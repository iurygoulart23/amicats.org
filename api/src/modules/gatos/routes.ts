import { z } from 'zod';
import { STATUS_GATO, SEXOS, slugify } from '../../domain/gato.js';
import { paraData } from '../../lib/datas.js';
import { naoEncontrado } from '../../lib/errors.js';
import { Paginacao, paginado, skipTake } from '../../lib/paginacao.js';
import { exigirCargo } from '../../plugins/auth.js';
import { includeGato, toGato } from './mapper.js';
import { CriarGato, EditarGato, Gato } from './schemas.js';
import type { Prisma, PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

export const ParamsGato = z.object({ id: z.uuid() });

async function slugDisponivel(prisma: PrismaClient, nome: string) {
  const base = slugify(nome) || 'gato';
  const existentes = await prisma.gato.findMany({
    where: { slug: { startsWith: base } },
    select: { slug: true },
  });
  const usados = new Set(existentes.map((g) => g.slug));
  if (!usados.has(base)) return base;
  let n = 2;
  while (usados.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

/** O registro no banco já foi apagado: falha no bucket só gera log (arquivo órfão). */
export async function removerDoStorage(
  app: FastifyInstance,
  keys: Array<string>,
) {
  const resultados = await Promise.allSettled(
    keys.map((k) => app.deps.storage.remover(k)),
  );
  resultados.forEach((r, i) => {
    if (r.status === 'rejected') {
      app.log.warn(
        { key: keys[i], err: r.reason },
        'falha ao remover foto do storage',
      );
    }
  });
}

function comDatas<T extends { dataNascimentoAprox?: string | null }>(dados: T) {
  const { dataNascimentoAprox, ...resto } = dados;
  return {
    ...resto,
    ...(dataNascimentoAprox !== undefined && {
      dataNascimentoAprox: dataNascimentoAprox
        ? paraData(dataNascimentoAprox)
        : null,
    }),
  };
}

export const gatosRoutes: FastifyPluginAsyncZod = async (app) => {
  const { prisma } = app.deps;
  app.addHook('onRequest', exigirCargo('voluntario'));

  app.get(
    '/',
    {
      schema: {
        tags: ['gatos'],
        summary: 'Lista os gatos do abrigo (gestão interna)',
        security: [{ sessao: [] }],
        querystring: Paginacao.extend({
          status: z.enum(STATUS_GATO).optional(),
          sexo: z.enum(SEXOS).optional(),
          tag: z.uuid().optional(),
          publicado: z.stringbool().optional(),
          busca: z.string().trim().optional(),
        }),
        response: { 200: paginado(Gato) },
      },
    },
    async (request) => {
      const { status, sexo, tag, publicado, busca, ...pag } = request.query;
      const where: Prisma.GatoWhereInput = {
        status,
        sexo,
        publicado,
        ...(tag && { tags: { some: { tagId: tag } } }),
        ...(busca && { nome: { contains: busca, mode: 'insensitive' } }),
      };
      const [itens, total] = await prisma.$transaction([
        prisma.gato.findMany({
          where,
          include: includeGato,
          orderBy: { nome: 'asc' },
          ...skipTake(pag),
        }),
        prisma.gato.count({ where }),
      ]);
      return { itens: itens.map(toGato), total, ...pag };
    },
  );

  app.get(
    '/:id',
    {
      schema: {
        tags: ['gatos'],
        security: [{ sessao: [] }],
        params: ParamsGato,
        response: { 200: Gato },
      },
    },
    async (request) => {
      const gato = await prisma.gato.findUnique({
        where: { id: request.params.id },
        include: includeGato,
      });
      if (!gato) throw naoEncontrado('Gato');
      return toGato(gato);
    },
  );

  app.post(
    '/',
    {
      schema: {
        tags: ['gatos'],
        summary: 'Cadastra um gato',
        security: [{ sessao: [] }],
        body: CriarGato,
        response: { 201: Gato },
      },
    },
    async (request, reply) => {
      const gato = await prisma.gato.create({
        data: {
          ...comDatas(request.body),
          slug: await slugDisponivel(prisma, request.body.nome),
          criadoPorId: request.usuario?.id,
        },
        include: includeGato,
      });
      return reply.status(201).send(toGato(gato));
    },
  );

  app.patch(
    '/:id',
    {
      schema: {
        tags: ['gatos'],
        summary: 'Edita os dados de um gato',
        security: [{ sessao: [] }],
        params: ParamsGato,
        body: EditarGato,
        response: { 200: Gato },
      },
    },
    async (request) => {
      const existe = await prisma.gato.findUnique({
        where: { id: request.params.id },
        select: { id: true },
      });
      if (!existe) throw naoEncontrado('Gato');
      const gato = await prisma.gato.update({
        where: { id: request.params.id },
        data: comDatas(request.body),
        include: includeGato,
      });
      return toGato(gato);
    },
  );

  app.put(
    '/:id/tags',
    {
      schema: {
        tags: ['gatos'],
        summary: 'Define as tags do gato (substitui o conjunto atual)',
        security: [{ sessao: [] }],
        params: ParamsGato,
        body: z
          .array(
            z.object({ tagId: z.uuid(), ativa: z.boolean().default(true) }),
          )
          .refine(
            (l) => new Set(l.map((t) => t.tagId)).size === l.length,
            'Tag repetida.',
          ),
        response: { 200: Gato },
      },
    },
    async (request) => {
      const { id } = request.params;
      const existe = await prisma.gato.findUnique({
        where: { id },
        select: { id: true },
      });
      if (!existe) throw naoEncontrado('Gato');
      const tagIds = request.body.map((t) => t.tagId);
      const encontradas = await prisma.tag.count({
        where: { id: { in: tagIds } },
      });
      if (encontradas !== tagIds.length) throw naoEncontrado('Tag');

      await prisma.$transaction([
        prisma.gatoTag.deleteMany({ where: { gatoId: id } }),
        prisma.gatoTag.createMany({
          data: request.body.map((t) => ({ gatoId: id, ...t })),
        }),
      ]);
      const gato = await prisma.gato.findUniqueOrThrow({
        where: { id },
        include: includeGato,
      });
      return toGato(gato);
    },
  );

  app.delete(
    '/:id',
    {
      onRequest: exigirCargo('adm'),
      schema: {
        tags: ['gatos'],
        summary: 'Exclui um gato (só adm)',
        security: [{ sessao: [] }],
        params: ParamsGato,
      },
    },
    async (request, reply) => {
      const gato = await prisma.gato.findUnique({
        where: { id: request.params.id },
        include: { fotos: true },
      });
      if (!gato) throw naoEncontrado('Gato');
      await prisma.gato.delete({ where: { id: gato.id } });
      await removerDoStorage(
        app,
        gato.fotos.flatMap((f) => (f.storageKey ? [f.storageKey] : [])),
      );
      return reply.status(204).send();
    },
  );
};
