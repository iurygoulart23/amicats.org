import { afterAll, beforeEach } from 'vitest';
import { prisma } from './helpers.js';

process.loadEnvFile('.env.test');

beforeEach(async () => {
  await prisma.$executeRawUnsafe(
    'TRUNCATE users, sessions, password_reset_tokens, gatos, gato_fotos, tags, gato_tags, registros_saude CASCADE',
  );
});

afterAll(async () => {
  await prisma.$disconnect();
});
