import { randomUUID } from 'node:crypto';
import type {
  AssinaturaMp,
  CobrancaMp,
  GatewayPagamentos,
  NovoCheckoutMp,
  PagamentoMp,
} from './mercadopago.js';

export type AprovacaoSimulada =
  | { tipo: 'assinatura'; urlRetorno: string; cobrancaId: string }
  | { tipo: 'checkout'; urlRetorno: string; pagamentoId: string };

export type SimuladorMp = {
  gateway: GatewayPagamentos;
  /**
   * Simula o pagamento aprovado no checkout. Assinatura: ativa e gera a 1ª cobrança.
   * Checkout de pagamento único: gera o pagamento aprovado com a referência.
   */
  aprovar: (id: string) => AprovacaoSimulada;
  existe: (id: string) => boolean;
  dados: (id: string) => {
    motivo: string;
    valorCentavos: number;
    emailPagador: string;
    recorrente: boolean;
  } | null;
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
  const checkouts = new Map<string, NovoCheckoutMp>();
  const pagamentos = new Map<string, PagamentoMp>();

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
    criarCheckout(d) {
      const id = `sim-chk-${randomUUID()}`;
      checkouts.set(id, d);
      return Promise.resolve({
        id,
        checkoutUrl: `${urlApi}/dev/mercadopago/checkout/${id}`,
      });
    },
    obterPagamento(id) {
      const p = pagamentos.get(id);
      return p
        ? Promise.resolve({ ...p })
        : Promise.reject(new Error(`pagamento simulado ${id} não existe`));
    },
    buscarPagamentos(referencia) {
      return Promise.resolve(
        [...pagamentos.values()]
          .filter((p) => p.externalReference === referencia)
          .map((p) => ({ ...p })),
      );
    },
  };

  function aprovarCheckout(id: string, c: NovoCheckoutMp): AprovacaoSimulada {
    const pagamentoId = `sim-pag-${randomUUID()}`;
    pagamentos.set(pagamentoId, {
      id: pagamentoId,
      status: 'approved',
      externalReference: c.referencia,
      valorCentavos: c.valorCentavos,
      data: new Date(),
    });
    checkouts.delete(id);
    return { tipo: 'checkout', urlRetorno: c.urlRetorno, pagamentoId };
  }

  return {
    gateway,
    existe: (id) => assinaturas.has(id) || checkouts.has(id),
    dados(id) {
      const c = checkouts.get(id);
      if (c)
        return {
          motivo: c.titulo,
          valorCentavos: c.valorCentavos,
          emailPagador: c.emailPagador,
          recorrente: false,
        };
      const a = assinaturas.get(id);
      return a
        ? {
            motivo: a.motivo,
            valorCentavos: a.valorCentavos,
            emailPagador: a.emailPagador,
            recorrente: true,
          }
        : null;
    },
    aprovar(id) {
      const c = checkouts.get(id);
      if (c) return aprovarCheckout(id, c);
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
      return { tipo: 'assinatura', urlRetorno: a.urlRetorno, cobrancaId };
    },
  };
}
