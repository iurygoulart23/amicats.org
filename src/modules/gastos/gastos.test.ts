import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, logarComo } from '../../../test/helpers.js';

let ctx: Awaited<ReturnType<typeof createTestApp>>;

beforeEach(async () => {
  ctx = await createTestApp();
});
afterEach(() => ctx.app.close());

async function preparar() {
  const vol = await logarComo(ctx.app, 'voluntario');
  const adm = await logarComo(ctx.app, 'adm');
  const gato = (
    await ctx.app.inject({
      method: 'POST',
      url: '/gatos',
      headers: vol.headers,
      payload: { nome: 'Mozart' },
    })
  ).json();
  const lancar = (payload: Record<string, unknown>, headers = vol.headers) =>
    ctx.app.inject({
      method: 'POST',
      url: `/gatos/${gato.id}/gastos`,
      headers,
      payload,
    });
  return { vol, adm, gato, lancar };
}

describe('gastos dos gatos', () => {
  it('voluntário lança gastos e vê o total do mês', async () => {
    const { vol, gato, lancar } = await preparar();

    const racao = await lancar({
      categoria: 'racao',
      descricao: 'Ração renal 2kg',
      valorCentavos: 8990,
      data: '2026-09-03',
    });
    expect(racao.statusCode).toBe(201);
    expect(racao.json()).toMatchObject({
      categoria: 'racao',
      valorCentavos: 8990,
      data: '2026-09-03',
      registradoPor: expect.objectContaining({ nome: 'Pessoa voluntario' }),
    });
    await lancar({
      categoria: 'veterinario',
      descricao: 'Consulta',
      valorCentavos: 15000,
      data: '2026-09-20',
    });
    await lancar({
      categoria: 'medicamento',
      descricao: 'Outro mês',
      valorCentavos: 1000,
      data: '2026-10-01',
    });

    const setembro = await ctx.app.inject({
      method: 'GET',
      url: `/gatos/${gato.id}/gastos?mes=2026-09`,
      headers: vol.headers,
    });
    expect(setembro.json()).toMatchObject({
      mes: '2026-09',
      totalCentavos: 23990,
    });
    expect(
      setembro.json().itens.map((g: { descricao: string }) => g.descricao),
    ).toEqual(['Consulta', 'Ração renal 2kg']);
  });

  it('valida valor positivo e categoria conhecida', async () => {
    const { lancar } = await preparar();
    const res = await lancar({
      categoria: 'festa',
      descricao: 'x',
      valorCentavos: 0,
      data: '2026-09-01',
    });
    expect(res.statusCode).toBe(400);
    expect(
      res
        .json()
        .erros.map((e: { campo: string }) => e.campo)
        .sort(),
    ).toEqual(['categoria', 'valorCentavos']);
  });

  it('só adm corrige ou exclui um gasto', async () => {
    const { vol, adm, gato, lancar } = await preparar();
    const { id } = (
      await lancar({
        categoria: 'racao',
        descricao: 'Ração',
        valorCentavos: 5000,
        data: '2026-09-01',
      })
    ).json();
    const url = `/gatos/${gato.id}/gastos/${id}`;

    const porVol = await ctx.app.inject({
      method: 'PATCH',
      url,
      headers: vol.headers,
      payload: { valorCentavos: 4500 },
    });
    expect(porVol.statusCode).toBe(403);

    const porAdm = await ctx.app.inject({
      method: 'PATCH',
      url,
      headers: adm.headers,
      payload: { valorCentavos: 4500 },
    });
    expect(porAdm.json().valorCentavos).toBe(4500);

    const exclusao = await ctx.app.inject({
      method: 'DELETE',
      url,
      headers: adm.headers,
    });
    expect(exclusao.statusCode).toBe(204);
  });

  it('cliente não lança nem lista gastos pela gestão', async () => {
    const { gato, lancar } = await preparar();
    const cliente = await logarComo(ctx.app, 'cliente');
    const lancamento = await lancar(
      {
        categoria: 'racao',
        descricao: 'x',
        valorCentavos: 100,
        data: '2026-09-01',
      },
      cliente.headers,
    );
    const lista = await ctx.app.inject({
      method: 'GET',
      url: `/gatos/${gato.id}/gastos?mes=2026-09`,
      headers: cliente.headers,
    });
    expect(lancamento.statusCode).toBe(403);
    expect(lista.statusCode).toBe(403);
  });
});
