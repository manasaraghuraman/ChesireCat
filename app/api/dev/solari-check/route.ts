/**
 * File: app/api/dev/solari-check/route.ts
 * Purpose: Dev-only live smoke test of the Solari wrappers: sandbox create -> serve a page ->
 *          browse it -> snapshot -> kill. GET /api/dev/solari-check. 404 in production.
 * Author: manasa
 * Date: 2026-11-21
 */
import { capturePage } from "@/lib/solari/browser";
import { createSandbox, killSandbox, serveFiles, snapshotSandbox } from "@/lib/solari/sandbox";

const SMOKE_PAGE = "<!doctype html><title>Wonder smoke</title><h1>Hello from the sandbox</h1>";
const PREVIEW_ORIGIN_PATTERN = /^(https?:\/\/[^/?#]+)/;

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status });
}

export async function GET(): Promise<Response> {
  if (process.env.NODE_ENV === "production") {
    return new Response("Not found", { status: 404 });
  }
  const created = await createSandbox("dev-smoke");
  if (!created.isOk) return json({ step: "createSandbox", error: created.error }, 500);

  try {
    const served = await serveFiles(created.value, { "index.html": SMOKE_PAGE });
    if (!served.isOk) return json({ step: "serveFiles", error: served.error }, 500);

    const snapshot = await snapshotSandbox(created.value, "dev-smoke");
    const captured = await capturePage(served.value);
    return json({
      sandbox: "created",
      previewOrigin: PREVIEW_ORIGIN_PATTERN.exec(served.value)?.[1] ?? null, // origin only: the URL may carry a token
      snapshot: snapshot.isOk ? "ok" : snapshot.error,
      capture: captured.isOk
        ? {
            title: captured.value.title,
            text: captured.value.text.trim(),
            screenshotBytes: captured.value.screenshotPngBase64.length,
            hasPasswordField: captured.value.hasPasswordField,
          }
        : captured.error,
    });
  } finally {
    const killed = await killSandbox(created.value);
    if (!killed.isOk) console.error("[solari-check] cleanup failed", killed.error.message);
  }
}
