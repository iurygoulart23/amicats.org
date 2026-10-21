import { useLingui } from '@lingui/react/macro';
import type { Pagamento, StatusPagamento } from '@/integrations/api/types';
import { formatarMes } from '@/components/app/shared/formatos';
import { cn } from '@/components/layout/shared/helpers/class.helper';
import { useRotulos } from '@/hooks/use-rotulos';

const COR: Record<StatusPagamento, string> = {
  pendente: 'badge-warning',
  aprovado: 'badge-success',
  recusado: 'badge-error',
  estornado: 'badge-ghost',
};

export interface StatusPagamentoBadgeProps {
  status: StatusPagamento;
}

export function StatusPagamentoBadge({ status }: StatusPagamentoBadgeProps) {
  const { statusPagamento } = useRotulos();
  return (
    <span className={cn('badge badge-sm whitespace-nowrap', COR[status])}>
      {statusPagamento[status]}
    </span>
  );
}

export interface DescricaoPagamentoProps {
  pagamento: Pagamento;
}

/** Origem do pagamento e o que ele pagou (faixa do Clube, gato e mês). */
export function DescricaoPagamento({ pagamento: p }: DescricaoPagamentoProps) {
  const { i18n } = useLingui();
  const { tipoPagamento } = useRotulos();
  const detalhe =
    p.tipo === 'clube'
      ? p.plano
      : p.tipo === 'apadrinhamento' && p.gato && p.mes
        ? `${p.gato.nome} · ${formatarMes(p.mes, i18n.locale)}`
        : null;
  return (
    <>
      {tipoPagamento[p.tipo]}
      {detalhe && <span className="block text-xs opacity-60">{detalhe}</span>}
    </>
  );
}
