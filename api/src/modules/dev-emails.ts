import { z } from 'zod';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import type { CaixaDev } from '../lib/caixa-dev.js';

/** GET /dev/emails?para=… (só existe com CAIXA_DEV=true fora de produção). */
export function devEmailsRoutes(caixa: CaixaDev): FastifyPluginAsyncZod {
  return async (app) => {
    app.get(
      '/emails',
      {
        schema: {
          hide: true,
          querystring: z.object({ para: z.string().optional() }),
        },
      },
      (request) => Promise.resolve(caixa.listar(request.query.para)),
    );
  };
}
