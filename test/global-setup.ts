import { execSync } from 'node:child_process';

// Aplica as migrations no banco de testes (cria o banco se não existir).
// A limpeza dos dados entre testes fica em test/setup.ts.
export default function setup() {
  process.loadEnvFile('.env.test');
  execSync('npx prisma migrate deploy', { stdio: 'ignore', env: process.env });
}
