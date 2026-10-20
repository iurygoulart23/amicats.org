import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useLingui } from '@lingui/react/macro';
import { Trash2 } from 'lucide-react';
import type { TipoTag } from '@/integrations/api/types';
import { AlertaErro } from '@/components/app/alerta-erro';
import { Campo } from '@/components/app/campo';
import { useRotulos } from '@/hooks/use-rotulos';
import {
  tagsQuery,
  useExcluirTag,
  useSalvarTag,
} from '@/integrations/api/tags.queries';

export const Route = createFileRoute('/$locale/app/_painel/admin/tags')({
  component: TagsPage,
});

function TagsPage() {
  const { t } = useLingui();
  const rotulos = useRotulos();
  const tags = useQuery(tagsQuery);
  const salvar = useSalvarTag();
  const excluir = useExcluirTag();

  const criar = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    salvar.mutate(
      { nome: String(form.get('nome')), tipo: form.get('tipo') as TipoTag },
      { onSuccess: () => formEl.reset() },
    );
  };

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <h1 className="text-2xl font-bold">{t`Tags`}</h1>
      <p className="opacity-70">
        {t`As tags marcam doenças, comportamentos e cuidados dos gatos e servem de filtro na lista.`}
      </p>

      <form onSubmit={criar} className="card bg-base-100 shadow-sm">
        <div className="card-body flex-row flex-wrap items-end gap-2">
          <Campo label={t`Nova tag`}>
            <input name="nome" required maxLength={60} className="input" />
          </Campo>
          <Campo label={t`Tipo`}>
            <select name="tipo" defaultValue="doenca" className="select">
              {Object.entries(rotulos.tipoTag).map(([valor, label]) => (
                <option key={valor} value={valor}>
                  {label}
                </option>
              ))}
            </select>
          </Campo>
          <button
            type="submit"
            className="btn btn-primary mb-1"
            disabled={salvar.isPending}
          >
            {t`Adicionar`}
          </button>
        </div>
      </form>
      <AlertaErro erro={salvar.error ?? excluir.error ?? tags.error} />

      <ul className="bg-base-100 rounded-box shadow-sm divide-y divide-base-200">
        {tags.data?.map((tag) => (
          <li key={tag.id} className="flex items-center justify-between p-3">
            <span>
              <span className="font-medium">{tag.nome}</span>{' '}
              <span className="badge badge-ghost badge-sm">
                {rotulos.tipoTag[tag.tipo]}
              </span>
            </span>
            <button
              type="button"
              className="btn btn-ghost btn-xs text-error"
              aria-label={t`Excluir tag`}
              onClick={() => {
                if (confirm(t`Excluir a tag? Ela sai de todos os gatos.`))
                  excluir.mutate(tag.id);
              }}
            >
              <Trash2 className="size-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
