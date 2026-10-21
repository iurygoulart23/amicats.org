import { createHmac } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, logarComo, prisma } from '../../../test/helpers.js';
import { mesDe, paraData, somarMeses } from '../../lib/datas.js';

let ctx: Awaited<ReturnType<typeof createTestApp>>;

const mesPassado = somarMeses(mesDe(new Date()), -1);
const mesRetrasado = somarMeses(mesDe(new Date()), -2);

beforeEach(async () => {
  ctx = await createTestApp();
});
afterEach(() => ctx.app.close());

/** Gato com um padrinho desde o mês retrasado e gastos lançados no mês passado. */
async function cenario() {
  const adm = await logarComo(ctx.app, 'adm');
  const gato = (
    await ctx.app.inject({
      method: 'POST',
      url: '/gatos',
      headers: adm.headers,
      payload: { nome: 'Raul', publicado: true },
    })
  ).json();
  const lancarGasto = (valorCentavos: number, data = `${mesPassado}-10`) =>
    ctx.app.inject({
      method: 'POST',
      url: `/gatos/${gato.id}/gastos`,
      headers: adm.headers,
      payload: {
        categoria: 'racao',
        descricao: `Ração ${data}`,
        valorCentavos,
        data,
      },
    });
  const padrinho = await logarComo(ctx.app, 'cliente');
  const ap = (
    await ctx.app.inject({
      method: 'POST',
      url: '/apadrinhamentos',
      headers: padrinho.headers,
      payload: { gatoId: gato.id },
    })
  ).json();
  await prisma.apadrinhamento.update({
    where: { id: ap.id },
    data: { inicio: paraData(`${mesRetrasado}-01`) },
  });
  await lancarGasto(4000);
  await lancarGasto(2550, `${mesPassado}-20`);
  return { adm, gato, padrinho, apId: ap.id as string, lancarGasto };
}

const extrato = (headers: { cookie: string }, apId: string, mes: string) =>
  ctx.app.inject({
    method: 'GET',
    url: `/apadrinhamentos/${apId}/extrato?mes=${mes}`,
    headers,
  });

const pagar = (headers: { cookie: string }, apId: string, mes: string) =>
  ctx.app.inject({
    method: 'POST',
    url: `/apadrinhamentos/${apId}/pagamentos`,
    headers,
    payload: { mes },
  });

/** O Mercado Pago registra um pagamento no checkout de referência `ref`. */
function pagamentoNoMp(
  ref: string,
  status: string,
  valorCentavos: number,
  id = `pay-${crypto.randomUUID()}`,
) {
  const p = {
    id,
    status,
    externalReference: ref,
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
    payload: {
      type: 'payment',
      action: 'payment.updated',
      data: { id: dataId },
    },
  });
}

describe('pagamento da parte do padrinho', () => {
  it('padrinho paga a parte do mês fechado no checkout e o extrato mostra quitado', async () => {
    const { adm, padrinho, apId } = await cenario();

    const antes = (await extrato(padrinho.headers, apId, mesPassado)).json();
    expect(antes).toMatchObject({
      totalCentavos: 6550,
      parteCentavos: 6550,
      pagoCentavos: 0,
      faltaCentavos: 6550,
      fechado: true,
      pagamentos: [],
    });

    const res = await pagar(padrinho.headers, apId, mesPassado);
    expect(res.statusCode).toBe(201);
    expect(res.json().checkoutUrl).toMatch(/^https:\/\/mp\.test\/checkout/);
    const [checkout] = ctx.pagamentos.checkouts;
    expect(checkout).toMatchObject({
      valorCentavos: 6550,
      emailPagador: padrinho.user.email,
      titulo: expect.stringMatching(/^Apadrinhamento de Raul — /),
      urlRetorno: `http://localhost:3000/pt-BR/app/apadrinhamentos/${apId}?mes=${mesPassado}`,
    });

    const pendente = (await extrato(padrinho.headers, apId, mesPassado)).json();
    expect(pendente.pagamentos).toEqual([
      expect.objectContaining({
        status: 'pendente',
        valorCentavos: 6550,
        checkoutUrl: res.json().checkoutUrl,
      }),
    ]);
    expect(pendente.faltaCentavos).toBe(6550);

    // Ao voltar do checkout, o extrato consulta o Mercado Pago.
    pagamentoNoMp(checkout!.referencia, 'approved', 6550);
    const depois = (await extrato(padrinho.headers, apId, mesPassado)).json();
    expect(depois).toMatchObject({ pagoCentavos: 6550, faltaCentavos: 0 });
    expect(depois.pagamentos).toEqual([
      expect.objectContaining({
        status: 'aprovado',
        pagoEm: expect.any(String),
        checkoutUrl: null,
      }),
    ]);

    const notificacoes = (
      await ctx.app.inject({
        method: 'GET',
        url: '/notificacoes',
        headers: adm.headers,
      })
    ).json();
    expect(notificacoes).toContainEqual(
      expect.objectContaining({
        tipo: 'pagamento_aprovado',
        titulo: 'Pagamento recebido: Raul',
      }),
    );
  });

  it('clicar duas vezes reaproveita o mesmo checkout', async () => {
    const { padrinho, apId } = await cenario();
    const a = await pagar(padrinho.headers, apId, mesPassado);
    const b = await pagar(padrinho.headers, apId, mesPassado);
    expect(b.statusCode).toBe(201);
    expect(b.json().checkoutUrl).toBe(a.json().checkoutUrl);
    expect(ctx.pagamentos.checkouts).toHaveLength(1);
  });

  it('gasto lançado depois do pagamento: falta só a diferença', async () => {
    const { padrinho, apId, lancarGasto } = await cenario();
    await pagar(padrinho.headers, apId, mesPassado);
    pagamentoNoMp(ctx.pagamentos.checkouts[0]!.referencia, 'approved', 6550);
    await extrato(padrinho.headers, apId, mesPassado);

    await lancarGasto(1000, `${mesPassado}-28`);
    expect(
      (await extrato(padrinho.headers, apId, mesPassado)).json(),
    ).toMatchObject({
      parteCentavos: 7550,
      pagoCentavos: 6550,
      faltaCentavos: 1000,
    });

    expect((await pagar(padrinho.headers, apId, mesPassado)).statusCode).toBe(
      201,
    );
    expect(ctx.pagamentos.checkouts[1]?.valorCentavos).toBe(1000);
  });

  it('não paga mês corrente, mês fora do período, mês sem nada a pagar nem o apadrinhamento dos outros', async () => {
    const { padrinho, apId } = await cenario();
    const mesAtual = mesDe(new Date());

    expect((await pagar(padrinho.headers, apId, mesAtual)).statusCode).toBe(
      400,
    );
    expect(
      (await pagar(padrinho.headers, apId, somarMeses(mesRetrasado, -1)))
        .statusCode,
    ).toBe(400);
    // Mês retrasado não teve gastos.
    expect((await pagar(padrinho.headers, apId, mesRetrasado)).statusCode).toBe(
      409,
    );

    const outro = await logarComo(ctx.app, 'cliente');
    expect((await pagar(outro.headers, apId, mesPassado)).statusCode).toBe(404);
    // Nem a equipe paga no lugar do padrinho.
    const adm = await logarComo(ctx.app, 'adm');
    expect((await pagar(adm.headers, apId, mesPassado)).statusCode).toBe(404);
    expect(ctx.pagamentos.checkouts).toHaveLength(0);
  });

  it('webhook "payment": recusado, depois aprovado, depois estornado', async () => {
    const { padrinho, apId } = await cenario();
    await pagar(padrinho.headers, apId, mesPassado);
    const ref = ctx.pagamentos.checkouts[0]!.referencia;

    const recusado = pagamentoNoMp(ref, 'rejected', 6550);
    expect((await webhookPayment(recusado.id)).statusCode).toBe(200);
    let local = await prisma.pagamentoApadrinhamento.findUniqueOrThrow({
      where: { id: ref },
    });
    expect(local.status).toBe('recusado');

    const aprovado = pagamentoNoMp(ref, 'approved', 6550);
    await webhookPayment(aprovado.id);
    // Aviso atrasado da tentativa recusada não desfaz a aprovação.
    await webhookPayment(recusado.id);
    local = await prisma.pagamentoApadrinhamento.findUniqueOrThrow({
      where: { id: ref },
    });
    expect(local).toMatchObject({
      status: 'aprovado',
      mpPagamentoId: aprovado.id,
    });

    pagamentoNoMp(ref, 'refunded', 6550, aprovado.id);
    await webhookPayment(aprovado.id);
    expect(
      (await extrato(padrinho.headers, apId, mesPassado)).json(),
    ).toMatchObject({ pagoCentavos: 0, faltaCentavos: 6550 });
  });

  it('webhook "payment" de outra origem (ex.: cobrança do Clube) é ignorado', async () => {
    const outro = pagamentoNoMp('nao-e-uuid', 'approved', 2000);
    expect((await webhookPayment(outro.id)).statusCode).toBe(200);
    const semLocal = pagamentoNoMp(crypto.randomUUID(), 'approved', 2000);
    expect((await webhookPayment(semLocal.id)).statusCode).toBe(200);
  });

  it('"meus apadrinhamentos" mostra quanto falta pagar nos meses fechados', async () => {
    const { padrinho, lancarGasto } = await cenario();
    await lancarGasto(999, `${mesRetrasado}-05`);
    // Gasto do mês corrente ainda não entra na conta.
    await lancarGasto(5000, `${mesDe(new Date())}-01`);

    const meus = (
      await ctx.app.inject({
        method: 'GET',
        url: '/apadrinhamentos/meus',
        headers: padrinho.headers,
      })
    ).json();
    expect(meus[0]).toMatchObject({
      faltaPagarCentavos: 6550 + 999,
      mesesEmAberto: [mesRetrasado, mesPassado],
    });
  });
});

describe('aviso da parte do mês', () => {
  it('quando o mês fecha, o padrinho é avisado do valor (uma vez só)', async () => {
    await ctx.app.close();
    const agora = new Date();
    ctx = await createTestApp({ agora: () => agora });
    const { padrinho, apId } = await cenario();

    const rodar = () =>
      ctx.app.inject({
        method: 'POST',
        url: '/tarefas/verificar-pendencias',
        headers: { 'x-tarefa-token': 'token-de-teste' },
      });
    expect((await rodar()).json().partes).toBe(1);
    expect((await rodar()).json().partes).toBe(0);

    const notificacoes = (
      await ctx.app.inject({
        method: 'GET',
        url: '/notificacoes',
        headers: padrinho.headers,
      })
    ).json();
    expect(notificacoes).toContainEqual(
      expect.objectContaining({
        tipo: 'parte_do_mes',
        titulo: 'Sua parte de Raul: R$\u00a065,50',
        link: `/app/apadrinhamentos/${apId}?mes=${mesPassado}`,
      }),
    );
  });
});
