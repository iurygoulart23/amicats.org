import { describe, expect, it } from 'vitest';
import {
  datetimeLocalParaIso,
  formatarHoraAbrigo,
  formatarMes,
  formatarReais,
  hojeNoAbrigo,
  reaisParaCentavos,
} from './formatos';

describe('formatos', () => {
  it('formata centavos em reais', () => {
    expect(formatarReais(123456).replace(/\s/g, ' ')).toBe('R$ 1.234,56');
    expect(formatarReais(500, 'en')).toBe('R$5.00');
  });

  it('converte o valor digitado em centavos', () => {
    expect(reaisParaCentavos('89,90')).toBe(8990);
    expect(reaisParaCentavos('R$ 1.234,56')).toBe(123456);
    expect(reaisParaCentavos('15.5')).toBe(1550);
    expect(reaisParaCentavos('150')).toBe(15000);
  });

  it('escreve o mês por extenso', () => {
    expect(formatarMes('2026-09')).toBe('setembro de 2026');
    expect(formatarMes('2026-09', 'en')).toBe('September 2026');
  });

  it('mostra horários no fuso do abrigo (Campo Grande, UTC-4)', () => {
    expect(formatarHoraAbrigo('2026-10-21T12:00:00.000Z')).toBe('08:00');
    expect(datetimeLocalParaIso('2026-10-20T08:00')).toBe(
      '2026-10-20T08:00:00-04:00',
    );
    // 02:00 UTC do dia 22 ainda é dia 21 em Campo Grande.
    expect(hojeNoAbrigo(new Date('2026-10-22T02:00:00Z'))).toBe('2026-10-21');
  });
});
