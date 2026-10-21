import {
  ativoNoPeriodo,
  faltaPagar,
  parteDoPadrinho,
} from '../../domain/apadrinhamento.js';
import { intervaloDoMes, mesDe, somarMeses } from '../../lib/datas.js';
import type { PrismaClient } from '@prisma/client';

export type SituacaoDoMes = {
  mes: string;
  totalCentavos: number;
  padrinhosNoMes: number;
  parteCentavos: number;
  pagoCentavos: number;
  faltaCentavos: number;
};

type Periodo = { id: string; gatoId: string; inicio: Date; fim: Date | null };

/** O mês corrente ainda pode receber gastos; só os anteriores estão fechados. */
export const mesFechado = (mes: string, hoje: Date) => mes < mesDe(hoje);

/** Meses fechados em que o apadrinhamento esteve ativo, do mais antigo ao mais recente. */
export function mesesFechados(ap: Periodo, hoje: Date): Array<string> {
  const ultimoFechado = somarMeses(mesDe(hoje), -1);
  const ultimo =
    ap.fim && mesDe(ap.fim) < ultimoFechado ? mesDe(ap.fim) : ultimoFechado;
  const meses: Array<string> = [];
  for (let m = mesDe(ap.inicio); m <= ultimo; m = somarMeses(m, 1)) {
    meses.push(m);
  }
  return meses;
}

/** Gastos, parte do padrinho e quanto já pagou em cada mês (meses em ordem crescente). */
export async function situacaoDosMeses(
  prisma: PrismaClient,
  ap: Periodo,
  meses: Array<string>,
): Promise<Array<SituacaoDoMes>> {
  if (!meses.length) return [];
  const inicio = intervaloDoMes(meses[0]!).inicio;
  const { fimExclusivo } = intervaloDoMes(meses[meses.length - 1]!);

  const [gastos, padrinhos, pagos] = await Promise.all([
    prisma.gasto.findMany({
      where: { gatoId: ap.gatoId, data: { gte: inicio, lt: fimExclusivo } },
      select: { valorCentavos: true, data: true },
    }),
    prisma.apadrinhamento.findMany({
      where: {
        gatoId: ap.gatoId,
        inicio: { lt: fimExclusivo },
        OR: [{ fim: null }, { fim: { gte: inicio } }],
      },
      select: { inicio: true, fim: true },
    }),
    prisma.pagamentoApadrinhamento.groupBy({
      by: ['mes'],
      where: {
        apadrinhamentoId: ap.id,
        status: 'aprovado',
        mes: { in: meses },
      },
      _sum: { valorCentavos: true },
    }),
  ]);

  const totalPorMes = new Map<string, number>();
  for (const g of gastos) {
    const mes = mesDe(g.data);
    totalPorMes.set(mes, (totalPorMes.get(mes) ?? 0) + g.valorCentavos);
  }
  const pagoPorMes = new Map(
    pagos.map((p) => [p.mes, p._sum.valorCentavos ?? 0]),
  );

  return meses.map((mes) => {
    const intervalo = intervaloDoMes(mes);
    const totalCentavos = totalPorMes.get(mes) ?? 0;
    const padrinhosNoMes = padrinhos.filter((p) =>
      ativoNoPeriodo(p, intervalo.inicio, intervalo.fimExclusivo),
    ).length;
    const parteCentavos = parteDoPadrinho(totalCentavos, padrinhosNoMes);
    const pagoCentavos = pagoPorMes.get(mes) ?? 0;
    return {
      mes,
      totalCentavos,
      padrinhosNoMes,
      parteCentavos,
      pagoCentavos,
      faltaCentavos: faltaPagar(parteCentavos, pagoCentavos),
    };
  });
}
