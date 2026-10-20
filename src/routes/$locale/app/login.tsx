import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import { useLingui } from '@lingui/react/macro';
import { z } from 'zod';
import { AuthCard } from '@/components/app/auth-card';
import { AlertaErro } from '@/components/app/alerta-erro';
import { Campo } from '@/components/app/campo';
import { useLogin } from '@/integrations/api/auth.queries';
import { destinoSeguro } from '@/integrations/api/guards';

export const Route = createFileRoute('/$locale/app/login')({
  validateSearch: z.object({ redirect: z.string().optional() }),
  component: LoginPage,
});

function LoginPage() {
  const { t } = useLingui();
  const { locale } = Route.useParams();
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const login = useLogin();

  const entrar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await login.mutateAsync({
      email: String(form.get('email')),
      senha: String(form.get('senha')),
    });
    await navigate({ to: destinoSeguro(redirect, locale) });
  };

  return (
    <AuthCard
      titulo={t`Entrar`}
      locale={locale}
      rodape={
        <>
          <Link
            to="/$locale/app/esqueci-senha"
            params={{ locale }}
            className="link"
          >
            {t`Esqueci minha senha`}
          </Link>
          <span>
            {t`Ainda não tem conta?`}{' '}
            <Link
              to="/$locale/app/cadastro"
              params={{ locale }}
              className="link link-primary"
            >
              {t`Cadastre-se`}
            </Link>
          </span>
        </>
      }
    >
      <form
        onSubmit={(e) => void entrar(e).catch(() => {})}
        className="flex flex-col gap-2"
      >
        <AlertaErro erro={login.error} />
        <Campo label={t`E-mail`}>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="input w-full"
          />
        </Campo>
        <Campo label={t`Senha`}>
          <input
            name="senha"
            type="password"
            required
            autoComplete="current-password"
            className="input w-full"
          />
        </Campo>
        <button
          type="submit"
          className="btn btn-primary mt-2"
          disabled={login.isPending}
        >
          {login.isPending && <span className="loading loading-spinner" />}
          {t`Entrar`}
        </button>
      </form>
    </AuthCard>
  );
}
