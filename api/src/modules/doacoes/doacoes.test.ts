import { createHmac } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, logarComo, prisma } from '../../../test/helpers.js';

let ctx: Awaited<ReturnType<typeof createTestApp>>;

beforeEach(async () => {
  ctx = await createTestApp();
});
afterEach(() => ctx.app.close());

const doar = (payload: Record<string, unknown>, headers = {}) =>
  ctx.app.inject({ method: 'POST', url: '/doacoes', headers, payload });

const situacao = (id: string) =>
  ctx.app.inject({ method: 'GET', url: `/doacoes/${id}` });

function pagamentoNoMp(
  referencia: string,
  status: string,
  valorCentavos: number,
  id = `pay-${crypto.randomUUID()}`,
) {
  const p = {
    id,
    status,
    externalReference: referencia,
    valorCentavos,
    data: new Date(),
  };
  ctx.pagamentos.registrarPagamento(p);
  return p;
}

function webhookPayment(dataId: string) {
  const ts = String(Date.now());
  const v1 = createHmac('sha256', 'segredo-webhook-teste')
    .update(`id:${dataId.toLowerCase()};request-id:req-1;ts:${ts};`)
    .digest('hex');
  return ctx.app.inject({
    method: 'POST',
    url: `/webhooks/mercadopago?data.id=${dataId}&type=payment`,
    headers: { 'x-signature': `ts=${ts},v1=${v1}`, 'x-request-id': 'req-1' },
    payload: { type: 'payment', data: { id: dataId } },
  });
}

describe('doações avulsas', () => {
  it('visitante sem conta doa e é mandado ao checkout do Mercado Pago', async () => {
    const res = await doar({
      valorCentavos: 5000,
      nome: 'Ana Doadora',
      email: 'ana@teste.org',
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().checkoutUrl).toMatch(/^https:\/\/mp\.test\/checkout/);
    expect(ctx.pagamentos.checkouts[0]).toMatchObject({
      titulo: 'Doação para a Amicats',
      referencia: `doacao:${res.json().id}`,
      emailPagador: 'ana@teste.org',
      valorCentavos: 5000,
      urlRetorno: `http://localhost:3000/pt-BR/doar/obrigado?doacao=${res.json().id}`,
    });

    const pendente = (await situacao(res.json().id)).json();
    expect(pendente).toEqual({
      id: res.json().id,
      status: 'pendente',
      valorCentavos: 5000,
      checkoutUrl: res.json().checkoutUrl,
      pagoEm: null,
    });
  });

  it('sem conta, nome e e-mail são obrigatórios; valor mínimo de R$ 5,00', async () => {
    expect((await doar({ valorCentavos: 5000 })).statusCode).toBe(400);
    expect(
      (await doar({ valorCentavos: 499, nome: 'Ana', email: 'ana@teste.org' }))
        .statusCode,
    ).toBe(400);
    expect(ctx.pagamentos.checkouts).toHaveLength(0);
  });

  it('logado, usa o nome e o e-mail da conta', async () => {
    const cliente = await logarComo(ctx.app, 'cliente');
    const res = await doar({ valorCentavos: 2000 }, cliente.headers);
    expect(res.statusCode).toBe(201);
    const doacao = await prisma.doacao.findUniqueOrThrow({
      where: { id: res.json().id },
    });
    expect(doacao).toMatchObject({
      userId: cliente.user.id,
      email: cliente.user.email,
      nome: cliente.user.nome,
    });
  });

  it('ao voltar do checkout aprovado: agradece por e-mail (uma vez) e avisa os adms', async () => {
    const adm = await logarComo(ctx.app, 'adm');
    const res = await doar({
      valorCentavos: 5000,
      nome: 'Ana Doadora',
      email: 'ana@teste.org',
    });
    const id = res.json().id as string;
    const pago = pagamentoNoMp(`doacao:${id}`, 'approved', 5000);

    const aprovada = (await situacao(id)).json();
    expect(aprovada).toMatchObject({
      status: 'aprovado',
      checkoutUrl: null,
      pagoEm: expect.any(String),
    });
    // O webhook chegando depois não repete e-mail nem notificação.
    await webhookPayment(pago.id);
    await situacao(id);

    const agradecimentos = ctx.mailer.enviados.filter(
      (e) => e.para === 'ana@teste.org',
    );
    expect(agradecimentos).toHaveLength(1);
    expect(agradecimentos[0]).toMatchObject({
      assunto: 'Obrigado pela sua doação à Amicats',
      texto: expect.stringContaining('R$ 50,00'),
    });

    const notificacoes = (
      await ctx.app.inject({
        method: 'GET',
        url: '/notificacoes',
        headers: adm.headers,
      })
    ).json();
    expect(notificacoes).toEqual([
      expect.objectContaining({
        tipo: 'doacao_recebida',
        titulo: 'Doação recebida: R$ 50,00',
        mensagem: 'Ana Doadora fez uma doação.',
      }),
    ]);
  });

  it('webhook: recusado não desfaz aprovado; estorno muda o status', async () => {
    const res = await doar({
      valorCentavos: 3000,
      nome: 'Ana',
      email: 'ana@teste.org',
    });
    const id = res.json().id as string;
    const recusado = pagamentoNoMp(`doacao:${id}`, 'rejected', 3000);
    await webhookPayment(recusado.id);
    expect((await situacao(id)).json().status).toBe('recusado');

    const aprovado = pagamentoNoMp(`doacao:${id}`, 'approved', 3000);
    await webhookPayment(aprovado.id);
    await webhookPayment(recusado.id);
    expect((await situacao(id)).json().status).toBe('aprovado');

    pagamentoNoMp(`doacao:${id}`, 'refunded', 3000, aprovado.id);
    await webhookPayment(aprovado.id);
    expect((await situacao(id)).json().status).toBe('estornado');
  });

  it('referência de doação malformada ou inexistente é ignorada', async () => {
    const malformada = pagamentoNoMp('doacao:xyz', 'approved', 1000);
    expect((await webhookPayment(malformada.id)).statusCode).toBe(200);
    const inexistente = pagamentoNoMp(
      `doacao:${crypto.randomUUID()}`,
      'approved',
      1000,
    );
    expect((await webhookPayment(inexistente.id)).statusCode).toBe(200);
    expect((await situacao(crypto.randomUUID())).statusCode).toBe(404);
  });
});
