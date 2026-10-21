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
      payload: { nome: 'Carlos' },
    })
  ).json();
  const esporo = (
    await ctx.app.inject({
      method: 'POST',
      url: '/tags',
      headers: adm.headers,
      payload: { nome: 'Esporotricose' },
    })
  ).json();
  return { vol, adm, gato, esporo };
}

describe('histórico de saúde', () => {
  it('voluntário registra doenças do gato e vê a linha do tempo (mais recente primeiro)', async () => {
    const { vol, gato, esporo } = await preparar();
    const url = `/gatos/${gato.id}/saude`;

    const antiga = await ctx.app.inject({
      method: 'POST',
      url,
      headers: vol.headers,
      payload: {
        titulo: 'Esporotricose na orelha',
        tagId: esporo.id,
        dataInicio: '2024-01-10',
        dataFim: '2024-04-02',
        observacao: 'Tratado com itraconazol por 12 semanas.',
      },
    });
    expect(antiga.statusCode).toBe(201);
    await ctx.app.inject({
      method: 'POST',
      url,
      headers: vol.headers,
      payload: { titulo: 'Gengivite', dataInicio: '2025-06-01' },
    });

    const lista = await ctx.app.inject({
      method: 'GET',
      url,
      headers: vol.headers,
    });
    expect(lista.json()).toEqual([
      expect.objectContaining({
        titulo: 'Gengivite',
        dataFim: null,
        emCurso: true,
        tag: null,
      }),
      expect.objectContaining({
        titulo: 'Esporotricose na orelha',
        dataInicio: '2024-01-10',
        dataFim: '2024-04-02',
        emCurso: false,
        tag: expect.objectContaining({ nome: 'Esporotricose' }),
        registradoPor: expect.objectContaining({ nome: 'Pessoa voluntario' }),
      }),
    ]);
  });

  it('encerra uma condição em curso e corrige a observação', async () => {
    const { vol, gato } = await preparar();
    const { id } = (
      await ctx.app.inject({
        method: 'POST',
        url: `/gatos/${gato.id}/saude`,
        headers: vol.headers,
        payload: { titulo: 'Rinotraqueíte', dataInicio: '2025-08-01' },
      })
    ).json();

    const res = await ctx.app.inject({
      method: 'PATCH',
      url: `/gatos/${gato.id}/saude/${id}`,
      headers: vol.headers,
      payload: { dataFim: '2025-08-20', observacao: 'Curado.' },
    });
    expect(res.json()).toMatchObject({
      dataFim: '2025-08-20',
      observacao: 'Curado.',
      emCurso: false,
    });
  });

  it('não aceita data de fim antes do início', async () => {
    const { vol, gato } = await preparar();
    const res = await ctx.app.inject({
      method: 'POST',
      url: `/gatos/${gato.id}/saude`,
      headers: vol.headers,
      payload: { titulo: 'X', dataInicio: '2025-08-10', dataFim: '2025-08-01' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('exclui um registro lançado por engano', async () => {
    const { vol, gato } = await preparar();
    const url = `/gatos/${gato.id}/saude`;
    const { id } = (
      await ctx.app.inject({
        method: 'POST',
        url,
        headers: vol.headers,
        payload: { titulo: 'Engano', dataInicio: '2025-01-01' },
      })
    ).json();

    const res = await ctx.app.inject({
      method: 'DELETE',
      url: `${url}/${id}`,
      headers: vol.headers,
    });
    expect(res.statusCode).toBe(204);
    expect(
      (
        await ctx.app.inject({ method: 'GET', url, headers: vol.headers })
      ).json(),
    ).toEqual([]);
  });

  it('registro de outro gato não é acessível pela URL deste', async () => {
    const { vol, gato } = await preparar();
    const outro = (
      await ctx.app.inject({
        method: 'POST',
        url: '/gatos',
        headers: vol.headers,
        payload: { nome: 'Outro' },
      })
    ).json();
    const { id } = (
      await ctx.app.inject({
        method: 'POST',
        url: `/gatos/${outro.id}/saude`,
        headers: vol.headers,
        payload: { titulo: 'Do outro', dataInicio: '2025-01-01' },
      })
    ).json();

    const res = await ctx.app.inject({
      method: 'DELETE',
      url: `/gatos/${gato.id}/saude/${id}`,
      headers: vol.headers,
    });
    expect(res.statusCode).toBe(404);
  });

  it('cliente não vê o histórico de saúde', async () => {
    const { gato } = await preparar();
    const cliente = await logarComo(ctx.app, 'cliente');
    const res = await ctx.app.inject({
      method: 'GET',
      url: `/gatos/${gato.id}/saude`,
      headers: cliente.headers,
    });
    expect(res.statusCode).toBe(403);
  });
});
