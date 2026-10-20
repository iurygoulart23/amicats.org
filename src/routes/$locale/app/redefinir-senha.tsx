import { Link, createFileRoute } from '@tanstack/react-router';
import { useLingui } from '@lingui/react/macro';
import { z } from 'zod';
import { AuthCard } from '@/components/app/auth-card';
import { AlertaErro } from '@/components/app/alerta-erro';
import { Campo } from '@/components/app/campo';
import { useRedefinirSenha } from '@/integrations/api/auth.queries';

export const Route = createFileRoute('/$locale/app/redefinir-senha')({
  validateSearch: z.object({ token: z.string().catch('') }),
  component: RedefinirSenhaPage,
});

function RedefinirSenhaPage() {
  const { t } = useLingui();
  const { locale } = Route.useParams();
  const { token } = Route.useSearch();
  const redefinir = useRedefinirSenha();

  const salvar = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    redefinir.mutate({
      token,
      senha: String(new FormData(e.currentTarget).get('senha')),
    });
  };

  return (
    <AuthCard titulo={t`Definir nova senha`} locale={locale}>
      {redefinir.isSuccess ? (
        <>
          <div role="status" className="alert alert-success alert-soft">
            {t`Senha definida! Agora é só entrar.`}
          </div>
          <Link
            to="/$locale/app/login"
            params={{ locale }}
            className="btn btn-primary"
          >
            {t`Entrar`}
          </Link>
        </>
      ) : (
        <form onSubmit={salvar} className="flex flex-col gap-2">
          {!token && (
            <AlertaErro erro={new Error(t`Link inválido. Peça um novo.`)} />
          )}
          <AlertaErro erro={redefinir.error} />
          <Campo label={t`Nova senha`} dica={t`Mínimo de 8 caracteres.`}>
            <input
              name="senha"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="input w-full"
            />
          </Campo>
          <button
            type="submit"
            className="btn btn-primary mt-2"
            disabled={!token || redefinir.isPending}
          >
            {t`Salvar senha`}
          </button>
        </form>
      )}
    </AuthCard>
  );
}
