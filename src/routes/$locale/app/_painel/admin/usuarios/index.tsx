import { useState } from 'react';
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useLingui } from '@lingui/react/macro';
import { UserPlus } from 'lucide-react';
import { z } from 'zod';
import type { Cargo } from '@/integrations/api/types';
import { AlertaErro } from '@/components/app/alerta-erro';
import { Campo } from '@/components/app/campo';
import { useRotulos } from '@/hooks/use-rotulos';
import { ApiError } from '@/integrations/api/client';
import {
  useSalvarUsuario,
  usuariosQuery,
} from '@/integrations/api/users.queries';

const CARGOS = ['adm', 'voluntario', 'cliente'] as const;

export const Route = createFileRoute('/$locale/app/_painel/admin/usuarios/')({
  validateSearch: z.object({
    busca: z.string().optional(),
    cargo: z.enum(CARGOS).optional(),
  }),
  component: UsuariosPage,
});

function UsuariosPage() {
  const { t } = useLingui();
  const rotulos = useRotulos();
  const { locale } = Route.useParams();
  const filtros = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const usuarios = useQuery({
    ...usuariosQuery(filtros),
    placeholderData: keepPreviousData,
  });
  const [criando, setCriando] = useState(false);

  const filtrar = (novo: Partial<typeof filtros>) =>
    navigate({ search: (atual) => ({ ...atual, ...novo }), replace: true });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{t`Pessoas`}</h1>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setCriando((c) => !c)}
        >
          <UserPlus className="size-4" />
          {t`Adicionar pessoa`}
        </button>
      </div>

      {criando && <NovaPessoa onCriada={() => setCriando(false)} />}

      <div className="flex flex-wrap gap-2">
        <input
          type="search"
          placeholder={t`Buscar por nome ou e-mail`}
          aria-label={t`Buscar por nome ou e-mail`}
          defaultValue={filtros.busca}
          onChange={(e) => void filtrar({ busca: e.target.value || undefined })}
          className="input w-full sm:w-72"
        />
        <select
          aria-label={t`Cargo`}
          value={filtros.cargo ?? ''}
          onChange={(e) =>
            void filtrar({
              cargo: (e.target.value || undefined) as Cargo | undefined,
            })
          }
          className="select w-full sm:w-48"
        >
          <option value="">{t`Todos os cargos`}</option>
          {CARGOS.map((c) => (
            <option key={c} value={c}>
              {rotulos.cargo[c]}
            </option>
          ))}
        </select>
      </div>

      <AlertaErro erro={usuarios.error} />
      <div className="overflow-x-auto bg-base-100 rounded-box shadow-sm">
        <table className="table">
          <thead>
            <tr>
              <th>{t`Nome`}</th>
              <th className="hidden md:table-cell">{t`E-mail`}</th>
              <th>{t`Cargo`}</th>
              <th>{t`Situação`}</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.data?.itens.map((u) => (
              <tr key={u.id} className="hover:bg-base-200">
                <td>
                  <Link
                    to="/$locale/app/admin/usuarios/$userId"
                    params={{ locale, userId: u.id }}
                    className="link link-hover font-medium"
                  >
                    {u.nome}
                  </Link>
                </td>
                <td className="hidden md:table-cell">{u.email}</td>
                <td>{rotulos.cargo[u.cargo]}</td>
                <td>
                  {!u.ativo ? (
                    <span className="badge badge-ghost badge-sm">{t`Desativada`}</span>
                  ) : !u.senhaDefinida ? (
                    <span className="badge badge-warning badge-soft badge-sm">{t`Convite pendente`}</span>
                  ) : (
                    <span className="badge badge-success badge-soft badge-sm">{t`Ativa`}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NovaPessoa({ onCriada }: { onCriada: () => void }) {
  const { t } = useLingui();
  const rotulos = useRotulos();
  const salvar = useSalvarUsuario();
  const erro = salvar.error instanceof ApiError ? salvar.error : null;

  const enviar = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    salvar.mutate(
      {
        nome: String(form.get('nome')),
        email: String(form.get('email')),
        cargo: form.get('cargo') as Cargo,
        telefone: String(form.get('telefone') || '') || null,
      },
      { onSuccess: onCriada },
    );
  };

  return (
    <form onSubmit={enviar} className="card bg-base-100 shadow-sm">
      <div className="card-body">
        <h2 className="card-title text-base">{t`Nova pessoa`}</h2>
        <p className="text-sm opacity-70">
          {t`A pessoa recebe um e-mail com o link para definir a própria senha.`}
        </p>
        <AlertaErro erro={erro} />
        <div className="grid gap-x-4 md:grid-cols-2">
          <Campo label={t`Nome`} erro={erro?.erroDoCampo('nome')}>
            <input
              name="nome"
              required
              minLength={2}
              className="input w-full"
            />
          </Campo>
          <Campo label={t`E-mail`} erro={erro?.erroDoCampo('email')}>
            <input
              name="email"
              type="email"
              required
              className="input w-full"
            />
          </Campo>
          <Campo label={t`Cargo`}>
            <select
              name="cargo"
              defaultValue="voluntario"
              className="select w-full"
            >
              {CARGOS.map((c) => (
                <option key={c} value={c}>
                  {rotulos.cargo[c]}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label={t`Telefone (opcional)`}>
            <input name="telefone" type="tel" className="input w-full" />
          </Campo>
        </div>
        <div className="card-actions justify-end">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={salvar.isPending}
          >
            {t`Criar e enviar convite`}
          </button>
        </div>
      </div>
    </form>
  );
}
