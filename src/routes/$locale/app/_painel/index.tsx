import { Link, createFileRoute } from '@tanstack/react-router';
import { useLingui } from '@lingui/react/macro';
import { Cat, Gift, Heart, Tags, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Cargo } from '@/integrations/api/types';
import { podeAcessar } from '@/integrations/api/cargos';

export const Route = createFileRoute('/$locale/app/_painel/')({
  component: PainelInicio,
});

type Atalho = {
  titulo: string;
  descricao: string;
  to?: string;
  icone: LucideIcon;
  cargo: Cargo;
  emBreve?: boolean;
};

function PainelInicio() {
  const { t } = useLingui();
  const { me } = Route.useRouteContext();
  const { locale } = Route.useParams();

  const atalhos: Array<Atalho> = [
    {
      titulo: t`Gatos do abrigo`,
      descricao: t`Cadastro, fotos, tags e histórico de saúde.`,
      to: `/${locale}/app/gatos`,
      icone: Cat,
      cargo: 'voluntario',
    },
    {
      titulo: t`Pessoas`,
      descricao: t`Voluntários, clientes e administração.`,
      to: `/${locale}/app/admin/usuarios`,
      icone: Users,
      cargo: 'adm',
    },
    {
      titulo: t`Tags`,
      descricao: t`Doenças, comportamentos e cuidados usados nos gatos.`,
      to: `/${locale}/app/admin/tags`,
      icone: Tags,
      cargo: 'adm',
    },
    {
      titulo: t`Conheça os gatinhos`,
      descricao: t`Veja quem está esperando por um lar.`,
      to: `/${locale}/#adote`,
      icone: Heart,
      cargo: 'cliente',
    },
    {
      titulo: t`Apadrinhamento e Clube Amicats`,
      descricao: t`Apadrinhe um gatinho ou assine o clube. Em breve!`,
      icone: Gift,
      cargo: 'cliente',
      emBreve: true,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">
          {t`Olá`}, {me.nome.split(' ')[0]}!
        </h1>
        <p className="opacity-70">{t`O que você quer fazer hoje?`}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {atalhos
          .filter((a) => podeAcessar(me.cargo, a.cargo))
          .map(({ titulo, descricao, to, icone: Icone, emBreve }) => {
            const conteudo = (
              <div className="card-body">
                <Icone className="size-6 text-primary" />
                <h2 className="card-title text-base">
                  {titulo}
                  {emBreve && (
                    <span className="badge badge-ghost badge-sm">{t`Em breve`}</span>
                  )}
                </h2>
                <p className="text-sm opacity-70">{descricao}</p>
              </div>
            );
            return to ? (
              <Link
                key={titulo}
                to={to}
                className="card bg-base-100 shadow-sm hover:shadow-md transition-all duration-300"
              >
                {conteudo}
              </Link>
            ) : (
              <div
                key={titulo}
                className="card bg-base-100 shadow-sm opacity-70"
              >
                {conteudo}
              </div>
            );
          })}
      </div>
    </div>
  );
}
