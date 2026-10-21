import { randomUUID } from 'node:crypto';
import type {
  AssinaturaMp,
  CobrancaMp,
  GatewayPagamentos,
} from './mercadopago.js';

export type SimuladorMp = {
  gateway: GatewayPagamentos;
  /** Simula o pagamento aprovado no checkout: ativa a assinatura e gera a 1ª cobrança. */
  aprovar: (id: string) => { urlRetorno: string; cobrancaId: string };
  existe: (id: string) => boolean;
  dados: (
    id: string,
  ) => { motivo: string; valorCentavos: number; emailPagador: string } | null;
};

/**
 * Mercado Pago de mentira para desenvolvimento (MP_SIMULADO=true): o "checkout" é uma página
 * da própria API. Os dados ficam em memória e somem ao reiniciar. Nunca usar em produção.
 */
export function createGatewaySimulado(urlApi: string): SimuladorMp {
  const assinaturas = new Map<
    string,
    AssinaturaMp & {
      urlRetorno: string;
      motivo: string;
      valorCentavos: number;
      emailPagador: string;
    }
  >();
  const cobrancas = new Map<string, CobrancaMp>();

  const buscar = (id: string) => {
    const a = assinaturas.get(id);
    if (!a)
      return Promise.reject(
        new Error(`assinatura simulada ${id} não existe (a API reiniciou?)`),
      );
    return Promise.resolve({ ...a });
  };

  const gateway: GatewayPagamentos = {
    criarAssinatura(d) {
      const id = `sim-${randomUUID()}`;
      const a = {
        id,
        status: 'pending',
        externalReference: d.referencia,
        checkoutUrl: `${urlApi}/dev/mercadopago/checkout/${id}`,
        proximaCobranca: null,
        urlRetorno: d.urlRetorno,
        motivo: d.motivo,
        valorCentavos: d.valorCentavos,
        emailPagador: d.emailPagador,
      };
      assinaturas.set(id, a);
      return Promise.resolve({ ...a });
    },
    obterAssinatura: buscar,
    cancelarAssinatura(id) {
      const a = assinaturas.get(id);
      if (a) a.status = 'cancelled';
      return Promise.resolve();
    },
    obterCobranca(id) {
      const c = cobrancas.get(id);
      return c
        ? Promise.resolve(c)
        : Promise.reject(new Error(`cobrança simulada ${id} não existe`));
    },
  };

  return {
    gateway,
    existe: (id) => assinaturas.has(id),
    dados(id) {
      const a = assinaturas.get(id);
      return a
        ? {
            motivo: a.motivo,
            valorCentavos: a.valorCentavos,
            emailPagador: a.emailPagador,
          }
        : null;
    },
    aprovar(id) {
      const a = assinaturas.get(id);
      if (!a) throw new Error(`assinatura simulada ${id} não existe`);
      const agora = new Date();
      a.status = 'authorized';
      // Mesmo horário, um mês depois (em UTC, independente do fuso da máquina).
      a.proximaCobranca = new Date(
        Date.UTC(
          agora.getUTCFullYear(),
          agora.getUTCMonth() + 1,
          agora.getUTCDate(),
          agora.getUTCHours(),
          agora.getUTCMinutes(),
        ),
      );
      const cobrancaId = `sim-cob-${randomUUID()}`;
      cobrancas.set(cobrancaId, {
        id: cobrancaId,
        assinaturaMpId: id,
        valorCentavos: a.valorCentavos,
        status: 'processed',
        statusPagamento: 'approved',
        data: agora,
      });
      return { urlRetorno: a.urlRetorno, cobrancaId };
    },
  };
}
