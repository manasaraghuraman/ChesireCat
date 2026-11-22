/**
 * File: app/wonderweb/[page]/route.ts
 * Purpose: Fallback host for WonderWeb pages (spec §9) when the level sandbox's port preview is
 *          unavailable. Only the Solari browser is meant to open these. Locked-down headers.
 * Author: manasa
 * Date: 2026-11-21
 */
import { WonderPage } from "@/lib/schemas";
import { WONDERWEB_HTML } from "@/lib/wonderweb/pages";

const PAGE_HEADERS = {
  "Content-Type": "text/html; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'none'",
  "Cache-Control": "no-store",
} as const;

export async function GET(_request: Request, context: { params: Promise<{ page: string }> }): Promise<Response> {
  const parsed = WonderPage.safeParse((await context.params).page);
  if (!parsed.success) return new Response("Not found", { status: 404 });
  return new Response(WONDERWEB_HTML[parsed.data], { headers: PAGE_HEADERS });
}
