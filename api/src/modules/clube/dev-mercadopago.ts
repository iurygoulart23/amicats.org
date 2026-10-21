import { z } from 'zod';
import { naoEncontrado } from '../../lib/errors.js';
import { aplicarPagamentoAvulsoMp } from '../pagamentos-avulsos.js';
import { aplicarAssinaturaMp, aplicarCobrancaMp } from './sincronizar.js';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import type { SimuladorMp } from '../../lib/mercadopago-simulado.js';

const escapar = (texto: string) =>
  texto.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Checkout de mentira do simulador (só existe com MP_SIMULADO=true fora de produção). */
export function devMercadoPagoRoutes(
  simulador: SimuladorMp,
): FastifyPluginAsyncZod {
  return async (app) => {
    const Params = z.object({ id: z.string().min(1) });
    // O botão da página é um <form> HTML: o corpo vem como urlencoded e não é usado.
    app.addContentTypeParser(
      'application/x-www-form-urlencoded',
      (_request, _corpo, pronto) => pronto(null, {}),
    );

    app.get(
      '/checkout/:id',
      { schema: { hide: true, params: Params } },
      async (request, reply) => {
        const dados = simulador.dados(request.params.id);
        if (!dados) throw naoEncontrado('Checkout simulado');
        const valor = new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(dados.valorCentavos / 100);
        return reply.type('text/html; charset=utf-8').send(`<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Mercado Pago (simulado)</title>
<style>body{font-family:system-ui,sans-serif;max-width:28rem;margin:3rem auto;padding:0 1rem}
.aviso{background:#fff3cd;padding:.75rem;border-radius:.5rem}button{padding:.75rem 1.25rem;font-size:1rem;cursor:pointer}</style></head>
<body><p class="aviso">⚠️ Checkout <strong>simulado</strong> para desenvolvimento. Nada é cobrado.</p>
<h1>${escapar(dados.motivo)}</h1><p>${valor}${dados.recorrente ? ' por mês' : ''} · ${escapar(dados.emailPagador)}</p>
<form method="post"><button type="submit">Simular pagamento aprovado</button></form></body></html>`);
      },
    );

    app.post(
      '/checkout/:id',
      { schema: { hide: true, params: Params } },
      async (request, reply) => {
        if (!simulador.existe(request.params.id))
          throw naoEncontrado('Checkout simulado');
        const aprovado = simulador.aprovar(request.params.id);

        // Faz o papel dos webhooks que o Mercado Pago enviaria.
        if (aprovado.tipo === 'checkout') {
          await aplicarPagamentoAvulsoMp(
            app.deps,
            await simulador.gateway.obterPagamento(aprovado.pagamentoId),
            request.log,
          );
          return reply.redirect(aprovado.urlRetorno, 303);
        }
        const { urlRetorno, cobrancaId } = aprovado;
        const agora = new Date();
        const mp = await simulador.gateway.obterAssinatura(request.params.id);
        const local = await app.deps.prisma.assinatura.findUnique({
          where: { mpId: mp.id },
        });
        if (local) await aplicarAssinaturaMp(app.deps, local, mp, agora);
        await aplicarCobrancaMp(
          app.deps,
          await simulador.gateway.obterCobranca(cobrancaId),
        );

        return reply.redirect(urlRetorno, 303);
      },
    );
  };
}
