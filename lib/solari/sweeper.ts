/**
 * File: lib/solari/sweeper.ts
 * Purpose: Kills orphaned game sandboxes older than the TTL. Only touches sandboxes tagged
 *          app=rabbit-hole. Browser sessions auto-release at expiresAt and are not swept.
 * Author: manasa
 * Date: 2026-11-21
 */
import { SandboxClient } from "@solarisdk/sandbox";
import { APP_METADATA_KEY, APP_METADATA_VALUE, getSolariConfig, MS_PER_SECOND } from "./config";
import { describeError, fail, ok, type Result } from "./result";
import { CREATED_AT_METADATA_KEY } from "./sandbox";

export interface SweepReport {
  readonly inspected: number;
  readonly killed: number;
}

export function isOrphan(
  metadata: Readonly<Record<string, string>>,
  nowMs: number,
  ttlSeconds: number,
): boolean {
  if (metadata[APP_METADATA_KEY] !== APP_METADATA_VALUE) return false;
  const createdAt = Number(metadata[CREATED_AT_METADATA_KEY]);
  if (!Number.isFinite(createdAt)) return false;
  return nowMs - createdAt > ttlSeconds * MS_PER_SECOND;
}

export async function sweepOrphans(nowMs: number = Date.now()): Promise<Result<SweepReport>> {
  const config = getSolariConfig();
  if (!config.isOk) return config;
  const client = new SandboxClient({ apiKey: config.value.apiKey });
  let inspected = 0;
  let killed = 0;
  try {
    for await (const view of client.listAll({ state: "running" })) {
      inspected += 1;
      if (!isOrphan(view.metadata, nowMs, config.value.ttlSeconds)) continue;
      await client.kill(view.sandboxId);
      killed += 1;
    }
    return ok({ inspected, killed });
  } catch (error) {
    return fail("cleanup-failed", describeError(error));
  }
}
