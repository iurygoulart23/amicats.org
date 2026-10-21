import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useLingui } from '@lingui/react/macro';
import { HandCoins } from 'lucide-react';
import { PaginaPublica } from './-components/pagina-publica';
import { AlertaErro } from '@/components/app/alerta-erro';
import { Campo } from '@/components/app/campo';
import {
  formatarReais,
  reaisParaCentavos,
} from '@/components/app/shared/formatos';
import { meQuery } from '@/integrations/api/auth.queries';
import { useDoar } from '@/integrations/api/doacoes.queries';

export const Route = createFileRoute('/$locale/doar/')({
  component: DoarPage,
});

const SUGESTOES_CENTAVOS = [2000, 5000, 10000];
const MINIMO_CENTAVOS = 500;

function DoarPage() {
  const { t, i18n } = useLingui();
  const me = useQuery(meQuery);
  const doar = useDoar();
  const [sugestao, setSugestao] = useState<number | null>(5000);
  const [outroValor, setOutroValor] = useState('');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');

  const valorCentavos = sugestao ?? reaisParaCentavos(outroValor);
  const valorValido =
    Number.isFinite(valorCentavos) && valorCentavos >= MINIMO_CENTAVOS;
  const logado = Boolean(me.data);

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valorValido) return;
    doar.mutate(logado ? { valorCentavos } : { valorCentavos, nome, email }, {
      onSuccess: ({ checkoutUrl }) => {
        window.location.href = checkoutUrl;
      },
    });
  };

  return (
    <PaginaPublica
      id="doar"
      titulo={t`Doe para a Amicats`}
      subtitulo={t`Qualquer valor ajuda a manter o abrigo: ração, remédios, veterinário e muito carinho.`}
    >
      <form
        onSubmit={enviar}
        className="card bg-base-100 shadow-sm"
        aria-label={t`Doação`}
      >
        <div className="card-body gap-4">
          <fieldset className="fieldset">
            <legend className="fieldset-legend">{t`Valor da doação`}</legend>
            <div className="flex flex-wrap gap-2">
              {SUGESTOES_CENTAVOS.map((v) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={sugestao === v}
                  className={
                    sugestao === v ? 'btn btn-primary' : 'btn btn-outline'
                  }
                  onClick={() => setSugestao(v)}
                >
                  {formatarReais(v, i18n.locale)}
                </button>
              ))}
              <button
                type="button"
                aria-pressed={sugestao === null}
                className={
                  sugestao === null ? 'btn btn-primary' : 'btn btn-outline'
                }
                onClick={() => setSugestao(null)}
              >
                {t`Outro valor`}
              </button>
            </div>
          </fieldset>

          {sugestao === null && (
            <Campo
              label={t`Quanto você quer doar (R$)`}
              dica={t`Mínimo de R$ 5,00`}
            >
              <input
                className="input w-full"
                inputMode="decimal"
                value={outroValor}
                onChange={(e) => setOutroValor(e.target.value)}
                placeholder="35,00"
                autoFocus
                required
              />
            </Campo>
          )}

          {me.isSuccess && !logado && (
            <>
              <Campo label={t`Nome`}>
                <input
                  className="input w-full"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  autoComplete="name"
                  required
                />
              </Campo>
              <Campo
                label={t`E-mail`}
                dica={t`Para enviarmos o agradecimento.`}
              >
                <input
                  type="email"
                  className="input w-full"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </Campo>
            </>
          )}
          {me.data && (
            <p className="text-sm opacity-70">
              {t`Doando como`} {me.data.nome} ({me.data.email})
            </p>
          )}

          <AlertaErro erro={doar.error} />

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={!valorValido || doar.isPending || me.isPending}
          >
            {doar.isPending ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              <HandCoins className="size-5" />
            )}
            {valorValido
              ? `${t`Doar`} ${formatarReais(valorCentavos, i18n.locale)}`
              : t`Doar`}
          </button>
          <p className="text-xs opacity-70 text-center">
            {t`Você será levado ao Mercado Pago para pagar com pix, cartão ou boleto.`}
          </p>
        </div>
      </form>
    </PaginaPublica>
  );
}
