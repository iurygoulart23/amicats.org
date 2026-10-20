import { useLingui } from '@lingui/react/macro';

export interface AlertaErroProps {
  erro: unknown;
}

export function AlertaErro({ erro }: AlertaErroProps) {
  const { t } = useLingui();
  if (!erro) return null;
  const mensagem =
    erro instanceof Error ? erro.message : t`Algo deu errado. Tente novamente.`;
  return (
    <div role="alert" className="alert alert-error alert-soft">
      <span>{mensagem}</span>
    </div>
  );
}
