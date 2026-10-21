import { z } from 'zod';
import {
  STATUS_PAGAMENTO,
  TIPOS_PAGAMENTO,
  resumoDosPagamentos,
} from '../../domain/pagamento.js';
import { MesISO } from '../../lib/datas.js';
import { exigirCargo } from '../../plugins/auth.js';
import { conciliarPendentes } from './conciliar.js';
import { listarPagamentos } from './historico.js';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import type { PagamentoNoHistorico } from './historico.js';

const Pagamento = z.object({
  id: z.string(),
  tipo: z.enum(TIPOS_PAGAMENTO),
  status: z.enum(STATUS_PAGAMENTO),
  valorCentavos: z.number(),
  data: z.date(),
  plano: z.string().nullable(),
  gato: z.object({ id: z.string(), nome: z.string() }).nullable(),
  mes: z.string().nullable(),
});

const PagamentoAdm = Pagamento.extend({
  pessoa: z.object({
    id: z.string().nullable(),
    nome: z.string(),
    email: z.string(),
  }),
  mpPagamentoId: z.string().nullable(),
});

const PorStatus = z.object({
  pendente: z.number(),
  aprovado: z.number(),
  recusado: z.number(),
  estornado: z.number(),
});

const semDadosDoAdm = ({
  pessoa: _,
  mpPagamentoId: __,
  ...p
}: PagamentoNoHistorico) => p;

export const pagamentosRoutes: FastifyPluginAsyncZod = async (app) => {
  const { prisma } = app.deps;
  const agora = () => app.deps.agora?.() ?? new Date();

  app.get(
    '/meus',
    {
      onRequest: exigirCargo('cliente'),
      schema: {
        tags: ['pagamentos'],
        summary:
          'Histórico de pagamentos da pessoa logada: Clube, parte do padrinho e doações feitas com a conta',
        security: [{ sessao: [] }],
        response: { 200: z.object({ itens: z.array(Pagamento) }) },
      },
    },
    async (request) => {
      const itens = await listarPagamentos(prisma, {
        userId: request.usuario!.id,
      });
      return { itens: itens.map(semDadosDoAdm) };
    },
  );

  app.get(
    '/',
    {
      onRequest: exigirCargo('adm'),
      schema: {
        tags: ['pagamentos'],
        summary:
          'Conciliação: todos os pagamentos com filtros e o total aprovado por origem',
        security: [{ sessao: [] }],
        querystring: z.object({
          tipo: z.enum(TIPOS_PAGAMENTO).optional(),
          status: z.enum(STATUS_PAGAMENTO).optional(),
          mes: MesISO.optional(),
        }),
        response: {
          200: z.object({
            resumo: z.object({
              aprovadoCentavos: z.number(),
              aprovadoPorTipo: z.object({
                clube: z.number(),
                apadrinhamento: z.number(),
                doacao: z.number(),
              }),
              quantidade: PorStatus,
            }),
            itens: z.array(PagamentoAdm),
          }),
        },
      },
    },
    async (request) => {
      const itens = await listarPagamentos(prisma, request.query);
      return { resumo: resumoDosPagamentos(itens), itens };
    },
  );

  app.post(
    '/conciliar',
    {
      onRequest: exigirCargo('adm'),
      config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
      schema: {
        tags: ['pagamentos'],
        summary:
          'Consulta no Mercado Pago os pagamentos pendentes (webhook perdido ou atrasado) e aplica o que mudou',
        security: [{ sessao: [] }],
        response: {
          200: z.object({ consultados: z.number(), atualizados: z.number() }),
        },
      },
    },
    (request) => conciliarPendentes(app.deps, agora(), request.log),
  );
};
