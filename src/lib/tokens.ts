import { createHash, randomBytes } from 'node:crypto';

export function gerarToken(): string {
  return randomBytes(32).toString('base64url');
}

/** Guardamos só o hash: um vazamento do banco não entrega sessões nem links válidos. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
