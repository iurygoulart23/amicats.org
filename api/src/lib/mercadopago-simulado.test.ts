import { describe, expect, it } from 'vitest';
import { loadEnv } from '../env.js';
import { createGatewaySimulado } from './mercadopago-simulado.js';

describe('simulador do Mercado Pago (desenvolvimento)', () => {
  it('cria assinatura pendente com checkout local; aprovar ativa e gera cobrança', async () => {
    const simulado = createGatewaySimulado('http://localhost:3333');
    const criada = await simulado.gateway.criarAssinatura({
      motivo: 'Clube Amicats — Amigo',
      referencia: 'ref-1',
      emailPagador: 'ana@teste.org',
      valorCentavos: 2000,
      urlRetorno: 'http://localhost:3000/pt-BR/app/clube',
    });
    expect(criada.status).toBe('pending');
    expect(criada.checkoutUrl).toBe(
      `http://localhost:3333/dev/mercadopago/checkout/${criada.id}`,
    );

    const aprovado = simulado.aprovar(criada.id);
    if (aprovado.tipo !== 'assinatura') throw new Error('tipo errado');
    const { urlRetorno, cobrancaId } = aprovado;
    expect(urlRetorno).toBe('http://localhost:3000/pt-BR/app/clube');
    expect((await simulado.gateway.obterAssinatura(criada.id)).status).toBe(
      'authorized',
    );
    expect(await simulado.gateway.obterCobranca(cobrancaId)).toMatchObject({
      assinaturaMpId: criada.id,
      valorCentavos: 2000,
      statusPagamento: 'approved',
    });
  });

  it('cria checkout de pagamento único; aprovar gera o pagamento com a referência', async () => {
    const simulado = createGatewaySimulado('http://localhost:3333');
    const checkout = await simulado.gateway.criarCheckout({
      titulo: 'Apadrinhamento de Raul — setembro de 2026',
      referencia: 'ref-2',
      emailPagador: 'ana@teste.org',
      valorCentavos: 4550,
      urlRetorno: 'http://localhost:3000/pt-BR/app/apadrinhamentos/x',
    });
    expect(checkout.checkoutUrl).toBe(
      `http://localhost:3333/dev/mercadopago/checkout/${checkout.id}`,
    );
    expect(simulado.dados(checkout.id)).toMatchObject({
      valorCentavos: 4550,
      recorrente: false,
    });
    expect(await simulado.gateway.buscarPagamentos('ref-2')).toEqual([]);

    const aprovado = simulado.aprovar(checkout.id);
    if (aprovado.tipo !== 'checkout') throw new Error('tipo errado');
    const pagamento = await simulado.gateway.obterPagamento(
      aprovado.pagamentoId,
    );
    expect(pagamento).toMatchObject({
      status: 'approved',
      externalReference: 'ref-2',
      valorCentavos: 4550,
    });
    expect(await simulado.gateway.buscarPagamentos('ref-2')).toEqual([
      pagamento,
    ]);
  });

  it('não é permitido em produção', () => {
    expect(() =>
      loadEnv({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://x',
        WEB_ORIGIN: 'https://amicats.org',
        MP_SIMULADO: 'true',
      }),
    ).toThrow(/MP_SIMULADO/);
  });
});
