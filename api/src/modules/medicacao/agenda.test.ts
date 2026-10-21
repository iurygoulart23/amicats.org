import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, logarComo } from '../../../test/helpers.js';

let ctx: Awaited<ReturnType<typeof createTestApp>>;

beforeEach(async () => {
  ctx = await createTestApp();
});
afterEach(() => ctx.app.close());

async function preparar(prescricao: Record<string, unknown> = {}) {
  const vol = await logarComo(ctx.app, 'voluntario');
  const gato = (
    await ctx.app.inject({
      method: 'POST',
      url: '/gatos',
      headers: vol.headers,
      payload: { nome: 'Pirelli' },
    })
  ).json();
  const p = (
    await ctx.app.inject({
      method: 'POST',
      url: `/gatos/${gato.id}/prescricoes`,
      headers: vol.headers,
      payload: {
        medicamento: 'Amoxicilina',
        dose: '1/2 comprimido',
        via: 'oral',
        intervaloHoras: 12,
        inicio: '2026-10-20T08:00:00-04:00',
        fim: '2026-10-27T08:00:00-04:00',
        ...prescricao,
      },
    })
  ).json();
  const agenda = async (dia: string, headers = vol.headers) =>
    ctx.app.inject({
      method: 'GET',
      url: `/medicacao/agenda?dia=${dia}`,
      headers,
    });
  const aplicar = (payload: Record<string, unknown>, headers = vol.headers) =>
    ctx.app.inject({
      method: 'POST',
      url: '/medicacao/aplicacoes',
      headers,
      payload: { prescricaoId: p.id, ...payload },
    });
  return { vol, gato, p, agenda, aplicar };
}

describe('remédios do dia', () => {
  it('lista as doses previstas do dia no horário do abrigo', async () => {
    const { agenda } = await preparar();
    const res = await agenda('2026-10-21');
    expect(res.statusCode).toBe(200);
    expect(
      res.json().map((d: { horarioPrevisto: string }) => d.horarioPrevisto),
    ).toEqual([
      '2026-10-21T12:00:00.000Z', // 08:00 em Campo Grande
      '2026-10-22T00:00:00.000Z', // 20:00 em Campo Grande
    ]);
    expect(res.json()[0]).toMatchObject({
      medicamento: 'Amoxicilina',
      dose: '1/2 comprimido',
      gato: expect.objectContaining({ nome: 'Pirelli' }),
      aplicacao: null,
    });
  });

  it('respeita o fim da prescrição (a última dose é no horário do fim)', async () => {
    const { agenda } = await preparar();
    expect((await agenda('2026-10-27')).json()).toHaveLength(1);
    expect((await agenda('2026-10-28')).json()).toHaveLength(0);
    expect((await agenda('2026-10-19')).json()).toHaveLength(0);
  });

  it('prescrição de uso contínuo segue aparecendo; encerrada para de aparecer', async () => {
    const { vol, gato, p, agenda } = await preparar({
      fim: null,
      inicio: '2026-01-01T09:00:00-04:00',
      intervaloHoras: 24,
    });
    expect((await agenda('2026-12-25')).json()).toHaveLength(1);

    await ctx.app.inject({
      method: 'POST',
      url: `/gatos/${gato.id}/prescricoes/${p.id}/encerrar`,
      headers: vol.headers,
    });
    expect((await agenda('2099-01-01')).json()).toHaveLength(0);
  });

  it('voluntário registra a dose dada; ela aparece aplicada e não pode ser registrada duas vezes', async () => {
    const { agenda, aplicar } = await preparar();
    const horarioPrevisto = '2026-10-21T12:00:00.000Z';

    const res = await aplicar({ horarioPrevisto });
    expect(res.statusCode).toBe(201);
    expect((await aplicar({ horarioPrevisto })).statusCode).toBe(409);

    const [primeira, segunda] = (await agenda('2026-10-21')).json();
    expect(primeira.aplicacao).toMatchObject({
      pulada: false,
      aplicadaPor: expect.objectContaining({ nome: 'Pessoa voluntario' }),
    });
    expect(segunda.aplicacao).toBeNull();
  });

  it('não aceita registrar um horário que não é dose prevista', async () => {
    const { aplicar } = await preparar();
    expect(
      (await aplicar({ horarioPrevisto: '2026-10-21T13:00:00.000Z' }))
        .statusCode,
    ).toBe(400);
  });

  it('dose pulada exige o motivo', async () => {
    const { aplicar } = await preparar();
    const semMotivo = await aplicar({
      horarioPrevisto: '2026-10-21T12:00:00.000Z',
      pulada: true,
    });
    expect(semMotivo.statusCode).toBe(400);
    const comMotivo = await aplicar({
      horarioPrevisto: '2026-10-21T12:00:00.000Z',
      pulada: true,
      observacao: 'Vomitou',
    });
    expect(comMotivo.json()).toMatchObject({
      pulada: true,
      observacao: 'Vomitou',
    });
  });

  it('quem registrou (ou adm) pode desfazer; outro voluntário não', async () => {
    const { aplicar } = await preparar();
    const outro = await logarComo(ctx.app, 'voluntario');
    const adm = await logarComo(ctx.app, 'adm');
    const a = (
      await aplicar({ horarioPrevisto: '2026-10-21T12:00:00.000Z' })
    ).json();
    const b = (
      await aplicar({ horarioPrevisto: '2026-10-22T00:00:00.000Z' })
    ).json();

    expect(
      (
        await ctx.app.inject({
          method: 'DELETE',
          url: `/medicacao/aplicacoes/${a.id}`,
          headers: outro.headers,
        })
      ).statusCode,
    ).toBe(403);
    expect(
      (
        await ctx.app.inject({
          method: 'DELETE',
          url: `/medicacao/aplicacoes/${b.id}`,
          headers: adm.headers,
        })
      ).statusCode,
    ).toBe(204);
  });

  it('cliente não vê os remédios do dia', async () => {
    const { agenda } = await preparar();
    const cliente = await logarComo(ctx.app, 'cliente');
    expect((await agenda('2026-10-21', cliente.headers)).statusCode).toBe(403);
  });
});
