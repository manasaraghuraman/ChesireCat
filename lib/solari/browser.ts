/**
 * File: lib/solari/browser.ts
 * Purpose: Server-only wrapper around @solarisdk/browser: scoped sessions that are always
 *          released, page capture, and replay URLs. Never enables stealth/proxy/captcha.
 * Author: manasa
 * Date: 2026-11-21 (updated: recorded captures, 425 retry, in-browser fallback)
 */
import { Solari, type BrowserSession } from "@solarisdk/browser";
import { getSolariConfig } from "./config";
import { describeError, fail, ok, type Result } from "./result";
import { validateTargetUrl } from "./url";

export const NAVIGATION_TIMEOUT_MS = 15_000;
export const MAX_PAGE_TEXT_CHARS = 4000;
/** Solari's preview route can answer 425 "Too Early" to a browser just after a sandbox starts. */
export const HTTP_TOO_EARLY = 425;
type Page = Awaited<ReturnType<BrowserSession["newPage"]>>;
export const TOO_EARLY_MAX_RETRIES = 8;
export const TOO_EARLY_DELAY_MS = 2000;

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

/**
 * What to load directly into the Solari browser if the URL never serves the expected page
 * (Solari's preview route can stay "too early" for a browser). Still isolated, still a screenshot.
 */
export interface PageFallback {
  readonly html: string;
  readonly isLoaded: (pageText: string) => boolean;
}

export interface RecordedCapture {
  readonly capture: PageCapture;
  readonly replayUrl: string | null;
}

/** Navigates, repeating the request a few times if the server says 425 (it means "try again"). */
export async function gotoWithRetry(page: Page, url: string): Promise<void> {
  for (let retries = 0; ; retries++) {
    const response = await page.goto(url, { timeout: NAVIGATION_TIMEOUT_MS, waitUntil: "load" });
    if (response?.status() !== HTTP_TOO_EARLY || retries >= TOO_EARLY_MAX_RETRIES) return;
    await page.waitForTimeout(TOO_EARLY_DELAY_MS);
  }
}

async function readText(page: Page): Promise<string> {
  return page.evaluate(() => document.body?.innerText ?? "");
}

async function readPage(session: BrowserSession, url: URL, fallback?: PageFallback): Promise<PageCapture> {
  const page = await session.newPage();
  await gotoWithRetry(page, url.toString());
  let text = await readText(page);
  if (fallback && !fallback.isLoaded(text)) {
    await page.setContent(fallback.html, { waitUntil: "load" });
    text = await readText(page);
  }
  const screenshot = await page.screenshot({ type: "png" });
  const hasPasswordField = (await page.locator("input[type=password]").count()) > 0;
  return {
    finalUrl: page.url(),
    title: await page.title(),
    text: text.slice(0, MAX_PAGE_TEXT_CHARS),
    screenshotPngBase64: screenshot.toString("base64"),
    hasPasswordField,
  };
}

/** Like capturePage, optionally recording the session so a replay link comes back. */
export async function capturePageRecorded(
  rawUrl: string,
  isRecording: boolean,
  fallback?: PageFallback,
): Promise<Result<RecordedCapture>> {
  const target = validateTargetUrl(rawUrl);
  if (!target.isOk) return target;
  const result = await withBrowser(({ session }) => readPage(session, target.value, fallback), isRecording);
  return result.isOk ? ok({ capture: result.value.value, replayUrl: result.value.replayUrl }) : result;
}

/** Visits a validated URL inside Solari and captures what an ordinary visitor sees. */
export async function capturePage(rawUrl: string, fallback?: PageFallback): Promise<Result<PageCapture>> {
  const result = await capturePageRecorded(rawUrl, false, fallback);
  return result.isOk ? ok(result.value.capture) : result;
}
