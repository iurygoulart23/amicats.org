import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, logarComo } from '../../../test/helpers.js';

let ctx: Awaited<ReturnType<typeof createTestApp>>;

beforeEach(async () => {
  ctx = await createTestApp();
});
afterEach(() => ctx.app.close());

const ZEZINHO = {
  nome: 'Zezinho',
  dataNascimentoAprox: '2022-03-01',
  precisaoNascimento: 'mes',
  sexo: 'macho',
  castrado: true,
  descricaoPt: 'Ama um carinho e adora um abraço.',
  observacoes: 'Come ração renal. Não se dá bem com o Elvis.',
};

describe('cadastro de gatos', () => {
  it('voluntário cadastra um gato e vê os dados internos', async () => {
    const { headers } = await logarComo(ctx.app, 'voluntario');

    const criado = await ctx.app.inject({
      method: 'POST',
      url: '/gatos',
      headers,
      payload: ZEZINHO,
    });
    expect(criado.statusCode).toBe(201);
    expect(criado.json()).toMatchObject({
      ...ZEZINHO,
      slug: 'zezinho',
      status: 'disponivel',
      publicado: false,
    });

    const lido = await ctx.app.inject({
      method: 'GET',
      url: `/gatos/${criado.json().id}`,
      headers,
    });
    expect(lido.json().observacoes).toBe(ZEZINHO.observacoes);
  });

  it('gera slugs únicos para gatos com o mesmo nome', async () => {
    const { headers } = await logarComo(ctx.app, 'voluntario');
    const slugs = [];
    for (const nome of ['Mia', 'Mia', 'Míá']) {
      const res = await ctx.app.inject({
        method: 'POST',
        url: '/gatos',
        headers,
        payload: { nome },
      });
      slugs.push(res.json().slug);
    }
    expect(slugs).toEqual(['mia', 'mia-2', 'mia-3']);
  });

  it('voluntário edita status e publica o gato', async () => {
    const { headers } = await logarComo(ctx.app, 'voluntario');
    const { id } = (
      await ctx.app.inject({
        method: 'POST',
        url: '/gatos',
        headers,
        payload: ZEZINHO,
      })
    ).json();

    const res = await ctx.app.inject({
      method: 'PATCH',
      url: `/gatos/${id}`,
      headers,
      payload: { status: 'em_tratamento', publicado: true },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      status: 'em_tratamento',
      publicado: true,
      nome: 'Zezinho',
    });
  });

  it('lista gatos com filtro de status e busca por nome', async () => {
    const { headers } = await logarComo(ctx.app, 'voluntario');
    for (const payload of [
      { nome: 'Zezinho' },
      { nome: 'Zuleica', status: 'adotado' },
      { nome: 'Elvis' },
    ]) {
      await ctx.app.inject({ method: 'POST', url: '/gatos', headers, payload });
    }

    const disponiveis = await ctx.app.inject({
      method: 'GET',
      url: '/gatos?status=disponivel',
      headers,
    });
    expect(
      disponiveis.json().itens.map((g: { nome: string }) => g.nome),
    ).toEqual(['Elvis', 'Zezinho']);

    const busca = await ctx.app.inject({
      method: 'GET',
      url: '/gatos?busca=zu',
      headers,
    });
    expect(busca.json().total).toBe(1);
  });

  it('só adm exclui gato', async () => {
    const vol = await logarComo(ctx.app, 'voluntario');
    const adm = await logarComo(ctx.app, 'adm');
    const { id } = (
      await ctx.app.inject({
        method: 'POST',
        url: '/gatos',
        headers: vol.headers,
        payload: ZEZINHO,
      })
    ).json();

    const porVoluntario = await ctx.app.inject({
      method: 'DELETE',
      url: `/gatos/${id}`,
      headers: vol.headers,
    });
    expect(porVoluntario.statusCode).toBe(403);

    const porAdm = await ctx.app.inject({
      method: 'DELETE',
      url: `/gatos/${id}`,
      headers: adm.headers,
    });
    expect(porAdm.statusCode).toBe(204);
    const depois = await ctx.app.inject({
      method: 'GET',
      url: `/gatos/${id}`,
      headers: adm.headers,
    });
    expect(depois.statusCode).toBe(404);
  });

  it('cliente não acessa a gestão de gatos', async () => {
    const { headers } = await logarComo(ctx.app, 'cliente');
    const lista = await ctx.app.inject({
      method: 'GET',
      url: '/gatos',
      headers,
    });
    const cria = await ctx.app.inject({
      method: 'POST',
      url: '/gatos',
      headers,
      payload: ZEZINHO,
    });
    expect(lista.statusCode).toBe(403);
    expect(cria.statusCode).toBe(403);
  });
});
