import {
  entraNoHistorico,
  statusDaCobrancaNoHistorico,
} from '../../domain/pagamento.js';
import { intervaloDoMes } from '../../lib/datas.js';
import type { PrismaClient } from '@prisma/client';
import type { StatusPagamento, TipoPagamento } from '../../domain/pagamento.js';

export type PagamentoNoHistorico = {
  id: string;
  tipo: TipoPagamento;
  status: StatusPagamento;
  valorCentavos: number;
  /** Quando foi pago ou, se ainda não foi, quando foi iniciado */
  data: Date;
  /** Clube: nome da faixa */
  plano: string | null;
  /** Apadrinhamento: gato e mês pago (AAAA-MM) */
  gato: { id: string; nome: string } | null;
  mes: string | null;
  /** Quem pagou (doação sem conta usa o nome e e-mail informados) */
  pessoa: { id: string | null; nome: string; email: string };
  mpPagamentoId: string | null;
};

export type FiltroHistorico = {
  userId?: string;
  tipo?: TipoPagamento;
  status?: StatusPagamento;
  /** Mês (AAAA-MM) em que o pagamento aconteceu */
  mes?: string;
};

const pessoa = { select: { id: true, nome: true, email: true } } as const;

/** Data pago (ou iniciado, se não foi pago) dentro do mês. */
function noMes(mes: string | undefined) {
  if (!mes) return {};
  const { inicio, fimExclusivo } = intervaloDoMes(mes);
  const intervalo = { gte: inicio, lt: fimExclusivo };
  return {
    OR: [{ pagoEm: intervalo }, { pagoEm: null, criadoEm: intervalo }],
  };
}

/**
 * Pagamentos das três origens (Clube, parte do padrinho e doação) numa lista só,
 * do mais recente para o mais antigo.
 */
export async function listarPagamentos(
  prisma: PrismaClient,
  filtro: FiltroHistorico,
): Promise<Array<PagamentoNoHistorico>> {
  const quer = (tipo: TipoPagamento) => !filtro.tipo || filtro.tipo === tipo;
  const { inicio, fimExclusivo } = filtro.mes
    ? intervaloDoMes(filtro.mes)
    : { inicio: undefined, fimExclusivo: undefined };

  const [cobrancas, partes, doacoes] = await Promise.all([
    quer('clube')
      ? prisma.cobrancaAssinatura.findMany({
          where: {
            assinatura: { userId: filtro.userId },
            data: { gte: inicio, lt: fimExclusivo },
          },
          include: {
            assinatura: {
              include: { plano: { select: { nome: true } }, user: pessoa },
            },
          },
        })
      : [],
    quer('apadrinhamento')
      ? prisma.pagamentoApadrinhamento.findMany({
          where: {
            apadrinhamento: { userId: filtro.userId },
            ...noMes(filtro.mes),
          },
          include: {
            apadrinhamento: {
              include: {
                gato: { select: { id: true, nome: true } },
                user: pessoa,
              },
            },
          },
        })
      : [],
    quer('doacao')
      ? prisma.doacao.findMany({
          where: { userId: filtro.userId, ...noMes(filtro.mes) },
        })
      : [],
  ]);

  const itens: Array<PagamentoNoHistorico> = [
    ...cobrancas.map((c) => ({
      id: c.id,
      tipo: 'clube' as const,
      status: statusDaCobrancaNoHistorico(c.status),
      valorCentavos: c.valorCentavos,
      data: c.data,
      plano: c.assinatura.plano.nome,
      gato: null,
      mes: null,
      pessoa: c.assinatura.user,
      mpPagamentoId: c.mpId,
    })),
    ...partes.filter(entraNoHistorico).map((p) => ({
      id: p.id,
      tipo: 'apadrinhamento' as const,
      status: p.status as StatusPagamento,
      valorCentavos: p.valorCentavos,
      data: p.pagoEm ?? p.criadoEm,
      plano: null,
      gato: p.apadrinhamento.gato,
      mes: p.mes,
      pessoa: p.apadrinhamento.user,
      mpPagamentoId: p.mpPagamentoId,
    })),
    ...doacoes.filter(entraNoHistorico).map((d) => ({
      id: d.id,
      tipo: 'doacao' as const,
      status: d.status as StatusPagamento,
      valorCentavos: d.valorCentavos,
      data: d.pagoEm ?? d.criadoEm,
      plano: null,
      gato: null,
      mes: null,
      pessoa: { id: d.userId, nome: d.nome, email: d.email },
      mpPagamentoId: d.mpPagamentoId,
    })),
  ];

  return itens
    .filter((p) => !filtro.status || p.status === filtro.status)
    .sort((a, b) => b.data.getTime() - a.data.getTime());
}
