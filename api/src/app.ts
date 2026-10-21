import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import {
  hasZodFastifySchemaValidationErrors,
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';
import { HttpError } from './lib/errors.js';
import { authPlugin } from './plugins/auth.js';
import { authRoutes } from './modules/auth/routes.js';
import { usersRoutes } from './modules/users/routes.js';
import { gatosRoutes } from './modules/gatos/routes.js';
import { tagsRoutes } from './modules/tags/routes.js';
import { saudeRoutes } from './modules/saude/routes.js';
import { fotosRoutes } from './modules/fotos/routes.js';
import { publicoRoutes } from './modules/publico/routes.js';
import { gastosRoutes } from './modules/gastos/routes.js';
import { apadrinhamentosRoutes } from './modules/apadrinhamentos/routes.js';
import { prescricoesRoutes } from './modules/medicacao/prescricoes.js';
import { agendaRoutes } from './modules/medicacao/agenda.js';
import { notificacoesRoutes } from './modules/notificacoes/routes.js';
import { tarefasRoutes } from './modules/notificacoes/tarefas.js';
import { clubeRoutes } from './modules/clube/routes.js';
import { webhookMercadoPagoRoutes } from './modules/clube/webhook.js';
import { devMercadoPagoRoutes } from './modules/clube/dev-mercadopago.js';
import { devEmailsRoutes } from './modules/dev-emails.js';
import { doacoesRoutes } from './modules/doacoes/routes.js';
import { pagamentosRoutes } from './modules/pagamentos/routes.js';
import {
  veterinarioGatoRoutes,
  veterinarioRoutes,
} from './modules/medicacao/veterinario.js';
import type { PrismaClient } from '@prisma/client';
import type { FastifyServerOptions } from 'fastify';
import type { Env } from './env.js';
import type { Mailer } from './lib/mailer.js';
import type { Storage } from './lib/storage.js';
import type { GatewayPagamentos } from './lib/mercadopago.js';
import type { SimuladorMp } from './lib/mercadopago-simulado.js';
import type { CaixaDev } from './lib/caixa-dev.js';

export type AppDeps = {
  env: Env;
  prisma: PrismaClient;
  mailer: Mailer;
  storage: Storage;
  pagamentos: GatewayPagamentos;
  /** Só em desenvolvimento, com CAIXA_DEV=true: e-mails em memória */
  caixaDev?: CaixaDev;
  /** Só em desenvolvimento, com MP_SIMULADO=true: checkout de mentira */
  simuladorMp?: SimuladorMp;
  /** Relógio injetável (testes de tarefas que dependem da hora) */
  agora?: () => Date;
};

declare module 'fastify' {
  interface FastifyInstance {
    deps: AppDeps;
  }
}

const METODOS_SEGUROS = new Set(['GET', 'HEAD', 'OPTIONS']);

export async function buildApp(
  deps: AppDeps,
  options: FastifyServerOptions = {},
) {
  const app = Fastify(options);
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.decorate('deps', deps);

  await app.register(cookie);
  await app.register(cors, {
    origin: deps.env.WEB_ORIGIN,
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PATCH', 'PUT', 'DELETE'],
  });
  await app.register(rateLimit, { global: false });

  // Defesa contra CSRF além do SameSite=Lax: requisições que alteram dados vindas
  // de um navegador precisam ter a origem do site.
  app.addHook('onRequest', async (request) => {
    const origin = request.headers.origin;
    // O checkout simulado (só em desenvolvimento) é uma página da própria API.
    const checkoutSimulado =
      deps.simuladorMp !== undefined &&
      request.url.startsWith('/dev/mercadopago/');
    if (
      !METODOS_SEGUROS.has(request.method) &&
      origin &&
      origin !== deps.env.WEB_ORIGIN &&
      !checkoutSimulado
    ) {
      throw new HttpError(403, 'Origem não permitida.');
    }
  });

  await app.register(swagger, {
    openapi: {
      info: { title: 'Amicats API', version: '0.1.0' },
      components: {
        securitySchemes: {
          sessao: { type: 'apiKey', in: 'cookie', name: 'amicats_session' },
        },
      },
    },
    transform: jsonSchemaTransform,
  });
  await app.register(swaggerUi, { routePrefix: '/docs' });

  app.setErrorHandler((error, request, reply) => {
    if (hasZodFastifySchemaValidationErrors(error)) {
      return reply.status(400).send({
        mensagem: 'Dados inválidos.',
        erros: error.validation.map((v) => ({
          campo: v.instancePath.replace(/^\//, '').replaceAll('/', '.'),
          mensagem: v.message,
        })),
      });
    }
    if (error instanceof HttpError) {
      return reply.status(error.statusCode).send({ mensagem: error.message });
    }
    const status = (error as { statusCode?: number }).statusCode;
    if (status && status < 500) {
      return reply.status(status).send({ mensagem: (error as Error).message });
    }
    request.log.error(error);
    return reply.status(500).send({ mensagem: 'Erro interno.' });
  });

  await app.register(authPlugin);

  app.get('/health', { schema: { hide: true } }, () => ({ ok: true }));
  await app.register(authRoutes, { prefix: '/auth' });
  await app.register(usersRoutes, { prefix: '/users' });
  await app.register(gatosRoutes, { prefix: '/gatos' });
  await app.register(saudeRoutes, { prefix: '/gatos' });
  await app.register(fotosRoutes, { prefix: '/gatos' });
  await app.register(gastosRoutes, { prefix: '/gatos' });
  await app.register(prescricoesRoutes, { prefix: '/gatos' });
  await app.register(veterinarioGatoRoutes, { prefix: '/gatos' });
  await app.register(tagsRoutes, { prefix: '/tags' });
  await app.register(publicoRoutes, { prefix: '/public' });
  await app.register(apadrinhamentosRoutes);
  await app.register(agendaRoutes, { prefix: '/medicacao' });
  await app.register(veterinarioRoutes, { prefix: '/veterinario' });
  await app.register(notificacoesRoutes, { prefix: '/notificacoes' });
  await app.register(tarefasRoutes, { prefix: '/tarefas' });
  await app.register(clubeRoutes, { prefix: '/clube' });
  await app.register(doacoesRoutes, { prefix: '/doacoes' });
  await app.register(pagamentosRoutes, { prefix: '/pagamentos' });
  await app.register(webhookMercadoPagoRoutes, { prefix: '/webhooks' });
  if (deps.caixaDev) {
    await app.register(devEmailsRoutes(deps.caixaDev), { prefix: '/dev' });
  }
  if (deps.simuladorMp) {
    await app.register(devMercadoPagoRoutes(deps.simuladorMp), {
      prefix: '/dev/mercadopago',
    });
  }

  return app;
}
