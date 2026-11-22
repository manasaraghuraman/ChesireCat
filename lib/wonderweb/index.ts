/**
 * File: lib/wonderweb/index.ts
 * Purpose: Maps WonderWeb pages to sandbox files and builds page URLs from a preview base URL,
 *          keeping any credential the preview URL carries (it is never logged or sent to clients).
 * Author: manasa
 * Date: 2026-11-21 (updated: in-browser fallback)
 */
import type { WonderPageType } from "../schemas";
import type { PageFallback } from "../solari/browser";
import { WONDERWEB_HTML } from "./pages";

const ADDRESS_BAR_PATTERN = /Address:\s*\S+/;

/** Files for the sandbox static server: one folder per page, each with an index.html. */
export function wonderWebFiles(): Readonly<Record<string, string>> {
  return Object.fromEntries(
    Object.entries(WONDERWEB_HTML).map(([page, html]) => [`${page}/index.html`, html]),
  );
}

/** Joins a page folder onto a preview base URL, preserving the base's query string. */
export function pageUrl(baseUrl: string, page: WonderPageType): string {
  const url = new URL(baseUrl);
  url.pathname = `${url.pathname.replace(/\/$/, "")}/${page}/`;
  return url.toString();
}

/** Every WonderWeb page shows an address bar; an error page (e.g. HTTP 425) does not. */
export function isWonderPageText(pageText: string): boolean {
  return ADDRESS_BAR_PATTERN.test(pageText);
}

/** The same page, loaded straight into the Solari browser if the preview URL never serves it. */
export function wonderFallback(page: WonderPageType): PageFallback {
  return { html: WONDERWEB_HTML[page], isLoaded: isWonderPageText };
}
