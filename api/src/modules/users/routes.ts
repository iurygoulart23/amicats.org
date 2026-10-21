import { z } from 'zod';
import { CARGOS } from '../../domain/cargos.js';
import { HttpError, conflito, naoEncontrado } from '../../lib/errors.js';
import { Paginacao, paginado, skipTake } from '../../lib/paginacao.js';
import { exigirCargo } from '../../plugins/auth.js';
import { enviarLinkDeSenha } from '../auth/link-senha.js';
import { Email } from '../auth/schemas.js';
import type { Prisma } from '@prisma/client';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

const Usuario = z.object({
  id: z.string(),
  nome: z.string(),
  email: z.string(),
  cargo: z.enum(CARGOS),
  telefone: z.string().nullable(),
  ativo: z.boolean(),
  /** false enquanto a pessoa não definiu a senha do convite */
  senhaDefinida: z.boolean(),
  criadoEm: z.date(),
});

const select = {
  id: true,
  nome: true,
  email: true,
  cargo: true,
  telefone: true,
  ativo: true,
  senhaHash: true,
  criadoEm: true,
} satisfies Prisma.UserSelect;

function toUsuario({
  senhaHash,
  ...user
}: Prisma.UserGetPayload<{ select: typeof select }>) {
  return {
    ...user,
    cargo: user.cargo as z.infer<typeof Usuario>['cargo'],
    senhaDefinida: !!senhaHash,
  };
}

const Params = z.object({ id: z.uuid() });

export const usersRoutes: FastifyPluginAsyncZod = async (app) => {
  const { prisma } = app.deps;
  app.addHook('onRequest', exigirCargo('adm'));

  app.get(
    '/',
    {
      schema: {
        tags: ['users'],
        summary: 'Lista usuários, voluntários e clientes',
        security: [{ sessao: [] }],
        querystring: Paginacao.extend({
          cargo: z.enum(CARGOS).optional(),
          ativo: z.stringbool().optional(),
          busca: z.string().trim().optional(),
        }),
        response: { 200: paginado(Usuario) },
      },
    },
    async (request) => {
      const { cargo, ativo, busca, ...pag } = request.query;
      const where: Prisma.UserWhereInput = {
        cargo,
        ativo,
        ...(busca && {
          OR: [
            { nome: { contains: busca, mode: 'insensitive' } },
            { email: { contains: busca, mode: 'insensitive' } },
          ],
        }),
      };
      const [itens, total] = await prisma.$transaction([
        prisma.user.findMany({
          where,
          select,
          orderBy: { nome: 'asc' },
          ...skipTake(pag),
        }),
        prisma.user.count({ where }),
      ]);
      return { itens: itens.map(toUsuario), total, ...pag };
    },
  );

  app.get(
    '/:id',
    {
      schema: {
        tags: ['users'],
        security: [{ sessao: [] }],
        params: Params,
        response: { 200: Usuario },
      },
    },
    async (request) => {
      const user = await prisma.user.findUnique({
        where: { id: request.params.id },
        select,
      });
      if (!user) throw naoEncontrado('Usuário');
      return toUsuario(user);
    },
  );

  app.post(
    '/',
    {
      schema: {
        tags: ['users'],
        summary:
          'Cria uma conta e envia convite por e-mail para definir a senha',
        security: [{ sessao: [] }],
        body: z.object({
          nome: z.string().trim().min(2).max(120),
          email: Email,
          cargo: z.enum(CARGOS),
          telefone: z.string().trim().max(30).nullable().optional(),
        }),
        response: { 201: Usuario },
      },
    },
    async (request, reply) => {
      const existente = await prisma.user.findUnique({
        where: { email: request.body.email },
      });
      if (existente) throw conflito('Já existe uma conta com este e-mail.');

      const user = await prisma.user.create({ data: request.body, select });
      await enviarLinkDeSenha(app.deps, user, 'convite');
      return reply.status(201).send(toUsuario(user));
    },
  );

  app.patch(
    '/:id',
    {
      schema: {
        tags: ['users'],
        summary: 'Altera dados, cargo ou ativa/desativa uma conta',
        security: [{ sessao: [] }],
        params: Params,
        body: z.object({
          nome: z.string().trim().min(2).max(120).optional(),
          cargo: z.enum(CARGOS).optional(),
          telefone: z.string().trim().max(30).nullable().optional(),
          ativo: z.boolean().optional(),
        }),
        response: { 200: Usuario },
      },
    },
    async (request) => {
      const { id } = request.params;
      const { cargo, ativo } = request.body;
      // Evita que a ONG fique sem adm por engano.
      if (
        id === request.usuario?.id &&
        ((cargo && cargo !== 'adm') || ativo === false)
      ) {
        throw new HttpError(
          400,
          'Você não pode remover o seu próprio acesso de adm.',
        );
      }

      const existe = await prisma.user.findUnique({
        where: { id },
        select: { id: true },
      });
      if (!existe) throw naoEncontrado('Usuário');

      const [user] = await prisma.$transaction([
        prisma.user.update({ where: { id }, data: request.body, select }),
        ...(ativo === false
          ? [prisma.session.deleteMany({ where: { userId: id } })]
          : []),
      ]);
      return toUsuario(user);
    },
  );

  app.post(
    '/:id/enviar-convite',
    {
      schema: {
        tags: ['users'],
        summary: 'Reenvia o e-mail para a pessoa definir a senha',
        security: [{ sessao: [] }],
        params: Params,
      },
    },
    async (request, reply) => {
      const user = await prisma.user.findUnique({
        where: { id: request.params.id },
      });
      if (!user) throw naoEncontrado('Usuário');
      await enviarLinkDeSenha(app.deps, user, 'convite');
      return reply.status(204).send();
    },
  );
};
