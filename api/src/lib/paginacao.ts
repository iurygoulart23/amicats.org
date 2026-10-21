import { z } from 'zod';

export const Paginacao = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  porPagina: z.coerce.number().int().min(1).max(100).default(20),
});

export function paginado<T extends z.ZodType>(item: T) {
  return z.object({
    itens: z.array(item),
    total: z.number(),
    pagina: z.number(),
    porPagina: z.number(),
  });
}

export function skipTake({ pagina, porPagina }: z.infer<typeof Paginacao>) {
  return { skip: (pagina - 1) * porPagina, take: porPagina };
}
