/**
 * File: lib/session/registry.ts
 * Purpose: Server-side game sessions (spec §5, §12): each owns at most one Solari sandbox serving
 *          WonderWeb. Boot is locked per session (no double sandboxes), idle sessions are swept,
 *          and the live count is capped. State lives on globalThis so dev reloads keep it.
 * Author: manasa
 * Date: 2026-11-21 (updated: readiness probe after boot)
 */
import { MAX_LIVE_SESSIONS, SESSION_SWEEP_INTERVAL_MS } from "../constants";
import { logEvent } from "../log";
import { TTL_DEFAULT_SECONDS, MS_PER_SECOND, getSolariConfig } from "../solari/config";
import { fail, ok, type Result } from "../solari/result";
import {
  createSandbox,
  killSandbox,
  revertSandbox,
  serveFiles,
  snapshotSandbox,
  type SandboxHandle,
} from "../solari/sandbox";
import { waitUntilServing } from "../solari/ready";
import { pageUrl, wonderWebFiles } from "../wonderweb";

/** Where WonderWeb is reachable. `handle` is null when the main app serves it (fallback). */
export interface LevelRuntime {
  readonly handle: SandboxHandle | null;
  readonly baseUrl: string;
  readonly snapshotId: string | null;
}

export interface GameSession {
  readonly id: string;
  runtime: LevelRuntime | null;
  booting: Promise<Result<LevelRuntime>> | null;
  isRabbitCured: boolean;
  lastUsedMs: number;
}

interface RegistryState {
  readonly sessions: Map<string, GameSession>;
  lastSweepMs: number;
}

const globalRegistry = globalThis as unknown as { __rabbitRegistry?: RegistryState };
const registry: RegistryState = (globalRegistry.__rabbitRegistry ??= { sessions: new Map(), lastSweepMs: 0 });

function ttlMs(): number {
  const config = getSolariConfig();
  return (config.isOk ? config.value.ttlSeconds : TTL_DEFAULT_SECONDS) * MS_PER_SECOND;
}

async function releaseRuntime(session: GameSession): Promise<void> {
  const handle = session.runtime?.handle;
  session.runtime = null;
  if (handle) await killSandbox(handle);
}

/** Ends a session and kills its sandbox. Safe to call twice. */
export async function endSession(id: string): Promise<boolean> {
  const session = registry.sessions.get(id);
  if (!session) return false;
  registry.sessions.delete(id);
  await releaseRuntime(session);
  logEvent({ level: "INFO", operation: "session.end", outcome: "released" });
  return true;
}

/** Kills sessions idle longer than the TTL. Runs lazily (no timers to leak). */
export async function sweepExpiredSessions(nowMs: number = Date.now()): Promise<number> {
  const limit = ttlMs();
  const expired = [...registry.sessions.values()].filter((s) => nowMs - s.lastUsedMs > limit);
  await Promise.all(expired.map((session) => endSession(session.id)));
  return expired.length;
}

function oldestSessionId(): string | undefined {
  let oldest: GameSession | undefined;
  for (const session of registry.sessions.values()) {
    if (!oldest || session.lastUsedMs < oldest.lastUsedMs) oldest = session;
  }
  return oldest?.id;
}

export async function createSession(nowMs: number = Date.now()): Promise<string> {
  if (nowMs - registry.lastSweepMs >= SESSION_SWEEP_INTERVAL_MS) {
    registry.lastSweepMs = nowMs;
    await sweepExpiredSessions(nowMs);
  }
  while (registry.sessions.size >= MAX_LIVE_SESSIONS) {
    const oldest = oldestSessionId();
    if (!oldest) break;
    await endSession(oldest);
  }
  const id = crypto.randomUUID();
  registry.sessions.set(id, { id, runtime: null, booting: null, isRabbitCured: false, lastUsedMs: nowMs });
  return id;
}

/** Looks a session up and refreshes its idle timer. Unknown ids get undefined (caller returns 404). */
export function getSession(id: string, nowMs: number = Date.now()): GameSession | undefined {
  const session = registry.sessions.get(id);
  if (session) session.lastUsedMs = nowMs;
  return session;
}

async function bootRuntime(sessionId: string): Promise<Result<LevelRuntime>> {
  const created = await createSandbox(sessionId);
  if (!created.isOk) return useFallbackRuntime(created.error.message);
  const served = await serveFiles(created.value, wonderWebFiles());
  if (!served.isOk) {
    await killSandbox(created.value);
    return useFallbackRuntime(served.error.message);
  }
  if (!(await waitUntilServing(pageUrl(served.value, "crown-shop")))) {
    logEvent({ level: "WARN", operation: "wonderweb.boot", outcome: "preview not ready in time; continuing" });
  }
  const snapshot = await snapshotSandbox(created.value, "level-start");
  return ok({ handle: created.value, baseUrl: served.value, snapshotId: snapshot.isOk ? snapshot.value : null });
}

/** Spec §9 fallback: serve /wonderweb/* from the main app (needs a publicly reachable URL). */
function useFallbackRuntime(reason: string): Result<LevelRuntime> {
  const fallbackUrl = process.env.WONDERWEB_FALLBACK_URL;
  logEvent({ level: "WARN", operation: "wonderweb.boot", outcome: `sandbox unavailable (${reason})` });
  if (!fallbackUrl) return fail("sandbox-failed", "WonderWeb could not be started.");
  return ok({ handle: null, baseUrl: fallbackUrl, snapshotId: null });
}

/** Boots WonderWeb for the session once; concurrent callers share the same boot. */
export async function ensureRuntime(session: GameSession): Promise<Result<LevelRuntime>> {
  if (session.runtime) return ok(session.runtime);
  session.booting ??= bootRuntime(session.id);
  const result = await session.booting;
  session.booting = null;
  if (result.isOk) session.runtime = result.value;
  return result;
}

/**
 * Rewinds the sandbox to the level-start snapshot, then makes sure the static server is up
 * (a revert may not restore running processes). Falls back silently: the game also restores
 * its own state JSON, so a failed revert never blocks the player.
 */
export async function rewindRuntime(session: GameSession): Promise<Result<true>> {
  const runtime = session.runtime;
  if (!runtime?.handle || !runtime.snapshotId) return ok(true);
  const reverted = await revertSandbox(runtime.handle, runtime.snapshotId);
  if (!reverted.isOk) return reverted;
  const served = await serveFiles(runtime.handle, wonderWebFiles());
  return served.isOk ? ok(true) : served;
}
