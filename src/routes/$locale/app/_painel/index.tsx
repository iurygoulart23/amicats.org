import { Link, createFileRoute } from '@tanstack/react-router';
import { useLingui } from '@lingui/react/macro';
import {
  Cat,
  Gift,
  Heart,
  HeartHandshake,
  Pill,
  Tags,
  Users,
} from 'lucide-react';
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
      titulo: t`Remédios do dia`,
      descricao: t`Doses previstas de todos os gatos, retornos e vacinas.`,
      to: `/${locale}/app/remedios`,
      icone: Pill,
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
      titulo: t`Meus apadrinhamentos`,
      descricao: t`Acompanhe os gastos dos gatinhos que você apadrinha.`,
      to: `/${locale}/app/apadrinhamentos`,
      icone: HeartHandshake,
      cargo: 'cliente',
    },
    {
      titulo: t`Clube Amicats`,
      descricao: t`Contribua todo mês no cartão e ajude a manter o abrigo.`,
      to: `/${locale}/app/clube`,
      icone: Gift,
      cargo: 'cliente',
    },
    {
      titulo: t`Assinantes`,
      descricao: t`Assinaturas do clube, receita mensal e faixas.`,
      to: `/${locale}/app/admin/clube`,
      icone: Gift,
      cargo: 'adm',
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
