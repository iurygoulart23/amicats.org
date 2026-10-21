import { describe, expect, it } from 'vitest';
import {
  atualizacaoDoPagamento,
  doacaoDaReferencia,
  referenciaDaDoacao,
  statusDoPagamento,
} from './pagamento.js';

const mp = (id: string, status: string) => ({
  id,
  status,
  externalReference: 'ref',
  valorCentavos: 2000,
  data: new Date('2026-10-01T12:00:00Z'),
});

describe('pagamentos avulsos', () => {
  it('traduz o status do Mercado Pago', () => {
    expect(statusDoPagamento('approved')).toBe('aprovado');
    expect(statusDoPagamento('rejected')).toBe('recusado');
    expect(statusDoPagamento('cancelled')).toBe('recusado');
    expect(statusDoPagamento('refunded')).toBe('estornado');
    expect(statusDoPagamento('charged_back')).toBe('estornado');
    expect(statusDoPagamento('in_process')).toBe('pendente');
    expect(statusDoPagamento('pending')).toBe('pendente');
  });

  it('aprovado só muda com o estorno do próprio pagamento', () => {
    const aprovado = { status: 'aprovado', mpPagamentoId: 'p2' };
    expect(atualizacaoDoPagamento(aprovado, mp('p1', 'rejected'))).toBeNull();
    expect(atualizacaoDoPagamento(aprovado, mp('p1', 'refunded'))).toBeNull();
    expect(atualizacaoDoPagamento(aprovado, mp('p2', 'refunded'))).toEqual({
      status: 'estornado',
      mpPagamentoId: 'p2',
    });
  });

  it('aprovação grava o valor e a data do Mercado Pago', () => {
    expect(
      atualizacaoDoPagamento(
        { status: 'recusado', mpPagamentoId: 'p1' },
        mp('p2', 'approved'),
      ),
    ).toEqual({
      status: 'aprovado',
      mpPagamentoId: 'p2',
      valorCentavos: 2000,
      pagoEm: new Date('2026-10-01T12:00:00Z'),
    });
  });

  it('referência de doação tem prefixo próprio', () => {
    expect(doacaoDaReferencia(referenciaDaDoacao('abc'))).toBe('abc');
    expect(doacaoDaReferencia('abc')).toBeNull();
    expect(doacaoDaReferencia(null)).toBeNull();
  });
});
