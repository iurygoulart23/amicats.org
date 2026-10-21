import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useLingui } from '@lingui/react/macro';
import { HeartHandshake } from 'lucide-react';
import { AlertaErro } from '@/components/app/alerta-erro';
import { formatarReais } from '@/components/app/shared/formatos';
import { useApadrinhar } from '@/integrations/api/apadrinhamentos.queries';
import { ApiError } from '@/integrations/api/client';
import { publicGatoQuery } from '@/integrations/api/gatos.queries';

export const Route = createFileRoute('/$locale/app/_painel/apadrinhar/$slug')({
  component: ApadrinharPage,
});

function ApadrinharPage() {
  const { t, i18n } = useLingui();
  const { locale, slug } = Route.useParams();
  const navigate = useNavigate();
  const gato = useQuery(publicGatoQuery(slug));
  const apadrinhar = useApadrinhar();
  const jaApadrinha =
    apadrinhar.error instanceof ApiError && apadrinhar.error.status === 409;

  if (gato.isPending) return <span className="loading loading-dots" />;
  if (gato.isError) return <AlertaErro erro={gato.error} />;

  const g = gato.data;
  const foto = g.fotos.find((f) => f.capa)?.url ?? g.fotos[0]?.url;
  const descricao =
    i18n.locale === 'pt-BR' ? g.descricaoPt : (g.descricaoEn ?? g.descricaoPt);

  const confirmar = () =>
    apadrinhar.mutate(
      { slug },
      {
        onSuccess: ({ id }) =>
          navigate({
            to: '/$locale/app/apadrinhamentos/$apadrinhamentoId',
            params: { locale, apadrinhamentoId: id },
          }),
      },
    );

  return (
    <div className="card bg-base-100 shadow-sm max-w-3xl md:card-side">
      {foto && (
        <figure className="md:w-72 shrink-0">
          <img
            src={foto}
            alt={g.nome}
            className="h-64 md:h-full w-full object-cover"
          />
        </figure>
      )}
      <div className="card-body gap-3">
        <h1 className="card-title text-2xl">
          {t`Apadrinhar`} {g.nome}
        </h1>
        {descricao && <p className="opacity-80">{descricao}</p>}

        <div className="stats stats-vertical sm:stats-horizontal bg-base-200">
          <div className="stat py-2">
            <div className="stat-title">{t`Custo médio por mês`}</div>
            <div className="stat-value text-xl">
              {g.custoMensalEstimadoCentavos !== null
                ? formatarReais(g.custoMensalEstimadoCentavos, i18n.locale)
                : '—'}
            </div>
            {g.custoMensalEstimadoCentavos === null && (
              <div className="stat-desc">{t`Ainda sem histórico de gastos`}</div>
            )}
          </div>
          <div className="stat py-2">
            <div className="stat-title">{t`Padrinhos`}</div>
            <div className="stat-value text-xl">{g.padrinhos}</div>
          </div>
        </div>

        <div className="text-sm flex flex-col gap-1">
          <p>
            {t`Todo mês você acompanha os gastos reais com este gatinho (ração, remédios, veterinário). A sua parte é o total do mês dividido igualmente entre todos os padrinhos.`}
          </p>
          <p className="opacity-70">
            {t`O pagamento online chega em breve. Até lá, a equipe da Amicats entra em contato para combinar.`}
          </p>
        </div>

        {jaApadrinha ? (
          <div role="status" className="alert alert-info alert-soft">
            <span>
              {t`Você já apadrinha este gatinho.`}{' '}
              <Link
                to="/$locale/app/apadrinhamentos"
                params={{ locale }}
                className="link"
              >
                {t`Ver meus apadrinhamentos`}
              </Link>
            </span>
          </div>
        ) : (
          <AlertaErro erro={apadrinhar.error} />
        )}

        <div className="card-actions justify-end">
          <button
            type="button"
            className="btn btn-primary"
            onClick={confirmar}
            disabled={apadrinhar.isPending || jaApadrinha}
          >
            <HeartHandshake className="size-4" />
            {t`Quero apadrinhar`}
          </button>
        </div>
      </div>
    </div>
  );
}
