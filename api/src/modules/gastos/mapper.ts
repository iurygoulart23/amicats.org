import { z } from 'zod';
import { CATEGORIAS_GASTO } from '../../domain/gasto.js';
import { deData } from '../../lib/datas.js';
import type { Prisma } from '@prisma/client';
import type { CategoriaGasto } from '../../domain/gasto.js';

export const Gasto = z.object({
  id: z.string(),
  categoria: z.enum(CATEGORIAS_GASTO),
  descricao: z.string(),
  valorCentavos: z.number(),
  data: z.string(),
  registradoPor: z.object({ id: z.string(), nome: z.string() }).nullable(),
});

export const includeGasto = {
  registradoPor: { select: { id: true, nome: true } },
} satisfies Prisma.GastoInclude;

export function toGasto(
  g: Prisma.GastoGetPayload<{ include: typeof includeGasto }>,
) {
  return {
    id: g.id,
    categoria: g.categoria as CategoriaGasto,
    descricao: g.descricao,
    valorCentavos: g.valorCentavos,
    data: deData(g.data),
    registradoPor: g.registradoPor,
  };
}
