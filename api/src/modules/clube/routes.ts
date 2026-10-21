import { z } from 'zod';
import { STATUS_ASSINATURA, STATUS_COBRANCA } from '../../domain/clube.js';
import { podeAcessar } from '../../domain/cargos.js';
import { HttpError, conflito, naoEncontrado } from '../../lib/errors.js';
import { exigirCargo } from '../../plugins/auth.js';
import { aplicarAssinaturaMp } from './sincronizar.js';
import type { Prisma } from '@prisma/client';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import type { StatusAssinatura, StatusCobranca } from '../../domain/clube.js';

const Plano = z.object({
  id: z.string(),
  nome: z.string(),
  descricao: z.string(),
  valorCentavos: z.number(),
  ativo: z.boolean(),
  ordem: z.number(),
});

const camposPlano = {
  nome: z.string().trim().min(1).max(60),
  descricao: z.string().max(500),
  valorCentavos: z
    .number()
    .int()
    .min(500, 'O valor mínimo é R$ 5,00.')
    .max(10_000_000),
  ativo: z.boolean(),
  ordem: z.number().int(),
};

const MinhaAssinatura = z
  .object({
    id: z.string(),
    status: z.enum(STATUS_ASSINATURA),
    valorCentavos: z.number(),
    plano: z.object({ id: z.string(), nome: z.string() }),
    checkoutUrl: z.string().nullable(),
    proximaCobranca: z.date().nullable(),
    ativadaEm: z.date().nullable(),
    canceladaEm: z.date().nullable(),
    criadoEm: z.date(),
    cobrancas: z.array(
      z.object({
        id: z.string(),
        valorCentavos: z.number(),
        status: z.enum(STATUS_COBRANCA),
        data: z.date(),
      }),
    ),
  })
  .nullable();

const includeMinha = {
  plano: { select: { id: true, nome: true } },
  cobrancas: { orderBy: { data: 'desc' }, take: 24 },
} satisfies Prisma.AssinaturaInclude;

function toMinha(
  a: Prisma.AssinaturaGetPayload<{ include: typeof includeMinha }>,
) {
  return {
    id: a.id,
    status: a.status as StatusAssinatura,
    valorCentavos: a.valorCentavos,
    plano: a.plano,
    checkoutUrl: a.status === 'pendente' ? a.checkoutUrl : null,
    proximaCobranca: a.proximaCobranca,
    ativadaEm: a.ativadaEm,
    canceladaEm: a.canceladaEm,
    criadoEm: a.criadoEm,
    cobrancas: a.cobrancas.map((c) => ({
      id: c.id,
      valorCentavos: c.valorCentavos,
      status: c.status as StatusCobranca,
      data: c.data,
    })),
  };
}

export const clubeRoutes: FastifyPluginAsyncZod = async (app) => {
  const { prisma, pagamentos, env } = app.deps;
  const agora = () => app.deps.agora?.() ?? new Date();

  const ultimaAssinatura = (userId: string) =>
    prisma.assinatura.findFirst({
      where: { userId },
      orderBy: { criadoEm: 'desc' },
    });

  app.get(
    '/planos',
    {
      schema: {
        tags: ['clube'],
        summary:
          'Faixas do Clube Amicats (adm com ?todas=true vê também as desativadas)',
        querystring: z.object({ todas: z.stringbool().optional() }),
        response: { 200: z.array(Plano) },
      },
    },
    async (request) => {
      const todas =
        request.query.todas &&
        request.usuario &&
        podeAcessar(request.usuario.cargo, 'adm');
      return prisma.planoClube.findMany({
        where: todas ? {} : { ativo: true },
        orderBy: [{ ordem: 'asc' }, { valorCentavos: 'asc' }],
      });
    },
  );

  app.post(
    '/planos',
    {
      onRequest: exigirCargo('adm'),
      schema: {
        tags: ['clube'],
        summary: 'Cria uma faixa do clube',
        security: [{ sessao: [] }],
        body: z
          .object(camposPlano)
          .partial({ descricao: true, ativo: true, ordem: true }),
        response: { 201: Plano },
      },
    },
    async (request, reply) =>
      reply
        .status(201)
        .send(await prisma.planoClube.create({ data: request.body })),
  );

  app.patch(
    '/planos/:id',
    {
      onRequest: exigirCargo('adm'),
      schema: {
        tags: ['clube'],
        summary:
          'Edita uma faixa (assinaturas existentes mantêm o valor da adesão)',
        security: [{ sessao: [] }],
        params: z.object({ id: z.uuid() }),
        body: z.object(camposPlano).partial(),
        response: { 200: Plano },
      },
    },
    async (request) => {
      const existe = await prisma.planoClube.findUnique({
        where: { id: request.params.id },
      });
      if (!existe) throw naoEncontrado('Faixa');
      return prisma.planoClube.update({
        where: { id: existe.id },
        data: request.body,
      });
    },
  );

  app.post(
    '/assinaturas',
    {
      onRequest: exigirCargo('cliente'),
      schema: {
        tags: ['clube'],
        summary:
          'Assina uma faixa: cria a assinatura no Mercado Pago e devolve o link do checkout',
        security: [{ sessao: [] }],
        body: z.object({ planoId: z.uuid() }),
        response: { 201: z.object({ checkoutUrl: z.string() }) },
      },
    },
    async (request, reply) => {
      const usuario = request.usuario!;
      const plano = await prisma.planoClube.findUnique({
        where: { id: request.body.planoId },
      });
      if (!plano) throw naoEncontrado('Faixa');
      if (!plano.ativo)
        throw new HttpError(400, 'Esta faixa não está mais disponível.');

      const anterior = await ultimaAssinatura(usuario.id);
      if (
        anterior &&
        (anterior.status === 'ativa' || anterior.status === 'pausada')
      ) {
        throw conflito('Você já é assinante do Clube Amicats.');
      }
      if (anterior?.status === 'pendente') {
        // Desistiu do checkout anterior: cancela lá e aqui antes de abrir outro.
        if (anterior.mpId) {
          await pagamentos
            .cancelarAssinatura(anterior.mpId)
            .catch((err: unknown) => {
              request.log.warn(
                { err },
                'não foi possível cancelar assinatura pendente no Mercado Pago',
              );
            });
        }
        await prisma.assinatura.update({
          where: { id: anterior.id },
          data: { status: 'cancelada', canceladaEm: agora() },
        });
      }

      const local = await prisma.assinatura.create({
        data: {
          userId: usuario.id,
          planoId: plano.id,
          valorCentavos: plano.valorCentavos,
        },
      });
      try {
        const mp = await pagamentos.criarAssinatura({
          motivo: `Clube Amicats — ${plano.nome}`,
          referencia: local.id,
          emailPagador: usuario.email,
          valorCentavos: plano.valorCentavos,
          urlRetorno: `${env.WEB_ORIGIN}/pt-BR/app/clube`,
        });
        await prisma.assinatura.update({
          where: { id: local.id },
          data: { mpId: mp.id, checkoutUrl: mp.checkoutUrl },
        });
        if (!mp.checkoutUrl)
          throw new HttpError(
            502,
            'O Mercado Pago não devolveu o link de pagamento.',
          );
        return reply.status(201).send({ checkoutUrl: mp.checkoutUrl });
      } catch (err) {
        await prisma.assinatura
          .delete({ where: { id: local.id } })
          .catch(() => undefined);
        throw err;
      }
    },
  );

  app.get(
    '/minha',
    {
      onRequest: exigirCargo('cliente'),
      schema: {
        tags: ['clube'],
        summary:
          'Assinatura da pessoa logada (sincroniza com o Mercado Pago se estiver pendente)',
        security: [{ sessao: [] }],
        response: { 200: MinhaAssinatura },
      },
    },
    async (request) => {
      const ultima = await ultimaAssinatura(request.usuario!.id);
      if (!ultima) return null;

      // Webhook não alcança ambientes locais e pode atrasar: ao voltar do checkout,
      // consultamos o Mercado Pago diretamente.
      if (ultima.status === 'pendente' && ultima.mpId) {
        try {
          const mp = await pagamentos.obterAssinatura(ultima.mpId);
          await aplicarAssinaturaMp(app.deps, ultima, mp, agora());
        } catch (err) {
          request.log.warn(
            { err },
            'não foi possível sincronizar a assinatura com o Mercado Pago',
          );
        }
      }
      const atual = await prisma.assinatura.findUniqueOrThrow({
        where: { id: ultima.id },
        include: includeMinha,
      });
      return toMinha(atual);
    },
  );

  app.post(
    '/minha/cancelar',
    {
      onRequest: exigirCargo('cliente'),
      schema: {
        tags: ['clube'],
        summary: 'Cancela a assinatura (o Mercado Pago para de cobrar)',
        security: [{ sessao: [] }],
      },
    },
    async (request, reply) => {
      const ultima = await ultimaAssinatura(request.usuario!.id);
      if (!ultima || ultima.status === 'cancelada')
        throw naoEncontrado('Assinatura');
      if (ultima.mpId) await pagamentos.cancelarAssinatura(ultima.mpId);
      await prisma.assinatura.update({
        where: { id: ultima.id },
        data: { status: 'cancelada', canceladaEm: agora() },
      });
      return reply.status(204).send();
    },
  );

  app.get(
    '/assinaturas',
    {
      onRequest: exigirCargo('adm'),
      schema: {
        tags: ['clube'],
        summary: 'Assinaturas do clube e receita mensal das ativas',
        security: [{ sessao: [] }],
        querystring: z.object({ status: z.enum(STATUS_ASSINATURA).optional() }),
        response: {
          200: z.object({
            ativas: z.number(),
            receitaMensalCentavos: z.number(),
            itens: z.array(
              z.object({
                id: z.string(),
                status: z.enum(STATUS_ASSINATURA),
                valorCentavos: z.number(),
                plano: z.object({ id: z.string(), nome: z.string() }),
                assinante: z.object({
                  id: z.string(),
                  nome: z.string(),
                  email: z.string(),
                }),
                ativadaEm: z.date().nullable(),
                proximaCobranca: z.date().nullable(),
                criadoEm: z.date(),
              }),
            ),
          }),
        },
      },
    },
    async (request) => {
      const [itens, resumo] = await Promise.all([
        prisma.assinatura.findMany({
          where: { status: request.query.status },
          include: {
            plano: { select: { id: true, nome: true } },
            user: { select: { id: true, nome: true, email: true } },
          },
          orderBy: { criadoEm: 'desc' },
          take: 500,
        }),
        prisma.assinatura.aggregate({
          where: { status: 'ativa' },
          _count: { _all: true },
          _sum: { valorCentavos: true },
        }),
      ]);
      return {
        ativas: resumo._count._all,
        receitaMensalCentavos: resumo._sum.valorCentavos ?? 0,
        itens: itens.map((a) => ({
          id: a.id,
          status: a.status as StatusAssinatura,
          valorCentavos: a.valorCentavos,
          plano: a.plano,
          assinante: a.user,
          ativadaEm: a.ativadaEm,
          proximaCobranca: a.proximaCobranca,
          criadoEm: a.criadoEm,
        })),
      };
    },
  );
};
