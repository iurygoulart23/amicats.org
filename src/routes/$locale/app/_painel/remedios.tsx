import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useLingui } from '@lingui/react/macro';
import { Check, SkipForward, Undo2 } from 'lucide-react';
import { z } from 'zod';
import type { DosePrevista } from '@/integrations/api/types';
import { AlertaErro } from '@/components/app/alerta-erro';
import { Campo } from '@/components/app/campo';
import { formatarData } from '@/components/app/gato-saude';
import {
  formatarHoraAbrigo,
  hojeNoAbrigo,
} from '@/components/app/shared/formatos';
import { useRotulos } from '@/hooks/use-rotulos';
import { podeAcessar } from '@/integrations/api/cargos';
import { exigirCargo } from '@/integrations/api/guards';
import {
  agendaQuery,
  retornosQuery,
  useDesfazerDose,
  useRegistrarDose,
} from '@/integrations/api/medicacao.queries';

export const Route = createFileRoute('/$locale/app/_painel/remedios')({
  validateSearch: z.object({
    dia: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .catch(undefined),
  }),
  beforeLoad: ({ context, params }) =>
    exigirCargo(context.me, 'voluntario', params.locale),
  component: RemediosPage,
});

function RemediosPage() {
  const { t } = useLingui();
  const rotulos = useRotulos();
  const { locale } = Route.useParams();
  const { me } = Route.useRouteContext();
  const dia = Route.useSearch().dia ?? hojeNoAbrigo();
  const navigate = useNavigate({ from: Route.fullPath });
  const agenda = useQuery({
    ...agendaQuery(dia),
    placeholderData: keepPreviousData,
  });
  const retornos = useQuery(retornosQuery(30));
  const registrar = useRegistrarDose();
  const desfazer = useDesfazerDose();
  const ehHoje = dia === hojeNoAbrigo();

  const doses = agenda.data ?? [];
  const pendentes = doses.filter((d) => !d.aplicacao).length;

  const dar = (d: DosePrevista) =>
    registrar.mutate({
      prescricaoId: d.prescricaoId,
      horarioPrevisto: d.horarioPrevisto,
    });

  const pular = (d: DosePrevista) => {
    const motivo = prompt(
      t`Por que a dose foi pulada? (ex.: recusou, vomitou, sem estoque)`,
    );
    if (!motivo?.trim()) return;
    registrar.mutate({
      prescricaoId: d.prescricaoId,
      horarioPrevisto: d.horarioPrevisto,
      pulada: true,
      observacao: motivo.trim(),
    });
  };

  const atrasada = (d: DosePrevista) =>
    !d.aplicacao && new Date(d.horarioPrevisto).getTime() < Date.now();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">{t`Remédios do dia`}</h1>
          <p className="opacity-70">
            {doses.length === 0
              ? t`Nenhuma dose prevista.`
              : pendentes === 0
                ? t`Todas as doses registradas.`
                : `${pendentes} ${t`dose(s) pendente(s)`}`}
          </p>
        </div>
        <Campo label={t`Dia`}>
          <input
            type="date"
            value={dia}
            onChange={(e) =>
              e.target.value &&
              void navigate({ search: { dia: e.target.value }, replace: true })
            }
            className="input w-44"
          />
        </Campo>
      </div>

      <AlertaErro erro={agenda.error ?? registrar.error ?? desfazer.error} />

      <ul className="flex flex-col gap-2">
        {doses.map((d) => (
          <li
            key={`${d.prescricaoId}-${d.horarioPrevisto}`}
            className={
              d.aplicacao
                ? 'card card-side bg-base-100 shadow-sm opacity-70'
                : atrasada(d) && ehHoje
                  ? 'card card-side bg-base-100 shadow-sm border-l-4 border-warning'
                  : 'card card-side bg-base-100 shadow-sm'
            }
          >
            <div className="flex items-center px-4 text-xl font-bold tabular-nums">
              {formatarHoraAbrigo(d.horarioPrevisto)}
            </div>
            <div className="card-body p-3 gap-0">
              <p>
                <Link
                  to="/$locale/app/gatos/$gatoId"
                  params={{ locale, gatoId: d.gato.id }}
                  search={{ aba: 'medicacao' }}
                  className="font-semibold link link-hover"
                >
                  {d.gato.nome}
                </Link>{' '}
                · {d.medicamento}
              </p>
              <p className="text-sm opacity-80">
                {d.dose} · {rotulos.via[d.via]}
              </p>
              {d.observacao && (
                <p className="text-xs opacity-70">{d.observacao}</p>
              )}
              {d.aplicacao && (
                <p className="text-sm">
                  {d.aplicacao.pulada ? (
                    <span className="badge badge-warning badge-sm mr-1">{t`Pulada`}</span>
                  ) : (
                    <span className="badge badge-success badge-sm mr-1">{t`Dada`}</span>
                  )}
                  {d.aplicacao.aplicadaPor?.nome} ·{' '}
                  {formatarHoraAbrigo(d.aplicacao.aplicadaEm)}
                  {d.aplicacao.pulada && ` · ${d.aplicacao.observacao}`}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1 pr-3">
              {d.aplicacao ? (
                (d.aplicacao.aplicadaPor?.id === me.id ||
                  podeAcessar(me.cargo, 'adm')) && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => desfazer.mutate(d.aplicacao!.id)}
                    aria-label={t`Desfazer registro`}
                    title={t`Desfazer registro`}
                  >
                    <Undo2 className="size-4" />
                  </button>
                )
              ) : (
                <>
                  <button
                    type="button"
                    className="btn btn-success btn-sm"
                    onClick={() => dar(d)}
                    disabled={registrar.isPending}
                  >
                    <Check className="size-4" />
                    {t`Dei`}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => pular(d)}
                    disabled={registrar.isPending}
                    aria-label={t`Pular dose`}
                    title={t`Pular dose`}
                  >
                    <SkipForward className="size-4" />
                  </button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">{t`Retornos e vacinas`}</h2>
        <AlertaErro erro={retornos.error} />
        {retornos.data?.length === 0 && (
          <p className="opacity-70">{t`Nenhum retorno nos próximos 30 dias.`}</p>
        )}
        <ul className="bg-base-100 rounded-box shadow-sm divide-y divide-base-200">
          {retornos.data?.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-2 p-3"
            >
              <span>
                <Link
                  to="/$locale/app/gatos/$gatoId"
                  params={{ locale, gatoId: r.gato.id }}
                  search={{ aba: 'veterinario' }}
                  className="font-semibold link link-hover"
                >
                  {r.gato.nome}
                </Link>{' '}
                · {rotulos.tipoEventoVet[r.tipo]}: {r.titulo}
              </span>
              <span
                className={
                  r.atrasado ? 'badge badge-error' : 'badge badge-ghost'
                }
              >
                {r.atrasado && `${t`Atrasado`} · `}
                {formatarData(r.proximaData!)}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
