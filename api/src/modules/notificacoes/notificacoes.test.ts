import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, logarComo } from '../../../test/helpers.js';

let ctx: Awaited<ReturnType<typeof createTestApp>>;

beforeEach(async () => {
  ctx = await createTestApp();
});
afterEach(() => ctx.app.close());

async function preparar() {
  const adm = await logarComo(ctx.app, 'adm');
  const gato = (
    await ctx.app.inject({
      method: 'POST',
      url: '/gatos',
      headers: adm.headers,
      payload: { nome: 'Mozart', publicado: true },
    })
  ).json();
  const apadrinhar = async (headers: { cookie: string }) =>
    (
      await ctx.app.inject({
        method: 'POST',
        url: '/apadrinhamentos',
        headers,
        payload: { gatoId: gato.id },
      })
    ).json();
  const lancarGasto = () =>
    ctx.app.inject({
      method: 'POST',
      url: `/gatos/${gato.id}/gastos`,
      headers: adm.headers,
      payload: {
        categoria: 'racao',
        descricao: 'Ração renal',
        valorCentavos: 8990,
        data: '2026-10-20',
      },
    });
  const notificacoes = async (headers: { cookie: string }) =>
    (
      await ctx.app.inject({ method: 'GET', url: '/notificacoes', headers })
    ).json();
  return { adm, gato, apadrinhar, lancarGasto, notificacoes };
}

describe('notificações', () => {
  it('padrinho ativo é avisado quando lançam um gasto do gato dele', async () => {
    const { apadrinhar, lancarGasto, notificacoes } = await preparar();
    const madrinha = await logarComo(ctx.app, 'cliente');
    const ex = await logarComo(ctx.app, 'cliente');
    const ap = await apadrinhar(madrinha.headers);
    const apEx = await apadrinhar(ex.headers);
    await ctx.app.inject({
      method: 'DELETE',
      url: `/apadrinhamentos/${apEx.id}`,
      headers: ex.headers,
    });

    await lancarGasto();

    expect(await notificacoes(madrinha.headers)).toEqual([
      expect.objectContaining({
        tipo: 'gasto_novo',
        titulo: 'Novo gasto com Mozart',
        mensagem: expect.stringContaining('Ração renal'),
        link: `/app/apadrinhamentos/${ap.id}`,
        lida: false,
      }),
    ]);
    expect(await notificacoes(ex.headers)).toEqual([]);

    const contagem = await ctx.app.inject({
      method: 'GET',
      url: '/notificacoes/contagem',
      headers: madrinha.headers,
    });
    expect(contagem.json()).toEqual({ naoLidas: 1 });
  });

  it('adms são avisados de um novo apadrinhamento; voluntários não', async () => {
    const { adm, apadrinhar, notificacoes } = await preparar();
    const vol = await logarComo(ctx.app, 'voluntario');
    const cliente = await logarComo(ctx.app, 'cliente');
    await apadrinhar(cliente.headers);

    expect(await notificacoes(adm.headers)).toEqual([
      expect.objectContaining({
        tipo: 'apadrinhamento_novo',
        titulo: 'Novo padrinho para Mozart',
      }),
    ]);
    expect(await notificacoes(vol.headers)).toEqual([]);
  });

  it('marca uma como lida, ou todas de uma vez; não mexe nas de outra pessoa', async () => {
    const { adm, apadrinhar, lancarGasto, notificacoes } = await preparar();
    const madrinha = await logarComo(ctx.app, 'cliente');
    await apadrinhar(madrinha.headers);
    await lancarGasto();
    await lancarGasto();
    const [primeira] = await notificacoes(madrinha.headers);

    const alheia = await ctx.app.inject({
      method: 'POST',
      url: `/notificacoes/${primeira.id}/lida`,
      headers: adm.headers,
    });
    expect(alheia.statusCode).toBe(404);

    await ctx.app.inject({
      method: 'POST',
      url: `/notificacoes/${primeira.id}/lida`,
      headers: madrinha.headers,
    });
    let contagem = await ctx.app.inject({
      method: 'GET',
      url: '/notificacoes/contagem',
      headers: madrinha.headers,
    });
    expect(contagem.json()).toEqual({ naoLidas: 1 });

    await ctx.app.inject({
      method: 'POST',
      url: '/notificacoes/ler-todas',
      headers: madrinha.headers,
    });
    contagem = await ctx.app.inject({
      method: 'GET',
      url: '/notificacoes/contagem',
      headers: madrinha.headers,
    });
    expect(contagem.json()).toEqual({ naoLidas: 0 });
  });

  it('anônimo não vê notificações', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: '/notificacoes' });
    expect(res.statusCode).toBe(401);
  });
});
