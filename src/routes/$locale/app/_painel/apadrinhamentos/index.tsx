import { Link, createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useLingui } from '@lingui/react/macro';
import { Cat } from 'lucide-react';
import { AlertaErro } from '@/components/app/alerta-erro';
import { formatarData } from '@/components/app/gato-saude';
import { formatarReais } from '@/components/app/shared/formatos';
import { meusApadrinhamentosQuery } from '@/integrations/api/apadrinhamentos.queries';

export const Route = createFileRoute('/$locale/app/_painel/apadrinhamentos/')({
  component: MeusApadrinhamentosPage,
});

function MeusApadrinhamentosPage() {
  const { t, i18n } = useLingui();
  const { locale } = Route.useParams();
  const lista = useQuery(meusApadrinhamentosQuery);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">{t`Meus apadrinhamentos`}</h1>
      <AlertaErro erro={lista.error} />
      {lista.isPending && <span className="loading loading-dots" />}

      {lista.data?.length === 0 && (
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body items-center text-center">
            <Cat className="size-10 text-primary" />
            <p>{t`Você ainda não apadrinha nenhum gatinho.`}</p>
            <Link
              to="/$locale"
              params={{ locale }}
              hash="adote"
              className="btn btn-primary"
            >
              {t`Conheça os gatinhos`}
            </Link>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {lista.data?.map((ap) => (
          <Link
            key={ap.id}
            to="/$locale/app/apadrinhamentos/$apadrinhamentoId"
            params={{ locale, apadrinhamentoId: ap.id }}
            search={{ mes: ap.mesesEmAberto[0] }}
            className={
              ap.ativo
                ? 'card bg-base-100 shadow-sm hover:shadow-md transition-all duration-300'
                : 'card bg-base-100 shadow-sm opacity-60'
            }
          >
            {ap.gato.fotoUrl && (
              <figure className="h-40">
                <img
                  src={ap.gato.fotoUrl}
                  alt={ap.gato.nome}
                  className="w-full h-full object-cover"
                />
              </figure>
            )}
            <div className="card-body p-4">
              <h2 className="card-title text-base">
                {ap.gato.nome}
                {ap.ativo ? (
                  <span className="badge badge-primary badge-sm">{t`Ativo`}</span>
                ) : (
                  <span className="badge badge-ghost badge-sm">{t`Encerrado`}</span>
                )}
              </h2>
              <p className="text-sm opacity-70">
                {t`Desde`} {formatarData(ap.inicio)}
                {ap.fim && ` → ${formatarData(ap.fim)}`}
              </p>
              {ap.faltaPagarCentavos > 0 && (
                <p className="text-sm font-medium text-warning">
                  {t`Falta pagar:`}{' '}
                  {formatarReais(ap.faltaPagarCentavos, i18n.locale)}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
