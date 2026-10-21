import { describe, expect, it } from 'vitest';
import {
  atualizacaoDoPagamento,
  doacaoDaReferencia,
  entraNoHistorico,
  referenciaDaDoacao,
  resumoDosPagamentos,
  statusDaCobrancaNoHistorico,
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

describe('histórico e conciliação', () => {
  it('checkout aberto e nunca pago não entra no histórico', () => {
    expect(entraNoHistorico({ status: 'pendente', mpPagamentoId: null })).toBe(
      false,
    );
    expect(entraNoHistorico({ status: 'pendente', mpPagamentoId: 'p1' })).toBe(
      true,
    );
    expect(entraNoHistorico({ status: 'recusado', mpPagamentoId: 'p1' })).toBe(
      true,
    );
  });

  it('cobrança do Clube usa o mesmo vocabulário dos outros pagamentos', () => {
    expect(statusDaCobrancaNoHistorico('aprovada')).toBe('aprovado');
    expect(statusDaCobrancaNoHistorico('recusada')).toBe('recusado');
    expect(statusDaCobrancaNoHistorico('pendente')).toBe('pendente');
  });

  it('soma só o aprovado, por origem, e conta os status', () => {
    expect(
      resumoDosPagamentos([
        { tipo: 'clube', status: 'aprovado', valorCentavos: 2000 },
        { tipo: 'doacao', status: 'aprovado', valorCentavos: 5000 },
        { tipo: 'doacao', status: 'estornado', valorCentavos: 9900 },
        { tipo: 'apadrinhamento', status: 'pendente', valorCentavos: 3275 },
      ]),
    ).toEqual({
      aprovadoCentavos: 7000,
      aprovadoPorTipo: { clube: 2000, apadrinhamento: 0, doacao: 5000 },
      quantidade: { pendente: 1, aprovado: 2, recusado: 0, estornado: 1 },
    });
  });
});
