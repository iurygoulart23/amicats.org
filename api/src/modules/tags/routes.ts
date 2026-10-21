import { z } from 'zod';
import { TIPOS_TAG } from '../../domain/gato.js';
import { conflito, naoEncontrado } from '../../lib/errors.js';
import { exigirCargo } from '../../plugins/auth.js';
import type { PrismaClient, Tag as TagRow } from '@prisma/client';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

const Tag = z.object({
  id: z.string(),
  nome: z.string(),
  tipo: z.enum(TIPOS_TAG),
  cor: z.string().nullable(),
});

const campos = {
  nome: z.string().trim().min(1).max(60),
  tipo: z.enum(TIPOS_TAG),
  cor: z
    .string()
    .regex(/^#[0-9a-fA-F]{3,8}$/, 'Use uma cor hexadecimal, ex.: #d33')
    .nullable(),
};

const Params = z.object({ id: z.uuid() });

const toTag = (t: TagRow) => ({
  ...t,
  tipo: t.tipo as z.infer<typeof Tag>['tipo'],
});

async function garantirNomeLivre(
  prisma: PrismaClient,
  nome: string,
  ignorarId?: string,
) {
  const outra = await prisma.tag.findFirst({
    where: {
      nome: { equals: nome, mode: 'insensitive' },
      NOT: { id: ignorarId },
    },
  });
  if (outra) throw conflito(`Já existe a tag "${outra.nome}".`);
}

export const tagsRoutes: FastifyPluginAsyncZod = async (app) => {
  const { prisma } = app.deps;

  app.get(
    '/',
    {
      onRequest: exigirCargo('voluntario'),
      schema: {
        tags: ['tags'],
        summary: 'Lista as tags (doenças, comportamento, cuidados)',
        security: [{ sessao: [] }],
        querystring: z.object({ tipo: z.enum(TIPOS_TAG).optional() }),
        response: { 200: z.array(Tag) },
      },
    },
    async (request) => {
      const tags = await prisma.tag.findMany({
        where: { tipo: request.query.tipo },
        orderBy: { nome: 'asc' },
      });
      return tags.map(toTag);
    },
  );

  app.post(
    '/',
    {
      onRequest: exigirCargo('adm'),
      schema: {
        tags: ['tags'],
        security: [{ sessao: [] }],
        body: z.object(campos).partial({ tipo: true, cor: true }),
        response: { 201: Tag },
      },
    },
    async (request, reply) => {
      await garantirNomeLivre(prisma, request.body.nome);
      const tag = await prisma.tag.create({ data: request.body });
      return reply.status(201).send(toTag(tag));
    },
  );

  app.patch(
    '/:id',
    {
      onRequest: exigirCargo('adm'),
      schema: {
        tags: ['tags'],
        security: [{ sessao: [] }],
        params: Params,
        body: z.object(campos).partial(),
        response: { 200: Tag },
      },
    },
    async (request) => {
      const { id } = request.params;
      if (!(await prisma.tag.findUnique({ where: { id } })))
        throw naoEncontrado('Tag');
      if (request.body.nome)
        await garantirNomeLivre(prisma, request.body.nome, id);
      return toTag(
        await prisma.tag.update({ where: { id }, data: request.body }),
      );
    },
  );

  app.delete(
    '/:id',
    {
      onRequest: exigirCargo('adm'),
      schema: { tags: ['tags'], security: [{ sessao: [] }], params: Params },
    },
    async (request, reply) => {
      const { count } = await prisma.tag.deleteMany({
        where: { id: request.params.id },
      });
      if (!count) throw naoEncontrado('Tag');
      return reply.status(204).send();
    },
  );
};
