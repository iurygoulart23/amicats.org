import { createFileRoute } from '@tanstack/react-router';
import { useLingui } from '@lingui/react/macro';
import { AlertaErro } from '@/components/app/alerta-erro';
import { Campo } from '@/components/app/campo';
import { useRotulos } from '@/hooks/use-rotulos';
import {
  useEditarPerfil,
  useTrocarSenha,
} from '@/integrations/api/auth.queries';

export const Route = createFileRoute('/$locale/app/_painel/minha-conta')({
  component: MinhaContaPage,
});

function MinhaContaPage() {
  const { t } = useLingui();
  const { me } = Route.useRouteContext();
  const rotulos = useRotulos();
  const perfil = useEditarPerfil();
  const senha = useTrocarSenha();

  const salvarPerfil = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    perfil.mutate({
      nome: String(form.get('nome')),
      telefone: String(form.get('telefone') || '') || null,
      notificarPorEmail: form.get('notificarPorEmail') === 'on',
    });
  };

  const trocarSenha = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    senha.mutate(
      {
        senhaAtual: String(form.get('senhaAtual')),
        novaSenha: String(form.get('novaSenha')),
      },
      { onSuccess: () => formEl.reset() },
    );
  };

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      <h1 className="text-2xl font-bold">{t`Minha conta`}</h1>

      <form onSubmit={salvarPerfil} className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <h2 className="card-title text-base">{t`Seus dados`}</h2>
          <p className="text-sm opacity-70">
            {me.email} · {rotulos.cargo[me.cargo]}
          </p>
          <AlertaErro erro={perfil.error} />
          {perfil.isSuccess && (
            <div role="status" className="alert alert-success alert-soft">
              {t`Dados salvos.`}
            </div>
          )}
          <Campo label={t`Nome`}>
            <input
              name="nome"
              defaultValue={me.nome}
              required
              minLength={2}
              className="input w-full"
            />
          </Campo>
          <Campo label={t`Telefone`}>
            <input
              name="telefone"
              type="tel"
              defaultValue={me.telefone ?? ''}
              className="input w-full"
            />
          </Campo>
          <label className="label cursor-pointer gap-2 py-2">
            <input
              name="notificarPorEmail"
              type="checkbox"
              defaultChecked={me.notificarPorEmail}
              className="toggle toggle-primary"
            />
            {t`Receber por e-mail um resumo diário das notificações`}
          </label>
          <div className="card-actions justify-end">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={perfil.isPending}
            >
              {t`Salvar`}
            </button>
          </div>
        </div>
      </form>

      <form onSubmit={trocarSenha} className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <h2 className="card-title text-base">{t`Trocar senha`}</h2>
          <AlertaErro erro={senha.error} />
          {senha.isSuccess && (
            <div role="status" className="alert alert-success alert-soft">
              {t`Senha alterada. As sessões em outros aparelhos foram encerradas.`}
            </div>
          )}
          <Campo label={t`Senha atual`}>
            <input
              name="senhaAtual"
              type="password"
              required
              autoComplete="current-password"
              className="input w-full"
            />
          </Campo>
          <Campo label={t`Nova senha`} dica={t`Mínimo de 8 caracteres.`}>
            <input
              name="novaSenha"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="input w-full"
            />
          </Campo>
          <div className="card-actions justify-end">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={senha.isPending}
            >
              {t`Trocar senha`}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
