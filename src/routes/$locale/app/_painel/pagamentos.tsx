import { Link, createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useLingui } from '@lingui/react/macro';
import { Receipt } from 'lucide-react';
import { AlertaErro } from '@/components/app/alerta-erro';
import {
  DescricaoPagamento,
  StatusPagamentoBadge,
} from '@/components/app/pagamento';
import {
  formatarDataAbrigo,
  formatarReais,
} from '@/components/app/shared/formatos';
import { meusPagamentosQuery } from '@/integrations/api/pagamentos.queries';

export const Route = createFileRoute('/$locale/app/_painel/pagamentos')({
  component: MeusPagamentosPage,
});

function MeusPagamentosPage() {
  const { t, i18n } = useLingui();
  const { locale } = Route.useParams();
  const pagamentos = useQuery(meusPagamentosQuery);
  const itens = pagamentos.data?.itens;

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Receipt className="size-6 text-primary" />
          {t`Meus pagamentos`}
        </h1>
        <p className="opacity-70">
          {t`Cobranças do Clube, a sua parte nos apadrinhamentos e as doações feitas com a sua conta.`}
        </p>
      </div>

      <AlertaErro erro={pagamentos.error} />
      {pagamentos.isPending && <span className="loading loading-dots" />}

      {itens?.length === 0 && (
        <div role="status" className="alert alert-soft">
          <span>
            {t`Você ainda não tem pagamentos.`}{' '}
            <Link to="/$locale/doar" params={{ locale }} className="link">
              {t`Fazer uma doação`}
            </Link>
          </span>
        </div>
      )}

      {itens && itens.length > 0 && (
        <div className="overflow-x-auto bg-base-100 rounded-box shadow-sm">
          <table className="table">
            <thead>
              <tr>
                <th>{t`Data`}</th>
                <th>{t`Pagamento`}</th>
                <th className="text-right">{t`Valor`}</th>
                <th>{t`Situação`}</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((p) => (
                <tr key={`${p.tipo}-${p.id}`}>
                  <td className="whitespace-nowrap">
                    {formatarDataAbrigo(p.data)}
                  </td>
                  <td>
                    <DescricaoPagamento pagamento={p} />
                  </td>
                  <td className="text-right whitespace-nowrap">
                    {formatarReais(p.valorCentavos, i18n.locale)}
                  </td>
                  <td>
                    <StatusPagamentoBadge status={p.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
