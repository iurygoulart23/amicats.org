import { z } from 'zod';

const vazioComoUndefined = z
  .string()
  .optional()
  .transform((v) => (v ? v : undefined));

const EnvSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().default(3333),
  DATABASE_URL: z.string().min(1),
  WEB_ORIGIN: z.string().url(),
  COOKIE_DOMAIN: vazioComoUndefined,
  COOKIE_SECURE: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
  RESEND_API_KEY: vazioComoUndefined,
  MAIL_FROM: z.string().default('Amicats <nao-responda@amicats.org>'),
  S3_ENDPOINT: vazioComoUndefined,
  S3_REGION: z.string().default('us-east-005'),
  S3_BUCKET: vazioComoUndefined,
  S3_ACCESS_KEY_ID: vazioComoUndefined,
  S3_SECRET_ACCESS_KEY: vazioComoUndefined,
  S3_PUBLIC_URL: vazioComoUndefined,
  TAREFAS_TOKEN: vazioComoUndefined,
  MP_ACCESS_TOKEN: vazioComoUndefined,
  MP_WEBHOOK_SECRET: vazioComoUndefined,
  /** Guarda os e-mails em memória e expõe em /dev/emails (nunca em produção) */
  CAIXA_DEV: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
  /** Mercado Pago de mentira para desenvolvimento (nunca em produção) */
  MP_SIMULADO: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
});

/** Ferramentas de desenvolvimento que nunca podem ligar em produção. */
const SO_DESENVOLVIMENTO = ['MP_SIMULADO', 'CAIXA_DEV'] as const;

const EnvValidado = EnvSchema.superRefine((e, ctx) => {
  if (e.NODE_ENV !== 'production') return;
  for (const chave of SO_DESENVOLVIMENTO) {
    if (e[chave]) {
      ctx.addIssue({
        code: 'custom',
        path: [chave],
        message: `${chave} não pode ser usado em produção.`,
      });
    }
  }
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  return EnvValidado.parse(source);
}
