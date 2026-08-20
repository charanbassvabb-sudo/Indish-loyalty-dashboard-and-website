/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the separate restaurant reservations app. See src/lib/restaurant.ts. */
  readonly VITE_RESTAURANT_ADMIN_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
