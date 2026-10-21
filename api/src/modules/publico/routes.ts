import { z } from 'zod';
import { SEXOS, STATUS_GATO } from '../../domain/gato.js';
import { naoEncontrado } from '../../lib/errors.js';
import { Paginacao, paginado, skipTake } from '../../lib/paginacao.js';
import { includeGato, toGato } from '../gatos/mapper.js';
import { GatoPublico } from '../gatos/schemas.js';
import type { Prisma } from '@prisma/client';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

/** Status que nunca aparecem no site. */
const STATUS_OCULTOS = ['falecido'];
const STATUS_PUBLICOS = STATUS_GATO.filter(
  (s) => !STATUS_OCULTOS.includes(s),
) as [string, ...Array<string>];

const visivel: Prisma.GatoWhereInput = {
  publicado: true,
  status: { notIn: STATUS_OCULTOS },
};

// Monta o objeto público campo a campo: dado interno novo no Gato não vaza por acidente.
function toGatoPublico(
  g: Parameters<typeof toGato>[0],
): z.infer<typeof GatoPublico> {
  const gato = toGato(g);
  return {
    slug: gato.slug,
    nome: gato.nome,
    dataNascimentoAprox: gato.dataNascimentoAprox,
    precisaoNascimento: gato.precisaoNascimento,
    sexo: gato.sexo,
    status: gato.status,
    castrado: gato.castrado,
    descricaoPt: gato.descricaoPt,
    descricaoEn: gato.descricaoEn,
    fotos: gato.fotos,
    tags: gato.tags.filter((t) => t.ativa).map(({ ativa: _ativa, ...t }) => t),
  };
}

export const publicoRoutes: FastifyPluginAsyncZod = async (app) => {
  const { prisma } = app.deps;

  app.get(
    '/gatos',
    {
      schema: {
        tags: ['público'],
        summary: 'Catálogo de gatos do site',
        querystring: Paginacao.extend({
          porPagina: z.coerce.number().int().min(1).max(100).default(50),
          status: z.enum(STATUS_PUBLICOS).optional(),
          sexo: z.enum(SEXOS).optional(),
          tag: z.uuid().optional(),
        }),
        response: { 200: paginado(GatoPublico) },
      },
    },
    async (request) => {
      const { status, sexo, tag, ...pag } = request.query;
      const where: Prisma.GatoWhereInput = {
        AND: [
          visivel,
          { status, sexo },
          tag ? { tags: { some: { tagId: tag, ativa: true } } } : {},
        ],
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
      return { itens: itens.map(toGatoPublico), total, ...pag };
    },
  );

  app.get(
    '/gatos/:slug',
    {
      schema: {
        tags: ['público'],
        summary: 'Perfil público de um gato',
        params: z.object({ slug: z.string().min(1).max(120) }),
        response: { 200: GatoPublico },
      },
    },
    async (request) => {
      const gato = await prisma.gato.findFirst({
        where: { ...visivel, slug: request.params.slug },
        include: includeGato,
      });
      if (!gato) throw naoEncontrado('Gato');
      return toGatoPublico(gato);
    },
  );
};
