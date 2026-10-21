import {
  DIAS_SINCRONIZAR,
  sincronizarPendentes,
} from '../apadrinhamentos/pagamentos.js';
import {
  aplicarAssinaturaMp,
  aplicarCobrancaMp,
} from '../clube/sincronizar.js';
import { sincronizarDoacao } from '../doacoes/sincronizar.js';
import type { FastifyBaseLogger } from 'fastify';
import type { AppDeps } from '../../app.js';

/**
 * Consulta no Mercado Pago tudo o que está pendente (webhook perdido ou atrasado)
 * e aplica o que mudou. Checkouts abandonados há mais de DIAS_SINCRONIZAR dias ficam de fora.
 */
export async function conciliarPendentes(
  deps: AppDeps,
  agora: Date,
  log: FastifyBaseLogger,
) {
  const { prisma, pagamentos } = deps;
  const desde = new Date(
    agora.getTime() - DIAS_SINCRONIZAR * 24 * 60 * 60 * 1000,
  );
  const recentes = { status: 'pendente', criadoEm: { gte: desde } };

  const [doacoes, partes, assinaturas, cobrancas] = await Promise.all([
    prisma.doacao.findMany({ where: recentes }),
    prisma.pagamentoApadrinhamento.findMany({ where: recentes }),
    prisma.assinatura.findMany({
      where: { ...recentes, mpId: { not: null } },
    }),
    prisma.cobrancaAssinatura.findMany({ where: { status: 'pendente' } }),
  ]);

  for (const d of doacoes) await sincronizarDoacao(deps, d, log);
  await sincronizarPendentes(deps, partes, log);
  for (const a of assinaturas) {
    try {
      await aplicarAssinaturaMp(
        deps,
        a,
        await pagamentos.obterAssinatura(a.mpId!),
        agora,
      );
    } catch (err) {
      log.warn(
        { err, assinaturaId: a.id },
        'não foi possível conciliar a assinatura',
      );
    }
  }
  for (const c of cobrancas) {
    try {
      await aplicarCobrancaMp(deps, await pagamentos.obterCobranca(c.mpId));
    } catch (err) {
      log.warn(
        { err, cobrancaId: c.id },
        'não foi possível conciliar a cobrança',
      );
    }
  }

  const ids = (l: Array<{ id: string }>) => ({ in: l.map((x) => x.id) });
  const aindaPendentes = await Promise.all([
    prisma.doacao.count({ where: { id: ids(doacoes), status: 'pendente' } }),
    prisma.pagamentoApadrinhamento.count({
      where: { id: ids(partes), status: 'pendente' },
    }),
    prisma.assinatura.count({
      where: { id: ids(assinaturas), status: 'pendente' },
    }),
    prisma.cobrancaAssinatura.count({
      where: { id: ids(cobrancas), status: 'pendente' },
    }),
  ]);
  const consultados =
    doacoes.length + partes.length + assinaturas.length + cobrancas.length;
  const pendentes = aindaPendentes.reduce((a, b) => a + b, 0);
  return { consultados, atualizados: consultados - pendentes };
}
