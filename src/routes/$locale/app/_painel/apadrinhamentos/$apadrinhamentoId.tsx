import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useLingui } from '@lingui/react/macro';
import { z } from 'zod';
import { AlertaErro } from '@/components/app/alerta-erro';
import { Campo } from '@/components/app/campo';
import { formatarData } from '@/components/app/gato-saude';
import {
  formatarMes,
  formatarReais,
  mesAtual,
} from '@/components/app/shared/formatos';
import { useRotulos } from '@/hooks/use-rotulos';
import {
  extratoQuery,
  meusApadrinhamentosQuery,
  useEncerrarApadrinhamento,
} from '@/integrations/api/apadrinhamentos.queries';

export const Route = createFileRoute(
  '/$locale/app/_painel/apadrinhamentos/$apadrinhamentoId',
)({
  validateSearch: z.object({
    mes: z
      .string()
      .regex(/^\d{4}-\d{2}$/)
      .optional()
      .catch(undefined),
  }),
  component: ExtratoPage,
});

function ExtratoPage() {
  const { t, i18n } = useLingui();
  const rotulos = useRotulos();
  const { locale, apadrinhamentoId } = Route.useParams();
  const { mes } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const meus = useQuery(meusApadrinhamentosQuery);
  const extrato = useQuery({
    ...extratoQuery(apadrinhamentoId, mes),
    placeholderData: keepPreviousData,
  });
  const encerrar = useEncerrarApadrinhamento();
  // Quando é a equipe olhando o extrato de outra pessoa, o apadrinhamento não está em "meus".
  const ap = meus.data?.find((a) => a.id === apadrinhamentoId);
  const mesExibido = extrato.data?.mes ?? mes ?? mesAtual();

  const encerrarApadrinhamento = () => {
    if (
      !confirm(
        t`Encerrar este apadrinhamento? Você pode apadrinhar de novo quando quiser.`,
      )
    )
      return;
    encerrar.mutate(apadrinhamentoId);
  };

  return (
    <div className="flex flex-col gap-4 max-w-4xl">
      <div className="breadcrumbs text-sm">
        <ul>
          <li>
            <Link to="/$locale/app/apadrinhamentos" params={{ locale }}>
              {t`Meus apadrinhamentos`}
            </Link>
          </li>
          <li>{ap?.gato.nome ?? t`Extrato`}</li>
        </ul>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="text-2xl font-bold">
          {ap?.gato.nome ?? t`Extrato`}
          {ap && !ap.ativo && (
            <span className="badge badge-ghost ml-2 align-middle">{t`Encerrado`}</span>
          )}
        </h1>
        <Campo label={t`Mês`}>
          <input
            type="month"
            value={mesExibido}
            min={ap?.inicio.slice(0, 7)}
            max={(ap?.fim ?? new Date().toISOString()).slice(0, 7)}
            onChange={(e) =>
              e.target.value &&
              void navigate({ search: { mes: e.target.value }, replace: true })
            }
            className="input w-44"
          />
        </Campo>
      </div>

      <AlertaErro erro={extrato.error ?? encerrar.error} />

      {extrato.data && (
        <>
          <div className="stats stats-vertical sm:stats-horizontal bg-base-100 shadow-sm">
            <div className="stat">
              <div className="stat-title">{t`Gastos do mês`}</div>
              <div className="stat-value text-2xl">
                {formatarReais(extrato.data.totalCentavos, i18n.locale)}
              </div>
              <div className="stat-desc first-letter:uppercase">
                {formatarMes(extrato.data.mes, i18n.locale)}
              </div>
            </div>
            <div className="stat">
              <div className="stat-title">{t`Padrinhos no mês`}</div>
              <div className="stat-value text-2xl">
                {extrato.data.padrinhosNoMes}
              </div>
            </div>
            <div className="stat">
              <div className="stat-title">{t`Sua parte`}</div>
              <div className="stat-value text-2xl text-primary">
                {formatarReais(extrato.data.parteCentavos, i18n.locale)}
              </div>
              <div className="stat-desc">{t`Total dividido igualmente entre os padrinhos`}</div>
            </div>
          </div>

          <div className="overflow-x-auto bg-base-100 rounded-box shadow-sm">
            <table className="table">
              <thead>
                <tr>
                  <th>{t`Data`}</th>
                  <th>{t`Descrição`}</th>
                  <th className="hidden sm:table-cell">{t`Categoria`}</th>
                  <th className="text-right">{t`Valor`}</th>
                </tr>
              </thead>
              <tbody>
                {extrato.data.itens.length === 0 && (
                  <tr>
                    <td colSpan={4} className="opacity-70">
                      {t`Nenhum gasto lançado neste mês.`}
                    </td>
                  </tr>
                )}
                {extrato.data.itens.map((g) => (
                  <tr key={g.id}>
                    <td>{formatarData(g.data)}</td>
                    <td>{g.descricao}</td>
                    <td className="hidden sm:table-cell">
                      {rotulos.categoriaGasto[g.categoria]}
                    </td>
                    <td className="text-right whitespace-nowrap">
                      {formatarReais(g.valorCentavos, i18n.locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm opacity-70">
            {t`O pagamento online chega em breve. Até lá, a equipe da Amicats entra em contato para combinar.`}
          </p>
        </>
      )}

      {ap?.ativo && (
        <div>
          <button
            type="button"
            className="btn btn-ghost btn-sm text-error"
            onClick={encerrarApadrinhamento}
            disabled={encerrar.isPending}
          >
            {t`Encerrar apadrinhamento`}
          </button>
        </div>
      )}
    </div>
  );
}
