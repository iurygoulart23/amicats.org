import { useQuery } from '@tanstack/react-query';
import { useLingui } from '@lingui/react/macro';
import type { Prescricao, Via } from '@/integrations/api/types';
import { AlertaErro } from '@/components/app/alerta-erro';
import { Campo } from '@/components/app/campo';
import {
  datetimeLocalParaIso,
  formatarDataHoraAbrigo,
  hojeNoAbrigo,
} from '@/components/app/shared/formatos';
import { useRotulos } from '@/hooks/use-rotulos';
import {
  prescricoesQuery,
  useEncerrarPrescricao,
  usePrescrever,
} from '@/integrations/api/medicacao.queries';

export interface GatoMedicacaoProps {
  gatoId: string;
}

const INTERVALOS = [4, 6, 8, 12, 24, 48, 72, 168];

function emUso(p: Prescricao, agora = Date.now()) {
  return !p.encerradaEm && (!p.fim || new Date(p.fim).getTime() >= agora);
}

export function GatoMedicacao({ gatoId }: GatoMedicacaoProps) {
  const { t } = useLingui();
  const rotulos = useRotulos();
  const prescricoes = useQuery(prescricoesQuery(gatoId));
  const prescrever = usePrescrever(gatoId);
  const encerrar = useEncerrarPrescricao(gatoId);

  const rotuloIntervalo = (h: number) =>
    h === 24
      ? t`1 vez ao dia`
      : h % 24 === 0
        ? `${t`A cada`} ${h / 24} ${t`dias`}`
        : `${t`A cada`} ${h}h`;

  const enviar = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const fim = String(form.get('fim') || '');
    prescrever.mutate(
      {
        medicamento: String(form.get('medicamento')),
        dose: String(form.get('dose')),
        via: form.get('via') as Via,
        intervaloHoras: Number(form.get('intervaloHoras')),
        inicio: datetimeLocalParaIso(String(form.get('inicio'))),
        fim: fim ? datetimeLocalParaIso(fim) : null,
        prescritoPor: String(form.get('prescritoPor') || '') || null,
        observacao: String(form.get('observacao') ?? ''),
      },
      { onSuccess: () => formEl.reset() },
    );
  };

  const lista = prescricoes.data ?? [];
  const ativas = lista.filter((p) => emUso(p));
  const anteriores = lista.filter((p) => !emUso(p));

  const cartao = (p: Prescricao) => (
    <article key={p.id} className="card bg-base-100 shadow-sm">
      <div className="card-body p-4 gap-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold">
            {p.medicamento}{' '}
            <span className="font-normal opacity-70">· {p.dose}</span>
          </h3>
          {emUso(p) && (
            <button
              type="button"
              className="btn btn-ghost btn-xs text-error"
              onClick={() => {
                if (confirm(t`Interromper esta prescrição agora?`))
                  encerrar.mutate(p.id);
              }}
            >
              {t`Interromper`}
            </button>
          )}
        </div>
        <p className="text-sm opacity-80">
          {rotulos.via[p.via]} · {rotuloIntervalo(p.intervaloHoras)}
        </p>
        <p className="text-sm opacity-70">
          {formatarDataHoraAbrigo(p.inicio)} →{' '}
          {p.encerradaEm
            ? `${formatarDataHoraAbrigo(p.encerradaEm)} (${t`interrompida`})`
            : p.fim
              ? formatarDataHoraAbrigo(p.fim)
              : t`uso contínuo`}
        </p>
        {p.prescritoPor && (
          <p className="text-sm opacity-70">{p.prescritoPor}</p>
        )}
        {p.observacao && (
          <p className="text-sm whitespace-pre-line">{p.observacao}</p>
        )}
      </div>
    </article>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <section className="flex flex-col gap-3">
        <AlertaErro erro={prescricoes.error ?? encerrar.error} />
        {prescricoes.isPending && <span className="loading loading-dots" />}
        <h3 className="font-semibold">{t`Em uso`}</h3>
        {prescricoes.isSuccess && ativas.length === 0 && (
          <p className="opacity-70">{t`Nenhum medicamento em uso.`}</p>
        )}
        {ativas.map(cartao)}
        {anteriores.length > 0 && (
          <details className="collapse collapse-arrow bg-base-200">
            <summary className="collapse-title font-semibold">
              {t`Anteriores`} ({anteriores.length})
            </summary>
            <div className="collapse-content flex flex-col gap-3">
              {anteriores.map(cartao)}
            </div>
          </details>
        )}
      </section>

      <form onSubmit={enviar} className="card bg-base-100 shadow-sm h-fit">
        <div className="card-body p-4 gap-1">
          <h3 className="card-title text-base">{t`Nova prescrição`}</h3>
          <AlertaErro erro={prescrever.error} />
          <Campo label={t`Medicamento`}>
            <input
              name="medicamento"
              required
              maxLength={120}
              className="input w-full"
            />
          </Campo>
          <Campo label={t`Dose`} dica={t`Ex.: 1/2 comprimido, 0,5 ml, 1 gota`}>
            <input
              name="dose"
              required
              maxLength={80}
              className="input w-full"
            />
          </Campo>
          <Campo label={t`Via`}>
            <select name="via" defaultValue="oral" className="select w-full">
              {Object.entries(rotulos.via).map(([valor, label]) => (
                <option key={valor} value={valor}>
                  {label}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label={t`Frequência`}>
            <select
              name="intervaloHoras"
              defaultValue="12"
              className="select w-full"
            >
              {INTERVALOS.map((h) => (
                <option key={h} value={h}>
                  {rotuloIntervalo(h)}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label={t`Primeira dose`}>
            <input
              name="inicio"
              type="datetime-local"
              required
              defaultValue={`${hojeNoAbrigo()}T08:00`}
              className="input w-full"
            />
          </Campo>
          <Campo
            label={t`Última dose`}
            dica={t`Deixe vazio para uso contínuo.`}
          >
            <input name="fim" type="datetime-local" className="input w-full" />
          </Campo>
          <Campo label={t`Prescrito por (opcional)`}>
            <input
              name="prescritoPor"
              maxLength={120}
              className="input w-full"
            />
          </Campo>
          <Campo label={t`Observação`}>
            <textarea name="observacao" rows={2} className="textarea w-full" />
          </Campo>
          <div className="card-actions justify-end mt-2">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={prescrever.isPending}
            >
              {t`Prescrever`}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
