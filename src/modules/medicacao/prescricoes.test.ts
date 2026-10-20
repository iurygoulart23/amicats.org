import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, logarComo } from '../../../test/helpers.js';

let ctx: Awaited<ReturnType<typeof createTestApp>>;

beforeEach(async () => {
  ctx = await createTestApp();
});
afterEach(() => ctx.app.close());

const ANTIBIOTICO = {
  medicamento: 'Amoxicilina 50mg',
  dose: '1/2 comprimido',
  via: 'oral',
  intervaloHoras: 12,
  inicio: '2026-10-20T08:00:00-04:00',
  fim: '2026-10-27T08:00:00-04:00',
  prescritoPor: 'Dra. Ana (Clínica Bicho Feliz)',
  observacao: 'Dar com comida.',
};

async function preparar() {
  const vol = await logarComo(ctx.app, 'voluntario');
  const gato = (
    await ctx.app.inject({
      method: 'POST',
      url: '/gatos',
      headers: vol.headers,
      payload: { nome: 'Pirelli' },
    })
  ).json();
  const prescrever = (
    payload: Record<string, unknown> = ANTIBIOTICO,
    headers = vol.headers,
  ) =>
    ctx.app.inject({
      method: 'POST',
      url: `/gatos/${gato.id}/prescricoes`,
      headers,
      payload,
    });
  return { vol, gato, prescrever };
}

describe('prescrições', () => {
  it('voluntário prescreve um medicamento e vê a lista do gato', async () => {
    const { vol, gato, prescrever } = await preparar();

    const res = await prescrever();
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({
      medicamento: 'Amoxicilina 50mg',
      intervaloHoras: 12,
      inicio: '2026-10-20T12:00:00.000Z',
      fim: '2026-10-27T12:00:00.000Z',
      encerradaEm: null,
      criadoPor: expect.objectContaining({ nome: 'Pessoa voluntario' }),
    });

    const lista = await ctx.app.inject({
      method: 'GET',
      url: `/gatos/${gato.id}/prescricoes`,
      headers: vol.headers,
    });
    expect(lista.json()).toHaveLength(1);
  });

  it('aceita uso contínuo (sem fim) e valida intervalo e período', async () => {
    const { prescrever } = await preparar();
    expect((await prescrever({ ...ANTIBIOTICO, fim: null })).statusCode).toBe(
      201,
    );

    const invalida = await prescrever({
      ...ANTIBIOTICO,
      intervaloHoras: 0,
      fim: '2026-10-19T08:00:00-04:00',
    });
    expect(invalida.statusCode).toBe(400);
  });

  it('encerrar interrompe a prescrição antes do fim previsto', async () => {
    const { vol, gato, prescrever } = await preparar();
    const { id } = (await prescrever()).json();

    const res = await ctx.app.inject({
      method: 'POST',
      url: `/gatos/${gato.id}/prescricoes/${id}/encerrar`,
      headers: vol.headers,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().encerradaEm).not.toBeNull();
  });

  it('só adm exclui uma prescrição lançada por engano; cliente não acessa', async () => {
    const { vol, gato, prescrever } = await preparar();
    const adm = await logarComo(ctx.app, 'adm');
    const cliente = await logarComo(ctx.app, 'cliente');
    const { id } = (await prescrever()).json();
    const url = `/gatos/${gato.id}/prescricoes/${id}`;

    expect(
      (await ctx.app.inject({ method: 'DELETE', url, headers: vol.headers }))
        .statusCode,
    ).toBe(403);
    expect(
      (await ctx.app.inject({ method: 'DELETE', url, headers: adm.headers }))
        .statusCode,
    ).toBe(204);
    expect((await prescrever(ANTIBIOTICO, cliente.headers)).statusCode).toBe(
      403,
    );
  });
});
