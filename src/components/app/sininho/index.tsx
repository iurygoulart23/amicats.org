import { useRef } from 'react';
import { Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useLingui } from '@lingui/react/macro';
import { Bell } from 'lucide-react';
import { ListaNotificacoes } from '@/components/app/lista-notificacoes';
import {
  contagemNotificacoesQuery,
  notificacoesQuery,
  useLerTodas,
} from '@/integrations/api/notificacoes.queries';

export interface SininhoProps {
  locale: string;
}

const ITENS_NO_MENU = 8;

export function Sininho({ locale }: SininhoProps) {
  const { t } = useLingui();
  const menu = useRef<HTMLDetailsElement>(null);
  const contagem = useQuery(contagemNotificacoesQuery);
  const lista = useQuery({
    ...notificacoesQuery(ITENS_NO_MENU),
    enabled: false,
  });
  const lerTodas = useLerTodas();
  const naoLidas = contagem.data?.naoLidas ?? 0;
  const fechar = () => menu.current?.removeAttribute('open');

  return (
    <details
      ref={menu}
      className="dropdown dropdown-end"
      onToggle={(e) => {
        if ((e.currentTarget as HTMLDetailsElement).open) void lista.refetch();
      }}
    >
      <summary
        className="btn btn-ghost btn-square indicator"
        aria-label={
          naoLidas
            ? `${t`Notificações`}: ${naoLidas} ${t`não lidas`}`
            : t`Notificações`
        }
      >
        <Bell className="size-5" />
        {naoLidas > 0 && (
          <span className="indicator-item badge badge-primary badge-xs">
            {naoLidas > 99 ? '99+' : naoLidas}
          </span>
        )}
      </summary>
      <div className="dropdown-content z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-box bg-base-100 shadow-xl">
        <div className="flex items-center justify-between border-b border-base-200 p-3">
          <span className="font-semibold">{t`Notificações`}</span>
          {naoLidas > 0 && (
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              onClick={() => lerTodas.mutate()}
            >
              {t`Marcar todas como lidas`}
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {lista.isFetching && !lista.data ? (
            <span className="loading loading-dots m-4" />
          ) : (
            <ListaNotificacoes
              notificacoes={lista.data ?? []}
              locale={locale}
              aoAbrir={fechar}
            />
          )}
        </div>
        <Link
          to="/$locale/app/notificacoes"
          params={{ locale }}
          onClick={fechar}
          className="block border-t border-base-200 p-3 text-center text-sm link link-hover"
        >
          {t`Ver todas`}
        </Link>
      </div>
    </details>
  );
}
