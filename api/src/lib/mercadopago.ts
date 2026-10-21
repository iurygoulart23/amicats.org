import { createHmac, timingSafeEqual } from 'node:crypto';
import { HttpError } from './errors.js';

/** 'pending' | 'authorized' | 'paused' | 'cancelled' (status do Mercado Pago) */
export type StatusMpAssinatura = string;

export type AssinaturaMp = {
  id: string;
  status: StatusMpAssinatura;
  externalReference: string | null;
  checkoutUrl: string | null;
  proximaCobranca: Date | null;
};

export type CobrancaMp = {
  id: string;
  assinaturaMpId: string;
  valorCentavos: number;
  /** status do pagamento autorizado no Mercado Pago (ex.: 'processed', 'recycling', 'cancelled') */
  status: string;
  /** situação do pagamento em si (ex.: 'approved', 'rejected') */
  statusPagamento: string | null;
  data: Date;
};

export type NovaAssinaturaMp = {
  motivo: string;
  referencia: string;
  emailPagador: string;
  valorCentavos: number;
  urlRetorno: string;
};

/** Pagamento avulso feito num checkout (Checkout Pro). */
export type PagamentoMp = {
  id: string;
  /** 'pending' | 'approved' | 'in_process' | 'rejected' | 'cancelled' | 'refunded' | 'charged_back'… */
  status: string;
  externalReference: string | null;
  valorCentavos: number;
  data: Date;
};

export type NovoCheckoutMp = {
  titulo: string;
  referencia: string;
  emailPagador: string;
  valorCentavos: number;
  urlRetorno: string;
};

export type CheckoutMp = { id: string; checkoutUrl: string };

/** O que a API precisa do Mercado Pago (adapter: real em produção, falso nos testes). */
export interface GatewayPagamentos {
  criarAssinatura: (dados: NovaAssinaturaMp) => Promise<AssinaturaMp>;
  obterAssinatura: (id: string) => Promise<AssinaturaMp>;
  cancelarAssinatura: (id: string) => Promise<void>;
  obterCobranca: (id: string) => Promise<CobrancaMp>;
  /** Checkout de pagamento único (pix, cartão ou boleto) */
  criarCheckout: (dados: NovoCheckoutMp) => Promise<CheckoutMp>;
  obterPagamento: (id: string) => Promise<PagamentoMp>;
  /** Pagamentos feitos nos checkouts com essa referência (external_reference) */
  buscarPagamentos: (referencia: string) => Promise<Array<PagamentoMp>>;
}

const API = 'https://api.mercadopago.com';

type PreapprovalResposta = {
  id: string;
  status: string;
  external_reference?: string | null;
  init_point?: string | null;
  next_payment_date?: string | null;
};

type AuthorizedPaymentResposta = {
  id: number | string;
  preapproval_id: string;
  transaction_amount: number;
  status: string;
  date_created?: string;
  debit_date?: string;
  payment?: { status?: string } | null;
};

type PaymentResposta = {
  id: number | string;
  status: string;
  external_reference?: string | null;
  transaction_amount: number;
  date_approved?: string | null;
  date_created?: string;
};

function paraPagamento(r: PaymentResposta): PagamentoMp {
  return {
    id: String(r.id),
    status: r.status,
    externalReference: r.external_reference ?? null,
    valorCentavos: Math.round(r.transaction_amount * 100),
    data: new Date(r.date_approved ?? r.date_created ?? Date.now()),
  };
}

function paraAssinatura(r: PreapprovalResposta): AssinaturaMp {
  return {
    id: r.id,
    status: r.status,
    externalReference: r.external_reference ?? null,
    checkoutUrl: r.init_point ?? null,
    proximaCobranca: r.next_payment_date ? new Date(r.next_payment_date) : null,
  };
}

export function createMercadoPagoGateway(
  accessToken: string,
): GatewayPagamentos {
  async function chamar<T>(
    metodo: string,
    caminho: string,
    corpo?: unknown,
  ): Promise<T> {
    const res = await fetch(`${API}${caminho}`, {
      method: metodo,
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json',
      },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    });
    const dados = (await res.json().catch(() => null)) as {
      message?: string;
    } | null;
    if (!res.ok) {
      // A mensagem do Mercado Pago vai para o log; para o usuário, uma mensagem genérica.
      throw new HttpError(
        502,
        `Mercado Pago respondeu ${res.status}: ${dados?.message ?? 'erro'}`,
      );
    }
    return dados as T;
  }

  return {
    async criarAssinatura(d) {
      const r = await chamar<PreapprovalResposta>('POST', '/preapproval', {
        reason: d.motivo,
        external_reference: d.referencia,
        payer_email: d.emailPagador,
        back_url: d.urlRetorno,
        status: 'pending',
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: d.valorCentavos / 100,
          currency_id: 'BRL',
        },
      });
      return paraAssinatura(r);
    },
    async obterAssinatura(id) {
      return paraAssinatura(
        await chamar<PreapprovalResposta>('GET', `/preapproval/${id}`),
      );
    },
    async cancelarAssinatura(id) {
      await chamar('PUT', `/preapproval/${id}`, { status: 'cancelled' });
    },
    async obterCobranca(id) {
      const r = await chamar<AuthorizedPaymentResposta>(
        'GET',
        `/authorized_payments/${id}`,
      );
      return {
        id: String(r.id),
        assinaturaMpId: r.preapproval_id,
        valorCentavos: Math.round(r.transaction_amount * 100),
        status: r.status,
        statusPagamento: r.payment?.status ?? null,
        data: new Date(r.debit_date ?? r.date_created ?? Date.now()),
      };
    },
    async criarCheckout(d) {
      const r = await chamar<{ id: string; init_point: string }>(
        'POST',
        '/checkout/preferences',
        {
          items: [
            {
              title: d.titulo,
              quantity: 1,
              unit_price: d.valorCentavos / 100,
              currency_id: 'BRL',
            },
          ],
          payer: { email: d.emailPagador },
          external_reference: d.referencia,
          back_urls: {
            success: d.urlRetorno,
            pending: d.urlRetorno,
            failure: d.urlRetorno,
          },
          auto_return: 'approved',
        },
      );
      return { id: r.id, checkoutUrl: r.init_point };
    },
    async obterPagamento(id) {
      return paraPagamento(
        await chamar<PaymentResposta>('GET', `/v1/payments/${id}`),
      );
    },
    async buscarPagamentos(referencia) {
      const r = await chamar<{ results: Array<PaymentResposta> }>(
        'GET',
        `/v1/payments/search?external_reference=${encodeURIComponent(referencia)}&sort=date_created&criteria=desc`,
      );
      return r.results.map(paraPagamento);
    },
  };
}

/** Sem credenciais: qualquer operação responde 503 com mensagem clara. */
export function createGatewayDesativado(): GatewayPagamentos {
  const erro = () =>
    Promise.reject(
      new HttpError(503, 'Pagamentos não configurados (MP_ACCESS_TOKEN).'),
    );
  return {
    criarAssinatura: erro,
    obterAssinatura: erro,
    cancelarAssinatura: erro,
    obterCobranca: erro,
    criarCheckout: erro,
    obterPagamento: erro,
    buscarPagamentos: erro,
  };
}

/** Avisos mais antigos que isso são recusados (proteção contra reenvio). */
const TOLERANCIA_WEBHOOK_MS = 15 * 60 * 1000;

/**
 * Valida o header x-signature do webhook do Mercado Pago:
 * HMAC-SHA256 (hex) do manifest `id:{data.id};request-id:{x-request-id};ts:{ts};`
 * com a chave secreta do painel. Campos ausentes saem do manifest.
 */
export function verificarAssinaturaWebhook(p: {
  segredo: string;
  xSignature: string | undefined;
  xRequestId: string | undefined;
  dataId: string | undefined;
  agora: Date;
}): boolean {
  if (!p.xSignature) return false;
  const partes = Object.fromEntries(
    p.xSignature.split(',').map((parte) => {
      const [chave, ...valor] = parte.trim().split('=');
      return [chave, valor.join('=')];
    }),
  );
  const ts = partes.ts;
  const v1 = partes.v1;
  if (!ts || !v1 || !/^[0-9a-f]{64}$/i.test(v1)) return false;
  if (Math.abs(p.agora.getTime() - Number(ts)) > TOLERANCIA_WEBHOOK_MS)
    return false;

  const manifest =
    (p.dataId ? `id:${p.dataId.toLowerCase()};` : '') +
    (p.xRequestId ? `request-id:${p.xRequestId};` : '') +
    `ts:${ts};`;
  const esperado = createHmac('sha256', p.segredo).update(manifest).digest();
  const recebido = Buffer.from(v1, 'hex');
  return (
    recebido.length === esperado.length && timingSafeEqual(recebido, esperado)
  );
}
