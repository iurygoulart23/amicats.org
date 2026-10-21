import { gerarToken, hashToken } from '../../lib/tokens.js';
import type { User } from '@prisma/client';
import type { AppDeps } from '../../app.js';

const VALIDADE_HORAS: Record<MotivoLink, number> = { reset: 2, convite: 72 };

/** 'reset' = esqueci minha senha · 'convite' = adm criou a conta */
export type MotivoLink = 'reset' | 'convite';

/** Gera um token de uso único e envia por e-mail o link para definir a senha. */
export async function enviarLinkDeSenha(
  { prisma, mailer, env }: AppDeps,
  user: Pick<User, 'id' | 'nome' | 'email'>,
  motivo: MotivoLink,
) {
  const token = gerarToken();
  const horas = VALIDADE_HORAS[motivo];
  await prisma.passwordResetToken.create({
    data: {
      tokenHash: hashToken(token),
      userId: user.id,
      expiraEm: new Date(Date.now() + horas * 60 * 60 * 1000),
    },
  });

  const link = `${env.WEB_ORIGIN}/pt-BR/app/redefinir-senha?token=${token}`;
  const email =
    motivo === 'convite'
      ? {
          assunto: 'Seu acesso à plataforma Amicats',
          texto: `Olá, ${user.nome}!\n\nUma conta foi criada para você na plataforma da Amicats. Defina sua senha em:\n${link}\n\nO link vale por ${horas} horas.`,
        }
      : {
          assunto: 'Redefinição de senha — Amicats',
          texto: `Olá, ${user.nome}!\n\nRecebemos um pedido para redefinir sua senha. Para criar uma nova, acesse:\n${link}\n\nO link vale por ${horas} horas. Se não foi você, ignore este e-mail.`,
        };

  await mailer.enviar({ para: user.email, ...email });
}
