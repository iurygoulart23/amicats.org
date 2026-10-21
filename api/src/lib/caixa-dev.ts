import type { Email, Mailer } from './mailer.js';

const LIMITE = 200;

export type EmailRecebido = Email & { enviadoEm: Date };

export type CaixaDev = {
  mailer: Mailer;
  /** E-mails de uma pessoa (ou todos), mais recentes primeiro */
  listar: (para?: string) => Array<EmailRecebido>;
};

/**
 * Caixa de e-mails de desenvolvimento (CAIXA_DEV=true): guarda em memória o que seria enviado,
 * para testes ponta a ponta lerem convites e links. Nunca usar em produção.
 */
export function createCaixaDev(): CaixaDev {
  const emails: Array<EmailRecebido> = [];
  return {
    mailer: {
      enviar(email) {
        emails.unshift({ ...email, enviadoEm: new Date() });
        emails.splice(LIMITE);
        return Promise.resolve();
      },
    },
    listar(para) {
      const alvo = para?.trim().toLowerCase();
      return alvo
        ? emails.filter((e) => e.para.toLowerCase() === alvo)
        : [...emails];
    },
  };
}
