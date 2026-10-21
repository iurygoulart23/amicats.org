import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, logarComo, prisma } from '../../../test/helpers.js';
import { mesDe, paraData, somarMeses } from '../../lib/datas.js';

let ctx: Awaited<ReturnType<typeof createTestApp>>;

beforeEach(async () => {
  ctx = await createTestApp();
});
afterEach(() => ctx.app.close());

async function cadastrarGato(payload: Record<string, unknown> = {}) {
  const adm = await logarComo(ctx.app, 'adm');
  const gato = (
    await ctx.app.inject({
      method: 'POST',
      url: '/gatos',
      headers: adm.headers,
      payload: { nome: 'Raul', publicado: true, ...payload },
    })
  ).json();
  const lancarGasto = (valorCentavos: number, data: string) =>
    ctx.app.inject({
      method: 'POST',
      url: `/gatos/${gato.id}/gastos`,
      headers: adm.headers,
      payload: {
        categoria: 'racao',
        descricao: `Gasto ${data}`,
        valorCentavos,
        data,
      },
    });
  return { adm, gato, lancarGasto };
}

function apadrinhar(headers: { cookie: string }, gatoId: string) {
  return ctx.app.inject({
    method: 'POST',
    url: '/apadrinhamentos',
    headers,
    payload: { gatoId },
  });
}

/** Arrange: move o início/fim de um apadrinhamento para simular o passado. */
function definirPeriodo(id: string, inicio: string, fim: string | null = null) {
  return prisma.apadrinhamento.update({
    where: { id },
    data: { inicio: paraData(inicio), fim: fim ? paraData(fim) : null },
  });
}

describe('apadrinhamento', () => {
  it('cliente apadrinha um gato e o vê em "meus apadrinhamentos"', async () => {
    const { gato } = await cadastrarGato();
    const cliente = await logarComo(ctx.app, 'cliente');

    const res = await apadrinhar(cliente.headers, gato.id);
    expect(res.statusCode).toBe(201);

    const meus = await ctx.app.inject({
      method: 'GET',
      url: '/apadrinhamentos/meus',
      headers: cliente.headers,
    });
    expect(meus.json()).toEqual([
      expect.objectContaining({
        id: res.json().id,
        gato: expect.objectContaining({ nome: 'Raul', slug: 'raul' }),
        ativo: true,
      }),
    ]);
  });

  it('dá para apadrinhar pelo slug do catálogo público', async () => {
    await cadastrarGato();
    const cliente = await logarComo(ctx.app, 'cliente');
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/apadrinhamentos',
      headers: cliente.headers,
      payload: { slug: 'raul' },
    });
    expect(res.statusCode).toBe(201);
  });

  it('voluntário e adm também podem apadrinhar', async () => {
    const { gato } = await cadastrarGato();
    for (const cargo of ['voluntario', 'adm'] as const) {
      const { headers } = await logarComo(ctx.app, cargo);
      expect((await apadrinhar(headers, gato.id)).statusCode).toBe(201);
    }
  });

  it('não apadrinha o mesmo gato duas vezes ao mesmo tempo', async () => {
    const { gato } = await cadastrarGato();
    const cliente = await logarComo(ctx.app, 'cliente');
    await apadrinhar(cliente.headers, gato.id);
    expect((await apadrinhar(cliente.headers, gato.id)).statusCode).toBe(409);
  });

  it('só gatos publicados e ainda no abrigo podem ser apadrinhados', async () => {
    const cliente = await logarComo(ctx.app, 'cliente');
    for (const payload of [
      { nome: 'Rascunho', publicado: false },
      { nome: 'Lar', status: 'adotado' },
      { nome: 'Estrela', status: 'falecido' },
    ]) {
      const { gato } = await cadastrarGato(payload);
      expect((await apadrinhar(cliente.headers, gato.id)).statusCode).toBe(400);
    }
  });

  it('a parte de cada padrinho é o total do mês dividido igualmente pelos padrinhos do mês', async () => {
    const { gato, lancarGasto } = await cadastrarGato();
    await lancarGasto(20000, '2026-09-05');
    await lancarGasto(10000, '2026-09-25');
    await lancarGasto(99900, '2026-10-02'); // outro mês, não entra

    const pessoas = await Promise.all(
      [1, 2, 3, 4, 5].map(() => logarComo(ctx.app, 'cliente')),
    );
    const ids = [];
    for (const p of pessoas)
      ids.push((await apadrinhar(p.headers, gato.id)).json().id);
    await definirPeriodo(ids[0], '2026-08-01'); // ativo desde agosto
    await definirPeriodo(ids[1], '2026-09-15'); // começou no meio de setembro: conta
    await definirPeriodo(ids[2], '2026-07-01', '2026-09-10'); // saiu em setembro: conta
    await definirPeriodo(ids[3], '2026-10-01'); // começou depois: não conta
    await definirPeriodo(ids[4], '2026-06-01', '2026-08-31'); // saiu antes: não conta

    const extrato = await ctx.app.inject({
      method: 'GET',
      url: `/apadrinhamentos/${ids[0]}/extrato?mes=2026-09`,
      headers: pessoas[0].headers,
    });
    expect(extrato.statusCode).toBe(200);
    expect(extrato.json()).toMatchObject({
      mes: '2026-09',
      totalCentavos: 30000,
      padrinhosNoMes: 3,
      parteCentavos: 10000,
    });
    expect(extrato.json().itens).toHaveLength(2);
  });

  it('arredonda a parte para o centavo mais próximo', async () => {
    const { gato, lancarGasto } = await cadastrarGato();
    await lancarGasto(1000, '2026-09-05');
    const a = await logarComo(ctx.app, 'cliente');
    const b = await logarComo(ctx.app, 'cliente');
    const c = await logarComo(ctx.app, 'cliente');
    const ids = [];
    for (const p of [a, b, c])
      ids.push((await apadrinhar(p.headers, gato.id)).json().id);
    for (const id of ids) await definirPeriodo(id, '2026-09-01');

    const extrato = await ctx.app.inject({
      method: 'GET',
      url: `/apadrinhamentos/${ids[0]}/extrato?mes=2026-09`,
      headers: a.headers,
    });
    expect(extrato.json()).toMatchObject({
      totalCentavos: 1000,
      padrinhosNoMes: 3,
      parteCentavos: 333,
    });
  });

  it('o padrinho não vê meses de antes de começar a apadrinhar', async () => {
    const { gato } = await cadastrarGato();
    const cliente = await logarComo(ctx.app, 'cliente');
    const { id } = (await apadrinhar(cliente.headers, gato.id)).json();
    await definirPeriodo(id, '2026-09-10');

    const antes = await ctx.app.inject({
      method: 'GET',
      url: `/apadrinhamentos/${id}/extrato?mes=2026-08`,
      headers: cliente.headers,
    });
    expect(antes.statusCode).toBe(400);
  });

  it('ninguém vê o extrato do apadrinhamento de outra pessoa; voluntário vê', async () => {
    const { gato } = await cadastrarGato();
    const dono = await logarComo(ctx.app, 'cliente');
    const outro = await logarComo(ctx.app, 'cliente');
    const vol = await logarComo(ctx.app, 'voluntario');
    const { id } = (await apadrinhar(dono.headers, gato.id)).json();
    const url = `/apadrinhamentos/${id}/extrato`;

    expect(
      (await ctx.app.inject({ method: 'GET', url, headers: outro.headers }))
        .statusCode,
    ).toBe(404);
    expect(
      (await ctx.app.inject({ method: 'GET', url, headers: vol.headers }))
        .statusCode,
    ).toBe(200);
  });

  it('padrinho encerra o próprio apadrinhamento; não encerra o de outro', async () => {
    const { gato } = await cadastrarGato();
    const dono = await logarComo(ctx.app, 'cliente');
    const outro = await logarComo(ctx.app, 'cliente');
    const { id } = (await apadrinhar(dono.headers, gato.id)).json();

    const alheio = await ctx.app.inject({
      method: 'DELETE',
      url: `/apadrinhamentos/${id}`,
      headers: outro.headers,
    });
    expect(alheio.statusCode).toBe(404);

    const proprio = await ctx.app.inject({
      method: 'DELETE',
      url: `/apadrinhamentos/${id}`,
      headers: dono.headers,
    });
    expect(proprio.statusCode).toBe(204);

    const meus = await ctx.app.inject({
      method: 'GET',
      url: '/apadrinhamentos/meus',
      headers: dono.headers,
    });
    expect(meus.json()).toEqual([
      expect.objectContaining({ id, ativo: false }),
    ]);
    // Pode voltar a apadrinhar depois de encerrar.
    expect((await apadrinhar(dono.headers, gato.id)).statusCode).toBe(201);
  });

  it('equipe vê a lista de padrinhos ativos do gato', async () => {
    const { adm, gato } = await cadastrarGato();
    const cliente = await logarComo(ctx.app, 'cliente');
    await apadrinhar(cliente.headers, gato.id);

    const res = await ctx.app.inject({
      method: 'GET',
      url: `/gatos/${gato.id}/padrinhos`,
      headers: adm.headers,
    });
    expect(res.json()).toEqual([
      expect.objectContaining({
        nome: 'Pessoa cliente',
        email: cliente.user.email,
      }),
    ]);

    const porCliente = await ctx.app.inject({
      method: 'GET',
      url: `/gatos/${gato.id}/padrinhos`,
      headers: cliente.headers,
    });
    expect(porCliente.statusCode).toBe(403);
  });
});

describe('catálogo público com apadrinhamento', () => {
  it('mostra quantos padrinhos o gato tem e a estimativa de custo dos últimos 3 meses', async () => {
    const { gato, lancarGasto } = await cadastrarGato();
    const atual = mesDe(new Date());
    await lancarGasto(30000, `${somarMeses(atual, -1)}-10`);
    await lancarGasto(15000, `${somarMeses(atual, -2)}-10`);
    await lancarGasto(15000, `${somarMeses(atual, -3)}-10`);
    await lancarGasto(90000, `${somarMeses(atual, -4)}-10`); // fora da janela
    await lancarGasto(77700, `${atual}-01`); // mês corrente (incompleto) não entra

    const cliente = await logarComo(ctx.app, 'cliente');
    await apadrinhar(cliente.headers, gato.id);

    const res = await ctx.app.inject({
      method: 'GET',
      url: '/public/gatos/raul',
    });
    expect(res.json()).toMatchObject({
      padrinhos: 1,
      custoMensalEstimadoCentavos: 20000,
    });
  });

  it('sem gastos recentes, a estimativa fica vazia', async () => {
    await cadastrarGato();
    const res = await ctx.app.inject({
      method: 'GET',
      url: '/public/gatos/raul',
    });
    expect(res.json()).toMatchObject({
      padrinhos: 0,
      custoMensalEstimadoCentavos: null,
    });
  });
});
