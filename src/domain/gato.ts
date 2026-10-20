export const STATUS_GATO = [
  'disponivel',
  'apadrinhado',
  'adotado',
  'em_tratamento',
  'falecido',
] as const;
export type StatusGato = (typeof STATUS_GATO)[number];

export const SEXOS = ['macho', 'femea', 'desconhecido'] as const;
export type Sexo = (typeof SEXOS)[number];

/** Quão precisa é a data de nascimento aproximada. */
export const PRECISOES_NASCIMENTO = ['dia', 'mes', 'ano'] as const;
export type PrecisaoNascimento = (typeof PRECISOES_NASCIMENTO)[number];

export const TIPOS_TAG = ['doenca', 'comportamento', 'cuidado'] as const;
export type TipoTag = (typeof TIPOS_TAG)[number];

export function slugify(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
