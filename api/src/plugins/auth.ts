import fp from 'fastify-plugin';
import { naoAutenticado, semPermissao } from '../lib/errors.js';
import { gerarToken, hashToken } from '../lib/tokens.js';
import { podeAcessar } from '../domain/cargos.js';
import type { Cargo } from '../domain/cargos.js';
import type { FastifyRequest } from 'fastify';

export const COOKIE_SESSAO = 'amicats_session';
const SESSAO_DIAS = 30;
const DIA_MS = 24 * 60 * 60 * 1000;

export type UsuarioLogado = {
  id: string;
  nome: string;
  email: string;
  cargo: Cargo;
  telefone: string | null;
  notificarPorEmail: boolean;
  sessaoId: string;
};

declare module 'fastify' {
  interface FastifyRequest {
    usuario: UsuarioLogado | null;
  }
  interface FastifyInstance {
    criarSessao: (
      reply: FastifyReply,
      userId: string,
      userAgent?: string,
    ) => Promise<void>;
    encerrarSessao: (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
  }
}

/** Hook onRequest (antes da validação do body): exige login e um cargo mínimo (cargos são hierárquicos). */
export function exigirCargo(exigido: Cargo) {
  return (request: FastifyRequest) => {
    if (!request.usuario) throw naoAutenticado();
    if (!podeAcessar(request.usuario.cargo, exigido)) throw semPermissao();
    return Promise.resolve();
  };
}

export const authPlugin = fp(async (app) => {
  const { prisma, env } = app.deps;

  const cookieOptions = {
    path: '/',
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: env.COOKIE_SECURE,
    domain: env.COOKIE_DOMAIN,
  };

  app.decorateRequest('usuario', null);

  app.decorate('criarSessao', async (reply, userId, userAgent) => {
    const token = gerarToken();
    const expiraEm = new Date(Date.now() + SESSAO_DIAS * DIA_MS);
    await prisma.session.create({
      data: { id: hashToken(token), userId, expiraEm, userAgent },
    });
    reply.setCookie(COOKIE_SESSAO, token, {
      ...cookieOptions,
      expires: expiraEm,
    });
  });

  app.decorate('encerrarSessao', async (request, reply) => {
    if (request.usuario) {
      await prisma.session.deleteMany({
        where: { id: request.usuario.sessaoId },
      });
    }
    reply.clearCookie(COOKIE_SESSAO, cookieOptions);
  });

  app.addHook('onRequest', async (request, reply) => {
    const token = request.cookies[COOKIE_SESSAO];
    if (!token) return;

    const sessao = await prisma.session.findUnique({
      where: { id: hashToken(token) },
      include: { user: true },
    });
    if (!sessao || sessao.expiraEm <= new Date() || !sessao.user.ativo) {
      reply.clearCookie(COOKIE_SESSAO, cookieOptions);
      return;
    }

    // Sessão deslizante: renova no máximo uma vez por dia para não escrever a cada request.
    const restante = sessao.expiraEm.getTime() - Date.now();
    if (restante < (SESSAO_DIAS - 1) * DIA_MS) {
      const expiraEm = new Date(Date.now() + SESSAO_DIAS * DIA_MS);
      await prisma.session.update({
        where: { id: sessao.id },
        data: { expiraEm },
      });
      reply.setCookie(COOKIE_SESSAO, token, {
        ...cookieOptions,
        expires: expiraEm,
      });
    }

    request.usuario = {
      id: sessao.user.id,
      nome: sessao.user.nome,
      email: sessao.user.email,
      cargo: sessao.user.cargo as Cargo,
      telefone: sessao.user.telefone,
      notificarPorEmail: sessao.user.notificarPorEmail,
      sessaoId: sessao.id,
    };
  });
});
