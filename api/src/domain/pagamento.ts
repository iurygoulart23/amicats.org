import type { PagamentoMp } from '../lib/mercadopago.js';

/** Pagamentos avulsos feitos no checkout do Mercado Pago (parte do padrinho, doação). */
export const STATUS_PAGAMENTO = [
  'pendente',
  'aprovado',
  'recusado',
  'estornado',
] as const;
export type StatusPagamento = (typeof STATUS_PAGAMENTO)[number];

/** Status do pagamento no Mercado Pago → nosso status. */
export function statusDoPagamento(statusMp: string): StatusPagamento {
  if (statusMp === 'approved') return 'aprovado';
  if (statusMp === 'rejected' || statusMp === 'cancelled') return 'recusado';
  if (statusMp === 'refunded' || statusMp === 'charged_back')
    return 'estornado';
  return 'pendente';
}

type PagamentoLocal = { status: string; mpPagamentoId: string | null };

/**
 * O que muda no nosso registro com o aviso do Mercado Pago, ou null se nada muda.
 * Uma tentativa recusada no mesmo checkout não desfaz o que já foi aprovado;
 * só o estorno do próprio pagamento aprovado muda o status.
 */
export function atualizacaoDoPagamento(local: PagamentoLocal, mp: PagamentoMp) {
  const status = statusDoPagamento(mp.status);
  if (
    local.status === 'aprovado' &&
    !(status === 'estornado' && mp.id === local.mpPagamentoId)
  ) {
    return null;
  }
  return {
    status,
    mpPagamentoId: mp.id,
    ...(status === 'aprovado' && {
      valorCentavos: mp.valorCentavos,
      pagoEm: mp.data,
    }),
  };
}

/** Prefixo da referência (external_reference) dos checkouts de doação. */
const PREFIXO_DOACAO = 'doacao:';

export const referenciaDaDoacao = (id: string) => `${PREFIXO_DOACAO}${id}`;

/** Id da doação a partir da referência do checkout, ou null se não for de doação. */
export function doacaoDaReferencia(referencia: string | null) {
  return referencia?.startsWith(PREFIXO_DOACAO)
    ? referencia.slice(PREFIXO_DOACAO.length)
    : null;
}
