/**
 * File: vitest.config.mts
 * Purpose: Main app test config. The vendored chase game has its own dependencies and test command
 *          (npm run test:chase), so the main run skips it.
 * Author: manasa
 * Date: 2026-11-22
 */
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({ test: { exclude: [...configDefaults.exclude, "chase/**"] } });
