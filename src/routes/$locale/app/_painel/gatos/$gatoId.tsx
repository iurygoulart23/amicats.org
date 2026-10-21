import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useLingui } from '@lingui/react/macro';
import { ExternalLink } from 'lucide-react';
import { z } from 'zod';
import { AlertaErro } from '@/components/app/alerta-erro';
import { GatoForm } from '@/components/app/gato-form';
import { GatoFotos } from '@/components/app/gato-fotos';
import { GatoGastos } from '@/components/app/gato-gastos';
import { GatoMedicacao } from '@/components/app/gato-medicacao';
import { GatoVeterinario } from '@/components/app/gato-veterinario';
import { GatoSaude } from '@/components/app/gato-saude';
import { GatoTags } from '@/components/app/gato-tags';
import { podeAcessar } from '@/integrations/api/cargos';
import {
  gatoQuery,
  useEditarGato,
  useExcluirGato,
} from '@/integrations/api/gatos.queries';

const ABAS = [
  'dados',
  'fotos',
  'tags',
  'saude',
  'medicacao',
  'veterinario',
  'gastos',
] as const;
type Aba = (typeof ABAS)[number];

export const Route = createFileRoute('/$locale/app/_painel/gatos/$gatoId')({
  validateSearch: z.object({ aba: z.enum(ABAS).optional().catch(undefined) }),
  component: GatoPage,
});

function GatoPage() {
  const { t } = useLingui();
  const { locale, gatoId } = Route.useParams();
  const aba = Route.useSearch().aba ?? 'dados';
  const { me } = Route.useRouteContext();
  const navigate = useNavigate({ from: Route.fullPath });
  const gato = useQuery(gatoQuery(gatoId));
  const editar = useEditarGato(gatoId);
  const excluir = useExcluirGato();

  const rotuloAba: Record<Aba, string> = {
    dados: t`Dados`,
    fotos: t`Fotos`,
    tags: t`Tags`,
    saude: t`Saúde`,
    medicacao: t`Medicação`,
    veterinario: t`Veterinário`,
    gastos: t`Gastos`,
  };

  if (gato.isPending) return <span className="loading loading-dots" />;
  if (gato.isError) return <AlertaErro erro={gato.error} />;

  const excluirGato = () => {
    if (
      !confirm(
        t`Excluir este gato e todo o histórico dele? Essa ação não pode ser desfeita.`,
      )
    )
      return;
    excluir.mutate(gatoId, {
      onSuccess: () =>
        navigate({ to: '/$locale/app/gatos', params: { locale } }),
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="breadcrumbs text-sm">
        <ul>
          <li>
            <Link to="/$locale/app/gatos" params={{ locale }}>
              {t`Gatos`}
            </Link>
          </li>
          <li>{gato.data.nome}</li>
        </ul>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{gato.data.nome}</h1>
        <div className="flex gap-2">
          {gato.data.publicado && (
            <Link
              to="/$locale"
              params={{ locale }}
              hash="adote"
              className="btn btn-ghost btn-sm"
              target="_blank"
            >
              <ExternalLink className="size-4" />
              {t`Ver no site`}
            </Link>
          )}
          {podeAcessar(me.cargo, 'adm') && (
            <button
              type="button"
              className="btn btn-error btn-outline btn-sm"
              onClick={excluirGato}
            >
              {t`Excluir`}
            </button>
          )}
        </div>
      </div>
      <AlertaErro erro={excluir.error} />

      <div
        role="tablist"
        className="tabs tabs-border flex-nowrap overflow-x-auto"
      >
        {ABAS.map((a) => (
          <Link
            key={a}
            role="tab"
            to="."
            search={{ aba: a }}
            replace
            className={a === aba ? 'tab tab-active' : 'tab'}
            aria-selected={a === aba}
          >
            {rotuloAba[a]}
          </Link>
        ))}
      </div>

      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          {aba === 'dados' && (
            <>
              {editar.isSuccess && (
                <div role="status" className="alert alert-success alert-soft">
                  {t`Dados salvos.`}
                </div>
              )}
              <GatoForm
                key={gato.data.atualizadoEm}
                gato={gato.data}
                salvando={editar.isPending}
                erro={editar.error}
                onSalvar={(dados) => editar.mutate(dados)}
              />
            </>
          )}
          {aba === 'fotos' && <GatoFotos gato={gato.data} />}
          {aba === 'tags' && (
            <GatoTags key={gato.data.atualizadoEm} gato={gato.data} />
          )}
          {aba === 'saude' && <GatoSaude gatoId={gatoId} />}
          {aba === 'medicacao' && <GatoMedicacao gatoId={gatoId} />}
          {aba === 'veterinario' && <GatoVeterinario gatoId={gatoId} />}
          {aba === 'gastos' && <GatoGastos gatoId={gatoId} me={me} />}
        </div>
      </div>
    </div>
  );
}
