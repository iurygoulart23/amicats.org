import { createHmac } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, logarComo } from '../../../test/helpers.js';

let ctx: Awaited<ReturnType<typeof createTestApp>>;

beforeEach(async () => {
  ctx = await createTestApp();
});
afterEach(() => ctx.app.close());

async function criarFaixas() {
  const adm = await logarComo(ctx.app, 'adm');
  const faixas = [];
  for (const [nome, valorCentavos, ordem] of [
    ['Amigo', 2000, 1],
    ['Protetor', 5000, 2],
    ['Guardião', 10000, 3],
  ] as const) {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/clube/planos',
      headers: adm.headers,
      payload: { nome, valorCentavos, ordem },
    });
    faixas.push(res.json());
  }
  return { adm, faixas };
}

async function assinar(headers: { cookie: string }, planoId: string) {
  return ctx.app.inject({
    method: 'POST',
    url: '/clube/assinaturas',
    headers,
    payload: { planoId },
  });
}

const minha = async (headers: { cookie: string }) =>
  ctx.app.inject({ method: 'GET', url: '/clube/minha', headers });

/** Envia um webhook assinado como o Mercado Pago faria. */
function webhook(
  tipo: string,
  dataId: string,
  opcoes: { assinatura?: string } = {},
) {
  const ts = String(Date.now());
  const manifest = `id:${dataId.toLowerCase()};request-id:req-1;ts:${ts};`;
  const v1 = createHmac('sha256', 'segredo-webhook-teste')
    .update(manifest)
    .digest('hex');
  return ctx.app.inject({
    method: 'POST',
    url: `/webhooks/mercadopago?data.id=${dataId}&type=${tipo}`,
    headers: {
      'x-signature': opcoes.assinatura ?? `ts=${ts},v1=${v1}`,
      'x-request-id': 'req-1',
    },
    payload: { type: tipo, action: 'updated', data: { id: dataId } },
  });
}

describe('faixas do clube', () => {
  it('qualquer visitante vê as faixas ativas em ordem; só adm cria e edita', async () => {
    const { adm, faixas } = await criarFaixas();
    await ctx.app.inject({
      method: 'PATCH',
      url: `/clube/planos/${faixas[2].id}`,
      headers: adm.headers,
      payload: { ativo: false },
    });

    const res = await ctx.app.inject({ method: 'GET', url: '/clube/planos' });
    expect(
      res
        .json()
        .map((f: { nome: string; valorCentavos: number }) => [
          f.nome,
          f.valorCentavos,
        ]),
    ).toEqual([
      ['Amigo', 2000],
      ['Protetor', 5000],
    ]);

    const vol = await logarComo(ctx.app, 'voluntario');
    const porVol = await ctx.app.inject({
      method: 'POST',
      url: '/clube/planos',
      headers: vol.headers,
      payload: { nome: 'X', valorCentavos: 100 },
    });
    expect(porVol.statusCode).toBe(403);
  });
});

describe('assinatura', () => {
  it('cliente escolhe a faixa e é mandado ao checkout do Mercado Pago', async () => {
    const { faixas } = await criarFaixas();
    const cliente = await logarComo(ctx.app, 'cliente');

    const res = await assinar(cliente.headers, faixas[1].id);
    expect(res.statusCode).toBe(201);
    expect(res.json().checkoutUrl).toMatch(/^https:\/\/mp\.test\/checkout/);

    const [criada] = ctx.pagamentos.criadas;
    expect(criada).toMatchObject({
      valorCentavos: 5000,
      emailPagador: cliente.user.email,
      motivo: 'Clube Amicats — Protetor',
      urlRetorno: 'http://localhost:3000/pt-BR/app/clube',
    });

    const atual = await minha(cliente.headers);
    expect(atual.json()).toMatchObject({
      status: 'pendente',
      valorCentavos: 5000,
      plano: expect.objectContaining({ nome: 'Protetor' }),
      checkoutUrl: res.json().checkoutUrl,
    });
    expect(criada?.referencia).toBe(atual.json().id);
  });

  it('ao voltar do Mercado Pago, a assinatura é sincronizada e os adms são avisados', async () => {
    const { adm, faixas } = await criarFaixas();
    const cliente = await logarComo(ctx.app, 'cliente');
    await assinar(cliente.headers, faixas[0].id);
    const proxima = new Date('2026-11-21T12:00:00Z');
    ctx.pagamentos.definirStatus(
      ctx.pagamentos.criadas[0]!.id,
      'authorized',
      proxima,
    );

    const atual = await minha(cliente.headers);
    expect(atual.json()).toMatchObject({
      status: 'ativa',
      proximaCobranca: proxima.toISOString(),
    });

    const notificacoes = (
      await ctx.app.inject({
        method: 'GET',
        url: '/notificacoes',
        headers: adm.headers,
      })
    ).json();
    expect(notificacoes).toEqual([
      expect.objectContaining({ titulo: 'Nova assinatura do Clube: Amigo' }),
    ]);
  });

  it('com assinatura ativa não dá para assinar de novo; a pendente é trocada', async () => {
    const { faixas } = await criarFaixas();
    const cliente = await logarComo(ctx.app, 'cliente');
    await assinar(cliente.headers, faixas[0].id);
    const primeira = ctx.pagamentos.criadas[0]!.id;

    // Pendente: desistiu e escolheu outra faixa.
    expect((await assinar(cliente.headers, faixas[1].id)).statusCode).toBe(201);
    expect(ctx.pagamentos.canceladas).toEqual([primeira]);

    ctx.pagamentos.definirStatus(ctx.pagamentos.criadas[1]!.id, 'authorized');
    await minha(cliente.headers);
    expect((await assinar(cliente.headers, faixas[2].id)).statusCode).toBe(409);
  });

  it('faixa desativada não pode ser assinada', async () => {
    const { adm, faixas } = await criarFaixas();
    await ctx.app.inject({
      method: 'PATCH',
      url: `/clube/planos/${faixas[0].id}`,
      headers: adm.headers,
      payload: { ativo: false },
    });
    const cliente = await logarComo(ctx.app, 'cliente');
    expect((await assinar(cliente.headers, faixas[0].id)).statusCode).toBe(400);
  });

  it('mudar o valor da faixa não muda quem já assinou', async () => {
    const { adm, faixas } = await criarFaixas();
    const cliente = await logarComo(ctx.app, 'cliente');
    await assinar(cliente.headers, faixas[0].id);
    await ctx.app.inject({
      method: 'PATCH',
      url: `/clube/planos/${faixas[0].id}`,
      headers: adm.headers,
      payload: { valorCentavos: 2500 },
    });
    expect((await minha(cliente.headers)).json().valorCentavos).toBe(2000);
  });

  it('assinante cancela pela plataforma e o Mercado Pago para de cobrar', async () => {
    const { faixas } = await criarFaixas();
    const cliente = await logarComo(ctx.app, 'cliente');
    await assinar(cliente.headers, faixas[0].id);
    const mpId = ctx.pagamentos.criadas[0]!.id;
    ctx.pagamentos.definirStatus(mpId, 'authorized');

    const res = await ctx.app.inject({
      method: 'POST',
      url: '/clube/minha/cancelar',
      headers: cliente.headers,
    });
    expect(res.statusCode).toBe(204);
    expect(ctx.pagamentos.canceladas).toContain(mpId);
    expect((await minha(cliente.headers)).json()).toMatchObject({
      status: 'cancelada',
    });
  });

  it('sem assinatura, "minha" responde vazio', async () => {
    const cliente = await logarComo(ctx.app, 'cliente');
    const res = await minha(cliente.headers);
    expect(res.statusCode).toBe(200);
    expect(res.json()).toBeNull();
  });
});

describe('webhook do Mercado Pago', () => {
  async function assinaturaPendente() {
    const { adm, faixas } = await criarFaixas();
    const cliente = await logarComo(ctx.app, 'cliente');
    await assinar(cliente.headers, faixas[1].id);
    return { adm, cliente, mpId: ctx.pagamentos.criadas[0]!.id };
  }

  it('recusa aviso sem assinatura válida', async () => {
    const { mpId } = await assinaturaPendente();
    const res = await webhook('subscription_preapproval', mpId, {
      assinatura: `ts=${Date.now()},v1=${'0'.repeat(64)}`,
    });
    expect(res.statusCode).toBe(401);
  });

  it('atualiza o status quando o Mercado Pago avisa da assinatura', async () => {
    const { cliente, mpId } = await assinaturaPendente();
    ctx.pagamentos.definirStatus(mpId, 'authorized');

    expect((await webhook('subscription_preapproval', mpId)).statusCode).toBe(
      200,
    );
    expect((await minha(cliente.headers)).json().status).toBe('ativa');

    ctx.pagamentos.definirStatus(mpId, 'paused');
    await webhook('subscription_preapproval', mpId);
    expect((await minha(cliente.headers)).json().status).toBe('pausada');
  });

  it('registra cada cobrança mensal uma única vez', async () => {
    const { cliente, mpId } = await assinaturaPendente();
    ctx.pagamentos.registrarCobranca({
      id: '7001',
      assinaturaMpId: mpId,
      valorCentavos: 5000,
      status: 'processed',
      statusPagamento: 'approved',
      data: new Date('2026-10-21T12:00:00Z'),
    });

    await webhook('subscription_authorized_payment', '7001');
    await webhook('subscription_authorized_payment', '7001');

    expect((await minha(cliente.headers)).json().cobrancas).toEqual([
      expect.objectContaining({
        valorCentavos: 5000,
        status: 'aprovada',
        data: '2026-10-21T12:00:00.000Z',
      }),
    ]);
  });

  it('aceita (e ignora) avisos de outros tipos', async () => {
    await assinaturaPendente();
    expect((await webhook('payment', '999')).statusCode).toBe(200);
  });
});

describe('painel do clube (adm)', () => {
  it('lista assinantes e soma a receita mensal das assinaturas ativas', async () => {
    const { adm, faixas } = await criarFaixas();
    for (const [i, faixa] of [faixas[0], faixas[2], faixas[1]].entries()) {
      const pessoa = await logarComo(ctx.app, 'cliente');
      await assinar(pessoa.headers, faixa.id);
      if (i < 2) {
        ctx.pagamentos.definirStatus(
          ctx.pagamentos.criadas.at(-1)!.id,
          'authorized',
        );
        await minha(pessoa.headers);
      }
    }

    const res = await ctx.app.inject({
      method: 'GET',
      url: '/clube/assinaturas',
      headers: adm.headers,
    });
    expect(res.json()).toMatchObject({
      ativas: 2,
      receitaMensalCentavos: 12000,
    });
    expect(res.json().itens).toHaveLength(3);

    const ativas = await ctx.app.inject({
      method: 'GET',
      url: '/clube/assinaturas?status=ativa',
      headers: adm.headers,
    });
    expect(ativas.json().itens).toHaveLength(2);

    const cliente = await logarComo(ctx.app, 'cliente');
    const porCliente = await ctx.app.inject({
      method: 'GET',
      url: '/clube/assinaturas',
      headers: cliente.headers,
    });
    expect(porCliente.statusCode).toBe(403);
  });
});
