import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLingui } from '@lingui/react/macro';
import type { Gato } from '@/integrations/api/types';
import { AlertaErro } from '@/components/app/alerta-erro';
import { useRotulos } from '@/hooks/use-rotulos';
import { useDefinirTagsDoGato } from '@/integrations/api/gatos.queries';
import { tagsQuery } from '@/integrations/api/tags.queries';

export interface GatoTagsProps {
  gato: Gato;
}

/** 'atual' = condição que o gato tem hoje · 'ja-teve' = histórico · 'nao' = sem a tag */
type Marcacao = 'atual' | 'ja-teve' | 'nao';

export function GatoTags({ gato }: GatoTagsProps) {
  const { t } = useLingui();
  const rotulos = useRotulos();
  const tags = useQuery(tagsQuery);
  const salvar = useDefinirTagsDoGato(gato.id);
  const [marcacoes, setMarcacoes] = useState<Record<string, Marcacao>>(() =>
    Object.fromEntries(
      gato.tags.map((tag) => [tag.id, tag.ativa ? 'atual' : 'ja-teve']),
    ),
  );

  const opcoes: Record<Marcacao, string> = {
    nao: t`Não`,
    atual: t`Tem hoje`,
    'ja-teve': t`Já teve`,
  };

  const enviar = () => {
    salvar.mutate(
      Object.entries(marcacoes)
        .filter(([, m]) => m !== 'nao')
        .map(([tagId, m]) => ({ tagId, ativa: m === 'atual' })),
    );
  };

  if (tags.isPending) return <span className="loading loading-dots" />;
  if (tags.isError) return <AlertaErro erro={tags.error} />;
  if (!tags.data.length) {
    return (
      <p className="opacity-70">{t`Nenhuma tag cadastrada. A administração cadastra as tags no menu Tags.`}</p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <AlertaErro erro={salvar.error} />
      {salvar.isSuccess && (
        <div role="status" className="alert alert-success alert-soft">
          {t`Tags salvas.`}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>{t`Tag`}</th>
              <th>{t`Tipo`}</th>
              <th>{t`Situação`}</th>
            </tr>
          </thead>
          <tbody>
            {tags.data.map((tag) => (
              <tr key={tag.id}>
                <td className="font-medium">{tag.nome}</td>
                <td>{rotulos.tipoTag[tag.tipo]}</td>
                <td>
                  <div className="join" role="radiogroup" aria-label={tag.nome}>
                    {(Object.keys(opcoes) as Array<Marcacao>).map((m) => (
                      <input
                        key={m}
                        type="radio"
                        name={`tag-${tag.id}`}
                        aria-label={opcoes[m]}
                        className="join-item btn btn-sm"
                        checked={(marcacoes[tag.id] ?? 'nao') === m}
                        onChange={() =>
                          setMarcacoes((atual) => ({ ...atual, [tag.id]: m }))
                        }
                      />
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          className="btn btn-primary"
          onClick={enviar}
          disabled={salvar.isPending}
        >
          {t`Salvar tags`}
        </button>
      </div>
    </div>
  );
}
