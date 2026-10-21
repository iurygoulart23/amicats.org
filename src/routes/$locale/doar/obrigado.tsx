import { Link, createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useLingui } from '@lingui/react/macro';
import { CircleCheck, CircleX, Clock } from 'lucide-react';
import { z } from 'zod';
import { PaginaPublica } from './-components/pagina-publica';
import { AlertaErro } from '@/components/app/alerta-erro';
import { formatarReais } from '@/components/app/shared/formatos';
import { doacaoQuery } from '@/integrations/api/doacoes.queries';

export const Route = createFileRoute('/$locale/doar/obrigado')({
  validateSearch: z.object({
    doacao: z.string().uuid().optional().catch(undefined),
  }),
  component: ObrigadoPage,
});

/** Pix e boleto podem levar um tempo para confirmar: consulta de novo enquanto pendente. */
const INTERVALO_CONSULTA_MS = 5000;

function ObrigadoPage() {
  const { t, i18n } = useLingui();
  const { locale } = Route.useParams();
  const { doacao: id } = Route.useSearch();
  const doacao = useQuery({
    ...doacaoQuery(id ?? ''),
    enabled: Boolean(id),
    refetchInterval: (q) =>
      q.state.data?.status === 'pendente' ? INTERVALO_CONSULTA_MS : false,
  });
  const d = doacao.data;

  return (
    <PaginaPublica
      id="doar-obrigado"
      titulo={t`Obrigado!`}
      subtitulo={t`Cada doação faz diferença na vida dos gatos do abrigo.`}
    >
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body items-center text-center gap-3">
          <AlertaErro erro={doacao.error} />
          {!id && <p>{t`Não encontramos esta doação.`}</p>}
          {doacao.isLoading && <span className="loading loading-dots" />}

          {d?.status === 'aprovado' && (
            <>
              <CircleCheck className="size-12 text-success" />
              <p className="text-lg font-semibold">
                {t`Recebemos a sua doação de`}{' '}
                {formatarReais(d.valorCentavos, i18n.locale)}.
              </p>
              <p className="opacity-80">{t`Enviamos um agradecimento para o seu e-mail.`}</p>
            </>
          )}
          {d?.status === 'pendente' && (
            <>
              <Clock className="size-12 text-warning" />
              <p className="text-lg font-semibold">{t`Aguardando a confirmação do pagamento`}</p>
              <p className="opacity-80">
                {t`Pix e cartão costumam confirmar em instantes; boleto, em até 3 dias úteis. Esta página se atualiza sozinha.`}
              </p>
              {d.checkoutUrl && (
                <a href={d.checkoutUrl} className="btn btn-outline btn-sm">
                  {t`Continuar pagamento`}
                </a>
              )}
            </>
          )}
          {(d?.status === 'recusado' || d?.status === 'estornado') && (
            <>
              <CircleX className="size-12 text-error" />
              <p className="text-lg font-semibold">
                {d.status === 'recusado'
                  ? t`O pagamento não foi aprovado`
                  : t`Este pagamento foi estornado`}
              </p>
              <Link
                to="/$locale/doar"
                params={{ locale }}
                className="btn btn-primary"
              >
                {t`Tentar de novo`}
              </Link>
            </>
          )}

          <Link to="/$locale" params={{ locale }} className="link text-sm">
            {t`Voltar para o site`}
          </Link>
        </div>
      </div>
    </PaginaPublica>
  );
}
