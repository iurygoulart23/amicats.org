import { statusDaAssinatura, statusDaCobranca } from '../../domain/clube.js';
import { notificar } from '../notificacoes/notificar.js';
import type { Assinatura } from '@prisma/client';
import type { AppDeps } from '../../app.js';
import type { AssinaturaMp, CobrancaMp } from '../../lib/mercadopago.js';

/** Aplica no banco o que o Mercado Pago diz sobre a assinatura (idempotente). */
export async function aplicarAssinaturaMp(
  { prisma }: AppDeps,
  local: Assinatura,
  mp: AssinaturaMp,
  agora: Date,
) {
  const status = statusDaAssinatura(mp.status);
  if (!status) return local;

  const ficouAtiva = status === 'ativa' && local.status !== 'ativa';
  const atualizada = await prisma.assinatura.update({
    where: { id: local.id },
    data: {
      status,
      proximaCobranca: mp.proximaCobranca,
      ...(ficouAtiva && !local.ativadaEm && { ativadaEm: agora }),
      ...(status === 'cancelada' &&
        !local.canceladaEm && { canceladaEm: agora }),
    },
  });

  if (ficouAtiva) {
    const [adms, detalhes] = await Promise.all([
      prisma.user.findMany({
        where: { cargo: 'adm', ativo: true },
        select: { id: true },
      }),
      prisma.assinatura.findUniqueOrThrow({
        where: { id: local.id },
        include: {
          plano: { select: { nome: true } },
          user: { select: { nome: true } },
        },
      }),
    ]);
    await notificar(
      prisma,
      adms.map((adm) => ({
        userId: adm.id,
        tipo: 'assinatura_nova' as const,
        titulo: `Nova assinatura do Clube: ${detalhes.plano.nome}`,
        mensagem: `${detalhes.user.nome} entrou para o Clube Amicats.`,
        link: '/app/admin/clube',
        chave: `assinatura:${local.id}:ativa`,
      })),
    );
  }
  return atualizada;
}

/** Registra (ou atualiza) uma cobrança mensal informada pelo Mercado Pago. */
export async function aplicarCobrancaMp(
  { prisma }: AppDeps,
  cobranca: CobrancaMp,
) {
  const assinatura = await prisma.assinatura.findUnique({
    where: { mpId: cobranca.assinaturaMpId },
  });
  if (!assinatura) return null;
  const dados = {
    valorCentavos: cobranca.valorCentavos,
    status: statusDaCobranca(cobranca.statusPagamento),
    data: cobranca.data,
  };
  return prisma.cobrancaAssinatura.upsert({
    where: { mpId: cobranca.id },
    create: { ...dados, mpId: cobranca.id, assinaturaId: assinatura.id },
    update: dados,
  });
}
