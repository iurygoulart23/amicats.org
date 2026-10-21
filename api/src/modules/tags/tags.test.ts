import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, logarComo } from '../../../test/helpers.js';

let ctx: Awaited<ReturnType<typeof createTestApp>>;

beforeEach(async () => {
  ctx = await createTestApp();
});
afterEach(() => ctx.app.close());

describe('tags', () => {
  it('adm cria tags; voluntário só lista', async () => {
    const adm = await logarComo(ctx.app, 'adm');
    const vol = await logarComo(ctx.app, 'voluntario');

    const criada = await ctx.app.inject({
      method: 'POST',
      url: '/tags',
      headers: adm.headers,
      payload: { nome: 'FIV', tipo: 'doenca', cor: '#d33' },
    });
    expect(criada.statusCode).toBe(201);

    const porVoluntario = await ctx.app.inject({
      method: 'POST',
      url: '/tags',
      headers: vol.headers,
      payload: { nome: 'FeLV', tipo: 'doenca' },
    });
    expect(porVoluntario.statusCode).toBe(403);

    const lista = await ctx.app.inject({
      method: 'GET',
      url: '/tags?tipo=doenca',
      headers: vol.headers,
    });
    expect(lista.json()).toEqual([
      expect.objectContaining({ nome: 'FIV', tipo: 'doenca', cor: '#d33' }),
    ]);
  });

  it('não aceita tags com nome repetido', async () => {
    const { headers } = await logarComo(ctx.app, 'adm');
    await ctx.app.inject({
      method: 'POST',
      url: '/tags',
      headers,
      payload: { nome: 'FIV' },
    });
    const dup = await ctx.app.inject({
      method: 'POST',
      url: '/tags',
      headers,
      payload: { nome: 'fiv' },
    });
    expect(dup.statusCode).toBe(409);
  });

  it('voluntário marca as condições atuais e passadas de um gato', async () => {
    const adm = await logarComo(ctx.app, 'adm');
    const vol = await logarComo(ctx.app, 'voluntario');
    const novaTag = async (nome: string) =>
      (
        await ctx.app.inject({
          method: 'POST',
          url: '/tags',
          headers: adm.headers,
          payload: { nome },
        })
      ).json().id;
    const fiv = await novaTag('FIV');
    const giardia = await novaTag('Giardíase');

    const { id } = (
      await ctx.app.inject({
        method: 'POST',
        url: '/gatos',
        headers: vol.headers,
        payload: { nome: 'Elvis' },
      })
    ).json();

    const res = await ctx.app.inject({
      method: 'PUT',
      url: `/gatos/${id}/tags`,
      headers: vol.headers,
      payload: [
        { tagId: fiv, ativa: true },
        { tagId: giardia, ativa: false },
      ],
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().tags).toEqual([
      expect.objectContaining({ nome: 'FIV', ativa: true }),
      expect.objectContaining({ nome: 'Giardíase', ativa: false }),
    ]);

    // PUT substitui o conjunto inteiro.
    const troca = await ctx.app.inject({
      method: 'PUT',
      url: `/gatos/${id}/tags`,
      headers: vol.headers,
      payload: [{ tagId: giardia, ativa: false }],
    });
    expect(troca.json().tags.map((t: { nome: string }) => t.nome)).toEqual([
      'Giardíase',
    ]);
  });

  it('filtra gatos pela tag', async () => {
    const adm = await logarComo(ctx.app, 'adm');
    const fiv = (
      await ctx.app.inject({
        method: 'POST',
        url: '/tags',
        headers: adm.headers,
        payload: { nome: 'FIV' },
      })
    ).json().id;
    for (const nome of ['Elvis', 'Mario']) {
      const { id } = (
        await ctx.app.inject({
          method: 'POST',
          url: '/gatos',
          headers: adm.headers,
          payload: { nome },
        })
      ).json();
      if (nome === 'Elvis') {
        await ctx.app.inject({
          method: 'PUT',
          url: `/gatos/${id}/tags`,
          headers: adm.headers,
          payload: [{ tagId: fiv, ativa: true }],
        });
      }
    }
    const res = await ctx.app.inject({
      method: 'GET',
      url: `/gatos?tag=${fiv}`,
      headers: adm.headers,
    });
    expect(res.json().itens.map((g: { nome: string }) => g.nome)).toEqual([
      'Elvis',
    ]);
  });

  it('adm renomeia e exclui tag', async () => {
    const { headers } = await logarComo(ctx.app, 'adm');
    const { id } = (
      await ctx.app.inject({
        method: 'POST',
        url: '/tags',
        headers,
        payload: { nome: 'Rino' },
      })
    ).json();

    const editada = await ctx.app.inject({
      method: 'PATCH',
      url: `/tags/${id}`,
      headers,
      payload: { nome: 'Rinotraqueíte' },
    });
    expect(editada.json().nome).toBe('Rinotraqueíte');

    const excluida = await ctx.app.inject({
      method: 'DELETE',
      url: `/tags/${id}`,
      headers,
    });
    expect(excluida.statusCode).toBe(204);
    const lista = await ctx.app.inject({
      method: 'GET',
      url: '/tags',
      headers,
    });
    expect(lista.json()).toEqual([]);
  });
});
