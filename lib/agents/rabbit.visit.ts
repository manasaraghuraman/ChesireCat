/**
 * File: lib/agents/rabbit.visit.ts
 * Purpose: One White Rabbit visit as a stream of events: Solari capture → screenshot → narration →
 *          verdict → replay link. The model never chooses URLs (OWASP A10); the route supplies one.
 * Author: manasa
 * Date: 2026-11-21 (updated: in-browser fallback page)
 */
import type { RabbitEventType } from "../schemas";
import { capturePageRecorded, type PageFallback } from "../solari/browser";
import { extractAddress, judgePage, narratePage, UNKNOWN_ADDRESS, type Defenses } from "./rabbit";

const UNREACHABLE_LINE = "Oh dear, oh dear, I couldn't reach that page. Shall we try again?";

/** Only https replay links are passed on, so the client can safely render them. */
/** Every WonderWeb page shows an address bar; an error page (e.g. HTTP 425) does not. */
export function isWonderPage(pageText: string): boolean {
  return extractAddress(pageText) !== UNKNOWN_ADDRESS;
}

export function safeReplayUrl(replayUrl: string | null): string | null {
  if (!replayUrl) return null;
  try {
    return new URL(replayUrl).protocol === "https:" ? replayUrl : null;
  } catch {
    return null;
  }
}

export async function* visitPage(options: {
  readonly url: string;
  readonly defenses: Defenses;
  /** Same page, loaded directly into the Solari browser if the preview URL won't serve it. */
  readonly fallback?: PageFallback;
  readonly abortSignal?: AbortSignal;
}): AsyncGenerator<RabbitEventType> {
  // Record only the fooled visit: that replay goes on the lesson card (spec §2).
  const isRecording = options.defenses === "off";
  const captured = await capturePageRecorded(options.url, isRecording, options.fallback);
  if (!captured.isOk || !isWonderPage(captured.value.capture.text)) {
    yield { type: "narration", text: UNREACHABLE_LINE };
    return;
  }
  const { capture, replayUrl } = captured.value;
  // The pretend ".wonder" address, never the real preview URL (it may carry a credential).
  yield { type: "screenshot", pngBase64: capture.screenshotPngBase64, url: extractAddress(capture.text) };

  let narration = "";
  for await (const delta of narratePage(capture, options.defenses, options.abortSignal)) {
    narration += delta;
    yield { type: "narration", text: delta };
  }
  const verdict = await judgePage(capture, narration, options.defenses, options.abortSignal);
  yield { type: "verdict", safe: verdict.safe, reasons: verdict.reasons };

  const replay = safeReplayUrl(replayUrl);
  if (isRecording && replay) yield { type: "replay", replayUrl: replay };
}
