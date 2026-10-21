import { describe, expect, it } from 'vitest';
import { faltaPagar } from './apadrinhamento.js';

describe('parte do padrinho', () => {
  it('falta pagar nunca fica negativo', () => {
    expect(faltaPagar(5000, 2000)).toBe(3000);
    expect(faltaPagar(5000, 5000)).toBe(0);
    expect(faltaPagar(3000, 5000)).toBe(0);
  });
});
