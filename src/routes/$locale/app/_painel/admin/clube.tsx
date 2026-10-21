import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useLingui } from '@lingui/react/macro';
import { z } from 'zod';
import type { PlanoClube, StatusAssinatura } from '@/integrations/api/types';
import { AlertaErro } from '@/components/app/alerta-erro';
import { Campo } from '@/components/app/campo';
import {
  formatarDataAbrigo,
  formatarReais,
  reaisParaCentavos,
} from '@/components/app/shared/formatos';
import {
  assinaturasClubeQuery,
  planosClubeQuery,
  useSalvarPlano,
} from '@/integrations/api/clube.queries';

const STATUS = ['pendente', 'ativa', 'pausada', 'cancelada'] as const;

export const Route = createFileRoute('/$locale/app/_painel/admin/clube')({
  validateSearch: z.object({
    status: z.enum(STATUS).optional().catch(undefined),
  }),
  component: ClubeAdminPage,
});

function ClubeAdminPage() {
  const { t, i18n } = useLingui();
  const { status } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const assinaturas = useQuery({
    ...assinaturasClubeQuery(status),
    placeholderData: keepPreviousData,
  });

  const rotuloStatus: Record<StatusAssinatura, string> = {
    pendente: t`Aguardando pagamento`,
    ativa: t`Ativa`,
    pausada: t`Pausada`,
    cancelada: t`Cancelada`,
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t`Clube Amicats`}</h1>

      <div className="stats stats-vertical sm:stats-horizontal bg-base-100 shadow-sm">
        <div className="stat">
          <div className="stat-title">{t`Assinantes ativos`}</div>
          <div className="stat-value">{assinaturas.data?.ativas ?? '—'}</div>
        </div>
        <div className="stat">
          <div className="stat-title">{t`Receita mensal recorrente`}</div>
          <div className="stat-value text-primary">
            {assinaturas.data
              ? formatarReais(
                  assinaturas.data.receitaMensalCentavos,
                  i18n.locale,
                )
              : '—'}
          </div>
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">{t`Assinaturas`}</h2>
          <select
            aria-label={t`Situação`}
            value={status ?? ''}
            onChange={(e) =>
              void navigate({
                search: {
                  status: (e.target.value || undefined) as
                    StatusAssinatura | undefined,
                },
                replace: true,
              })
            }
            className="select select-sm w-48"
          >
            <option value="">{t`Todas`}</option>
            {STATUS.map((s) => (
              <option key={s} value={s}>
                {rotuloStatus[s]}
              </option>
            ))}
          </select>
        </div>
        <AlertaErro erro={assinaturas.error} />
        <div className="overflow-x-auto bg-base-100 rounded-box shadow-sm">
          <table className="table">
            <thead>
              <tr>
                <th>{t`Assinante`}</th>
                <th>{t`Faixa`}</th>
                <th>{t`Situação`}</th>
                <th className="hidden md:table-cell">{t`Desde`}</th>
              </tr>
            </thead>
            <tbody>
              {assinaturas.data?.itens.length === 0 && (
                <tr>
                  <td colSpan={4} className="opacity-70">
                    {t`Nenhuma assinatura ainda.`}
                  </td>
                </tr>
              )}
              {assinaturas.data?.itens.map((a) => (
                <tr key={a.id}>
                  <td>
                    {a.assinante.nome}
                    <span className="block text-xs opacity-60">
                      {a.assinante.email}
                    </span>
                  </td>
                  <td className="whitespace-nowrap">
                    {a.plano.nome} ·{' '}
                    {formatarReais(a.valorCentavos, i18n.locale)}
                  </td>
                  <td>{rotuloStatus[a.status]}</td>
                  <td className="hidden md:table-cell">
                    {a.ativadaEm ? formatarDataAbrigo(a.ativadaEm) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Faixas />
    </div>
  );
}

function Faixas() {
  const { t, i18n } = useLingui();
  const planos = useQuery(planosClubeQuery(true));
  const salvar = useSalvarPlano();

  const enviar = (e: React.FormEvent<HTMLFormElement>, plano?: PlanoClube) => {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    salvar.mutate(
      {
        id: plano?.id,
        nome: String(form.get('nome')),
        valorCentavos: reaisParaCentavos(String(form.get('valor'))),
        ordem: Number(form.get('ordem') || 0),
        ativo: form.get('ativo') === 'on',
      },
      { onSuccess: () => !plano && formEl.reset() },
    );
  };

  const linha = (p?: PlanoClube) => (
    <form
      key={p?.id ?? 'nova'}
      onSubmit={(e) => enviar(e, p)}
      className="flex flex-wrap items-end gap-2 p-3"
    >
      <Campo label={t`Nome`}>
        <input
          name="nome"
          required
          defaultValue={p?.nome}
          className="input input-sm w-40"
        />
      </Campo>
      <Campo label={t`Valor mensal (R$)`}>
        <input
          name="valor"
          required
          inputMode="decimal"
          defaultValue={
            p ? (p.valorCentavos / 100).toFixed(2).replace('.', ',') : ''
          }
          className="input input-sm w-28"
        />
      </Campo>
      <Campo label={t`Ordem`}>
        <input
          name="ordem"
          type="number"
          defaultValue={p?.ordem ?? 0}
          className="input input-sm w-20"
        />
      </Campo>
      <label className="label cursor-pointer gap-2 pb-2">
        <input
          name="ativo"
          type="checkbox"
          defaultChecked={p?.ativo ?? true}
          className="toggle toggle-sm toggle-primary"
        />
        {t`Disponível`}
      </label>
      <button
        type="submit"
        className="btn btn-sm btn-primary mb-1"
        disabled={salvar.isPending}
      >
        {p ? t`Salvar` : t`Adicionar`}
      </button>
    </form>
  );

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">{t`Faixas`}</h2>
      <p className="text-sm opacity-70">
        {t`Mudar o valor de uma faixa vale só para novas assinaturas; quem já assina continua pagando o valor da adesão.`}
      </p>
      <AlertaErro erro={planos.error ?? salvar.error} />
      <div className="bg-base-100 rounded-box shadow-sm divide-y divide-base-200">
        {planos.data?.map((p) => linha(p))}
        {linha()}
      </div>
      {planos.data && (
        <p className="text-xs opacity-60">
          {planos.data
            .filter((p) => p.ativo)
            .map(
              (p) =>
                `${p.nome}: ${formatarReais(p.valorCentavos, i18n.locale)}`,
            )
            .join(' · ')}
        </p>
      )}
    </section>
  );
}
