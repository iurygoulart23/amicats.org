import {
  atualizacaoDoPagamento,
  doacaoDaReferencia,
  referenciaDaDoacao,
} from '../../domain/pagamento.js';
import { z } from 'zod';
import {
  notificarDoacaoRecebida,
  notificarSemFalhar,
  reais,
} from '../notificacoes/notificar.js';
import type { Doacao } from '@prisma/client';
import type { FastifyBaseLogger } from 'fastify';
import type { AppDeps } from '../../app.js';
import type { PagamentoMp } from '../../lib/mercadopago.js';

const IdDoacao = z.uuid();

/** E-mail de agradecimento, uma única vez por doação (reserva antes de enviar). */
async function agradecer(deps: AppDeps, doacao: Doacao) {
  const { count } = await deps.prisma.doacao.updateMany({
    where: { id: doacao.id, agradecidaEm: null },
    data: { agradecidaEm: new Date() },
  });
  if (!count) return;
  await deps.mailer
    .enviar({
      para: doacao.email,
      assunto: 'Obrigado pela sua doação à Amicats',
      texto: `Olá, ${doacao.nome}!\n\nRecebemos a sua doação de ${reais(doacao.valorCentavos)}. Ela ajuda a manter o abrigo funcionando: ração, remédios, veterinário e todo o cuidado com os gatos resgatados.\n\nMuito obrigado!\nEquipe Amicats\n\n${deps.env.WEB_ORIGIN}`,
    })
    .catch(async (err: unknown) => {
      // Falhou: libera para tentar de novo no próximo aviso ou consulta.
      await deps.prisma.doacao.update({
        where: { id: doacao.id },
        data: { agradecidaEm: null },
      });
      throw err;
    });
}

/**
 * Aplica no banco o que o Mercado Pago diz sobre o pagamento de uma doação (idempotente).
 * Pagamentos com referência que não é de doação devolvem null.
 */
export async function aplicarDoacaoMp(
  deps: AppDeps,
  mp: PagamentoMp,
  log: FastifyBaseLogger,
) {
  const id = doacaoDaReferencia(mp.externalReference);
  if (!id || !IdDoacao.safeParse(id).success) return null;
  const local = await deps.prisma.doacao.findUnique({ where: { id } });
  if (!local) return null;

  const dados = atualizacaoDoPagamento(local, mp);
  const atual = dados
    ? await deps.prisma.doacao.update({ where: { id: local.id }, data: dados })
    : local;
  if (dados?.status === 'aprovado') {
    await notificarSemFalhar(log, () =>
      notificarDoacaoRecebida(deps.prisma, atual),
    );
  }
  if (atual.status === 'aprovado' && !atual.agradecidaEm) {
    await notificarSemFalhar(log, () => agradecer(deps, atual));
  }
  return atual;
}

/** Ao voltar do checkout, consulta o Mercado Pago (webhook pode atrasar ou não alcançar). */
export async function sincronizarDoacao(
  deps: AppDeps,
  doacao: Doacao,
  log: FastifyBaseLogger,
) {
  if (doacao.status !== 'pendente') return doacao;
  try {
    const encontrados = await deps.pagamentos.buscarPagamentos(
      referenciaDaDoacao(doacao.id),
    );
    encontrados.sort((a, b) => a.data.getTime() - b.data.getTime());
    for (const mp of encontrados) await aplicarDoacaoMp(deps, mp, log);
  } catch (err) {
    log.warn(
      { err, doacaoId: doacao.id },
      'não foi possível sincronizar a doação com o Mercado Pago',
    );
  }
  return deps.prisma.doacao.findUniqueOrThrow({ where: { id: doacao.id } });
}
