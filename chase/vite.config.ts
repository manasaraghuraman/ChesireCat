/**
 * File: chase/vite.config.ts
 * Purpose: Builds the vendored carbon-footprint speedrun game as a static site into the main app's
 *          public/chase folder, using relative asset paths so it works under /chase/ in an iframe.
 * Author: manasa
 * Date: 2026-11-22
 */
import { defineConfig } from "vite";
import preact from "@preact/preset-vite";

export default defineConfig({
  base: "./",
  plugins: [preact()],
  build: { outDir: "../public/chase", emptyOutDir: true },
});
