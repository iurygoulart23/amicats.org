import { cloneElement, isValidElement, useId } from 'react';
import type { ReactElement, ReactNode } from 'react';

export interface CampoProps {
  label: string;
  erro?: string;
  dica?: string;
  children: ReactNode;
}

/**
 * Campo de formulário. O <label> envolve o controle (clicar no texto foca o campo) e o
 * aria-labelledby fixa o nome acessível só no rótulo — sem ele, um <select> embutido
 * somaria a opção escolhida ao nome ("Tipo Consulta").
 */
export function Campo({ label, erro, dica, children }: CampoProps) {
  const id = useId();
  const controle = isValidElement(children)
    ? cloneElement(children as ReactElement<{ 'aria-labelledby'?: string }>, {
        'aria-labelledby': `${id}-rotulo`,
      })
    : children;

  return (
    <div className="fieldset">
      <label className="flex flex-col gap-1">
        <span id={`${id}-rotulo`} className="fieldset-legend">
          {label}
        </span>
        {controle}
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
