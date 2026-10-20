import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globalSetup: ['./test/global-setup.ts'],
    setupFiles: ['./test/setup.ts'],
    // Os testes compartilham um banco real; rodar em série evita interferência.
    fileParallelism: false,
  },
});
