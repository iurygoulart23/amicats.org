import { z } from 'zod';
import {
  STATUS_APADRINHAVEIS,
  STATUS_PAGAMENTO,
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
import {
  mesPorExtenso,
  notificarApadrinhamentoNovo,
  notificarSemFalhar,
} from '../notificacoes/notificar.js';
import { sincronizarPendentes } from './pagamentos.js';
import { mesFechado, mesesFechados, situacaoDosMeses } from './situacao.js';
import type { StatusPagamento } from '../../domain/apadrinhamento.js';
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
  /** Soma do que falta pagar nos meses fechados */
  faltaPagarCentavos: z.number(),
  mesesEmAberto: z.array(z.string()),
});

const Extrato = z.object({
  mes: z.string(),
  totalCentavos: z.number(),
  padrinhosNoMes: z.number(),
  parteCentavos: z.number(),
  pagoCentavos: z.number(),
  faltaCentavos: z.number(),
  /** Mês já encerrado: a parte pode ser paga */
  fechado: z.boolean(),
  pagamentos: z.array(
    z.object({
      id: z.string(),
      valorCentavos: z.number(),
      status: z.enum(STATUS_PAGAMENTO),
      /** Só enquanto pendente: para retomar o pagamento */
      checkoutUrl: z.string().nullable(),
      pagoEm: z.date().nullable(),
      criadoEm: z.date(),
    }),
  ),
  itens: z.array(Gasto),
});

const Params = z.object({ id: z.uuid() });

const hojeUtc = () => paraData(deData(new Date()));

export const apadrinhamentosRoutes: FastifyPluginAsyncZod = async (app) => {
  const { prisma, pagamentos, env } = app.deps;
  const agora = () => app.deps.agora?.() ?? new Date();

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
      await notificarSemFalhar(request.log, () =>
        notificarApadrinhamentoNovo(prisma, ap),
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
      const hoje = agora();
      const situacoes = await Promise.all(
        lista.map((ap) =>
          situacaoDosMeses(prisma, ap, mesesFechados(ap, hoje)),
        ),
      );
      return lista
        .map((ap, i) => ({
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
          faltaPagarCentavos: situacoes[i]!.reduce(
            (soma, m) => soma + m.faltaCentavos,
            0,
          ),
          mesesEmAberto: situacoes[i]!.filter((m) => m.faltaCentavos > 0).map(
            (m) => m.mes,
          ),
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

      const pendentes = await prisma.pagamentoApadrinhamento.findMany({
        where: { apadrinhamentoId: ap.id, mes, status: 'pendente' },
      });
      await sincronizarPendentes(app.deps, pendentes, request.log);

      const { inicio, fimExclusivo } = intervaloDoMes(mes);
      const [gastos, [situacao], pagamentosDoMes] = await Promise.all([
        prisma.gasto.findMany({
          where: { gatoId: ap.gatoId, data: { gte: inicio, lt: fimExclusivo } },
          include: includeGasto,
          orderBy: [{ data: 'desc' }, { criadoEm: 'desc' }],
        }),
        situacaoDosMeses(prisma, ap, [mes]),
        prisma.pagamentoApadrinhamento.findMany({
          where: { apadrinhamentoId: ap.id, mes },
          orderBy: { criadoEm: 'desc' },
        }),
      ]);

      return {
        ...situacao!,
        fechado: mesFechado(mes, agora()),
        pagamentos: pagamentosDoMes.map((p) => ({
          id: p.id,
          valorCentavos: p.valorCentavos,
          status: p.status as StatusPagamento,
          checkoutUrl: p.status === 'pendente' ? p.checkoutUrl : null,
          pagoEm: p.pagoEm,
          criadoEm: p.criadoEm,
        })),
        itens: gastos.map(toGasto),
      };
    },
  );

  app.post(
    '/apadrinhamentos/:id/pagamentos',
    {
      onRequest: exigirCargo('cliente'),
      schema: {
        tags: ['apadrinhamento'],
        summary:
          'Paga a parte de um mês fechado: cria o checkout do Mercado Pago (pix, cartão ou boleto)',
        security: [{ sessao: [] }],
        params: Params,
        body: z.object({ mes: MesISO }),
        response: { 201: z.object({ checkoutUrl: z.string() }) },
      },
    },
    async (request, reply) => {
      const usuario = request.usuario!;
      const ap = await prisma.apadrinhamento.findUnique({
        where: { id: request.params.id },
        include: { gato: { select: { nome: true } } },
      });
      // Só o próprio padrinho paga a parte dele.
      if (!ap || ap.userId !== usuario.id)
        throw naoEncontrado('Apadrinhamento');

      const { mes } = request.body;
      if (mes < mesDe(ap.inicio) || (ap.fim && mes > mesDe(ap.fim))) {
        throw new HttpError(
          400,
          'Este mês está fora do período do apadrinhamento.',
        );
      }
      if (!mesFechado(mes, agora())) {
        throw new HttpError(
          400,
          'Só dá para pagar depois que o mês terminar (ainda podem entrar gastos).',
        );
      }

      const pendentes = await prisma.pagamentoApadrinhamento.findMany({
        where: { apadrinhamentoId: ap.id, mes, status: 'pendente' },
        orderBy: { criadoEm: 'desc' },
      });
      await sincronizarPendentes(app.deps, pendentes, request.log);
      const [situacao] = await situacaoDosMeses(prisma, ap, [mes]);
      const falta = situacao!.faltaCentavos;
      if (falta === 0) throw conflito('Não há valor a pagar neste mês.');

      // Clique repetido: reaproveita o checkout ainda aberto com o mesmo valor.
      const aberto = await prisma.pagamentoApadrinhamento.findFirst({
        where: {
          apadrinhamentoId: ap.id,
          mes,
          status: 'pendente',
          valorCentavos: falta,
          checkoutUrl: { not: null },
        },
        orderBy: { criadoEm: 'desc' },
      });
      if (aberto?.checkoutUrl) {
        return reply.status(201).send({ checkoutUrl: aberto.checkoutUrl });
      }

      const local = await prisma.pagamentoApadrinhamento.create({
        data: { apadrinhamentoId: ap.id, mes, valorCentavos: falta },
      });
      try {
        const checkout = await pagamentos.criarCheckout({
          titulo: `Apadrinhamento de ${ap.gato.nome} — ${mesPorExtenso(mes)}`,
          referencia: local.id,
          emailPagador: usuario.email,
          valorCentavos: falta,
          urlRetorno: `${env.WEB_ORIGIN}/pt-BR/app/apadrinhamentos/${ap.id}?mes=${mes}`,
        });
        await prisma.pagamentoApadrinhamento.update({
          where: { id: local.id },
          data: {
            mpPreferenciaId: checkout.id,
            checkoutUrl: checkout.checkoutUrl,
          },
        });
        return reply.status(201).send({ checkoutUrl: checkout.checkoutUrl });
      } catch (err) {
        await prisma.pagamentoApadrinhamento
          .delete({ where: { id: local.id } })
          .catch(() => undefined);
        throw err;
      }
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
