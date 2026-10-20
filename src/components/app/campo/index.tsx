import type { ReactNode } from 'react';

export interface CampoProps {
  label: string;
  erro?: string;
  dica?: string;
  children: ReactNode;
}

/** Campo de formulário: o <label> envolve o controle para associar o nome a ele. */
export function Campo({ label, erro, dica, children }: CampoProps) {
  return (
    <div className="fieldset">
      <label className="flex flex-col gap-1">
        <span className="fieldset-legend">{label}</span>
        {children}
      </label>
      {erro ? (
        <p className="label text-error" role="alert">
          {erro}
        </p>
      ) : (
        dica && <p className="label">{dica}</p>
      )}
    </div>
  );
}
