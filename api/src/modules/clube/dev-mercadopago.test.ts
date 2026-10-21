import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from '../../app.js';
import { createGatewaySimulado } from '../../lib/mercadopago-simulado.js';
import {
  createFakeGateway,
  createFakeMailer,
  createFakeStorage,
  env,
  login,
  criarUsuario,
  prisma,
} from '../../../test/helpers.js';

let app: Awaited<ReturnType<typeof buildApp>>;
afterEach(() => app.close());

describe('checkout simulado (desenvolvimento)', () => {
  it('aprovar no checkout simulado ativa a assinatura, registra a cobrança e volta ao site', async () => {
    const simuladorMp = createGatewaySimulado('http://localhost:3333');
    app = await buildApp({
      env,
      prisma,
      mailer: createFakeMailer(),
      storage: createFakeStorage(),
      pagamentos: simuladorMp.gateway,
      simuladorMp,
    });
    const plano = await prisma.planoClube.create({
      data: { nome: 'Amigo', valorCentavos: 2000 },
    });
    const user = await criarUsuario('cliente');
    const headers = await login(app, user.email);

    const { checkoutUrl } = (
      await app.inject({
        method: 'POST',
        url: '/clube/assinaturas',
        headers,
        payload: { planoId: plano.id },
      })
    ).json();
    const caminho = new URL(checkoutUrl).pathname;

    const pagina = await app.inject({ method: 'GET', url: caminho });
    expect(pagina.body).toContain('Simular pagamento aprovado');

    // Como o navegador envia: formulário HTML, com a origem da página do checkout (a API).
    const aprovado = await app.inject({
      method: 'POST',
      url: caminho,
      headers: {
        origin: 'http://localhost:3333',
        'content-type': 'application/x-www-form-urlencoded',
      },
      payload: '',
    });
    expect(aprovado.statusCode).toBe(303);
    expect(aprovado.headers.location).toBe(
      'http://localhost:3000/pt-BR/app/clube',
    );

    const minha = (
      await app.inject({ method: 'GET', url: '/clube/minha', headers })
    ).json();
    expect(minha).toMatchObject({
      status: 'ativa',
      cobrancas: [
        expect.objectContaining({ status: 'aprovada', valorCentavos: 2000 }),
      ],
    });
  });

  it('sem o simulador as rotas de checkout não existem', async () => {
    app = await buildApp({
      env,
      prisma,
      mailer: createFakeMailer(),
      storage: createFakeStorage(),
      pagamentos: createFakeGateway(),
    });
    const res = await app.inject({
      method: 'GET',
      url: '/dev/mercadopago/checkout/qualquer',
    });
    expect(res.statusCode).toBe(404);
  });
});
