import { Link, createFileRoute } from '@tanstack/react-router';
import { useLingui } from '@lingui/react/macro';
import { AuthCard } from '@/components/app/auth-card';
import { AlertaErro } from '@/components/app/alerta-erro';
import { Campo } from '@/components/app/campo';
import { useEsqueciSenha } from '@/integrations/api/auth.queries';

export const Route = createFileRoute('/$locale/app/esqueci-senha')({
  component: EsqueciSenhaPage,
});

function EsqueciSenhaPage() {
  const { t } = useLingui();
  const { locale } = Route.useParams();
  const pedido = useEsqueciSenha();

  const enviar = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    pedido.mutate(String(new FormData(e.currentTarget).get('email')));
  };

  return (
    <AuthCard
      titulo={t`Esqueci minha senha`}
      locale={locale}
      rodape={
        <Link to="/$locale/app/login" params={{ locale }} className="link">
          {t`Voltar para o login`}
        </Link>
      }
    >
      {pedido.isSuccess ? (
        <div role="status" className="alert alert-success alert-soft">
          {t`Se houver uma conta com esse e-mail, enviamos um link para criar uma nova senha. Confira também a caixa de spam.`}
        </div>
      ) : (
        <form onSubmit={enviar} className="flex flex-col gap-2">
          <AlertaErro erro={pedido.error} />
          <Campo label={t`E-mail`}>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="input w-full"
            />
          </Campo>
          <button
            type="submit"
            className="btn btn-primary mt-2"
            disabled={pedido.isPending}
          >
            {t`Enviar link`}
          </button>
        </form>
      )}
    </AuthCard>
  );
}
