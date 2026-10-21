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
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  return EnvSchema.parse(source);
}
