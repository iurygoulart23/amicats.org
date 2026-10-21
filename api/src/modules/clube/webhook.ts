import { z } from 'zod';
import { HttpError } from '../../lib/errors.js';
import { verificarAssinaturaWebhook } from '../../lib/mercadopago.js';
import { aplicarPagamentoAvulsoMp } from '../pagamentos-avulsos.js';
import { aplicarAssinaturaMp, aplicarCobrancaMp } from './sincronizar.js';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

const primeiro = (v: string | Array<string> | undefined) =>
  Array.isArray(v) ? v[0] : v;

/** Webhook do Mercado Pago (configurar em Suas integrações > Webhooks). */
export const webhookMercadoPagoRoutes: FastifyPluginAsyncZod = async (app) => {
  const { prisma, pagamentos, env } = app.deps;
  const agora = () => app.deps.agora?.() ?? new Date();

  app.post(
    '/mercadopago',
    {
      schema: {
        tags: ['webhooks'],
        summary:
          'Avisos do Mercado Pago sobre assinaturas, cobranças e pagamentos (assinatura x-signature)',
        querystring: z.looseObject({
          'data.id': z.string().optional(),
          type: z.string().optional(),
        }),
        body: z
          .looseObject({
            type: z.string().optional(),
            data: z
              .looseObject({ id: z.union([z.string(), z.number()]).optional() })
              .optional(),
          })
          .optional(),
      },
    },
    async (request, reply) => {
      if (!env.MP_WEBHOOK_SECRET)
        throw new HttpError(
          503,
          'Webhook não configurado (MP_WEBHOOK_SECRET).',
        );
      const dataId =
        request.query['data.id'] ?? request.body?.data?.id?.toString();
      const tipo = request.body?.type ?? request.query.type;

      const valido = verificarAssinaturaWebhook({
        segredo: env.MP_WEBHOOK_SECRET,
        xSignature: primeiro(request.headers['x-signature']),
        xRequestId: primeiro(request.headers['x-request-id']),
        dataId,
        agora: agora(),
      });
      if (!valido) throw new HttpError(401, 'Assinatura do webhook inválida.');
      if (!dataId) return reply.status(200).send({ ok: true });

      // Sempre consultamos o Mercado Pago em vez de confiar no corpo do aviso.
      // Erros aqui viram 500 para o Mercado Pago tentar de novo.
      if (tipo === 'subscription_preapproval') {
        const mp = await pagamentos.obterAssinatura(dataId);
        const local = await prisma.assinatura.findFirst({
          where: {
            OR: [
              { mpId: mp.id },
              ...(mp.externalReference ? [{ id: mp.externalReference }] : []),
            ],
          },
        });
        if (local) await aplicarAssinaturaMp(app.deps, local, mp, agora());
        else
          request.log.warn(
            { mpId: mp.id },
            'assinatura do Mercado Pago sem correspondente local',
          );
      } else if (tipo === 'subscription_authorized_payment') {
        const cobranca = await pagamentos.obterCobranca(dataId);
        await aplicarCobrancaMp(app.deps, cobranca);
      } else if (tipo === 'payment') {
        // Pagamentos avulsos (parte do padrinho e doações). Cobranças do Clube também
        // chegam como 'payment', mas não têm correspondente e são ignoradas.
        const pagamento = await pagamentos.obterPagamento(dataId);
        await aplicarPagamentoAvulsoMp(app.deps, pagamento, request.log);
      }
      return reply.status(200).send({ ok: true });
    },
  );
};
