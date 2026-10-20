export const CATEGORIAS_GASTO = [
  'racao',
  'medicamento',
  'veterinario',
  'exame',
  'higiene',
  'outro',
] as const;
export type CategoriaGasto = (typeof CATEGORIAS_GASTO)[number];
