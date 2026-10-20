import { PrismaClient } from '@prisma/client';
import { buildApp } from '../src/app.js';
import { loadEnv } from '../src/env.js';
import { hashSenha } from '../src/lib/password.js';
import type { Cargo } from '../src/domain/cargos.js';
import type { Email, Mailer } from '../src/lib/mailer.js';
import type { Storage } from '../src/lib/storage.js';

process.loadEnvFile('.env.test');

export const prisma = new PrismaClient();
export const env = loadEnv();

export type FakeMailer = Mailer & { enviados: Array<Email> };

export function createFakeMailer(): FakeMailer {
  const enviados: Array<Email> = [];
  return {
    enviados,
    enviar(email) {
      enviados.push(email);
      return Promise.resolve();
    },
  };
}

export type FakeStorage = Storage & { removidos: Array<string> };

export function createFakeStorage(): FakeStorage {
  const removidos: Array<string> = [];
  return {
    removidos,
    criarUrlUpload(key) {
      return Promise.resolve({
        key,
        uploadUrl: `https://upload.test/${key}?assinatura=x`,
        publicUrl: `https://cdn.test/${key}`,
      });
    },
    urlPublica: (key) => `https://cdn.test/${key}`,
    remover(key) {
      removidos.push(key);
      return Promise.resolve();
    },
  };
}

export async function createTestApp() {
  const mailer = createFakeMailer();
  const storage = createFakeStorage();
  const app = await buildApp({ env, prisma, mailer, storage });
  return { app, mailer, storage };
}

type TestApp = Awaited<ReturnType<typeof createTestApp>>['app'];

const SENHA_PADRAO = 'senha-segura-123';

/** Arrange: cria um usuário direto no banco (como faria o seed). */
export async function criarUsuario(
  cargo: Cargo,
  dados: { email?: string; senha?: string; ativo?: boolean } = {},
) {
  const email = dados.email ?? `${cargo}-${crypto.randomUUID()}@teste.org`;
  return prisma.user.create({
    data: {
      nome: `Pessoa ${cargo}`,
      email,
      cargo,
      ativo: dados.ativo ?? true,
      senhaHash: await hashSenha(dados.senha ?? SENHA_PADRAO),
    },
  });
}

/** Faz login pela API e devolve o header de cookie pronto para as próximas requisições. */
export async function login(app: TestApp, email: string, senha = SENHA_PADRAO) {
  const res = await app.inject({
    method: 'POST',
    url: '/auth/login',
    payload: { email, senha },
  });
  if (res.statusCode !== 200) {
    throw new Error(`login falhou (${res.statusCode}): ${res.body}`);
  }
  const cookie = res.cookies.find((c) => c.name === 'amicats_session');
  return { cookie: `amicats_session=${cookie?.value}` };
}

/** Cria um usuário do cargo e já devolve os headers da sessão dele. */
export async function logarComo(app: TestApp, cargo: Cargo) {
  const user = await criarUsuario(cargo);
  const headers = await login(app, user.email);
  return { user, headers };
}
