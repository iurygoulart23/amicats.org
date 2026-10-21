import { fileURLToPath } from 'node:url';
import { configDefaults, defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

const srcDir = fileURLToPath(new URL('./src', import.meta.url));

export default defineConfig({
  test: {
    environment: 'jsdom',
    // A API (api/) tem a própria suíte, que roda contra Postgres: `cd api && npm test`.
    exclude: [...configDefaults.exclude, 'api/**'],
    setupFiles: ['src/test/setup.ts', 'src/test/setupNodeGlobals.ts'],
    globals: true,
    alias: {
      '@': srcDir,
    },
    deps: { inline: ['@tanstack/react-router'] },
  },
  plugins: [tsconfigPaths()],
});
