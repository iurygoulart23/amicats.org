import argon2 from 'argon2';

export function hashSenha(senha: string): Promise<string> {
  return argon2.hash(senha, { type: argon2.argon2id });
}

export async function verificarSenha(
  hash: string | null,
  senha: string,
): Promise<boolean> {
  if (!hash) return false;
  try {
    return await argon2.verify(hash, senha);
  } catch {
    return false;
  }
}
