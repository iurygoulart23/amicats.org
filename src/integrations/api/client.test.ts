import { describe, expect, it, vi } from 'vitest';
import { ApiError, api, montarUrl } from './client';

const resposta = (status: number, corpo?: unknown) =>
  new Response(corpo === undefined ? null : JSON.stringify(corpo), {
    status,
    headers: { 'content-type': 'application/json' },
  });

describe('api', () => {
  it('envia JSON com o cookie de sessão e devolve o corpo', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(resposta(200, { id: '1' }));

    const dados = await api('/gatos', {
      method: 'POST',
      body: { nome: 'Elvis' },
      fetchImpl,
    });

    expect(dados).toEqual({ id: '1' });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('http://localhost:3333/gatos');
    expect(init).toMatchObject({
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({ nome: 'Elvis' }),
      headers: { 'content-type': 'application/json' },
    });
  });

  it('transforma erros da API em ApiError com mensagem e erros de campo', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      resposta(400, {
        mensagem: 'Dados inválidos.',
        erros: [{ campo: 'email', mensagem: 'E-mail inválido.' }],
      }),
    );

    const erro = await api('/auth/cadastro', {
      method: 'POST',
      body: {},
      fetchImpl,
    }).catch((e: unknown) => e);

    expect(erro).toBeInstanceOf(ApiError);
    expect((erro as ApiError).status).toBe(400);
    expect((erro as ApiError).message).toBe('Dados inválidos.');
    expect((erro as ApiError).erroDoCampo('email')).toBe('E-mail inválido.');
  });

  it('responde 204 sem corpo', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }));
    await expect(
      api('/auth/logout', { method: 'POST', fetchImpl }),
    ).resolves.toBeUndefined();
  });

  it('falha de rede vira ApiError com status 0', async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(api('/auth/me', { fetchImpl })).rejects.toMatchObject({
      status: 0,
      message: 'Não foi possível conectar ao servidor.',
    });
  });
});

describe('montarUrl', () => {
  it('ignora filtros vazios', () => {
    expect(
      montarUrl('/gatos', {
        status: 'disponivel',
        busca: '',
        tag: undefined,
        pagina: 2,
      }),
    ).toBe('http://localhost:3333/gatos?status=disponivel&pagina=2');
  });
});
