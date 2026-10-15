// Strip a non-functional `localStorage` global (some non-browser runtimes expose a
// value stub without `getItem`, which breaks feature-detection). The descriptor is
// inspected directly so we never invoke the accessor getter — on Node >=25 touching
// `globalThis.localStorage` emits a spurious `--localstorage-file` warning.
{
  const localStorageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  if (
    localStorageDescriptor &&
    'value' in localStorageDescriptor &&
    typeof (localStorageDescriptor.value as { getItem?: unknown } | undefined)?.getItem !== 'function'
  ) {
    try {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } catch {
      // localStorage cleanup is best-effort in non-browser runtimes
    }
  }
}

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Server-only infra libs loaded natively (require) instead of being bundled.
  // bullmq lazily references the optional `@valkey/valkey-glide` driver, which is
  // not installed; externalizing it avoids a spurious build-time "Module not found".
  serverExternalPackages: ["bullmq", "ioredis"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
