import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  createTestApp,
  criarUsuario,
  login,
  prisma,
} from '../../../test/helpers.js';

let ctx: Awaited<ReturnType<typeof createTestApp>>;

beforeEach(async () => {
  ctx = await createTestApp();
});
afterEach(() => ctx.app.close());

describe('cadastro de cliente', () => {
  it('pessoa se cadastra e já fica logada como cliente', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/auth/cadastro',
      payload: {
        nome: 'Ana',
        email: 'Ana@Exemplo.org',
        senha: 'senha-segura-123',
      },
    });
    expect(res.statusCode).toBe(201);

    const cookie = res.cookies.find((c) => c.name === 'amicats_session');
    const me = await ctx.app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { cookie: `amicats_session=${cookie?.value}` },
    });
    expect(me.statusCode).toBe(200);
    expect(me.json()).toMatchObject({
      nome: 'Ana',
      email: 'ana@exemplo.org',
      cargo: 'cliente',
    });
  });
});

describe('login', () => {
  it('entra com e-mail e senha corretos (e-mail sem diferenciar maiúsculas)', async () => {
    await criarUsuario('voluntario', {
      email: 'vol@amicats.org',
      senha: 'senha-certa-1',
    });
    const { cookie } = await login(ctx.app, 'VOL@amicats.org', 'senha-certa-1');

    const me = await ctx.app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { cookie },
    });
    expect(me.json()).toMatchObject({
      email: 'vol@amicats.org',
      cargo: 'voluntario',
    });
  });

  it('recusa senha errada sem revelar se o e-mail existe', async () => {
    await criarUsuario('cliente', {
      email: 'ana@teste.org',
      senha: 'senha-certa-1',
    });
    const senhaErrada = await ctx.app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'ana@teste.org', senha: 'senha-errada' },
    });
    const emailInexistente = await ctx.app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'ninguem@teste.org', senha: 'senha-errada' },
    });
    expect(senhaErrada.statusCode).toBe(401);
    expect(emailInexistente.statusCode).toBe(401);
    expect(senhaErrada.json()).toEqual(emailInexistente.json());
  });

  it('recusa conta desativada', async () => {
    await criarUsuario('cliente', {
      email: 'off@teste.org',
      senha: 'senha-certa-1',
      ativo: false,
    });
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'off@teste.org', senha: 'senha-certa-1' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('logout encerra a sessão', async () => {
    const user = await criarUsuario('cliente');
    const { cookie } = await login(ctx.app, user.email);

    const logout = await ctx.app.inject({
      method: 'POST',
      url: '/auth/logout',
      headers: { cookie },
    });
    expect(logout.statusCode).toBe(204);

    const me = await ctx.app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { cookie },
    });
    expect(me.statusCode).toBe(401);
  });

  it('sem sessão, /auth/me responde 401', async () => {
    const me = await ctx.app.inject({ method: 'GET', url: '/auth/me' });
    expect(me.statusCode).toBe(401);
  });
});

describe('redefinição de senha', () => {
  function linkDoEmail() {
    const texto = ctx.mailer.enviados.at(-1)?.texto ?? '';
    const token = /token=([\w-]+)/.exec(texto)?.[1];
    return { texto, token };
  }

  it('envia link por e-mail e permite trocar a senha uma única vez', async () => {
    const user = await criarUsuario('cliente', { email: 'bia@teste.org' });

    const pedido = await ctx.app.inject({
      method: 'POST',
      url: '/auth/esqueci-senha',
      payload: { email: 'bia@teste.org' },
    });
    expect(pedido.statusCode).toBe(204);
    expect(ctx.mailer.enviados).toHaveLength(1);
    expect(ctx.mailer.enviados[0]?.para).toBe('bia@teste.org');

    const { texto, token } = linkDoEmail();
    expect(texto).toContain(
      'http://localhost:3000/pt-BR/app/redefinir-senha?token=',
    );

    const troca = await ctx.app.inject({
      method: 'POST',
      url: '/auth/redefinir-senha',
      payload: { token, senha: 'nova-senha-456' },
    });
    expect(troca.statusCode).toBe(204);

    await expect(
      login(ctx.app, user.email, 'nova-senha-456'),
    ).resolves.toBeDefined();
    await expect(login(ctx.app, user.email)).rejects.toThrow('401');

    const reuso = await ctx.app.inject({
      method: 'POST',
      url: '/auth/redefinir-senha',
      payload: { token, senha: 'outra-senha-789' },
    });
    expect(reuso.statusCode).toBe(400);
  });

  it('trocar a senha derruba as sessões abertas', async () => {
    const user = await criarUsuario('cliente', { email: 'caio@teste.org' });
    const { cookie } = await login(ctx.app, user.email);

    await ctx.app.inject({
      method: 'POST',
      url: '/auth/esqueci-senha',
      payload: { email: 'caio@teste.org' },
    });
    await ctx.app.inject({
      method: 'POST',
      url: '/auth/redefinir-senha',
      payload: { token: linkDoEmail().token, senha: 'nova-senha-456' },
    });

    const me = await ctx.app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { cookie },
    });
    expect(me.statusCode).toBe(401);
  });

  it('e-mail desconhecido responde igual, sem enviar nada', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/auth/esqueci-senha',
      payload: { email: 'ninguem@teste.org' },
    });
    expect(res.statusCode).toBe(204);
    expect(ctx.mailer.enviados).toHaveLength(0);
  });

  it('token inválido é recusado', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/auth/redefinir-senha',
      payload: { token: 'inventado', senha: 'nova-senha-456' },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('proteções', () => {
  it('o site pode fazer PATCH, PUT e DELETE com cookie (preflight de CORS)', async () => {
    for (const metodo of ['PATCH', 'PUT', 'DELETE']) {
      const res = await ctx.app.inject({
        method: 'OPTIONS',
        url: '/gatos/qualquer',
        headers: {
          origin: 'http://localhost:3000',
          'access-control-request-method': metodo,
          'access-control-request-headers': 'content-type',
        },
      });
      expect(res.headers['access-control-allow-origin']).toBe(
        'http://localhost:3000',
      );
      expect(res.headers['access-control-allow-credentials']).toBe('true');
      expect(String(res.headers['access-control-allow-methods'])).toContain(
        metodo,
      );
    }
  });

  it('bloqueia a 6ª tentativa de login seguida para o mesmo e-mail', async () => {
    const tentativa = () =>
      ctx.app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: 'alvo@teste.org', senha: 'chute' },
      });
    for (let i = 0; i < 5; i++)
      expect((await tentativa()).statusCode).toBe(401);
    expect((await tentativa()).statusCode).toBe(429);
  });

  it('recusa requisição que altera dados vinda de outro site', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/auth/cadastro',
      headers: { origin: 'https://site-malicioso.com' },
      payload: {
        nome: 'Ana',
        email: 'ana@teste.org',
        senha: 'senha-segura-123',
      },
    });
    expect(res.statusCode).toBe(403);
  });

  it('sessão expirada não autentica', async () => {
    const user = await criarUsuario('cliente');
    const { cookie } = await login(ctx.app, user.email);
    await prisma.session.updateMany({
      where: { userId: user.id },
      data: { expiraEm: new Date(Date.now() - 1000) },
    });

    const me = await ctx.app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { cookie },
    });
    expect(me.statusCode).toBe(401);
  });

  it('não permite dois cadastros com o mesmo e-mail', async () => {
    await criarUsuario('cliente', { email: 'dup@teste.org' });
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/auth/cadastro',
      payload: {
        nome: 'Outra',
        email: 'DUP@teste.org',
        senha: 'senha-segura-123',
      },
    });
    expect(res.statusCode).toBe(409);
  });

  it('valida os dados do cadastro', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/auth/cadastro',
      payload: { nome: 'A', email: 'nao-e-email', senha: 'curta' },
    });
    expect(res.statusCode).toBe(400);
    expect(
      res
        .json()
        .erros.map((e: { campo: string }) => e.campo)
        .sort(),
    ).toEqual(['email', 'nome', 'senha']);
  });
});

describe('minha conta', () => {
  it('qualquer pessoa logada edita o próprio nome e telefone, mas não o cargo', async () => {
    const user = await criarUsuario('cliente');
    const { cookie } = await login(ctx.app, user.email);

    const res = await ctx.app.inject({
      method: 'PATCH',
      url: '/auth/me',
      headers: { cookie },
      payload: { nome: 'Novo Nome', telefone: '67 99999-0000', cargo: 'adm' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      nome: 'Novo Nome',
      telefone: '67 99999-0000',
      cargo: 'cliente',
    });
  });

  it('troca a senha confirmando a atual; outras sessões caem, a atual continua', async () => {
    const user = await criarUsuario('voluntario');
    const atual = await login(ctx.app, user.email);
    const outroAparelho = await login(ctx.app, user.email);

    const errada = await ctx.app.inject({
      method: 'POST',
      url: '/auth/trocar-senha',
      headers: atual,
      payload: { senhaAtual: 'nao-e-essa', novaSenha: 'nova-senha-456' },
    });
    expect(errada.statusCode).toBe(400);

    const ok = await ctx.app.inject({
      method: 'POST',
      url: '/auth/trocar-senha',
      headers: atual,
      payload: { senhaAtual: 'senha-segura-123', novaSenha: 'nova-senha-456' },
    });
    expect(ok.statusCode).toBe(204);

    expect(
      (await ctx.app.inject({ method: 'GET', url: '/auth/me', headers: atual }))
        .statusCode,
    ).toBe(200);
    expect(
      (
        await ctx.app.inject({
          method: 'GET',
          url: '/auth/me',
          headers: outroAparelho,
        })
      ).statusCode,
    ).toBe(401);
    await expect(
      login(ctx.app, user.email, 'nova-senha-456'),
    ).resolves.toBeDefined();
  });
});
