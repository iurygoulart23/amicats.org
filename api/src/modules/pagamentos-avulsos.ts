import { aplicarPagamentoMp } from './apadrinhamentos/pagamentos.js';
import { aplicarDoacaoMp } from './doacoes/sincronizar.js';
import type { FastifyBaseLogger } from 'fastify';
import type { AppDeps } from '../app.js';
import type { PagamentoMp } from '../lib/mercadopago.js';

/**
 * Pagamento feito num checkout de pagamento único: doação (referência `doacao:<id>`)
 * ou parte do padrinho (referência = id do pagamento). Outros são ignorados.
 */
export async function aplicarPagamentoAvulsoMp(
  deps: AppDeps,
  mp: PagamentoMp,
  log: FastifyBaseLogger,
) {
  return (
    (await aplicarDoacaoMp(deps, mp, log)) ??
    (await aplicarPagamentoMp(deps, mp, log))
  );
}
