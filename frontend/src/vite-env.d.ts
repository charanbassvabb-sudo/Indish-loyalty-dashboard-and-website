/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the separate Indish Loyalty app. See src/lib/loyalty.ts. */
  readonly VITE_LOYALTY_APP_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
