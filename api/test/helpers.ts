import { PrismaClient } from '@prisma/client';
import { buildApp } from '../src/app.js';
import { loadEnv } from '../src/env.js';
import { hashSenha } from '../src/lib/password.js';
import type { Cargo } from '../src/domain/cargos.js';
import type { Email, Mailer } from '../src/lib/mailer.js';
import type { Storage } from '../src/lib/storage.js';
import type {
  AssinaturaMp,
  CobrancaMp,
  GatewayPagamentos,
  NovaAssinaturaMp,
} from '../src/lib/mercadopago.js';

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

export type FakeGateway = GatewayPagamentos & {
  criadas: Array<NovaAssinaturaMp & { id: string }>;
  canceladas: Array<string>;
  /** Simula o que o Mercado Pago responderia sobre uma assinatura */
  definirStatus: (id: string, status: string, proximaCobranca?: Date) => void;
  /** Simula uma cobrança mensal registrada no Mercado Pago */
  registrarCobranca: (cobranca: CobrancaMp) => void;
};

export function createFakeGateway(): FakeGateway {
  const assinaturas = new Map<string, AssinaturaMp>();
  const cobrancas = new Map<string, CobrancaMp>();
  const criadas: FakeGateway['criadas'] = [];
  const canceladas: Array<string> = [];
  const buscar = (id: string) => {
    const a = assinaturas.get(id);
    if (!a)
      return Promise.reject(
        new Error(`assinatura ${id} não existe no gateway falso`),
      );
    return Promise.resolve({ ...a });
  };
  return {
    criadas,
    canceladas,
    criarAssinatura(dados) {
      const id = `mp-${crypto.randomUUID()}`;
      criadas.push({ ...dados, id });
      const a: AssinaturaMp = {
        id,
        status: 'pending',
        externalReference: dados.referencia,
        checkoutUrl: `https://mp.test/checkout?preapproval_id=${id}`,
        proximaCobranca: null,
      };
      assinaturas.set(id, a);
      return Promise.resolve({ ...a });
    },
    obterAssinatura: buscar,
    cancelarAssinatura(id) {
      canceladas.push(id);
      const a = assinaturas.get(id);
      if (a) a.status = 'cancelled';
      return Promise.resolve();
    },
    obterCobranca(id) {
      const c = cobrancas.get(id);
      return c
        ? Promise.resolve(c)
        : Promise.reject(new Error(`cobrança ${id} não existe`));
    },
    definirStatus(id, status, proximaCobranca) {
      const a = assinaturas.get(id)!;
      a.status = status;
      a.proximaCobranca = proximaCobranca ?? a.proximaCobranca;
    },
    registrarCobranca(c) {
      cobrancas.set(c.id, c);
    },
  };
}

export async function createTestApp(opcoes: { agora?: () => Date } = {}) {
  const mailer = createFakeMailer();
  const storage = createFakeStorage();
  const pagamentos = createFakeGateway();
  const app = await buildApp({
    env,
    prisma,
    mailer,
    storage,
    pagamentos,
    agora: opcoes.agora,
  });
  return { app, mailer, storage, pagamentos };
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
