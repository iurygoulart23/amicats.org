import { PrismaClient } from '@prisma/client';
import { buildApp } from './app.js';
import { loadEnv } from './env.js';
import { createLogMailer, createResendMailer } from './lib/mailer.js';
import { createDisabledStorage, createS3Storage } from './lib/storage.js';

const env = loadEnv();
const prisma = new PrismaClient();

const storage =
  env.S3_ENDPOINT &&
  env.S3_BUCKET &&
  env.S3_ACCESS_KEY_ID &&
  env.S3_SECRET_ACCESS_KEY &&
  env.S3_PUBLIC_URL
    ? createS3Storage({
        endpoint: env.S3_ENDPOINT,
        region: env.S3_REGION,
        bucket: env.S3_BUCKET,
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY,
        publicUrl: env.S3_PUBLIC_URL,
      })
    : createDisabledStorage();

const app = await buildApp(
  {
    env,
    prisma,
    storage,
    // Sem Resend configurado, os e-mails (com os links) vão para o log do app.
    mailer: env.RESEND_API_KEY
      ? createResendMailer(env.RESEND_API_KEY, env.MAIL_FROM)
      : { enviar: (email) => createLogMailer(app.log).enviar(email) },
  },
  { logger: true, trustProxy: true },
);

const encerrar = async () => {
  await app.close();
  await prisma.$disconnect();
  process.exit(0);
};
process.on('SIGTERM', encerrar);
process.on('SIGINT', encerrar);

await app.listen({ port: env.PORT, host: '0.0.0.0' });
