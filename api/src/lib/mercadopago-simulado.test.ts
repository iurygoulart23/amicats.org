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

    const { urlRetorno, cobrancaId } = simulado.aprovar(criada.id);
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
