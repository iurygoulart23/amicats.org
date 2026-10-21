import { z } from 'zod';
import {
  STATUS_APADRINHAVEIS,
  ativoNoPeriodo,
  parteDoPadrinho,
} from '../../domain/apadrinhamento.js';
import { podeAcessar } from '../../domain/cargos.js';
import {
  MesISO,
  deData,
  intervaloDoMes,
  mesDe,
  paraData,
} from '../../lib/datas.js';
import { HttpError, conflito, naoEncontrado } from '../../lib/errors.js';
import { exigirCargo } from '../../plugins/auth.js';
import { Gasto, includeGasto, toGasto } from '../gastos/mapper.js';
import { ParamsGato } from '../gatos/routes.js';
import type { StatusGato } from '../../domain/gato.js';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import type { FastifyRequest } from 'fastify';

const Apadrinhamento = z.object({
  id: z.string(),
  ativo: z.boolean(),
  inicio: z.string(),
  fim: z.string().nullable(),
  gato: z.object({
    id: z.string(),
    slug: z.string(),
    nome: z.string(),
    fotoUrl: z.string().nullable(),
  }),
});

const Extrato = z.object({
  mes: z.string(),
  totalCentavos: z.number(),
  padrinhosNoMes: z.number(),
  parteCentavos: z.number(),
  itens: z.array(Gasto),
});

const Params = z.object({ id: z.uuid() });

const hojeUtc = () => paraData(deData(new Date()));

export const apadrinhamentosRoutes: FastifyPluginAsyncZod = async (app) => {
  const { prisma } = app.deps;

  /** O próprio padrinho (ou a equipe, se permitido) acessa; para os demais, "não existe". */
  async function buscarAcessivel(
    request: FastifyRequest,
    id: string,
    cargoEquipe: 'voluntario' | 'adm',
  ) {
    const ap = await prisma.apadrinhamento.findUnique({ where: { id } });
    const usuario = request.usuario!;
    if (
      !ap ||
      (ap.userId !== usuario.id && !podeAcessar(usuario.cargo, cargoEquipe))
    ) {
      throw naoEncontrado('Apadrinhamento');
    }
    return ap;
  }

  app.post(
    '/apadrinhamentos',
    {
      onRequest: exigirCargo('cliente'),
      schema: {
        tags: ['apadrinhamento'],
        summary: 'Apadrinha um gato (para a pessoa logada)',
        security: [{ sessao: [] }],
        body: z.union([
          z.object({ gatoId: z.uuid() }),
          z.object({ slug: z.string().min(1).max(120) }),
        ]),
        response: { 201: z.object({ id: z.string() }) },
      },
    },
    async (request, reply) => {
      const userId = request.usuario!.id;
      const gato = await prisma.gato.findUnique({
        where:
          'gatoId' in request.body
            ? { id: request.body.gatoId }
            : { slug: request.body.slug },
      });
      if (!gato) throw naoEncontrado('Gato');
      if (
        !gato.publicado ||
        !STATUS_APADRINHAVEIS.includes(gato.status as StatusGato)
      ) {
        throw new HttpError(
          400,
          'Este gato não está disponível para apadrinhamento.',
        );
      }

      // Checagem + criação na mesma transação serializável: evita dois apadrinhamentos
      // ativos da mesma pessoa para o mesmo gato em cliques duplicados.
      const ap = await prisma.$transaction(
        async (tx) => {
          const ativo = await tx.apadrinhamento.findFirst({
            where: { gatoId: gato.id, userId, fim: null },
          });
          if (ativo) throw conflito('Você já apadrinha este gato.');
          return tx.apadrinhamento.create({
            data: { gatoId: gato.id, userId, inicio: hojeUtc() },
          });
        },
        { isolationLevel: 'Serializable' },
      );
      return reply.status(201).send({ id: ap.id });
    },
  );

  app.get(
    '/apadrinhamentos/meus',
    {
      onRequest: exigirCargo('cliente'),
      schema: {
        tags: ['apadrinhamento'],
        summary: 'Apadrinhamentos da pessoa logada (ativos primeiro)',
        security: [{ sessao: [] }],
        response: { 200: z.array(Apadrinhamento) },
      },
    },
    async (request) => {
      const lista = await prisma.apadrinhamento.findMany({
        where: { userId: request.usuario!.id },
        include: {
          gato: {
            select: {
              id: true,
              slug: true,
              nome: true,
              fotos: { orderBy: [{ capa: 'desc' }, { ordem: 'asc' }], take: 1 },
            },
          },
        },
        orderBy: [{ inicio: 'desc' }],
      });
      return lista
        .map((ap) => ({
          id: ap.id,
          ativo: ap.fim === null,
          inicio: deData(ap.inicio),
          fim: ap.fim ? deData(ap.fim) : null,
          gato: {
            id: ap.gato.id,
            slug: ap.gato.slug,
            nome: ap.gato.nome,
            fotoUrl: ap.gato.fotos[0]?.url ?? null,
          },
        }))
        .sort((a, b) => Number(b.ativo) - Number(a.ativo));
    },
  );

  app.get(
    '/apadrinhamentos/:id/extrato',
    {
      onRequest: exigirCargo('cliente'),
      schema: {
        tags: ['apadrinhamento'],
        summary: 'Gastos do gato no mês e a parte deste padrinho',
        security: [{ sessao: [] }],
        params: Params,
        querystring: z.object({ mes: MesISO.optional() }),
        response: { 200: Extrato },
      },
    },
    async (request) => {
      const ap = await buscarAcessivel(
        request,
        request.params.id,
        'voluntario',
      );
      const mes = request.query.mes ?? mesDe(ap.fim ?? new Date());
      if (mes < mesDe(ap.inicio) || (ap.fim && mes > mesDe(ap.fim))) {
        throw new HttpError(
          400,
          'Este mês está fora do período do apadrinhamento.',
        );
      }

      const { inicio, fimExclusivo } = intervaloDoMes(mes);
      const [gastos, apadrinhamentosDoGato] = await Promise.all([
        prisma.gasto.findMany({
          where: { gatoId: ap.gatoId, data: { gte: inicio, lt: fimExclusivo } },
          include: includeGasto,
          orderBy: [{ data: 'desc' }, { criadoEm: 'desc' }],
        }),
        prisma.apadrinhamento.findMany({
          where: { gatoId: ap.gatoId, inicio: { lt: fimExclusivo } },
          select: { inicio: true, fim: true },
        }),
      ]);
      const totalCentavos = gastos.reduce(
        (soma, g) => soma + g.valorCentavos,
        0,
      );
      const padrinhosNoMes = apadrinhamentosDoGato.filter((a) =>
        ativoNoPeriodo(a, inicio, fimExclusivo),
      ).length;

      return {
        mes,
        totalCentavos,
        padrinhosNoMes,
        parteCentavos: parteDoPadrinho(totalCentavos, padrinhosNoMes),
        itens: gastos.map(toGasto),
      };
    },
  );

  app.delete(
    '/apadrinhamentos/:id',
    {
      onRequest: exigirCargo('cliente'),
      schema: {
        tags: ['apadrinhamento'],
        summary: 'Encerra o apadrinhamento (o próprio padrinho ou adm)',
        security: [{ sessao: [] }],
        params: Params,
      },
    },
    async (request, reply) => {
      const ap = await buscarAcessivel(request, request.params.id, 'adm');
      if (!ap.fim) {
        await prisma.apadrinhamento.update({
          where: { id: ap.id },
          data: { fim: hojeUtc() },
        });
      }
      return reply.status(204).send();
    },
  );

  app.get(
    '/gatos/:id/padrinhos',
    {
      onRequest: exigirCargo('voluntario'),
      schema: {
        tags: ['apadrinhamento'],
        summary: 'Padrinhos ativos do gato',
        security: [{ sessao: [] }],
        params: ParamsGato,
        response: {
          200: z.array(
            z.object({
              apadrinhamentoId: z.string(),
              nome: z.string(),
              email: z.string(),
              telefone: z.string().nullable(),
              inicio: z.string(),
            }),
          ),
        },
      },
    },
    async (request) => {
      const lista = await prisma.apadrinhamento.findMany({
        where: { gatoId: request.params.id, fim: null },
        include: {
          user: { select: { nome: true, email: true, telefone: true } },
        },
        orderBy: { inicio: 'asc' },
      });
      return lista.map((ap) => ({
        apadrinhamentoId: ap.id,
        ...ap.user,
        inicio: deData(ap.inicio),
      }));
    },
  );
};
