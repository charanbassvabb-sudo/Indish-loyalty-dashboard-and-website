// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  // Hard-pin the Nitro output target. Was "netlify" (Netlify Functions) —
  // switched to "node-server" now that this app is self-hosted alongside
  // the main site on the same droplet (see deploy/DEPLOY.md), which needs a
  // plain standalone Node server (`node .output/server/index.mjs`) instead
  // of a Netlify Functions bundle. Revert to "netlify" if this app ever
  // moves back to Netlify hosting.
  nitro: {
    preset: "node-server",
  },
  // A Rolldown/Nitro bundling bug (Linux-specific — see
  // scripts/fix-commonjs-hoist.mjs) leaves a shared CJS-interop helper
  // undefined in some circular-import chunk orderings. The postbuild script
  // patches the generated output directly; nothing to configure here.
});
