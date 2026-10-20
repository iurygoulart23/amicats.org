import { MESES_ESTIMATIVA } from '../../domain/apadrinhamento.js';
import { intervaloDoMes, mesDe, somarMeses } from '../../lib/datas.js';
import type { PrismaClient } from '@prisma/client';

export type ResumoApoio = {
  padrinhos: number;
  custoMensalEstimadoCentavos: number | null;
};

/** Padrinhos ativos e estimativa de custo (média dos últimos meses completos) por gato. */
export async function resumoApoio(
  prisma: PrismaClient,
  gatoIds: Array<string>,
  hoje = new Date(),
): Promise<Map<string, ResumoApoio>> {
  const mesAtual = mesDe(hoje);
  const inicio = intervaloDoMes(somarMeses(mesAtual, -MESES_ESTIMATIVA)).inicio;
  const fimExclusivo = intervaloDoMes(mesAtual).inicio;

  const [padrinhos, gastos] = await Promise.all([
    prisma.apadrinhamento.groupBy({
      by: ['gatoId'],
      where: { gatoId: { in: gatoIds }, fim: null },
      _count: { _all: true },
    }),
    prisma.gasto.groupBy({
      by: ['gatoId'],
      where: {
        gatoId: { in: gatoIds },
        data: { gte: inicio, lt: fimExclusivo },
      },
      _sum: { valorCentavos: true },
    }),
  ]);

  const resumo = new Map<string, ResumoApoio>(
    gatoIds.map((id) => [
      id,
      { padrinhos: 0, custoMensalEstimadoCentavos: null },
    ]),
  );
  padrinhos.forEach((p) => {
    resumo.get(p.gatoId)!.padrinhos = p._count._all;
  });
  gastos.forEach((g) => {
    const total = g._sum.valorCentavos ?? 0;
    if (total > 0) {
      resumo.get(g.gatoId)!.custoMensalEstimadoCentavos = Math.round(
        total / MESES_ESTIMATIVA,
      );
    }
  });
  return resumo;
}
