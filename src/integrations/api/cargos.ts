import type { Cargo } from './types';

// Cargos em camadas: adm ⊃ voluntario ⊃ cliente.
const NIVEL: Record<Cargo, number> = { cliente: 0, voluntario: 1, adm: 2 };

export function podeAcessar(cargo: Cargo, exigido: Cargo): boolean {
  return NIVEL[cargo] >= NIVEL[exigido];
}
