import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { verificarAssinaturaWebhook } from './mercadopago.js';

const SEGREDO = 'segredo-do-painel';

function assinar(manifest: string) {
  return createHmac('sha256', SEGREDO).update(manifest).digest('hex');
}

describe('verificarAssinaturaWebhook', () => {
  const ts = '1761000000000';
  const agora = new Date(Number(ts) + 60_000);

  it('aceita o aviso assinado com o manifest oficial', () => {
    const v1 = assinar(`id:abc123;request-id:req-1;ts:${ts};`);
    expect(
      verificarAssinaturaWebhook({
        segredo: SEGREDO,
        xSignature: `ts=${ts},v1=${v1}`,
        xRequestId: 'req-1',
        dataId: 'ABC123', // ids alfanuméricos entram em minúsculas no manifest
        agora,
      }),
    ).toBe(true);
  });

  it('recusa assinatura errada, adulterada ou ausente', () => {
    const v1 = assinar(`id:abc123;request-id:req-1;ts:${ts};`);
    const base = {
      segredo: SEGREDO,
      xRequestId: 'req-1',
      dataId: 'abc123',
      agora,
    };
    expect(
      verificarAssinaturaWebhook({
        ...base,
        xSignature: `ts=${ts},v1=${'0'.repeat(64)}`,
      }),
    ).toBe(false);
    expect(
      verificarAssinaturaWebhook({
        ...base,
        dataId: 'outro',
        xSignature: `ts=${ts},v1=${v1}`,
      }),
    ).toBe(false);
    expect(verificarAssinaturaWebhook({ ...base, xSignature: undefined })).toBe(
      false,
    );
    expect(verificarAssinaturaWebhook({ ...base, xSignature: 'lixo' })).toBe(
      false,
    );
  });

  it('recusa aviso antigo demais (proteção contra reenvio)', () => {
    const v1 = assinar(`id:abc123;request-id:req-1;ts:${ts};`);
    expect(
      verificarAssinaturaWebhook({
        segredo: SEGREDO,
        xSignature: `ts=${ts},v1=${v1}`,
        xRequestId: 'req-1',
        dataId: 'abc123',
        agora: new Date(Number(ts) + 60 * 60_000),
      }),
    ).toBe(false);
  });

  it('sem x-request-id, o campo sai do manifest', () => {
    const v1 = assinar(`id:abc123;ts:${ts};`);
    expect(
      verificarAssinaturaWebhook({
        segredo: SEGREDO,
        xSignature: `ts=${ts},v1=${v1}`,
        xRequestId: undefined,
        dataId: 'abc123',
        agora,
      }),
    ).toBe(true);
  });
});
