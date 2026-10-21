import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from '../app.js';
import { loadEnv } from '../env.js';
import { createCaixaDev } from './caixa-dev.js';
import {
  createFakeGateway,
  createFakeStorage,
  env,
  prisma,
} from '../../test/helpers.js';

let app: Awaited<ReturnType<typeof buildApp>> | undefined;
afterEach(() => app?.close());

describe('caixa de e-mails de desenvolvimento', () => {
  it('guarda os e-mails enviados e mostra os de uma pessoa, mais recentes primeiro', async () => {
    const caixa = createCaixaDev();
    app = await buildApp({
      env,
      prisma,
      mailer: caixa.mailer,
      caixaDev: caixa,
      storage: createFakeStorage(),
      pagamentos: createFakeGateway(),
    });
    await caixa.mailer.enviar({
      para: 'Ana@Teste.org',
      assunto: 'Primeiro',
      texto: 'a',
    });
    await caixa.mailer.enviar({
      para: 'bia@teste.org',
      assunto: 'Outra pessoa',
      texto: 'b',
    });
    await caixa.mailer.enviar({
      para: 'ana@teste.org',
      assunto: 'Segundo',
      texto: 'c',
    });

    const res = await app.inject({
      method: 'GET',
      url: '/dev/emails?para=ana@teste.org',
    });
    expect(res.json().map((e: { assunto: string }) => e.assunto)).toEqual([
      'Segundo',
      'Primeiro',
    ]);
  });

  it('sem a caixa, a rota não existe', async () => {
    app = await buildApp({
      env,
      prisma,
      mailer: createCaixaDev().mailer,
      storage: createFakeStorage(),
      pagamentos: createFakeGateway(),
    });
    expect(
      (await app.inject({ method: 'GET', url: '/dev/emails' })).statusCode,
    ).toBe(404);
  });

  it('não é permitida em produção', () => {
    expect(() =>
      loadEnv({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://x',
        WEB_ORIGIN: 'https://amicats.org',
        CAIXA_DEV: 'true',
      }),
    ).toThrow(/CAIXA_DEV/);
  });
});
