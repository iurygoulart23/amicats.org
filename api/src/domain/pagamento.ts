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

/** Origem de um pagamento no histórico e na conciliação. */
export const TIPOS_PAGAMENTO = ['clube', 'apadrinhamento', 'doacao'] as const;
export type TipoPagamento = (typeof TIPOS_PAGAMENTO)[number];

/** Status da cobrança do Clube ('aprovada'…) no mesmo vocabulário dos outros pagamentos. */
export function statusDaCobrancaNoHistorico(status: string): StatusPagamento {
  if (status === 'aprovada') return 'aprovado';
  if (status === 'recusada') return 'recusado';
  return 'pendente';
}

/**
 * Entra no histórico? Checkout aberto e nunca pago (pendente sem pagamento no
 * Mercado Pago) não é pagamento: é só alguém que desistiu na página de pagamento.
 */
export function entraNoHistorico(p: PagamentoLocal) {
  return p.status !== 'pendente' || p.mpPagamentoId !== null;
}

/** Totais da conciliação: o que entrou (aprovado) por origem e quantos pedem atenção. */
export function resumoDosPagamentos(
  itens: Array<{
    tipo: TipoPagamento;
    status: StatusPagamento;
    valorCentavos: number;
  }>,
) {
  const aprovadoPorTipo: Record<TipoPagamento, number> = {
    clube: 0,
    apadrinhamento: 0,
    doacao: 0,
  };
  const quantidade: Record<StatusPagamento, number> = {
    pendente: 0,
    aprovado: 0,
    recusado: 0,
    estornado: 0,
  };
  for (const p of itens) {
    quantidade[p.status] += 1;
    if (p.status === 'aprovado') aprovadoPorTipo[p.tipo] += p.valorCentavos;
  }
  return {
    aprovadoCentavos:
      aprovadoPorTipo.clube +
      aprovadoPorTipo.apadrinhamento +
      aprovadoPorTipo.doacao,
    aprovadoPorTipo,
    quantidade,
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
