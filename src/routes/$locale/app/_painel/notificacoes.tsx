import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useLingui } from '@lingui/react/macro';
import { AlertaErro } from '@/components/app/alerta-erro';
import { ListaNotificacoes } from '@/components/app/lista-notificacoes';
import {
  notificacoesQuery,
  useLerTodas,
} from '@/integrations/api/notificacoes.queries';

export const Route = createFileRoute('/$locale/app/_painel/notificacoes')({
  component: NotificacoesPage,
});

function NotificacoesPage() {
  const { t } = useLingui();
  const { locale } = Route.useParams();
  const lista = useQuery(notificacoesQuery(100));
  const lerTodas = useLerTodas();
  const temNaoLidas = lista.data?.some((n) => !n.lida);

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{t`Notificações`}</h1>
        {temNaoLidas && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => lerTodas.mutate()}
          >
            {t`Marcar todas como lidas`}
          </button>
        )}
      </div>
      <AlertaErro erro={lista.error ?? lerTodas.error} />
      {lista.isPending ? (
        <span className="loading loading-dots" />
      ) : (
        <div className="bg-base-100 rounded-box shadow-sm overflow-hidden">
          <ListaNotificacoes notificacoes={lista.data ?? []} locale={locale} />
        </div>
      )}
    </div>
  );
}
