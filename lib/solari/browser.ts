/**
 * File: lib/solari/browser.ts
 * Purpose: Server-only wrapper around @solarisdk/browser: scoped sessions that are always
 *          released, page capture, and replay URLs. Never enables stealth/proxy/captcha.
 * Author: manasa
 * Date: 2026-11-21
 */
import { Solari, type BrowserSession } from "@solarisdk/browser";
import { getSolariConfig } from "./config";
import { describeError, fail, ok, type Result } from "./result";
import { validateTargetUrl } from "./url";

export const NAVIGATION_TIMEOUT_MS = 15_000;
export const MAX_PAGE_TEXT_CHARS = 4000;

export interface BrowserScope {
  readonly session: BrowserSession;
  readonly sessionId: string;
}

export interface PageCapture {
  readonly finalUrl: string;
  readonly title: string;
  readonly text: string;
  readonly screenshotPngBase64: string;
  readonly hasPasswordField: boolean;
}

export interface ScopedOutput<T> {
  readonly value: T;
  readonly replayUrl: string | null;
}

/**
 * Launches a session, runs `work`, and ALWAYS releases the session (try/finally).
 * When `isRecording` is true, returns the replay URL after release.
 */
export async function withBrowser<T>(
  work: (scope: BrowserScope) => Promise<T>,
  isRecording = false,
): Promise<Result<ScopedOutput<T>>> {
  const config = getSolariConfig();
  if (!config.isOk) return config;
  const client = new Solari({ apiKey: config.value.apiKey });
  let session: BrowserSession | undefined;
  try {
    session = await client.launch({ recording: isRecording });
    const value = await work({ session, sessionId: session.id });
    await session.close();
    const replayUrl = isRecording ? await replayUrlFor(client, session.id) : null;
    return ok({ value, replayUrl });
  } catch (error) {
    return fail(session ? "navigation-failed" : "launch-failed", describeError(error));
  } finally {
    await session?.close().catch(() => undefined);
    await client.close().catch(() => undefined);
  }
}

async function replayUrlFor(client: Solari, sessionId: string): Promise<string | null> {
  try {
    return (await client.sessions.getReplayUrl(sessionId)).url;
  } catch {
    return null; // replay may not be ready yet; callers treat it as optional
  }
}

async function visit(session: BrowserSession, url: URL): Promise<PageCapture> {
  const page = await session.newPage();
  await page.goto(url.toString(), { timeout: NAVIGATION_TIMEOUT_MS, waitUntil: "load" });
  const screenshot = await page.screenshot({ type: "png" });
  const text = await page.evaluate(() => document.body?.innerText ?? "");
  const hasPasswordField = (await page.locator("input[type=password]").count()) > 0;
  return {
    finalUrl: page.url(),
    title: await page.title(),
    text: text.slice(0, MAX_PAGE_TEXT_CHARS),
    screenshotPngBase64: screenshot.toString("base64"),
    hasPasswordField,
  };
}

/** Visits a validated URL inside Solari and captures what an ordinary visitor sees. */
export async function capturePage(rawUrl: string): Promise<Result<PageCapture>> {
  const target = validateTargetUrl(rawUrl);
  if (!target.isOk) return target;
  const result = await withBrowser(({ session }) => visit(session, target.value));
  return result.isOk ? ok(result.value.value) : result;
}

/** Same as capturePage, with session recording on; also returns the replay URL (may be null). */
export async function captureRecordedPage(rawUrl: string): Promise<Result<ScopedOutput<PageCapture>>> {
  const target = validateTargetUrl(rawUrl);
  if (!target.isOk) return target;
  return withBrowser(({ session }) => visit(session, target.value), true);
}
