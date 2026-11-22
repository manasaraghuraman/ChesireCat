/**
 * File: lib/client/requests.ts
 * Purpose: Typed client calls for the Rabbit, cure, link checker, evidence and Looking-Glass routes.
 *          Every response is validated with zod before the UI sees it (OWASP A03, both directions).
 * Author: manasa
 * Date: 2026-11-21
 */
import {
  CureJudgement,
  EvidenceAnalysis,
  LinkVerdict,
  RabbitEvent,
  ScamDetection,
  type CureJudgementType,
  type EvidenceAnalysisType,
  type LinkVerdictType,
  type RabbitEventType,
  type ScamDetectionType,
  type WonderPageType,
} from "../schemas";
import { readSse } from "../sse";
import { postWithSession } from "./session";

const GENERIC_ERROR = "Something went wrong in Wonderland. Please try again.";
const JSON_HEADERS = { "Content-Type": "application/json" } as const;

async function readErrorMessage(response: Response): Promise<string> {
  const body = (await response.json().catch(() => ({}))) as { error?: unknown };
  return typeof body.error === "string" ? body.error : GENERIC_ERROR;
}

async function parseOrThrow<T>(response: Response, schema: { safeParse: (value: unknown) => { success: boolean; data?: T } }): Promise<T> {
  if (!response.ok) throw new Error(await readErrorMessage(response));
  const parsed = schema.safeParse(await response.json());
  if (!parsed.success || parsed.data === undefined) throw new Error(GENERIC_ERROR);
  return parsed.data;
}

export async function startLevel(levelId: string, isRabbitCured: boolean): Promise<void> {
  const response = await postWithSession(`/api/level/${levelId}/start`, { isRabbitCured });
  if (!response.ok) throw new Error(await readErrorMessage(response));
}

/** Best effort: the game also restores its own state JSON, so a failed sandbox revert is ignored. */
export async function rewindLevel(levelId: string): Promise<void> {
  await postWithSession(`/api/level/${levelId}/rewind`).catch(() => undefined);
}

export async function runRabbitVisit(
  page: WonderPageType,
  onEvent: (event: RabbitEventType) => void,
  signal: AbortSignal,
): Promise<void> {
  const response = await postWithSession("/api/rabbit", { page }, signal);
  if (!response.ok || !response.body) throw new Error(await readErrorMessage(response));
  for await (const { event, data } of readSse(response.body)) {
    if (event === "error") throw new Error(GENERIC_ERROR);
    const parsed = RabbitEvent.safeParse(data);
    if (parsed.success) onEvent(parsed.data);
  }
}

export async function sendCure(message: string, signal?: AbortSignal): Promise<CureJudgementType> {
  return parseOrThrow(await postWithSession("/api/rabbit/cure", { message }, signal), CureJudgement);
}

export async function fetchEvidence(signal: AbortSignal): Promise<EvidenceAnalysisType & { readonly screenshotPngBase64: string }> {
  const response = await postWithSession("/api/trial/evidence", {}, signal);
  if (!response.ok) throw new Error(await readErrorMessage(response));
  const body: unknown = await response.json();
  const analysis = EvidenceAnalysis.safeParse(body);
  const screenshot = (body as { screenshotPngBase64?: unknown }).screenshotPngBase64;
  if (!analysis.success || typeof screenshot !== "string") throw new Error(GENERIC_ERROR);
  return { ...analysis.data, screenshotPngBase64: screenshot };
}

export async function checkLinkRequest(url: string, signal: AbortSignal): Promise<LinkVerdictType> {
  const response = await fetch("/api/linkcheck", { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ url }), signal });
  return parseOrThrow(response, LinkVerdict);
}

export async function detectScamRequest(message: string, signal: AbortSignal): Promise<ScamDetectionType> {
  const response = await fetch("/api/lookingglass", { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ message }), signal });
  return parseOrThrow(response, ScamDetection);
}
