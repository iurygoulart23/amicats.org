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

/** O que ainda falta pagar no mês (pagamentos a mais não viram crédito). */
export function faltaPagar(parteCentavos: number, pagoCentavos: number) {
  return Math.max(0, parteCentavos - pagoCentavos);
}
