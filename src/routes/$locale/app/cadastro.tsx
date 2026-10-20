import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import { useLingui } from '@lingui/react/macro';
import { AuthCard } from '@/components/app/auth-card';
import { AlertaErro } from '@/components/app/alerta-erro';
import { Campo } from '@/components/app/campo';
import { useCadastro } from '@/integrations/api/auth.queries';
import { ApiError } from '@/integrations/api/client';

export const Route = createFileRoute('/$locale/app/cadastro')({
  component: CadastroPage,
});

function CadastroPage() {
  const { t } = useLingui();
  const { locale } = Route.useParams();
  const navigate = useNavigate();
  const cadastro = useCadastro();
  const erro = cadastro.error instanceof ApiError ? cadastro.error : null;

  const cadastrar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await cadastro.mutateAsync({
      nome: String(form.get('nome')),
      email: String(form.get('email')),
      senha: String(form.get('senha')),
      telefone: String(form.get('telefone') || '') || undefined,
    });
    await navigate({ to: '/$locale/app', params: { locale } });
  };

  return (
    <AuthCard
      titulo={t`Criar conta`}
      locale={locale}
      rodape={
        <span>
          {t`Já tem conta?`}{' '}
          <Link
            to="/$locale/app/login"
            params={{ locale }}
            className="link link-primary"
          >
            {t`Entrar`}
          </Link>
        </span>
      }
    >
      <p className="text-sm opacity-70 text-center">
        {t`Com uma conta você acompanha os gatinhos e, em breve, poderá apadrinhar e participar do Clube Amicats.`}
      </p>
      <form
        onSubmit={(e) => void cadastrar(e).catch(() => {})}
        className="flex flex-col gap-2"
      >
        <AlertaErro erro={erro} />
        <Campo label={t`Nome`} erro={erro?.erroDoCampo('nome')}>
          <input
            name="nome"
            required
            minLength={2}
            autoComplete="name"
            className="input w-full"
          />
        </Campo>
        <Campo label={t`E-mail`} erro={erro?.erroDoCampo('email')}>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="input w-full"
          />
        </Campo>
        <Campo label={t`Telefone (opcional)`}>
          <input
            name="telefone"
            type="tel"
            autoComplete="tel"
            className="input w-full"
          />
        </Campo>
        <Campo
          label={t`Senha`}
          erro={erro?.erroDoCampo('senha')}
          dica={t`Mínimo de 8 caracteres.`}
        >
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
          disabled={cadastro.isPending}
        >
          {cadastro.isPending && <span className="loading loading-spinner" />}
          {t`Criar conta`}
        </button>
      </form>
    </AuthCard>
  );
}
