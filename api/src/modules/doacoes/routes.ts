import { z } from 'zod';
import {
  STATUS_PAGAMENTO,
  referenciaDaDoacao,
} from '../../domain/pagamento.js';
import { HttpError, naoEncontrado } from '../../lib/errors.js';
import { sincronizarDoacao } from './sincronizar.js';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import type { StatusPagamento } from '../../domain/pagamento.js';

const VALOR_MINIMO_CENTAVOS = 500;

const DoacaoPublica = z.object({
  id: z.string(),
  status: z.enum(STATUS_PAGAMENTO),
  valorCentavos: z.number(),
  /** Só enquanto pendente: para retomar o pagamento */
  checkoutUrl: z.string().nullable(),
  pagoEm: z.date().nullable(),
});

export const doacoesRoutes: FastifyPluginAsyncZod = async (app) => {
  const { prisma, pagamentos, env } = app.deps;

  app.post(
    '/',
    {
      // Rota aberta (não exige conta): limite por IP contra abuso.
      config: { rateLimit: { max: 10, timeWindow: '15 minutes' } },
      schema: {
        tags: ['doacoes'],
        summary:
          'Doação avulsa: cria o checkout do Mercado Pago (pix, cartão ou boleto). Sem login, informe nome e e-mail',
        body: z.object({
          valorCentavos: z
            .number()
            .int()
            .min(VALOR_MINIMO_CENTAVOS, 'O valor mínimo é R$ 5,00.')
            .max(10_000_000),
          nome: z.string().trim().min(1).max(120).optional(),
          email: z.email().max(200).optional(),
        }),
        response: {
          201: z.object({ id: z.string(), checkoutUrl: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { valorCentavos } = request.body;
      const usuario = request.usuario;
      const nome = usuario?.nome ?? request.body.nome;
      const email = usuario?.email ?? request.body.email;
      if (!nome || !email) {
        throw new HttpError(400, 'Informe seu nome e e-mail.');
      }

      const local = await prisma.doacao.create({
        data: { userId: usuario?.id, nome, email, valorCentavos },
      });
      try {
        const checkout = await pagamentos.criarCheckout({
          titulo: 'Doação para a Amicats',
          referencia: referenciaDaDoacao(local.id),
          emailPagador: email,
          valorCentavos,
          urlRetorno: `${env.WEB_ORIGIN}/pt-BR/doar/obrigado?doacao=${local.id}`,
        });
        await prisma.doacao.update({
          where: { id: local.id },
          data: {
            mpPreferenciaId: checkout.id,
            checkoutUrl: checkout.checkoutUrl,
          },
        });
        return reply
          .status(201)
          .send({ id: local.id, checkoutUrl: checkout.checkoutUrl });
      } catch (err) {
        await prisma.doacao
          .delete({ where: { id: local.id } })
          .catch(() => undefined);
        throw err;
      }
    },
  );

  app.get(
    '/:id',
    {
      schema: {
        tags: ['doacoes'],
        summary:
          'Situação de uma doação (página de obrigado). Sincroniza com o Mercado Pago se estiver pendente; não expõe dados de quem doou',
        params: z.object({ id: z.uuid() }),
        response: { 200: DoacaoPublica },
      },
    },
    async (request) => {
      const doacao = await prisma.doacao.findUnique({
        where: { id: request.params.id },
      });
      if (!doacao) throw naoEncontrado('Doação');
      const atual = await sincronizarDoacao(app.deps, doacao, request.log);
      return {
        id: atual.id,
        status: atual.status as StatusPagamento,
        valorCentavos: atual.valorCentavos,
        checkoutUrl: atual.status === 'pendente' ? atual.checkoutUrl : null,
        pagoEm: atual.pagoEm,
      };
    },
  );
};
