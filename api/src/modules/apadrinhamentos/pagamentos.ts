import { z } from 'zod';
import { atualizacaoDoPagamento } from '../../domain/pagamento.js';
import {
  notificarPagamentoAprovado,
  notificarSemFalhar,
} from '../notificacoes/notificar.js';
import type { PagamentoApadrinhamento } from '@prisma/client';
import type { FastifyBaseLogger } from 'fastify';
import type { AppDeps } from '../../app.js';
import type { PagamentoMp } from '../../lib/mercadopago.js';

const Referencia = z.uuid();
/** Checkouts abandonados há mais tempo que isso não são mais consultados ao abrir o extrato. */
export const DIAS_SINCRONIZAR = 30;

/**
 * Aplica no banco o que o Mercado Pago diz sobre um pagamento (idempotente).
 * A referência do checkout é o id do nosso pagamento; outras referências (ex.: cobranças
 * do Clube, que também chegam como 'payment') são ignoradas.
 */
export async function aplicarPagamentoMp(
  deps: AppDeps,
  mp: PagamentoMp,
  log: FastifyBaseLogger,
) {
  const { prisma } = deps;
  if (
    !mp.externalReference ||
    !Referencia.safeParse(mp.externalReference).success
  )
    return null;
  const local = await prisma.pagamentoApadrinhamento.findUnique({
    where: { id: mp.externalReference },
  });
  if (!local) return null;

  const dados = atualizacaoDoPagamento(local, mp);
  if (!dados) return local;

  const ficouAprovado = dados.status === 'aprovado';
  const atualizado = await prisma.pagamentoApadrinhamento.update({
    where: { id: local.id },
    data: dados,
  });
  if (ficouAprovado) {
    await notificarSemFalhar(log, () =>
      notificarPagamentoAprovado(prisma, atualizado),
    );
  }
  return atualizado;
}

/**
 * Webhook não alcança ambientes locais e pode atrasar: ao abrir o extrato,
 * consultamos no Mercado Pago os pagamentos ainda pendentes.
 */
export async function sincronizarPendentes(
  deps: AppDeps,
  pendentes: Array<PagamentoApadrinhamento>,
  log: FastifyBaseLogger,
) {
  const limite = Date.now() - DIAS_SINCRONIZAR * 24 * 60 * 60 * 1000;
  for (const local of pendentes) {
    if (local.criadoEm.getTime() < limite) continue;
    try {
      const encontrados = await deps.pagamentos.buscarPagamentos(local.id);
      encontrados.sort((a, b) => a.data.getTime() - b.data.getTime());
      for (const mp of encontrados) await aplicarPagamentoMp(deps, mp, log);
    } catch (err) {
      log.warn(
        { err, pagamentoId: local.id },
        'não foi possível sincronizar o pagamento com o Mercado Pago',
      );
    }
  }
}
