export const STATUS_ASSINATURA = [
  'pendente',
  'ativa',
  'pausada',
  'cancelada',
] as const;
export type StatusAssinatura = (typeof STATUS_ASSINATURA)[number];

export const STATUS_COBRANCA = ['aprovada', 'recusada', 'pendente'] as const;
export type StatusCobranca = (typeof STATUS_COBRANCA)[number];

/** Status da assinatura no Mercado Pago → nosso status. */
const DO_MERCADO_PAGO: Record<string, StatusAssinatura> = {
  pending: 'pendente',
  authorized: 'ativa',
  paused: 'pausada',
  cancelled: 'cancelada',
};

export function statusDaAssinatura(statusMp: string): StatusAssinatura | null {
  return DO_MERCADO_PAGO[statusMp] ?? null;
}

/** Situação do pagamento da cobrança no Mercado Pago → nosso status. */
export function statusDaCobranca(
  statusPagamento: string | null,
): StatusCobranca {
  if (statusPagamento === 'approved') return 'aprovada';
  if (statusPagamento === 'rejected' || statusPagamento === 'cancelled')
    return 'recusada';
  return 'pendente';
}
