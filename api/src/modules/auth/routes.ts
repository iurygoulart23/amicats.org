import { z } from 'zod';
import { HttpError, conflito, naoAutenticado } from '../../lib/errors.js';
import { hashSenha, verificarSenha } from '../../lib/password.js';
import { hashToken } from '../../lib/tokens.js';
import { exigirCargo } from '../../plugins/auth.js';
import { enviarLinkDeSenha } from './link-senha.js';
import { Email, Senha, UsuarioPublico } from './schemas.js';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

export const authRoutes: FastifyPluginAsyncZod = async (app) => {
  const { prisma } = app.deps;

  app.post(
    '/cadastro',
    {
      schema: {
        tags: ['auth'],
        summary: 'Autocadastro do público (sempre cria cargo cliente)',
        body: z.object({
          nome: z.string().trim().min(2).max(120),
          email: Email,
          senha: Senha,
          telefone: z.string().trim().max(30).nullable().optional(),
        }),
        response: { 201: UsuarioPublico },
      },
    },
    async (request, reply) => {
      const { nome, email, senha, telefone } = request.body;
      const existente = await prisma.user.findUnique({ where: { email } });
      if (existente) throw conflito('Já existe uma conta com este e-mail.');

      const user = await prisma.user.create({
        data: {
          nome,
          email,
          telefone,
          cargo: 'cliente',
          senhaHash: await hashSenha(senha),
        },
      });
      await app.criarSessao(reply, user.id, request.headers['user-agent']);
      return reply.status(201).send(user as z.infer<typeof UsuarioPublico>);
    },
  );

  app.post(
    '/login',
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '1 minute',
          // preValidation: o body já foi lido, então a chave é IP + e-mail (e não só o IP,
          // o que bloquearia todo mundo atrás da mesma rede).
          hook: 'preValidation',
          keyGenerator: (request) =>
            `${request.ip}:${String(
              (request.body as { email?: unknown } | undefined)?.email ?? '',
            )
              .trim()
              .toLowerCase()}`,
        },
      },
      schema: {
        tags: ['auth'],
        summary: 'Login com e-mail e senha (grava o cookie de sessão)',
        body: z.object({ email: Email, senha: z.string().min(1).max(200) }),
        response: { 200: UsuarioPublico },
      },
    },
    async (request, reply) => {
      const { email, senha } = request.body;
      const user = await prisma.user.findUnique({ where: { email } });
      // Mesma resposta para e-mail inexistente e senha errada.
      const ok = await verificarSenha(user?.senhaHash ?? null, senha);
      if (!user || !ok || !user.ativo) {
        throw new HttpError(401, 'E-mail ou senha incorretos.');
      }
      await app.criarSessao(reply, user.id, request.headers['user-agent']);
      return user as z.infer<typeof UsuarioPublico>;
    },
  );

  app.post(
    '/logout',
    { schema: { tags: ['auth'], summary: 'Encerra a sessão atual' } },
    async (request, reply) => {
      await app.encerrarSessao(request, reply);
      return reply.status(204).send();
    },
  );

  app.post(
    '/esqueci-senha',
    {
      config: { rateLimit: { max: 5, timeWindow: '15 minutes' } },
      schema: {
        tags: ['auth'],
        summary: 'Envia por e-mail um link para redefinir a senha',
        body: z.object({ email: Email }),
      },
    },
    async (request, reply) => {
      const user = await prisma.user.findUnique({
        where: { email: request.body.email },
      });
      // Responde igual exista ou não a conta, para não revelar e-mails cadastrados.
      if (user?.ativo) await enviarLinkDeSenha(app.deps, user, 'reset');
      return reply.status(204).send();
    },
  );

  app.post(
    '/redefinir-senha',
    {
      config: { rateLimit: { max: 10, timeWindow: '15 minutes' } },
      schema: {
        tags: ['auth'],
        summary: 'Define a nova senha a partir do token recebido por e-mail',
        body: z.object({ token: z.string().min(1), senha: Senha }),
      },
    },
    async (request, reply) => {
      const { token, senha } = request.body;
      const registro = await prisma.passwordResetToken.findUnique({
        where: { tokenHash: hashToken(token) },
      });
      if (!registro || registro.usadoEm || registro.expiraEm <= new Date()) {
        throw new HttpError(400, 'Link inválido ou expirado. Peça um novo.');
      }

      await prisma.$transaction([
        prisma.user.update({
          where: { id: registro.userId },
          data: { senhaHash: await hashSenha(senha) },
        }),
        prisma.passwordResetToken.update({
          where: { tokenHash: registro.tokenHash },
          data: { usadoEm: new Date() },
        }),
        prisma.session.deleteMany({ where: { userId: registro.userId } }),
      ]);
      return reply.status(204).send();
    },
  );

  app.get(
    '/me',
    {
      schema: {
        tags: ['auth'],
        summary: 'Usuário da sessão atual',
        security: [{ sessao: [] }],
        response: { 200: UsuarioPublico },
      },
    },
    (request) => {
      if (!request.usuario) throw naoAutenticado();
      return Promise.resolve(request.usuario);
    },
  );

  app.patch(
    '/me',
    {
      onRequest: exigirCargo('cliente'),
      schema: {
        tags: ['auth'],
        summary: 'Edita o próprio perfil (cargo e e-mail não mudam por aqui)',
        security: [{ sessao: [] }],
        body: z.object({
          nome: z.string().trim().min(2).max(120).optional(),
          telefone: z.string().trim().max(30).nullable().optional(),
          notificarPorEmail: z.boolean().optional(),
        }),
        response: { 200: UsuarioPublico },
      },
    },
    async (request) => {
      const { nome, telefone, notificarPorEmail } = request.body;
      const user = await prisma.user.update({
        where: { id: request.usuario!.id },
        data: { nome, telefone, notificarPorEmail },
      });
      return user as z.infer<typeof UsuarioPublico>;
    },
  );

  app.post(
    '/trocar-senha',
    {
      onRequest: exigirCargo('cliente'),
      config: { rateLimit: { max: 5, timeWindow: '15 minutes' } },
      schema: {
        tags: ['auth'],
        summary: 'Troca a senha confirmando a atual; encerra as outras sessões',
        security: [{ sessao: [] }],
        body: z.object({
          senhaAtual: z.string().min(1).max(200),
          novaSenha: Senha,
        }),
      },
    },
    async (request, reply) => {
      const { id, sessaoId } = request.usuario!;
      const user = await prisma.user.findUniqueOrThrow({ where: { id } });
      if (!(await verificarSenha(user.senhaHash, request.body.senhaAtual))) {
        throw new HttpError(400, 'Senha atual incorreta.');
      }
      await prisma.$transaction([
        prisma.user.update({
          where: { id },
          data: { senhaHash: await hashSenha(request.body.novaSenha) },
        }),
        prisma.session.deleteMany({
          where: { userId: id, NOT: { id: sessaoId } },
        }),
      ]);
      return reply.status(204).send();
    },
  );
};
