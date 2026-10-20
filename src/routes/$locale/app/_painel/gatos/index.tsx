import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useLingui } from '@lingui/react/macro';
import { Plus } from 'lucide-react';
import { z } from 'zod';
import type { StatusGato } from '@/integrations/api/types';
import { AlertaErro } from '@/components/app/alerta-erro';
import { useRotulos } from '@/hooks/use-rotulos';
import { gatosQuery } from '@/integrations/api/gatos.queries';
import { tagsQuery } from '@/integrations/api/tags.queries';

const STATUS = [
  'disponivel',
  'apadrinhado',
  'adotado',
  'em_tratamento',
  'falecido',
] as const;

export const Route = createFileRoute('/$locale/app/_painel/gatos/')({
  validateSearch: z.object({
    busca: z.string().optional(),
    status: z.enum(STATUS).optional(),
    tag: z.string().optional(),
  }),
  component: GatosPage,
});

function GatosPage() {
  const { t } = useLingui();
  const rotulos = useRotulos();
  const { locale } = Route.useParams();
  const filtros = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const gatos = useQuery({
    ...gatosQuery(filtros),
    placeholderData: keepPreviousData,
  });
  const tags = useQuery(tagsQuery);

  const filtrar = (novo: Partial<typeof filtros>) =>
    navigate({ search: (atual) => ({ ...atual, ...novo }), replace: true });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{t`Gatos do abrigo`}</h1>
        <Link
          to="/$locale/app/gatos/novo"
          params={{ locale }}
          className="btn btn-primary"
        >
          <Plus className="size-4" />
          {t`Cadastrar gato`}
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          type="search"
          placeholder={t`Buscar por nome`}
          aria-label={t`Buscar por nome`}
          defaultValue={filtros.busca}
          onChange={(e) => void filtrar({ busca: e.target.value || undefined })}
          className="input w-full sm:w-64"
        />
        <select
          aria-label={t`Status`}
          value={filtros.status ?? ''}
          onChange={(e) =>
            void filtrar({
              status: (e.target.value || undefined) as StatusGato | undefined,
            })
          }
          className="select w-full sm:w-48"
        >
          <option value="">{t`Todos os status`}</option>
          {STATUS.map((s) => (
            <option key={s} value={s}>
              {rotulos.status[s]}
            </option>
          ))}
        </select>
        <select
          aria-label={t`Tag`}
          value={filtros.tag ?? ''}
          onChange={(e) => void filtrar({ tag: e.target.value || undefined })}
          className="select w-full sm:w-48"
        >
          <option value="">{t`Todas as tags`}</option>
          {tags.data?.map((tag) => (
            <option key={tag.id} value={tag.id}>
              {tag.nome}
            </option>
          ))}
        </select>
      </div>

      <AlertaErro erro={gatos.error} />

      <div className="overflow-x-auto bg-base-100 rounded-box shadow-sm">
        <table className="table">
          <thead>
            <tr>
              <th>{t`Gato`}</th>
              <th>{t`Status`}</th>
              <th className="hidden md:table-cell">{t`Tags atuais`}</th>
              <th>{t`No site`}</th>
            </tr>
          </thead>
          <tbody>
            {gatos.isPending && (
              <tr>
                <td colSpan={4}>
                  <span className="loading loading-dots" />
                </td>
              </tr>
            )}
            {gatos.data?.itens.length === 0 && (
              <tr>
                <td colSpan={4} className="opacity-70">
                  {t`Nenhum gato encontrado.`}
                </td>
              </tr>
            )}
            {gatos.data?.itens.map((gato) => {
              const capa = gato.fotos.find((f) => f.capa);
              return (
                <tr key={gato.id} className="hover:bg-base-200">
                  <td>
                    <Link
                      to="/$locale/app/gatos/$gatoId"
                      params={{ locale, gatoId: gato.id }}
                      className="flex items-center gap-3"
                    >
                      <div className="avatar">
                        <div className="mask mask-squircle size-10 bg-base-200">
                          {capa && <img src={capa.url} alt="" />}
                        </div>
                      </div>
                      <span className="font-medium link link-hover">
                        {gato.nome}
                      </span>
                    </Link>
                  </td>
                  <td>{rotulos.status[gato.status]}</td>
                  <td className="hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {gato.tags
                        .filter((tag) => tag.ativa)
                        .map((tag) => (
                          <span
                            key={tag.id}
                            className="badge badge-outline badge-sm"
                          >
                            {tag.nome}
                          </span>
                        ))}
                    </div>
                  </td>
                  <td>
                    {gato.publicado ? (
                      <span className="badge badge-success badge-soft badge-sm">{t`Publicado`}</span>
                    ) : (
                      <span className="badge badge-ghost badge-sm">{t`Rascunho`}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {gatos.data && (
        <p className="text-sm opacity-60">
          {gatos.data.total} {t`gato(s)`}
        </p>
      )}
    </div>
  );
}
