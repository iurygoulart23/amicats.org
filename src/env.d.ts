/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL da amicats-api, ex.: https://api.amicats.org */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
