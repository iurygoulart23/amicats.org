import { useNavigate } from '@tanstack/react-router';
import { useLingui } from '@lingui/react/macro';
import {
  CalendarClock,
  Gift,
  HeartHandshake,
  Pill,
  Receipt,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Notificacao, TipoNotificacao } from '@/integrations/api/types';
import { cn } from '@/components/layout/shared/helpers/class.helper';
import { useMarcarLida } from '@/integrations/api/notificacoes.queries';

export interface ListaNotificacoesProps {
  notificacoes: Array<Notificacao>;
  locale: string;
  /** Chamado depois de abrir uma notificação (ex.: fechar o menu) */
  aoAbrir?: () => void;
}

const ICONES: Record<TipoNotificacao, LucideIcon> = {
  gasto_novo: Receipt,
  apadrinhamento_novo: HeartHandshake,
  dose_atrasada: Pill,
  retorno_proximo: CalendarClock,
  assinatura_nova: Gift,
};

function quandoFoi(iso: string, locale: string) {
  const minutos = Math.round((new Date(iso).getTime() - Date.now()) / 60_000);
  const rtf = new Intl.RelativeTimeFormat(locale === 'en' ? 'en' : 'pt-BR', {
    numeric: 'auto',
  });
  if (Math.abs(minutos) < 60) return rtf.format(minutos, 'minute');
  if (Math.abs(minutos) < 60 * 24)
    return rtf.format(Math.round(minutos / 60), 'hour');
  return rtf.format(Math.round(minutos / (60 * 24)), 'day');
}

export function ListaNotificacoes({
  notificacoes,
  locale,
  aoAbrir,
}: ListaNotificacoesProps) {
  const { t } = useLingui();
  const navigate = useNavigate();
  const marcarLida = useMarcarLida();

  if (!notificacoes.length) {
    return (
      <p className="p-4 text-sm opacity-70">{t`Nenhuma notificação por aqui.`}</p>
    );
  }

  const abrir = async (n: Notificacao) => {
    if (!n.lida) marcarLida.mutate(n.id);
    aoAbrir?.();
    if (n.link) await navigate({ href: `/${locale}${n.link}` });
  };

  return (
    <ul className="divide-y divide-base-200">
      {notificacoes.map((n) => {
        const Icone = ICONES[n.tipo];
        return (
          <li key={n.id}>
            <button
              type="button"
              onClick={() => void abrir(n)}
              className={cn(
                'flex w-full gap-3 p-3 text-left transition-all duration-300 hover:bg-base-200',
                !n.lida && 'bg-primary/5',
              )}
            >
              <Icone className="size-5 shrink-0 text-primary mt-0.5" />
              <span className="flex-1 min-w-0">
                <span
                  className={cn('block text-sm', !n.lida && 'font-semibold')}
                >
                  {n.titulo}
                </span>
                {n.mensagem && (
                  <span className="block text-xs opacity-70 truncate">
                    {n.mensagem}
                  </span>
                )}
                <span className="block text-xs opacity-50">
                  {quandoFoi(n.criadoEm, locale)}
                </span>
              </span>
              {!n.lida && (
                <span
                  className="badge badge-primary badge-xs mt-1.5"
                  aria-label={t`Não lida`}
                />
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
