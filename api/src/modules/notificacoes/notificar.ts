import type { FastifyBaseLogger } from 'fastify';
import type { PrismaClient } from '@prisma/client';

/** 'gasto_novo' | 'apadrinhamento_novo' | 'dose_atrasada' | 'retorno_proximo' */
export type TipoNotificacao =
  'gasto_novo' | 'apadrinhamento_novo' | 'dose_atrasada' | 'retorno_proximo';

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

const reais = (centavos: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    centavos / 100,
  );

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
