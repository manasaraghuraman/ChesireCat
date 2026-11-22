/**
 * File: vitest.config.mts
 * Purpose: Main app test config: resolves the "@/" import alias used by routes and components. The vendored
 *          chase game has its own dependencies and test command (npm run test:chase), so the main run skips it.
 * Author: manasa
 * Date: 2026-11-22
 */
import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  test: { exclude: [...configDefaults.exclude, "chase/**"] },
});
