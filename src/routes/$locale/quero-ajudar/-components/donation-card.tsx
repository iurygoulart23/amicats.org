import React, { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Trans, useLingui } from '@lingui/react/macro';
import { Copy, CreditCard, FileText, Info, Repeat } from 'lucide-react';
import { cn } from '@/components/layout/shared/helpers/class.helper';

interface Props {
  locale: string;
}

export function DonationCard({ locale }: Props) {
  const { t } = useLingui();
  const PIX = '27.806.981/0001-15';
  const recurring2 = 'https://apoia.se/resgateemanutencaoong';

  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(PIX);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // swallow but log in dev for diagnostics
      if (process.env.NODE_ENV !== 'test') console.warn('copy failed', err);
    }
  }

  return (
    <section className={cn('rounded-lg bg-base-200 p-6 shadow-sm')}>
      <div className="grid gap-6 md:grid-cols-2">
        {/* Left: One-time donation */}
        <div className={cn('bg-base-100 rounded-md p-4')}>
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-semibold mb-1">{t`Doação Única`}</h3>
              <p className="text-base-content/80">{t`Contribua com qualquer valor através de PIX, boleto ou cartão`}</p>
            </div>
            <CreditCard className="text-primary" />
          </div>

          <div className="mt-4 rounded-md bg-base-200 p-3 flex items-center justify-between">
            <div>
              <div className="text-sm text-base-content/80">{t`PIX (CNPJ):`}</div>
              <div className="font-mono font-medium">{PIX}</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn btn-ghost btn-sm flex items-center gap-2"
                onClick={handleCopy}
                aria-live="polite"
                aria-label={copied ? t`Copiado` : t`Copiar PIX`}
              >
                <Copy className="h-4 w-4" />
                {copied ? <Trans>Copiado</Trans> : <Trans>Copiar</Trans>}
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            <a
              className="btn btn-outline btn-disabled w-full sm:w-auto flex items-center gap-2"
              target="_blank"
              rel="noreferrer"
              aria-disabled="true"
            >
              <FileText className="h-4 w-4" />
              <Trans>Doe por Boleto</Trans>
              <div className='badge badge-accent badge-xs text-white'><Trans>Em breve</Trans></div>
            </a>
          </div>
        </div>

        {/* Right: Recurring donations */}
        <div className={cn('bg-base-100 rounded-md p-4')}>
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-semibold mb-1">{t`Doação Recorrente`}</h3>
              <p className="text-base-content/80">{t`Contribua mensalmente e nos ajude a planejar melhor`}</p>
              <p className="text-base-content/80 mt-2">{t`Escolha o valor mensal que cabe no seu orçamento`}</p>
            </div>
            <Repeat className="text-secondary" />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2">
            <Link
              to="/$locale/app/clube"
              params={{ locale }}
              className="btn btn-primary flex items-center gap-2"
            >
              <Repeat className="h-4 w-4" />
              <Trans>Assinar o Clube Amicats</Trans>
            </Link>
            <a
              className="btn btn-outline flex items-center gap-2"
              href={recurring2}
              target="_blank"
              rel="noreferrer"
            >
              <Repeat className="h-4 w-4" />
              <Trans>Financiamento Coletivo</Trans>
              <div className='badge badge-primary badge-xs text-white'>Apoia-se</div>
            </a>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <Link
          to={`/${locale}/como-funciona/?section=apadrinhamento`}
          className="btn btn-ghost flex items-center gap-2"
        >
          <Info className="h-4 w-4" />
          <Trans>Saiba como apadrinhar</Trans>
        </Link>
      </div>
    </section>
  );
}

// Note: no default export — components in this codebase use named exports
