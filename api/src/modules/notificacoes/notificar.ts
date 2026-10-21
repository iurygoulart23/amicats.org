import type { FastifyBaseLogger } from 'fastify';
import type { PrismaClient } from '@prisma/client';

export type TipoNotificacao =
  | 'gasto_novo'
  | 'apadrinhamento_novo'
  | 'dose_atrasada'
  | 'retorno_proximo'
  | 'assinatura_nova'
  | 'parte_do_mes'
  | 'pagamento_aprovado'
  | 'doacao_recebida';

export type NovaNotificacao = {
  userId: string;
  tipo: TipoNotificacao;
  titulo: string;
  mensagem?: string;
  link?: string;
  /** Mesmo userId + chave não gera notificação repetida */
  chave: string;
};

export async function notificar(
  prisma: PrismaClient,
  notificacoes: Array<NovaNotificacao>,
) {
  if (!notificacoes.length) return 0;
  const { count } = await prisma.notificacao.createMany({
    data: notificacoes,
    skipDuplicates: true,
  });
  return count;
}

/** Notificar é efeito colateral: uma falha aqui não pode desfazer a ação principal. */
export async function notificarSemFalhar(
  log: FastifyBaseLogger,
  acao: () => Promise<unknown>,
) {
  try {
    await acao();
  } catch (err) {
    log.error({ err }, 'falha ao gerar notificações');
  }
}

export const reais = (centavos: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    centavos / 100,
  );

/** AAAA-MM → "setembro de 2026" */
export const mesPorExtenso = (mes: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${mes}-01T00:00:00Z`));

export async function notificarGastoNovo(
  prisma: PrismaClient,
  gasto: {
    id: string;
    gatoId: string;
    descricao: string;
    valorCentavos: number;
  },
) {
  const padrinhos = await prisma.apadrinhamento.findMany({
    where: { gatoId: gasto.gatoId, fim: null },
    include: { gato: { select: { nome: true } } },
  });
  return notificar(
    prisma,
    padrinhos.map((ap) => ({
      userId: ap.userId,
      tipo: 'gasto_novo',
      titulo: `Novo gasto com ${ap.gato.nome}`,
      mensagem: `${gasto.descricao} — ${reais(gasto.valorCentavos)}`,
      link: `/app/apadrinhamentos/${ap.id}`,
      chave: `gasto:${gasto.id}`,
    })),
  );
}

export async function notificarApadrinhamentoNovo(
  prisma: PrismaClient,
  ap: { id: string; gatoId: string; userId: string },
) {
  const [adms, detalhes] = await Promise.all([
    prisma.user.findMany({
      where: { cargo: 'adm', ativo: true },
      select: { id: true },
    }),
    prisma.apadrinhamento.findUniqueOrThrow({
      where: { id: ap.id },
      include: {
        gato: { select: { nome: true } },
        user: { select: { nome: true } },
      },
    }),
  ]);
  return notificar(
    prisma,
    adms
      .filter((adm) => adm.id !== ap.userId)
      .map((adm) => ({
        userId: adm.id,
        tipo: 'apadrinhamento_novo',
        titulo: `Novo padrinho para ${detalhes.gato.nome}`,
        mensagem: `${detalhes.user.nome} começou a apadrinhar.`,
        link: `/app/gatos/${ap.gatoId}?aba=gastos`,
        chave: `apadrinhamento:${ap.id}`,
      })),
  );
}

export async function notificarPagamentoAprovado(
  prisma: PrismaClient,
  pagamento: {
    id: string;
    apadrinhamentoId: string;
    mes: string;
    valorCentavos: number;
  },
) {
  const [adms, ap] = await Promise.all([
    prisma.user.findMany({
      where: { cargo: 'adm', ativo: true },
      select: { id: true },
    }),
    prisma.apadrinhamento.findUniqueOrThrow({
      where: { id: pagamento.apadrinhamentoId },
      include: {
        gato: { select: { nome: true } },
        user: { select: { nome: true } },
      },
    }),
  ]);
  return notificar(
    prisma,
    adms.map((adm) => ({
      userId: adm.id,
      tipo: 'pagamento_aprovado',
      titulo: `Pagamento recebido: ${ap.gato.nome}`,
      mensagem: `${ap.user.nome} pagou ${reais(pagamento.valorCentavos)} referente a ${mesPorExtenso(pagamento.mes)}.`,
      link: `/app/gatos/${ap.gatoId}?aba=gastos`,
      chave: `pagamento:${pagamento.id}`,
    })),
  );
}

export async function notificarDoacaoRecebida(
  prisma: PrismaClient,
  doacao: { id: string; nome: string; valorCentavos: number },
) {
  const adms = await prisma.user.findMany({
    where: { cargo: 'adm', ativo: true },
    select: { id: true },
  });
  return notificar(
    prisma,
    adms.map((adm) => ({
      userId: adm.id,
      tipo: 'doacao_recebida',
      titulo: `Doação recebida: ${reais(doacao.valorCentavos)}`,
      mensagem: `${doacao.nome} fez uma doação.`,
      chave: `doacao:${doacao.id}`,
    })),
  );
}
