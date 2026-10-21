import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { meQuery } from './auth.queries';
import { destinoSeguro, exigirCargo, exigirLogin } from './guards';
import type { UsuarioLogado } from './types';

const pessoa = (cargo: UsuarioLogado['cargo']): UsuarioLogado => ({
  id: '1',
  nome: 'Ana',
  email: 'ana@teste.org',
  cargo,
  telefone: null,
  notificarPorEmail: true,
});

describe('exigirLogin', () => {
  it('sem sessão, redireciona para o login guardando para onde voltar', async () => {
    const qc = new QueryClient();
    qc.setQueryData(meQuery.queryKey, null);

    const erro = await exigirLogin(qc, 'pt-BR', '/pt-BR/app/gatos').catch(
      (e: unknown) => e,
    );

    expect(erro).toMatchObject({
      options: {
        to: '/$locale/app/login',
        params: { locale: 'pt-BR' },
        search: { redirect: '/pt-BR/app/gatos' },
      },
    });
  });

  it('com sessão, devolve a pessoa logada', async () => {
    const qc = new QueryClient();
    qc.setQueryData(meQuery.queryKey, pessoa('cliente'));
    await expect(exigirLogin(qc, 'pt-BR', '/pt-BR/app')).resolves.toMatchObject(
      { nome: 'Ana' },
    );
  });
});

describe('exigirCargo', () => {
  it('cliente não entra na gestão de gatos; voluntário e adm entram', () => {
    expect(() =>
      exigirCargo(pessoa('cliente'), 'voluntario', 'pt-BR'),
    ).toThrow();
    expect(() =>
      exigirCargo(pessoa('voluntario'), 'voluntario', 'pt-BR'),
    ).not.toThrow();
    expect(() =>
      exigirCargo(pessoa('adm'), 'voluntario', 'pt-BR'),
    ).not.toThrow();
  });

  it('só adm entra na administração', () => {
    expect(() => exigirCargo(pessoa('voluntario'), 'adm', 'pt-BR')).toThrow();
    expect(() => exigirCargo(pessoa('adm'), 'adm', 'pt-BR')).not.toThrow();
  });
});

describe('destinoSeguro', () => {
  it('aceita só caminhos internos depois do login', () => {
    expect(destinoSeguro('/pt-BR/app/gatos', 'pt-BR')).toBe('/pt-BR/app/gatos');
    expect(destinoSeguro('https://site-malicioso.com', 'pt-BR')).toBe(
      '/pt-BR/app',
    );
    expect(destinoSeguro('//site-malicioso.com', 'pt-BR')).toBe('/pt-BR/app');
    expect(destinoSeguro(undefined, 'en')).toBe('/en/app');
  });
});
