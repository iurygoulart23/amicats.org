import { Link, useNavigate } from '@tanstack/react-router';
import { useLingui } from '@lingui/react/macro';
import {
  Cat,
  Gift,
  HeartHandshake,
  Home,
  Landmark,
  LogOut,
  Menu,
  Pill,
  Receipt,
  Tags,
  UserCircle,
  Users,
} from 'lucide-react';
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { Cargo, UsuarioLogado } from '@/integrations/api/types';
import { useLogout } from '@/integrations/api/auth.queries';
import { podeAcessar } from '@/integrations/api/cargos';
import { Sininho } from '@/components/app/sininho';
import { useRotulos } from '@/hooks/use-rotulos';

export interface AppShellProps {
  me: UsuarioLogado;
  locale: string;
  children: ReactNode;
}

type ItemMenu = {
  to: string;
  label: string;
  icone: LucideIcon;
  cargo: Cargo;
  exato?: boolean;
};

const DRAWER_ID = 'app-drawer';

export function AppShell({ me, locale, children }: AppShellProps) {
  const { t } = useLingui();
  const rotulos = useRotulos();
  const logout = useLogout();
  const navigate = useNavigate();

  const itens: Array<ItemMenu> = [
    {
      to: `/${locale}/app`,
      label: t`Início`,
      icone: Home,
      cargo: 'cliente',
      exato: true,
    },
    {
      to: `/${locale}/app/gatos`,
      label: t`Gatos`,
      icone: Cat,
      cargo: 'voluntario',
    },
    {
      to: `/${locale}/app/remedios`,
      label: t`Remédios do dia`,
      icone: Pill,
      cargo: 'voluntario',
    },
    {
      to: `/${locale}/app/apadrinhamentos`,
      label: t`Apadrinhamentos`,
      icone: HeartHandshake,
      cargo: 'cliente',
    },
    {
      to: `/${locale}/app/clube`,
      label: t`Clube Amicats`,
      icone: Gift,
      cargo: 'cliente',
    },
    {
      to: `/${locale}/app/pagamentos`,
      label: t`Meus pagamentos`,
      icone: Receipt,
      cargo: 'cliente',
    },
    {
      to: `/${locale}/app/admin/usuarios`,
      label: t`Pessoas`,
      icone: Users,
      cargo: 'adm',
    },
    {
      to: `/${locale}/app/admin/tags`,
      label: t`Tags`,
      icone: Tags,
      cargo: 'adm',
    },
    {
      to: `/${locale}/app/admin/clube`,
      label: t`Assinantes`,
      icone: Gift,
      cargo: 'adm',
    },
    {
      to: `/${locale}/app/admin/pagamentos`,
      label: t`Pagamentos`,
      icone: Landmark,
      cargo: 'adm',
    },
    {
      to: `/${locale}/app/minha-conta`,
      label: t`Minha conta`,
      icone: UserCircle,
      cargo: 'cliente',
    },
  ];

  const sair = async () => {
    await logout.mutateAsync();
    await navigate({ to: '/$locale/app/login', params: { locale } });
  };

  return (
    <div className="drawer lg:drawer-open min-h-screen bg-base-200">
      <input id={DRAWER_ID} type="checkbox" className="drawer-toggle" />
      <div className="drawer-content flex flex-col">
        <header className="navbar bg-base-100 shadow-sm gap-2 px-4">
          <label
            htmlFor={DRAWER_ID}
            className="btn btn-ghost btn-square lg:hidden"
            aria-label={t`Abrir menu`}
          >
            <Menu className="size-5" />
          </label>
          <span className="flex-1 font-semibold text-primary">
            <span className="lg:hidden">Amicats</span>
          </span>
          <div className="text-right leading-tight">
            <p className="text-sm font-medium">{me.nome}</p>
            <p className="text-xs opacity-60">{rotulos.cargo[me.cargo]}</p>
          </div>
          <Sininho locale={locale} />
          <button
            type="button"
            className="btn btn-ghost btn-square"
            onClick={sair}
            aria-label={t`Sair`}
            title={t`Sair`}
          >
            <LogOut className="size-5" />
          </button>
        </header>
        <main className="flex-1 p-4 md:p-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>

      <div className="drawer-side z-40">
        <label
          htmlFor={DRAWER_ID}
          aria-label={t`Fechar menu`}
          className="drawer-overlay"
        />
        <nav
          aria-label={t`Menu da área logada`}
          className="bg-base-100 min-h-full w-64 p-4"
        >
          <Link
            to="/$locale"
            params={{ locale }}
            className="btn btn-ghost text-xl text-primary mb-4"
          >
            Amicats
          </Link>
          <ul className="menu w-full gap-1">
            {itens
              .filter((item) => podeAcessar(me.cargo, item.cargo))
              .map(({ to, label, icone: Icone, exato }) => (
                <li key={to}>
                  <Link
                    to={to}
                    activeOptions={{ exact: !!exato }}
                    activeProps={{ className: 'menu-active' }}
                  >
                    <Icone className="size-4" />
                    {label}
                  </Link>
                </li>
              ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
