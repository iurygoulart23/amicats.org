import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLingui } from '@lingui/react/macro';
import { Pencil, Trash2 } from 'lucide-react';
import type { RegistroSaude } from '@/integrations/api/types';
import { AlertaErro } from '@/components/app/alerta-erro';
import { Campo } from '@/components/app/campo';
import {
  saudeQuery,
  useExcluirRegistroSaude,
  useSalvarRegistroSaude,
} from '@/integrations/api/gatos.queries';
import { tagsQuery } from '@/integrations/api/tags.queries';

export interface GatoSaudeProps {
  gatoId: string;
}

export function formatarData(iso: string) {
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

export function GatoSaude({ gatoId }: GatoSaudeProps) {
  const { t } = useLingui();
  const registros = useQuery(saudeQuery(gatoId));
  const tags = useQuery(tagsQuery);
  const salvar = useSalvarRegistroSaude(gatoId);
  const excluir = useExcluirRegistroSaude(gatoId);
  const [editando, setEditando] = useState<RegistroSaude | null>(null);
  const doencas = (tags.data ?? []).filter((tag) => tag.tipo === 'doenca');

  const enviar = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    salvar.mutate(
      {
        id: editando?.id,
        titulo: String(form.get('titulo')),
        tagId: String(form.get('tagId') || '') || null,
        dataInicio: String(form.get('dataInicio')),
        dataFim: String(form.get('dataFim') || '') || null,
        observacao: String(form.get('observacao') ?? ''),
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
        aria-label={t`Linha do tempo de saúde`}
        className="flex flex-col gap-3"
      >
        <AlertaErro erro={registros.error ?? excluir.error} />
        {registros.isPending && <span className="loading loading-dots" />}
        {registros.data?.length === 0 && (
          <p className="opacity-70">{t`Nenhum registro de saúde.`}</p>
        )}
        {registros.data?.map((r) => (
          <article key={r.id} className="card bg-base-100 shadow-sm">
            <div className="card-body p-4 gap-1">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold">
                  {r.titulo}{' '}
                  {r.emCurso ? (
                    <span className="badge badge-warning badge-sm">{t`Em curso`}</span>
                  ) : (
                    <span className="badge badge-success badge-soft badge-sm">{t`Encerrado`}</span>
                  )}
                </h3>
                <div className="flex">
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    aria-label={t`Editar registro`}
                    onClick={() => setEditando(r)}
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs text-error"
                    aria-label={t`Excluir registro`}
                    onClick={() => {
                      if (confirm(t`Excluir este registro?`))
                        excluir.mutate(r.id);
                    }}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
              <p className="text-sm opacity-70">
                {formatarData(r.dataInicio)}
                {r.dataFim ? ` → ${formatarData(r.dataFim)}` : ''}
                {r.tag && ` · ${r.tag.nome}`}
                {r.registradoPor && ` · ${r.registradoPor.nome}`}
              </p>
              {r.observacao && (
                <p className="text-sm whitespace-pre-line">{r.observacao}</p>
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
            {editando ? t`Editar registro` : t`Novo registro`}
          </h3>
          <AlertaErro erro={salvar.error} />
          <Campo label={t`Doença ou condição`}>
            <input
              name="titulo"
              required
              defaultValue={editando?.titulo}
              className="input w-full"
            />
          </Campo>
          <Campo label={t`Tag (opcional)`}>
            <select
              name="tagId"
              defaultValue={editando?.tag?.id ?? ''}
              className="select w-full"
            >
              <option value="">—</option>
              {doencas.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.nome}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label={t`Início`}>
            <input
              name="dataInicio"
              type="date"
              required
              defaultValue={editando?.dataInicio}
              className="input w-full"
            />
          </Campo>
          <Campo label={t`Fim`} dica={t`Deixe vazio se ainda está em curso.`}>
            <input
              name="dataFim"
              type="date"
              defaultValue={editando?.dataFim ?? ''}
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
