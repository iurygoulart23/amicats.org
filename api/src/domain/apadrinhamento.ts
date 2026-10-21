import type { StatusGato } from './gato.js';

/** Gatos ainda no abrigo podem receber padrinhos. */
export const STATUS_APADRINHAVEIS: ReadonlyArray<StatusGato> = [
  'disponivel',
  'apadrinhado',
  'em_tratamento',
];

/** Meses completos usados na estimativa de custo. */
export const MESES_ESTIMATIVA = 3;

type Periodo = { inicio: Date; fim: Date | null };

/** Esteve ativo em algum dia do intervalo [inicio, fimExclusivo)? */
export function ativoNoPeriodo(
  ap: Periodo,
  inicio: Date,
  fimExclusivo: Date,
): boolean {
  return ap.inicio < fimExclusivo && (ap.fim === null || ap.fim >= inicio);
}

/** Total do mês dividido igualmente, arredondado para o centavo mais próximo. */
export function parteDoPadrinho(
  totalCentavos: number,
  padrinhosNoMes: number,
): number {
  return padrinhosNoMes > 0
    ? Math.round(totalCentavos / padrinhosNoMes)
    : totalCentavos;
}

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

/** O que ainda falta pagar no mês (pagamentos a mais não viram crédito). */
export function faltaPagar(parteCentavos: number, pagoCentavos: number) {
  return Math.max(0, parteCentavos - pagoCentavos);
}
