import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useLingui } from '@lingui/react/macro';
import { CreditCard, Gift, ShieldCheck } from 'lucide-react';
import type {
  MinhaAssinatura,
  StatusAssinatura,
} from '@/integrations/api/types';
import { AlertaErro } from '@/components/app/alerta-erro';
import {
  formatarDataAbrigo,
  formatarReais,
} from '@/components/app/shared/formatos';
import {
  minhaAssinaturaQuery,
  planosClubeQuery,
  useAssinar,
  useCancelarAssinatura,
} from '@/integrations/api/clube.queries';

export const Route = createFileRoute('/$locale/app/_painel/clube')({
  component: ClubePage,
});

function ClubePage() {
  const { t } = useLingui();
  const minha = useQuery(minhaAssinaturaQuery);
  const [trocando, setTrocando] = useState(false);
  const a = minha.data;
  const mostrarFaixas =
    !a || a.status === 'cancelada' || (a.status === 'pendente' && trocando);

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Gift className="size-6 text-primary" />
          {t`Clube Amicats`}
        </h1>
        <p className="opacity-70">
          {t`Uma contribuição mensal no cartão que mantém o abrigo funcionando. Em breve, assinantes concorrem a sorteios mensais.`}
        </p>
      </div>

      <AlertaErro erro={minha.error} />
      {minha.isPending && <span className="loading loading-dots" />}

      {a &&
        a.status !== 'cancelada' &&
        !(a.status === 'pendente' && trocando) && (
          <StatusAssinaturaCard
            assinatura={a}
            aoTrocar={() => setTrocando(true)}
          />
        )}
      {a?.status === 'cancelada' && (
        <div role="status" className="alert alert-soft">
          {t`Sua assinatura foi cancelada. Quando quiser, é só escolher uma faixa de novo.`}
        </div>
      )}
      {minha.isSuccess && mostrarFaixas && <EscolherFaixa />}

      <p className="text-sm opacity-70 flex items-center gap-2">
        <ShieldCheck className="size-4" />
        {t`O pagamento é feito na página do Mercado Pago: a Amicats não vê nem guarda os dados do seu cartão.`}
      </p>
    </div>
  );
}

function EscolherFaixa() {
  const { t, i18n } = useLingui();
  const planos = useQuery(planosClubeQuery());
  const assinar = useAssinar();

  const escolher = (planoId: string) =>
    assinar.mutate(planoId, {
      onSuccess: ({ checkoutUrl }) => {
        window.location.href = checkoutUrl;
      },
    });

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">{t`Escolha sua faixa`}</h2>
      <AlertaErro erro={planos.error ?? assinar.error} />
      <div className="grid gap-4 sm:grid-cols-3">
        {planos.data?.map((p) => (
          <div key={p.id} className="card bg-base-100 shadow-sm">
            <div className="card-body items-center text-center">
              <h3 className="card-title">{p.nome}</h3>
              <p className="text-3xl font-bold text-primary">
                {formatarReais(p.valorCentavos, i18n.locale)}
                <span className="text-sm font-normal opacity-70">
                  /{t`mês`}
                </span>
              </p>
              {p.descricao && (
                <p className="text-sm opacity-70">{p.descricao}</p>
              )}
              <button
                type="button"
                className="btn btn-primary w-full mt-2"
                onClick={() => escolher(p.id)}
                disabled={assinar.isPending}
              >
                {assinar.isPending && assinar.variables === p.id && (
                  <span className="loading loading-spinner" />
                )}
                {t`Assinar`}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function StatusAssinaturaCard({
  assinatura: a,
  aoTrocar,
}: {
  assinatura: MinhaAssinatura;
  aoTrocar: () => void;
}) {
  const { t, i18n } = useLingui();
  const cancelar = useCancelarAssinatura();

  const rotuloStatus: Record<StatusAssinatura, string> = {
    pendente: t`Aguardando pagamento`,
    ativa: t`Ativa`,
    pausada: t`Pausada`,
    cancelada: t`Cancelada`,
  };
  const corStatus: Record<StatusAssinatura, string> = {
    pendente: 'badge-warning',
    ativa: 'badge-success',
    pausada: 'badge-ghost',
    cancelada: 'badge-ghost',
  };
  const rotuloCobranca = {
    aprovada: t`Aprovada`,
    recusada: t`Recusada`,
    pendente: t`Pendente`,
  };

  return (
    <section className="card bg-base-100 shadow-sm">
      <div className="card-body gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="card-title">
            {a.plano.nome} · {formatarReais(a.valorCentavos, i18n.locale)}/
            {t`mês`}
          </h2>
          <span className={`badge ${corStatus[a.status]}`}>
            {rotuloStatus[a.status]}
          </span>
        </div>

        {a.status === 'pendente' ? (
          <>
            <p className="text-sm">
              {t`Falta concluir o pagamento no Mercado Pago. Se você já concluiu, a confirmação pode levar alguns minutos.`}
            </p>
            <div className="card-actions">
              {a.checkoutUrl && (
                <a href={a.checkoutUrl} className="btn btn-primary">
                  <CreditCard className="size-4" />
                  {t`Concluir pagamento`}
                </a>
              )}
              <button
                type="button"
                className="btn btn-ghost"
                onClick={aoTrocar}
              >
                {t`Escolher outra faixa`}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm opacity-80">
              {a.ativadaEm &&
                `${t`Assinante desde`} ${formatarDataAbrigo(a.ativadaEm)}`}
              {a.proximaCobranca &&
                ` · ${t`Próxima cobrança em`} ${formatarDataAbrigo(a.proximaCobranca)}`}
            </p>
            {a.cobrancas.length > 0 && (
              <div className="overflow-x-auto">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>{t`Data`}</th>
                      <th>{t`Valor`}</th>
                      <th>{t`Situação`}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {a.cobrancas.map((c) => (
                      <tr key={c.id}>
                        <td>{formatarDataAbrigo(c.data)}</td>
                        <td>{formatarReais(c.valorCentavos, i18n.locale)}</td>
                        <td>{rotuloCobranca[c.status]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <AlertaErro erro={cancelar.error} />
            <div className="card-actions">
              <button
                type="button"
                className="btn btn-ghost btn-sm text-error"
                disabled={cancelar.isPending}
                onClick={() => {
                  if (
                    confirm(
                      t`Cancelar sua assinatura do Clube Amicats? As cobranças mensais param.`,
                    )
                  ) {
                    cancelar.mutate();
                  }
                }}
              >
                {t`Cancelar assinatura`}
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
