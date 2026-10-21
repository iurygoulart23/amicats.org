import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLingui } from '@lingui/react/macro';
import { Pencil, Trash2 } from 'lucide-react';
import type { EventoVet, TipoEventoVet } from '@/integrations/api/types';
import { AlertaErro } from '@/components/app/alerta-erro';
import { Campo } from '@/components/app/campo';
import { formatarData } from '@/components/app/gato-saude';
import { hojeNoAbrigo } from '@/components/app/shared/formatos';
import { useRotulos } from '@/hooks/use-rotulos';
import {
  eventosVetQuery,
  useExcluirEventoVet,
  useSalvarEventoVet,
} from '@/integrations/api/medicacao.queries';

export interface GatoVeterinarioProps {
  gatoId: string;
}

export function GatoVeterinario({ gatoId }: GatoVeterinarioProps) {
  const { t } = useLingui();
  const rotulos = useRotulos();
  const eventos = useQuery(eventosVetQuery(gatoId));
  const salvar = useSalvarEventoVet(gatoId);
  const excluir = useExcluirEventoVet(gatoId);
  const [editando, setEditando] = useState<EventoVet | null>(null);

  const enviar = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    salvar.mutate(
      {
        id: editando?.id,
        tipo: form.get('tipo') as TipoEventoVet,
        titulo: String(form.get('titulo')),
        data: String(form.get('data')),
        local: String(form.get('local') || '') || null,
        observacao: String(form.get('observacao') ?? ''),
        proximaData: String(form.get('proximaData') || '') || null,
      },
      {
        onSuccess: () => {
          setEditando(null);
          formEl.reset();
        },
      },
    );
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <section
        aria-label={t`Histórico veterinário`}
        className="flex flex-col gap-3"
      >
        <AlertaErro erro={eventos.error ?? excluir.error} />
        {eventos.isPending && <span className="loading loading-dots" />}
        {eventos.data?.length === 0 && (
          <p className="opacity-70">{t`Nenhum evento veterinário.`}</p>
        )}
        {eventos.data?.map((ev) => (
          <article key={ev.id} className="card bg-base-100 shadow-sm">
            <div className="card-body p-4 gap-1">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold">
                  <span className="badge badge-outline badge-sm mr-2">
                    {rotulos.tipoEventoVet[ev.tipo]}
                  </span>
                  {ev.titulo}
                </h3>
                <div className="flex">
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    aria-label={t`Editar evento`}
                    onClick={() => setEditando(ev)}
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs text-error"
                    aria-label={t`Excluir evento`}
                    onClick={() => {
                      if (confirm(t`Excluir este evento?`))
                        excluir.mutate(ev.id);
                    }}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
              <p className="text-sm opacity-70">
                {formatarData(ev.data)}
                {ev.local && ` · ${ev.local}`}
                {ev.registradoPor && ` · ${ev.registradoPor.nome}`}
              </p>
              {ev.proximaData && (
                <p className="text-sm">
                  {t`Retorno`}: <strong>{formatarData(ev.proximaData)}</strong>
                </p>
              )}
              {ev.observacao && (
                <p className="text-sm whitespace-pre-line">{ev.observacao}</p>
              )}
            </div>
          </article>
        ))}
      </section>

      <form
        key={editando?.id ?? 'novo'}
        onSubmit={enviar}
        className="card bg-base-100 shadow-sm h-fit"
      >
        <div className="card-body p-4 gap-1">
          <h3 className="card-title text-base">
            {editando ? t`Editar evento` : t`Novo evento`}
          </h3>
          <AlertaErro erro={salvar.error} />
          <Campo label={t`Tipo`}>
            <select
              name="tipo"
              defaultValue={editando?.tipo ?? 'consulta'}
              className="select w-full"
            >
              {Object.entries(rotulos.tipoEventoVet).map(([valor, label]) => (
                <option key={valor} value={valor}>
                  {label}
                </option>
              ))}
            </select>
          </Campo>
          <Campo
            label={t`Título`}
            dica={t`Ex.: V4 — 2ª dose, Hemograma, Revisão pós-cirurgia`}
          >
            <input
              name="titulo"
              required
              maxLength={120}
              defaultValue={editando?.titulo}
              className="input w-full"
            />
          </Campo>
          <Campo label={t`Data`}>
            <input
              name="data"
              type="date"
              required
              defaultValue={editando?.data ?? hojeNoAbrigo()}
              className="input w-full"
            />
          </Campo>
          <Campo label={t`Clínica ou veterinário(a)`}>
            <input
              name="local"
              maxLength={120}
              defaultValue={editando?.local ?? ''}
              className="input w-full"
            />
          </Campo>
          <Campo
            label={t`Retorno (opcional)`}
            dica={t`Reforço de vacina, revisão ou novo exame.`}
          >
            <input
              name="proximaData"
              type="date"
              defaultValue={editando?.proximaData ?? ''}
              className="input w-full"
            />
          </Campo>
          <Campo label={t`Observação`}>
            <textarea
              name="observacao"
              rows={3}
              defaultValue={editando?.observacao}
              className="textarea w-full"
            />
          </Campo>
          <div className="card-actions justify-end mt-2">
            {editando && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setEditando(null)}
              >
                {t`Cancelar`}
              </button>
            )}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={salvar.isPending}
            >
              {t`Salvar`}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
