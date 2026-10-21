import { describe, expect, it } from 'vitest';
import { faltaPagar, statusDoPagamento } from './apadrinhamento.js';

describe('pagamento da parte do padrinho', () => {
  it('traduz o status do Mercado Pago', () => {
    expect(statusDoPagamento('approved')).toBe('aprovado');
    expect(statusDoPagamento('rejected')).toBe('recusado');
    expect(statusDoPagamento('cancelled')).toBe('recusado');
    expect(statusDoPagamento('refunded')).toBe('estornado');
    expect(statusDoPagamento('charged_back')).toBe('estornado');
    expect(statusDoPagamento('in_process')).toBe('pendente');
    expect(statusDoPagamento('pending')).toBe('pendente');
  });

  it('falta pagar nunca fica negativo', () => {
    expect(faltaPagar(5000, 2000)).toBe(3000);
    expect(faltaPagar(5000, 5000)).toBe(0);
    expect(faltaPagar(3000, 5000)).toBe(0);
  });
});
