import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, logarComo } from '../../../test/helpers.js';
import { diaNoAbrigo } from '../../domain/medicacao.js';

let ctx: Awaited<ReturnType<typeof createTestApp>>;

beforeEach(async () => {
  ctx = await createTestApp();
});
afterEach(() => ctx.app.close());

const diaRelativo = (dias: number) =>
  diaNoAbrigo(new Date(Date.now() + dias * 24 * 60 * 60 * 1000));

async function preparar(nome = 'Star') {
  const vol = await logarComo(ctx.app, 'voluntario');
  const gato = (
    await ctx.app.inject({
      method: 'POST',
      url: '/gatos',
      headers: vol.headers,
      payload: { nome },
    })
  ).json();
  const registrar = (payload: Record<string, unknown>) =>
    ctx.app.inject({
      method: 'POST',
      url: `/gatos/${gato.id}/veterinario`,
      headers: vol.headers,
      payload,
    });
  return { vol, gato, registrar };
}

describe('eventos veterinários', () => {
  it('voluntário registra vacina com retorno e vê o histórico do gato', async () => {
    const { vol, gato, registrar } = await preparar();
    const res = await registrar({
      tipo: 'vacina',
      titulo: 'V4 — 1ª dose',
      data: '2026-09-10',
      local: 'Clínica Bicho Feliz',
      proximaData: '2026-10-01',
    });
    expect(res.statusCode).toBe(201);
    await registrar({
      tipo: 'consulta',
      titulo: 'Check-up',
      data: '2026-10-05',
    });

    const lista = await ctx.app.inject({
      method: 'GET',
      url: `/gatos/${gato.id}/veterinario`,
      headers: vol.headers,
    });
    expect(lista.json().map((e: { titulo: string }) => e.titulo)).toEqual([
      'Check-up',
      'V4 — 1ª dose',
    ]);
    expect(lista.json()[1]).toMatchObject({
      tipo: 'vacina',
      local: 'Clínica Bicho Feliz',
      proximaData: '2026-10-01',
      registradoPor: expect.objectContaining({ nome: 'Pessoa voluntario' }),
    });
  });

  it('o retorno não pode ser antes do evento', async () => {
    const { registrar } = await preparar();
    const res = await registrar({
      tipo: 'vacina',
      titulo: 'X',
      data: '2026-09-10',
      proximaData: '2026-09-01',
    });
    expect(res.statusCode).toBe(400);
  });

  it('edita e exclui um evento', async () => {
    const { vol, gato, registrar } = await preparar();
    const { id } = (
      await registrar({
        tipo: 'exame',
        titulo: 'Hemograma',
        data: '2026-09-10',
      })
    ).json();
    const url = `/gatos/${gato.id}/veterinario/${id}`;

    const editado = await ctx.app.inject({
      method: 'PATCH',
      url,
      headers: vol.headers,
      payload: { observacao: 'Tudo normal' },
    });
    expect(editado.json().observacao).toBe('Tudo normal');
    expect(
      (await ctx.app.inject({ method: 'DELETE', url, headers: vol.headers }))
        .statusCode,
    ).toBe(204);
  });

  it('lista os retornos dos próximos dias de todos os gatos, com os atrasados primeiro', async () => {
    const star = await preparar('Star');
    const raul = await preparar('Raul');
    await star.registrar({
      tipo: 'vacina',
      titulo: 'Reforço V4',
      data: diaRelativo(-30),
      proximaData: diaRelativo(10),
    });
    await raul.registrar({
      tipo: 'consulta',
      titulo: 'Revisão',
      data: diaRelativo(-20),
      proximaData: diaRelativo(-2),
    });
    await raul.registrar({
      tipo: 'vacina',
      titulo: 'Antirrábica',
      data: diaRelativo(-5),
      proximaData: diaRelativo(300),
    });

    const res = await ctx.app.inject({
      method: 'GET',
      url: '/veterinario/retornos?dias=30',
      headers: star.vol.headers,
    });
    expect(res.json()).toEqual([
      expect.objectContaining({
        titulo: 'Revisão',
        atrasado: true,
        gato: expect.objectContaining({ nome: 'Raul' }),
      }),
      expect.objectContaining({
        titulo: 'Reforço V4',
        atrasado: false,
        gato: expect.objectContaining({ nome: 'Star' }),
      }),
    ]);
  });

  it('cliente não acessa o histórico veterinário', async () => {
    const { gato } = await preparar();
    const cliente = await logarComo(ctx.app, 'cliente');
    const res = await ctx.app.inject({
      method: 'GET',
      url: `/gatos/${gato.id}/veterinario`,
      headers: cliente.headers,
    });
    expect(res.statusCode).toBe(403);
  });
});
