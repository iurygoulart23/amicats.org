import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, logarComo, prisma } from '../../../test/helpers.js';

let ctx: Awaited<ReturnType<typeof createTestApp>>;

beforeEach(async () => {
  ctx = await createTestApp();
});
afterEach(() => ctx.app.close());

const get = (url: string, headers?: { cookie: string }) =>
  ctx.app.inject({ method: 'GET', url, headers });

const conciliar = (headers: { cookie: string }) =>
  ctx.app.inject({ method: 'POST', url: '/pagamentos/conciliar', headers });

/** Arrange direto no banco: um pagamento de cada origem para a mesma pessoa. */
async function cenario() {
  const adm = await logarComo(ctx.app, 'adm');
  const cliente = await logarComo(ctx.app, 'cliente');
  const userId = cliente.user.id;
  const sufixo = crypto.randomUUID();

  const plano = await prisma.planoClube.create({
    data: { nome: `Faixa ${sufixo}`, valorCentavos: 2000 },
  });
  const assinatura = await prisma.assinatura.create({
    data: {
      userId,
      planoId: plano.id,
      valorCentavos: 2000,
      status: 'ativa',
      mpId: `mp-${sufixo}`,
    },
  });
  await prisma.cobrancaAssinatura.create({
    data: {
      assinaturaId: assinatura.id,
      mpId: `cob-${sufixo}`,
      valorCentavos: 2000,
      status: 'aprovada',
      data: new Date('2026-09-05T12:00:00Z'),
    },
  });

  const gato = await prisma.gato.create({
    data: { nome: 'Raul', slug: `raul-${sufixo}` },
  });
  const ap = await prisma.apadrinhamento.create({
    data: { gatoId: gato.id, userId, inicio: new Date('2026-08-01') },
  });
  await prisma.pagamentoApadrinhamento.create({
    data: {
      apadrinhamentoId: ap.id,
      mes: '2026-08',
      valorCentavos: 6550,
      status: 'aprovado',
      mpPagamentoId: `pay-ap-${sufixo}`,
      pagoEm: new Date('2026-09-10T12:00:00Z'),
    },
  });
  // Checkout aberto e abandonado: não é pagamento.
  await prisma.pagamentoApadrinhamento.create({
    data: { apadrinhamentoId: ap.id, mes: '2026-09', valorCentavos: 3000 },
  });

  await prisma.doacao.create({
    data: {
      userId,
      nome: cliente.user.nome,
      email: cliente.user.email,
      valorCentavos: 5000,
      status: 'estornado',
      mpPagamentoId: `pay-d-${sufixo}`,
      pagoEm: new Date('2026-10-02T12:00:00Z'),
    },
  });
  // Doação de um visitante sem conta.
  await prisma.doacao.create({
    data: {
      nome: 'Visitante',
      email: `visitante-${sufixo}@teste.org`,
      valorCentavos: 10000,
      status: 'aprovado',
      mpPagamentoId: `pay-v-${sufixo}`,
      pagoEm: new Date('2026-10-03T12:00:00Z'),
    },
  });

  return { adm, cliente, gato, plano };
}

describe('histórico de pagamentos', () => {
  it('cliente vê os próprios pagamentos das três origens, do mais recente ao mais antigo', async () => {
    const { cliente, gato, plano } = await cenario();

    const res = await get('/pagamentos/meus', cliente.headers);
    expect(res.statusCode).toBe(200);
    expect(res.json().itens).toEqual([
      expect.objectContaining({
        tipo: 'doacao',
        status: 'estornado',
        valorCentavos: 5000,
        data: '2026-10-02T12:00:00.000Z',
      }),
      expect.objectContaining({
        tipo: 'apadrinhamento',
        status: 'aprovado',
        valorCentavos: 6550,
        gato: { id: gato.id, nome: 'Raul' },
        mes: '2026-08',
      }),
      expect.objectContaining({
        tipo: 'clube',
        status: 'aprovado',
        valorCentavos: 2000,
        plano: plano.nome,
      }),
    ]);
    // Dados da conciliação não vão para o cliente.
    expect(res.json().itens[0]).not.toHaveProperty('pessoa');
    expect(res.json().itens[0]).not.toHaveProperty('mpPagamentoId');
  });

  it('sem pagamentos, a lista vem vazia; sem login, 401', async () => {
    const outro = await logarComo(ctx.app, 'cliente');
    expect((await get('/pagamentos/meus', outro.headers)).json()).toEqual({
      itens: [],
    });
    expect((await get('/pagamentos/meus')).statusCode).toBe(401);
  });
});

describe('conciliação (adm)', () => {
  it('lista os pagamentos do mês com quem pagou e o total aprovado por origem', async () => {
    const { adm, cliente } = await cenario();

    const res = await get('/pagamentos?mes=2026-10', adm.headers);
    expect(res.statusCode).toBe(200);
    // Só outubro: o Clube e a parte do padrinho (setembro) ficam de fora.
    expect(res.json()).toEqual({
      resumo: {
        aprovadoCentavos: 10000,
        aprovadoPorTipo: { clube: 0, apadrinhamento: 0, doacao: 10000 },
        quantidade: { pendente: 0, aprovado: 1, recusado: 0, estornado: 1 },
      },
      itens: [
        expect.objectContaining({
          tipo: 'doacao',
          status: 'aprovado',
          valorCentavos: 10000,
          pessoa: expect.objectContaining({ id: null, nome: 'Visitante' }),
          mpPagamentoId: expect.stringMatching(/^pay-v-/),
        }),
        expect.objectContaining({
          tipo: 'doacao',
          status: 'estornado',
          pessoa: expect.objectContaining({ id: cliente.user.id }),
        }),
      ],
    });

    const todos = (await get('/pagamentos', adm.headers)).json();
    expect(todos.itens).toHaveLength(4);
    expect(todos.resumo.aprovadoPorTipo).toEqual({
      clube: 2000,
      apadrinhamento: 6550,
      doacao: 10000,
    });
  });

  it('filtra por origem e status', async () => {
    const { adm } = await cenario();
    const { itens } = (
      await get('/pagamentos?tipo=doacao&status=estornado', adm.headers)
    ).json();
    expect(itens).toEqual([
      expect.objectContaining({ tipo: 'doacao', status: 'estornado' }),
    ]);
  });

  it('só adm vê a conciliação e reconsulta o Mercado Pago', async () => {
    const { cliente } = await cenario();
    const voluntario = await logarComo(ctx.app, 'voluntario');
    expect((await get('/pagamentos', cliente.headers)).statusCode).toBe(403);
    expect((await get('/pagamentos', voluntario.headers)).statusCode).toBe(403);
    expect((await conciliar(cliente.headers)).statusCode).toBe(403);
  });

  it('reconsulta no Mercado Pago o que ficou pendente e aplica o que mudou', async () => {
    const adm = await logarComo(ctx.app, 'adm');
    const doacao = await prisma.doacao.create({
      data: {
        nome: 'Ana',
        email: 'ana@teste.org',
        valorCentavos: 5000,
        mpPagamentoId: null,
      },
    });
    // O webhook do pix aprovado se perdeu.
    ctx.pagamentos.registrarPagamento({
      id: `pay-${crypto.randomUUID()}`,
      status: 'approved',
      externalReference: `doacao:${doacao.id}`,
      valorCentavos: 5000,
      data: new Date(),
    });

    const res = await conciliar(adm.headers);
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ consultados: 1, atualizados: 1 });
    expect(
      await prisma.doacao.findUniqueOrThrow({ where: { id: doacao.id } }),
    ).toMatchObject({ status: 'aprovado', pagoEm: expect.any(Date) });
  });

  it('cobrança do Clube pendente é atualizada pela consulta', async () => {
    const adm = await logarComo(ctx.app, 'adm');
    const cliente = await logarComo(ctx.app, 'cliente');
    const plano = await prisma.planoClube.create({
      data: { nome: 'Faixa', valorCentavos: 2000 },
    });
    const mpId = `mp-${crypto.randomUUID()}`;
    const assinatura = await prisma.assinatura.create({
      data: {
        userId: cliente.user.id,
        planoId: plano.id,
        valorCentavos: 2000,
        status: 'ativa',
        mpId,
      },
    });
    const cobranca = await prisma.cobrancaAssinatura.create({
      data: {
        assinaturaId: assinatura.id,
        mpId: `cob-${crypto.randomUUID()}`,
        valorCentavos: 2000,
        status: 'pendente',
        data: new Date(),
      },
    });
    ctx.pagamentos.registrarCobranca({
      id: cobranca.mpId,
      assinaturaMpId: mpId,
      valorCentavos: 2000,
      status: 'processed',
      statusPagamento: 'approved',
      data: cobranca.data,
    });

    await conciliar(adm.headers);
    expect(
      await prisma.cobrancaAssinatura.findUniqueOrThrow({
        where: { id: cobranca.id },
      }),
    ).toMatchObject({ status: 'aprovada' });
  });
});
