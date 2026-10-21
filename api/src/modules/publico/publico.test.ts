import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, logarComo } from '../../../test/helpers.js';

let ctx: Awaited<ReturnType<typeof createTestApp>>;

beforeEach(async () => {
  ctx = await createTestApp();
});
afterEach(() => ctx.app.close());

async function cadastrar(payload: Record<string, unknown>) {
  const { headers } = await logarComo(ctx.app, 'adm');
  return (
    await ctx.app.inject({ method: 'POST', url: '/gatos', headers, payload })
  ).json();
}

describe('catálogo público', () => {
  it('qualquer visitante vê só os gatos publicados, sem dados internos', async () => {
    await cadastrar({
      nome: 'Zezinho',
      publicado: true,
      observacoes: 'segredo interno',
      descricaoPt: 'Galã',
    });
    await cadastrar({ nome: 'Rascunho', publicado: false });

    const res = await ctx.app.inject({ method: 'GET', url: '/public/gatos' });
    expect(res.statusCode).toBe(200);
    expect(res.json().itens).toEqual([
      expect.objectContaining({
        nome: 'Zezinho',
        slug: 'zezinho',
        descricaoPt: 'Galã',
      }),
    ]);
    expect(res.body).not.toContain('segredo interno');
    expect(res.json().itens[0]).not.toHaveProperty('observacoes');
    expect(res.json().itens[0]).not.toHaveProperty('id');
  });

  it('esconde gatos falecidos e filtra por status e sexo', async () => {
    await cadastrar({ nome: 'Ana', publicado: true, sexo: 'femea' });
    await cadastrar({
      nome: 'Beto',
      publicado: true,
      sexo: 'macho',
      status: 'adotado',
    });
    await cadastrar({ nome: 'Caco', publicado: true, status: 'falecido' });

    const todos = await ctx.app.inject({ method: 'GET', url: '/public/gatos' });
    expect(todos.json().itens.map((g: { nome: string }) => g.nome)).toEqual([
      'Ana',
      'Beto',
    ]);

    const femeas = await ctx.app.inject({
      method: 'GET',
      url: '/public/gatos?sexo=femea',
    });
    expect(femeas.json().total).toBe(1);
    const adotados = await ctx.app.inject({
      method: 'GET',
      url: '/public/gatos?status=adotado',
    });
    expect(adotados.json().itens[0].nome).toBe('Beto');
  });

  it('mostra o perfil do gato pelo slug; rascunho responde 404', async () => {
    await cadastrar({ nome: 'Elvis', publicado: true });
    await cadastrar({ nome: 'Oculto', publicado: false });

    const elvis = await ctx.app.inject({
      method: 'GET',
      url: '/public/gatos/elvis',
    });
    expect(elvis.json()).toMatchObject({ nome: 'Elvis', fotos: [], tags: [] });
    const oculto = await ctx.app.inject({
      method: 'GET',
      url: '/public/gatos/oculto',
    });
    expect(oculto.statusCode).toBe(404);
  });
});
