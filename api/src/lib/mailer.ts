import { Resend } from 'resend';
import type { FastifyBaseLogger } from 'fastify';

export type Email = {
  para: string;
  assunto: string;
  texto: string;
  html?: string;
};

export interface Mailer {
  enviar: (email: Email) => Promise<void>;
}

export function createResendMailer(apiKey: string, from: string): Mailer {
  const resend = new Resend(apiKey);
  return {
    async enviar(email) {
      const { error } = await resend.emails.send({
        from,
        to: email.para,
        subject: email.assunto,
        text: email.texto,
        html: email.html,
      });
      if (error) throw new Error(`Falha ao enviar e-mail: ${error.message}`);
    },
  };
}

/** Desenvolvimento sem Resend: o conteúdo (com os links) vai para o log. */
export function createLogMailer(log: FastifyBaseLogger): Mailer {
  return {
    enviar(email) {
      log.info({ para: email.para, assunto: email.assunto }, email.texto);
      return Promise.resolve();
    },
  };
}
