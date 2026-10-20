import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  createTestApp,
  criarUsuario,
  login,
  logarComo,
} from '../../../test/helpers.js';

let ctx: Awaited<ReturnType<typeof createTestApp>>;

beforeEach(async () => {
  ctx = await createTestApp();
});
afterEach(() => ctx.app.close());

describe('gestão de usuários', () => {
  it('adm cria um voluntário, que recebe convite por e-mail para definir a senha', async () => {
    const { headers } = await logarComo(ctx.app, 'adm');

    const res = await ctx.app.inject({
      method: 'POST',
      url: '/users',
      headers,
      payload: {
        nome: 'Vó Lourdes',
        email: 'lourdes@teste.org',
        cargo: 'voluntario',
      },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({
      email: 'lourdes@teste.org',
      cargo: 'voluntario',
      ativo: true,
    });
    expect(res.json()).not.toHaveProperty('senhaHash');

    const convite = ctx.mailer.enviados.at(-1);
    expect(convite?.para).toBe('lourdes@teste.org');
    expect(convite?.texto).toContain('redefinir-senha?token=');
  });

  it('aceita telefone vazio (null) ao criar', async () => {
    const { headers } = await logarComo(ctx.app, 'adm');
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/users',
      headers,
      payload: {
        nome: 'Sem Telefone',
        email: 'semtel@teste.org',
        cargo: 'cliente',
        telefone: null,
      },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().telefone).toBeNull();
  });

  it('adm lista e filtra por cargo e busca', async () => {
    const { headers } = await logarComo(ctx.app, 'adm');
    await criarUsuario('cliente', { email: 'maria.cliente@teste.org' });
    await criarUsuario('cliente', { email: 'joao.cliente@teste.org' });
    await criarUsuario('voluntario', { email: 'maria.vol@teste.org' });

    const clientes = await ctx.app.inject({
      method: 'GET',
      url: '/users?cargo=cliente',
      headers,
    });
    expect(clientes.json().total).toBe(2);

    const marias = await ctx.app.inject({
      method: 'GET',
      url: '/users?busca=maria',
      headers,
    });
    expect(
      marias
        .json()
        .itens.map((u: { email: string }) => u.email)
        .sort(),
    ).toEqual(['maria.cliente@teste.org', 'maria.vol@teste.org']);
  });

  it('adm promove um cliente a voluntário', async () => {
    const { headers } = await logarComo(ctx.app, 'adm');
    const cliente = await criarUsuario('cliente');

    const res = await ctx.app.inject({
      method: 'PATCH',
      url: `/users/${cliente.id}`,
      headers,
      payload: { cargo: 'voluntario' },
    });
    expect(res.statusCode).toBe(200);

    const sessao = await login(ctx.app, cliente.email);
    const me = await ctx.app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: sessao,
    });
    expect(me.json().cargo).toBe('voluntario');
  });

  it('desativar uma conta derruba as sessões dela', async () => {
    const { headers } = await logarComo(ctx.app, 'adm');
    const vol = await logarComo(ctx.app, 'voluntario');

    await ctx.app.inject({
      method: 'PATCH',
      url: `/users/${vol.user.id}`,
      headers,
      payload: { ativo: false },
    });

    const me = await ctx.app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: vol.headers,
    });
    expect(me.statusCode).toBe(401);
  });

  it('adm não pode tirar o próprio acesso de adm nem se desativar', async () => {
    const { user, headers } = await logarComo(ctx.app, 'adm');
    for (const payload of [{ cargo: 'voluntario' }, { ativo: false }]) {
      const res = await ctx.app.inject({
        method: 'PATCH',
        url: `/users/${user.id}`,
        headers,
        payload,
      });
      expect(res.statusCode).toBe(400);
    }
  });

  it('adm reenvia o convite', async () => {
    const { headers } = await logarComo(ctx.app, 'adm');
    const vol = await criarUsuario('voluntario', {
      email: 'reenvio@teste.org',
    });

    const res = await ctx.app.inject({
      method: 'POST',
      url: `/users/${vol.id}/enviar-convite`,
      headers,
    });
    expect(res.statusCode).toBe(204);
    expect(ctx.mailer.enviados.at(-1)?.para).toBe('reenvio@teste.org');
  });

  it('voluntário e cliente não acessam a gestão de usuários; anônimo precisa logar', async () => {
    for (const cargo of ['voluntario', 'cliente'] as const) {
      const { headers } = await logarComo(ctx.app, cargo);
      const res = await ctx.app.inject({
        method: 'GET',
        url: '/users',
        headers,
      });
      expect(res.statusCode).toBe(403);
    }
    const anonimo = await ctx.app.inject({ method: 'GET', url: '/users' });
    expect(anonimo.statusCode).toBe(401);
  });
});
