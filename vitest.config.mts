/**
 * File: vitest.config.mts
 * Purpose: Test runner config: resolves the "@/" import alias used by routes and components.
 * Author: manasa
 * Date: 2026-11-21
 */
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  test: { environment: "node" },
});
