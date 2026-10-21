import { timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { HttpError } from '../../lib/errors.js';
import { verificarPendencias } from './pendencias.js';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

function tokenConfere(recebido: string | undefined, esperado: string) {
  const a = Buffer.from(recebido ?? '');
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Rotas chamadas por agendador externo (Cloud Scheduler/cron), autenticadas por token. */
export const tarefasRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('onRequest', async (request) => {
    const esperado = app.deps.env.TAREFAS_TOKEN;
    if (!esperado)
      throw new HttpError(503, 'Tarefas desativadas (TAREFAS_TOKEN).');
    const recebido = request.headers['x-tarefa-token'];
    if (
      !tokenConfere(Array.isArray(recebido) ? recebido[0] : recebido, esperado)
    ) {
      throw new HttpError(401, 'Token da tarefa inválido.');
    }
  });

  app.post(
    '/verificar-pendencias',
    {
      schema: {
        tags: ['tarefas'],
        summary:
          'Doses atrasadas, retornos, partes do mês dos padrinhos e resumos por e-mail (rodar a cada 15 min)',
        response: {
          200: z.object({
            dosesAtrasadas: z.number(),
            retornos: z.number(),
            partes: z.number(),
            emails: z.number(),
          }),
        },
      },
    },
    () => verificarPendencias(app.deps, app.deps.agora?.() ?? new Date()),
  );
};
