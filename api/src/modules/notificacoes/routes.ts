import { z } from 'zod';
import { naoEncontrado } from '../../lib/errors.js';
import { exigirCargo } from '../../plugins/auth.js';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import type { TipoNotificacao } from './notificar.js';

const TIPOS = [
  'gasto_novo',
  'apadrinhamento_novo',
  'dose_atrasada',
  'retorno_proximo',
] as const;

const Notificacao = z.object({
  id: z.string(),
  tipo: z.enum(TIPOS),
  titulo: z.string(),
  mensagem: z.string(),
  link: z.string().nullable(),
  lida: z.boolean(),
  criadoEm: z.date(),
});

export const notificacoesRoutes: FastifyPluginAsyncZod = async (app) => {
  const { prisma } = app.deps;
  app.addHook('onRequest', exigirCargo('cliente'));

  app.get(
    '/',
    {
      schema: {
        tags: ['notificações'],
        summary: 'Notificações da pessoa logada (mais recentes primeiro)',
        security: [{ sessao: [] }],
        querystring: z.object({
          naoLidas: z.stringbool().optional(),
          limite: z.coerce.number().int().min(1).max(100).default(50),
        }),
        response: { 200: z.array(Notificacao) },
      },
    },
    async (request) => {
      const lista = await prisma.notificacao.findMany({
        where: {
          userId: request.usuario!.id,
          ...(request.query.naoLidas && { lidaEm: null }),
        },
        orderBy: { criadoEm: 'desc' },
        take: request.query.limite,
      });
      return lista.map((n) => ({
        id: n.id,
        tipo: n.tipo as TipoNotificacao,
        titulo: n.titulo,
        mensagem: n.mensagem,
        link: n.link,
        lida: n.lidaEm !== null,
        criadoEm: n.criadoEm,
      }));
    },
  );

  app.get(
    '/contagem',
    {
      schema: {
        tags: ['notificações'],
        summary: 'Quantas notificações não lidas (para o sininho)',
        security: [{ sessao: [] }],
        response: { 200: z.object({ naoLidas: z.number() }) },
      },
    },
    async (request) => ({
      naoLidas: await prisma.notificacao.count({
        where: { userId: request.usuario!.id, lidaEm: null },
      }),
    }),
  );

  app.post(
    '/:id/lida',
    {
      schema: {
        tags: ['notificações'],
        security: [{ sessao: [] }],
        params: z.object({ id: z.uuid() }),
      },
    },
    async (request, reply) => {
      const { count } = await prisma.notificacao.updateMany({
        where: { id: request.params.id, userId: request.usuario!.id },
        data: { lidaEm: new Date() },
      });
      if (!count) throw naoEncontrado('Notificação');
      return reply.status(204).send();
    },
  );

  app.post(
    '/ler-todas',
    { schema: { tags: ['notificações'], security: [{ sessao: [] }] } },
    async (request, reply) => {
      await prisma.notificacao.updateMany({
        where: { userId: request.usuario!.id, lidaEm: null },
        data: { lidaEm: new Date() },
      });
      return reply.status(204).send();
    },
  );
};
