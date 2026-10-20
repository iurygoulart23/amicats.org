import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, logarComo } from '../../../test/helpers.js';

let ctx: Awaited<ReturnType<typeof createTestApp>>;

beforeEach(async () => {
  ctx = await createTestApp();
});
afterEach(() => ctx.app.close());

async function preparar() {
  const vol = await logarComo(ctx.app, 'voluntario');
  const gato = (
    await ctx.app.inject({
      method: 'POST',
      url: '/gatos',
      headers: vol.headers,
      payload: { nome: 'Marilyn' },
    })
  ).json();
  const enviarFoto = async (contentType = 'image/jpeg') => {
    const url = await ctx.app.inject({
      method: 'POST',
      url: `/gatos/${gato.id}/fotos/upload-url`,
      headers: vol.headers,
      payload: { contentType },
    });
    // Aqui o navegador faria o PUT direto no bucket; depois confirma na API.
    const confirmada = await ctx.app.inject({
      method: 'POST',
      url: `/gatos/${gato.id}/fotos`,
      headers: vol.headers,
      payload: { key: url.json().key },
    });
    return { url: url.json(), foto: confirmada.json() };
  };
  return { vol, gato, enviarFoto };
}

describe('fotos dos gatos', () => {
  it('gera URL de upload na pasta do gato e registra a foto depois do envio', async () => {
    const { gato, enviarFoto } = await preparar();
    const { url, foto } = await enviarFoto('image/webp');

    expect(url.key).toMatch(new RegExp(`^gatos/${gato.id}/[\\w-]+\\.webp$`));
    expect(url.uploadUrl).toContain(url.key);
    expect(foto).toMatchObject({
      url: `https://cdn.test/${url.key}`,
      capa: true,
      ordem: 0,
    });
  });

  it('só aceita imagens', async () => {
    const { vol, gato } = await preparar();
    const res = await ctx.app.inject({
      method: 'POST',
      url: `/gatos/${gato.id}/fotos/upload-url`,
      headers: vol.headers,
      payload: { contentType: 'application/pdf' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('não registra arquivo fora da pasta do gato', async () => {
    const { vol, gato } = await preparar();
    const res = await ctx.app.inject({
      method: 'POST',
      url: `/gatos/${gato.id}/fotos`,
      headers: vol.headers,
      payload: { key: 'gatos/outro-gato/x.jpg' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('a primeira foto vira capa; trocar a capa desmarca a anterior', async () => {
    const { vol, gato, enviarFoto } = await preparar();
    const primeira = (await enviarFoto()).foto;
    const segunda = (await enviarFoto()).foto;
    expect(primeira.capa).toBe(true);
    expect(segunda).toMatchObject({ capa: false, ordem: 1 });

    await ctx.app.inject({
      method: 'PATCH',
      url: `/gatos/${gato.id}/fotos/${segunda.id}`,
      headers: vol.headers,
      payload: { capa: true },
    });
    const detalhe = (
      await ctx.app.inject({
        method: 'GET',
        url: `/gatos/${gato.id}`,
        headers: vol.headers,
      })
    ).json();
    expect(
      detalhe.fotos.map((f: { id: string; capa: boolean }) => [f.id, f.capa]),
    ).toEqual([
      [segunda.id, true],
      [primeira.id, false],
    ]);
  });

  it('excluir a foto apaga o arquivo do bucket e promove outra a capa', async () => {
    const { vol, gato, enviarFoto } = await preparar();
    const capa = await enviarFoto();
    const outra = (await enviarFoto()).foto;

    const res = await ctx.app.inject({
      method: 'DELETE',
      url: `/gatos/${gato.id}/fotos/${capa.foto.id}`,
      headers: vol.headers,
    });
    expect(res.statusCode).toBe(204);
    expect(ctx.storage.removidos).toEqual([capa.url.key]);

    const detalhe = (
      await ctx.app.inject({
        method: 'GET',
        url: `/gatos/${gato.id}`,
        headers: vol.headers,
      })
    ).json();
    expect(detalhe.fotos).toEqual([
      expect.objectContaining({ id: outra.id, capa: true }),
    ]);
  });

  it('cadastra foto legada só pela URL (migração do catálogo atual)', async () => {
    const { vol, gato } = await preparar();
    const res = await ctx.app.inject({
      method: 'POST',
      url: `/gatos/${gato.id}/fotos`,
      headers: vol.headers,
      payload: {
        url: 'https://f005.backblazeb2.com/file/catalogo-gatos/x.jpg',
      },
    });
    expect(res.json()).toMatchObject({
      url: 'https://f005.backblazeb2.com/file/catalogo-gatos/x.jpg',
      capa: true,
    });
  });
});
