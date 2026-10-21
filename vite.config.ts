import { URL, fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { devtools } from '@tanstack/devtools-vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { lingui } from '@lingui/vite-plugin';
import viteTsConfigPaths from 'vite-tsconfig-paths';

import tailwindcss from '@tailwindcss/vite';
import { nitro } from 'nitro/vite';

const config = defineConfig({
  ssr: {
    // Some tooling (jiti, lilconfig, etc.) is used during build-time and
    // must remain as external Node modules so Rollup doesn't try to bundle
    // Node builtin helpers (createRequire) for the browser. Externalizing
    // `jiti` avoids the "createRequire is not exported" rollup error.
    external: ['jiti'],
  },
  build: {
    rollupOptions: {
      // Ensure rollup treats jiti and its internal paths as external to
      // avoid bundling node-only helpers into client/server bundles.
      external: ['jiti', 'jiti/*', 'jiti/**'],
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: [
    devtools({
      // O e2e sobe um segundo servidor de dev; o event bus (porta fixa) fica só no primeiro.
      eventBusConfig: { enabled: process.env.DEVTOOLS_EVENT_BUS !== 'false' },
    }),
    nitro(),
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact({
      babel: {
        // Use the official Lingui babel macro plugin so `t`/`Trans` macros
        // are compiled during build. Keep the react compiler plugin too.
        plugins: [
          '@lingui/babel-plugin-lingui-macro',
          'babel-plugin-react-compiler',
        ],
      },
    }),
    // Add the official Lingui Vite plugin to enable catalog extraction
    // and runtime compilation helpers aligned with the official example.
    // This is safe because the plugin only affects build-time behavior.
    lingui(),
  ],
});

export default config;
