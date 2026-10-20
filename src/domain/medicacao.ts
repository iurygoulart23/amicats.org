export const VIAS = [
  'oral',
  'topica',
  'injetavel',
  'ocular',
  'otologica',
  'outra',
] as const;
export type Via = (typeof VIAS)[number];

export const TIPOS_EVENTO_VET = [
  'consulta',
  'vacina',
  'vermifugo',
  'exame',
  'cirurgia',
  'castracao',
  'outro',
] as const;
export type TipoEventoVet = (typeof TIPOS_EVENTO_VET)[number];

/** Campo Grande/MS: UTC-4 o ano todo (sem horário de verão desde 2019). */
export const FUSO_ABRIGO = 'America/Campo_Grande';
const OFFSET_ABRIGO_HORAS = -4;
const HORA_MS = 60 * 60 * 1000;

/** Início e fim (exclusivo) de um dia AAAA-MM-DD no horário do abrigo, em UTC. */
export function intervaloDoDiaNoAbrigo(dia: string) {
  const inicio = new Date(
    new Date(`${dia}T00:00:00.000Z`).getTime() - OFFSET_ABRIGO_HORAS * HORA_MS,
  );
  return { inicio, fimExclusivo: new Date(inicio.getTime() + 24 * HORA_MS) };
}

/** Dia AAAA-MM-DD de um instante, no horário do abrigo. */
export function diaNoAbrigo(instante: Date): string {
  return new Date(instante.getTime() + OFFSET_ABRIGO_HORAS * HORA_MS)
    .toISOString()
    .slice(0, 10);
}

type PrescricaoAgendavel = {
  inicio: Date;
  intervaloHoras: number;
  fim: Date | null;
  encerradaEm: Date | null;
};

/** Doses previstas da prescrição dentro de [de, ate). */
export function dosesPrevistas(
  p: PrescricaoAgendavel,
  de: Date,
  ate: Date,
): Array<Date> {
  const passo = p.intervaloHoras * HORA_MS;
  const limites = [
    ate.getTime(),
    p.fim ? p.fim.getTime() + 1 : Infinity,
    p.encerradaEm?.getTime() ?? Infinity,
  ];
  const limite = Math.min(...limites);
  const primeiraK = Math.max(
    0,
    Math.ceil((de.getTime() - p.inicio.getTime()) / passo),
  );
  const doses: Array<Date> = [];
  for (let t = p.inicio.getTime() + primeiraK * passo; t < limite; t += passo) {
    doses.push(new Date(t));
  }
  return doses;
}
