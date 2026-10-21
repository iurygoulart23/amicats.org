import { deData } from '../../lib/datas.js';
import type { Prisma } from '@prisma/client';
import type { z } from 'zod';
import type { Gato } from './schemas.js';

export const includeGato = {
  fotos: { orderBy: [{ capa: 'desc' }, { ordem: 'asc' }] },
  tags: { include: { tag: true }, orderBy: { tag: { nome: 'asc' } } },
} satisfies Prisma.GatoInclude;

type GatoComRelacoes = Prisma.GatoGetPayload<{ include: typeof includeGato }>;
type GatoDto = z.infer<typeof Gato>;

export function toGato(g: GatoComRelacoes): GatoDto {
  return {
    id: g.id,
    slug: g.slug,
    nome: g.nome,
    dataNascimentoAprox: g.dataNascimentoAprox
      ? deData(g.dataNascimentoAprox)
      : null,
    precisaoNascimento: g.precisaoNascimento as GatoDto['precisaoNascimento'],
    sexo: g.sexo as GatoDto['sexo'],
    status: g.status as GatoDto['status'],
    castrado: g.castrado,
    descricaoPt: g.descricaoPt,
    descricaoEn: g.descricaoEn,
    observacoes: g.observacoes,
    publicado: g.publicado,
    fotos: g.fotos.map(({ id, url, ordem, capa }) => ({
      id,
      url,
      ordem,
      capa,
    })),
    tags: g.tags.map(({ tag, ativa }) => ({
      id: tag.id,
      nome: tag.nome,
      tipo: tag.tipo as GatoDto['tags'][number]['tipo'],
      cor: tag.cor,
      ativa,
    })),
    criadoEm: g.criadoEm,
    atualizadoEm: g.atualizadoEm,
  };
}
