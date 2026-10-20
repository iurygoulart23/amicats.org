import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import { useLingui } from '@lingui/react/macro';
import { GatoForm } from '@/components/app/gato-form';
import { useCriarGato } from '@/integrations/api/gatos.queries';

export const Route = createFileRoute('/$locale/app/_painel/gatos/novo')({
  component: NovoGatoPage,
});

function NovoGatoPage() {
  const { t } = useLingui();
  const { locale } = Route.useParams();
  const navigate = useNavigate();
  const criar = useCriarGato();

  return (
    <div className="flex flex-col gap-4">
      <div className="breadcrumbs text-sm">
        <ul>
          <li>
            <Link to="/$locale/app/gatos" params={{ locale }}>
              {t`Gatos`}
            </Link>
          </li>
          <li>{t`Novo`}</li>
        </ul>
      </div>
      <h1 className="text-2xl font-bold">{t`Cadastrar gato`}</h1>
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <GatoForm
            salvando={criar.isPending}
            erro={criar.error}
            onSalvar={(dados) =>
              criar.mutate(dados, {
                onSuccess: (gato) =>
                  navigate({
                    to: '/$locale/app/gatos/$gatoId',
                    params: { locale, gatoId: gato.id },
                    search: { aba: 'fotos' },
                  }),
              })
            }
          />
        </div>
      </div>
    </div>
  );
}
