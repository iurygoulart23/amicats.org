import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, logarComo } from '../../test/helpers.js';
import type { Cargo } from '../domain/cargos.js';

const ID = '11111111-1111-4111-8111-111111111111';

// [método, url, cargo mínimo]. Rotas novas devem entrar aqui.
const ROTAS: Array<[string, string, Cargo]> = [
  ['GET', '/users', 'adm'],
  ['POST', '/users', 'adm'],
  ['GET', `/users/${ID}`, 'adm'],
  ['PATCH', `/users/${ID}`, 'adm'],
  ['POST', `/users/${ID}/enviar-convite`, 'adm'],
  ['GET', '/gatos', 'voluntario'],
  ['POST', '/gatos', 'voluntario'],
  ['GET', `/gatos/${ID}`, 'voluntario'],
  ['PATCH', `/gatos/${ID}`, 'voluntario'],
  ['DELETE', `/gatos/${ID}`, 'adm'],
  ['PUT', `/gatos/${ID}/tags`, 'voluntario'],
  ['GET', `/gatos/${ID}/saude`, 'voluntario'],
  ['POST', `/gatos/${ID}/saude`, 'voluntario'],
  ['PATCH', `/gatos/${ID}/saude/${ID}`, 'voluntario'],
  ['DELETE', `/gatos/${ID}/saude/${ID}`, 'voluntario'],
  ['POST', `/gatos/${ID}/fotos/upload-url`, 'voluntario'],
  ['POST', `/gatos/${ID}/fotos`, 'voluntario'],
  ['PATCH', `/gatos/${ID}/fotos/${ID}`, 'voluntario'],
  ['DELETE', `/gatos/${ID}/fotos/${ID}`, 'voluntario'],
  ['GET', '/tags', 'voluntario'],
  ['POST', '/tags', 'adm'],
  ['PATCH', `/tags/${ID}`, 'adm'],
  ['DELETE', `/tags/${ID}`, 'adm'],
  ['GET', `/gatos/${ID}/gastos`, 'voluntario'],
  ['POST', `/gatos/${ID}/gastos`, 'voluntario'],
  ['PATCH', `/gatos/${ID}/gastos/${ID}`, 'adm'],
  ['DELETE', `/gatos/${ID}/gastos/${ID}`, 'adm'],
  ['GET', `/gatos/${ID}/padrinhos`, 'voluntario'],
  ['POST', '/apadrinhamentos', 'cliente'],
  ['GET', '/apadrinhamentos/meus', 'cliente'],
  ['GET', `/apadrinhamentos/${ID}/extrato`, 'cliente'],
  ['DELETE', `/apadrinhamentos/${ID}`, 'cliente'],
  ['GET', `/gatos/${ID}/prescricoes`, 'voluntario'],
  ['POST', `/gatos/${ID}/prescricoes`, 'voluntario'],
  ['POST', `/gatos/${ID}/prescricoes/${ID}/encerrar`, 'voluntario'],
  ['DELETE', `/gatos/${ID}/prescricoes/${ID}`, 'adm'],
  ['GET', '/medicacao/agenda', 'voluntario'],
  ['POST', '/medicacao/aplicacoes', 'voluntario'],
  ['DELETE', `/medicacao/aplicacoes/${ID}`, 'voluntario'],
  ['GET', `/gatos/${ID}/veterinario`, 'voluntario'],
  ['POST', `/gatos/${ID}/veterinario`, 'voluntario'],
  ['PATCH', `/gatos/${ID}/veterinario/${ID}`, 'voluntario'],
  ['DELETE', `/gatos/${ID}/veterinario/${ID}`, 'voluntario'],
  ['GET', '/veterinario/retornos', 'voluntario'],
  ['PATCH', '/auth/me', 'cliente'],
  ['POST', '/auth/trocar-senha', 'cliente'],
];

const NIVEL: Record<Cargo, number> = { cliente: 0, voluntario: 1, adm: 2 };

let ctx: Awaited<ReturnType<typeof createTestApp>>;
const sessoes = {} as Record<Cargo, { cookie: string }>;

// Uma sessão por cargo para a matriz toda (o banco é limpo antes de cada teste,
// por isso a matriz roda num único teste).
beforeAll(async () => {
  ctx = await createTestApp();
});
afterAll(() => ctx.app.close());

describe('matriz de permissões', () => {
  it('cada rota interna exige login e o cargo mínimo (cargos acima também passam)', async () => {
    for (const cargo of ['cliente', 'voluntario', 'adm'] as const) {
      sessoes[cargo] = (await logarComo(ctx.app, cargo)).headers;
    }

    const falhas: Array<string> = [];
    for (const [method, url, minimo] of ROTAS) {
      const anonimo = await ctx.app.inject({
        method: method as 'GET',
        url,
        payload: {},
      });
      if (anonimo.statusCode !== 401)
        falhas.push(`${method} ${url} anônimo → ${anonimo.statusCode}`);

      for (const cargo of ['cliente', 'voluntario', 'adm'] as const) {
        const res = await ctx.app.inject({
          method: method as 'GET',
          url,
          headers: sessoes[cargo],
          payload: {},
        });
        const permitido = NIVEL[cargo] >= NIVEL[minimo];
        const bloqueado = res.statusCode === 403 || res.statusCode === 401;
        if (permitido === bloqueado)
          falhas.push(`${method} ${url} ${cargo} → ${res.statusCode}`);
      }
    }
    expect(falhas).toEqual([]);
  });
});
