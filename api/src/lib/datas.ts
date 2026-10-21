import { z } from 'zod';

/** Data sem horário no formato AAAA-MM-DD (colunas @db.Date). */
export const DataISO = z.iso.date();

export function paraData(valor: string): Date {
  return new Date(`${valor}T00:00:00.000Z`);
}

export function deData(data: Date): string {
  return data.toISOString().slice(0, 10);
}
