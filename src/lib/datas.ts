import { z } from 'zod';

/** Data sem horário no formato AAAA-MM-DD (colunas @db.Date). */
export const DataISO = z.iso.date();

export function paraData(valor: string): Date {
  return new Date(`${valor}T00:00:00.000Z`);
}

export function deData(data: Date): string {
  return data.toISOString().slice(0, 10);
}

/** Mês no formato AAAA-MM. */
export const MesISO = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use o formato AAAA-MM.');

/** Primeiro dia do mês e primeiro dia do mês seguinte (intervalo semiaberto). */
export function intervaloDoMes(mes: string) {
  const [ano, m] = mes.split('-').map(Number);
  return {
    inicio: new Date(Date.UTC(ano, m - 1, 1)),
    fimExclusivo: new Date(Date.UTC(ano, m, 1)),
  };
}

export function mesDe(data: Date): string {
  return data.toISOString().slice(0, 7);
}

/** Desloca um mês AAAA-MM em n meses (negativo volta). */
export function somarMeses(mes: string, n: number): string {
  const [ano, m] = mes.split('-').map(Number);
  return mesDe(new Date(Date.UTC(ano, m - 1 + n, 1)));
}
