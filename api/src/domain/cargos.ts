export const CARGOS = ['cliente', 'voluntario', 'adm'] as const;

/** 'adm' | 'voluntario' (voluntário) | 'cliente' (público) */
export type Cargo = (typeof CARGOS)[number];

// Cargos em camadas: adm ⊃ voluntario ⊃ cliente. Quem tem um cargo acima pode
// tudo que os cargos abaixo podem (ex.: voluntário também apadrinha e assina).
const NIVEL: Record<Cargo, number> = { cliente: 0, voluntario: 1, adm: 2 };

export function podeAcessar(cargo: Cargo, exigido: Cargo): boolean {
  return NIVEL[cargo] >= NIVEL[exigido];
}
