import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useLingui } from '@lingui/react/macro';
import { RefreshCw } from 'lucide-react';
import { z } from 'zod';
import type { StatusPagamento, TipoPagamento } from '@/integrations/api/types';
import { AlertaErro } from '@/components/app/alerta-erro';
import { Campo } from '@/components/app/campo';
import { cn } from '@/components/layout/shared/helpers/class.helper';
import {
  DescricaoPagamento,
  StatusPagamentoBadge,
} from '@/components/app/pagamento';
import {
  formatarDataAbrigo,
  formatarReais,
  mesAtual,
} from '@/components/app/shared/formatos';
import { useRotulos } from '@/hooks/use-rotulos';
import {
  conciliacaoQuery,
  useConciliar,
} from '@/integrations/api/pagamentos.queries';

const TIPOS = ['clube', 'apadrinhamento', 'doacao'] as const;
const STATUS = ['pendente', 'aprovado', 'recusado', 'estornado'] as const;

export const Route = createFileRoute('/$locale/app/_painel/admin/pagamentos')({
  validateSearch: z.object({
    // Vazio = todos os meses
    mes: z
      .string()
      .regex(/^\d{4}-\d{2}$/)
      .or(z.literal(''))
      .optional()
      .catch(undefined),
    tipo: z.enum(TIPOS).optional().catch(undefined),
    status: z.enum(STATUS).optional().catch(undefined),
  }),
  component: ConciliacaoPage,
});

function ConciliacaoPage() {
  const { t, i18n } = useLingui();
  const rotulos = useRotulos();
  const busca = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const mes = busca.mes ?? mesAtual();
  const filtro = {
    mes: mes || undefined,
    tipo: busca.tipo,
    status: busca.status,
  };
  const conciliacao = useQuery({
    ...conciliacaoQuery(filtro),
    placeholderData: keepPreviousData,
  });
  const conciliar = useConciliar();
  const resultado = conciliar.data;
  const { consultados, atualizados } = resultado ?? {};
  const resumo = conciliacao.data?.resumo;
  const reais = (centavos: number) => formatarReais(centavos, i18n.locale);

  const filtrar = (mudanca: Partial<typeof busca>) =>
    void navigate({ search: { ...busca, ...mudanca }, replace: true });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{t`Pagamentos`}</h1>
        <button
          type="button"
          className="btn btn-sm"
          disabled={conciliar.isPending}
          onClick={() => conciliar.mutate()}
        >
          <RefreshCw
            className={cn('size-4', conciliar.isPending && 'animate-spin')}
          />
          {t`Reconsultar pendentes no Mercado Pago`}
        </button>
      </div>

      {resultado && (
        <div role="status" className="alert alert-soft">
          {resultado.consultados === 0
            ? t`Nenhum pagamento pendente para consultar.`
            : t`${consultados} pendentes consultados, ${atualizados} atualizados.`}
        </div>
      )}
      <AlertaErro erro={conciliacao.error ?? conciliar.error} />

      <div className="flex flex-wrap items-end gap-3">
        <Campo label={t`Mês`}>
          <input
            type="month"
            value={mes}
            onChange={(e) => filtrar({ mes: e.target.value })}
            className="input input-sm w-44"
          />
        </Campo>
        <Campo label={t`Origem`}>
          <select
            value={busca.tipo ?? ''}
            onChange={(e) =>
              filtrar({
                tipo: (e.target.value || undefined) as
                  TipoPagamento | undefined,
              })
            }
            className="select select-sm w-44"
          >
            <option value="">{t`Todas`}</option>
            {TIPOS.map((tipo) => (
              <option key={tipo} value={tipo}>
                {rotulos.tipoPagamento[tipo]}
              </option>
            ))}
          </select>
        </Campo>
        <Campo label={t`Situação`}>
          <select
            value={busca.status ?? ''}
            onChange={(e) =>
              filtrar({
                status: (e.target.value || undefined) as
                  StatusPagamento | undefined,
              })
            }
            className="select select-sm w-48"
          >
            <option value="">{t`Todas`}</option>
            {STATUS.map((s) => (
              <option key={s} value={s}>
                {rotulos.statusPagamento[s]}
              </option>
            ))}
          </select>
        </Campo>
      </div>

      <div className="stats stats-vertical lg:stats-horizontal bg-base-100 shadow-sm">
        <div className="stat">
          <div className="stat-title">{t`Recebido`}</div>
          <div className="stat-value text-primary">
            {resumo ? reais(resumo.aprovadoCentavos) : '—'}
          </div>
          {resumo && (
            <div className="stat-desc">
              {TIPOS.map(
                (tipo) =>
                  `${rotulos.tipoPagamento[tipo]}: ${reais(resumo.aprovadoPorTipo[tipo])}`,
              ).join(' · ')}
            </div>
          )}
        </div>
        <div className="stat">
          <div className="stat-title">{t`Aguardando pagamento`}</div>
          <div className="stat-value">{resumo?.quantidade.pendente ?? '—'}</div>
          <div className="stat-desc">{t`Pix e boleto ainda não compensados`}</div>
        </div>
        <div className="stat">
          <div className="stat-title">{t`Recusados e estornados`}</div>
          <div className="stat-value">
            {resumo
              ? resumo.quantidade.recusado + resumo.quantidade.estornado
              : '—'}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto bg-base-100 rounded-box shadow-sm">
        <table className="table">
          <thead>
            <tr>
              <th>{t`Data`}</th>
              <th>{t`Quem pagou`}</th>
              <th>{t`Pagamento`}</th>
              <th className="text-right">{t`Valor`}</th>
              <th>{t`Situação`}</th>
              <th className="hidden lg:table-cell">{t`Id no Mercado Pago`}</th>
            </tr>
          </thead>
          <tbody>
            {conciliacao.data?.itens.length === 0 && (
              <tr>
                <td colSpan={6} className="opacity-70">
                  {t`Nenhum pagamento com esses filtros.`}
                </td>
              </tr>
            )}
            {conciliacao.data?.itens.map((p) => (
              <tr key={`${p.tipo}-${p.id}`}>
                <td className="whitespace-nowrap">
                  {formatarDataAbrigo(p.data)}
                </td>
                <td>
                  {p.pessoa.nome}
                  <span className="block text-xs opacity-60">
                    {p.pessoa.email}
                    {!p.pessoa.id && ` · ${t`sem conta`}`}
                  </span>
                </td>
                <td>
                  <DescricaoPagamento pagamento={p} />
                </td>
                <td className="text-right whitespace-nowrap">
                  {reais(p.valorCentavos)}
                </td>
                <td>
                  <StatusPagamentoBadge status={p.status} />
                </td>
                <td className="hidden lg:table-cell font-mono text-xs opacity-70">
                  {p.mpPagamentoId ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
