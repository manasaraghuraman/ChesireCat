/**
 * File: next.config.ts
 * Purpose: Next.js configuration with baseline security headers (OWASP A05).
 * Author: manasa
 * Date: 2026-11-21
 */
import type { NextConfig } from "next";

const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
] as const;

/** Solari SDKs pull in Playwright internals that must not be bundled; load them from node_modules. */
const SERVER_EXTERNAL_PACKAGES = ["@solarisdk/browser", "@solarisdk/sandbox", "@solarisdk/core", "patchright-core"];

const config: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: SERVER_EXTERNAL_PACKAGES,
  async headers() {
    return [{ source: "/(.*)", headers: [...SECURITY_HEADERS] }];
  },
};

export default config;
