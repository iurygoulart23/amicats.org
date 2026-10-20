import { Link, createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useLingui } from '@lingui/react/macro';
import type { Cargo } from '@/integrations/api/types';
import { AlertaErro } from '@/components/app/alerta-erro';
import { Campo } from '@/components/app/campo';
import { useRotulos } from '@/hooks/use-rotulos';
import {
  useEnviarConvite,
  useSalvarUsuario,
  usuarioQuery,
} from '@/integrations/api/users.queries';

const CARGOS = ['adm', 'voluntario', 'cliente'] as const;

export const Route = createFileRoute(
  '/$locale/app/_painel/admin/usuarios/$userId',
)({
  component: UsuarioPage,
});

function UsuarioPage() {
  const { t } = useLingui();
  const rotulos = useRotulos();
  const { locale, userId } = Route.useParams();
  const { me } = Route.useRouteContext();
  const usuario = useQuery(usuarioQuery(userId));
  const salvar = useSalvarUsuario();
  const convite = useEnviarConvite();
  const ehVoce = me.id === userId;

  if (usuario.isPending) return <span className="loading loading-dots" />;
  if (usuario.isError) return <AlertaErro erro={usuario.error} />;
  const u = usuario.data;

  const enviar = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    salvar.mutate({
      id: u.id,
      nome: String(form.get('nome')),
      telefone: String(form.get('telefone') || '') || null,
      ...(!ehVoce && {
        cargo: form.get('cargo') as Cargo,
        ativo: form.get('ativo') === 'on',
      }),
    });
  };

  return (
    <div className="flex flex-col gap-4 max-w-xl">
      <div className="breadcrumbs text-sm">
        <ul>
          <li>
            <Link to="/$locale/app/admin/usuarios" params={{ locale }}>
              {t`Pessoas`}
            </Link>
          </li>
          <li>{u.nome}</li>
        </ul>
      </div>
      <h1 className="text-2xl font-bold">{u.nome}</h1>

      <form
        key={`${u.cargo}-${u.ativo}-${u.nome}`}
        onSubmit={enviar}
        className="card bg-base-100 shadow-sm"
      >
        <div className="card-body">
          <p className="text-sm opacity-70">{u.email}</p>
          <AlertaErro erro={salvar.error} />
          {salvar.isSuccess && (
            <div role="status" className="alert alert-success alert-soft">
              {t`Alterações salvas.`}
            </div>
          )}
          <Campo label={t`Nome`}>
            <input
              name="nome"
              defaultValue={u.nome}
              required
              minLength={2}
              className="input w-full"
            />
          </Campo>
          <Campo label={t`Telefone`}>
            <input
              name="telefone"
              type="tel"
              defaultValue={u.telefone ?? ''}
              className="input w-full"
            />
          </Campo>
          <Campo
            label={t`Cargo`}
            dica={
              ehVoce ? t`Você não pode alterar o seu próprio cargo.` : undefined
            }
          >
            <select
              name="cargo"
              defaultValue={u.cargo}
              disabled={ehVoce}
              className="select w-full"
            >
              {CARGOS.map((c) => (
                <option key={c} value={c}>
                  {rotulos.cargo[c]}
                </option>
              ))}
            </select>
          </Campo>
          <label className="label cursor-pointer gap-2 py-2">
            <input
              name="ativo"
              type="checkbox"
              defaultChecked={u.ativo}
              disabled={ehVoce}
              className="toggle toggle-primary"
            />
            {t`Conta ativa (desativar encerra o acesso na hora)`}
          </label>
          <div className="card-actions justify-between">
            <button
              type="button"
              className="btn btn-ghost"
              disabled={convite.isPending}
              onClick={() => convite.mutate(u.id)}
            >
              {convite.isSuccess ? t`Convite enviado!` : t`Reenviar convite`}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={salvar.isPending}
            >
              {t`Salvar`}
            </button>
          </div>
          <AlertaErro erro={convite.error} />
        </div>
      </form>
    </div>
  );
}
