/**
 * File: lib/solari/sandbox.ts
 * Purpose: Server-only wrapper around @solarisdk/sandbox: create, serve a folder via port
 *          preview, snapshot/revert, and kill. Every sandbox is tagged and has an idle TTL.
 * Author: manasa
 * Date: 2026-11-21
 */
import { SandboxClient, type Sandbox } from "@solarisdk/sandbox";
import { APP_METADATA_KEY, APP_METADATA_VALUE, getSolariConfig, MS_PER_SECOND } from "./config";
import { describeError, fail, ok, type Result } from "./result";

export const CREATED_AT_METADATA_KEY = "createdAtMs";
export const SESSION_METADATA_KEY = "gameSessionId";
const SITE_DIR = "/tmp/site";
const SERVER_PORT = 3000;

export interface SandboxHandle {
  readonly sandbox: Sandbox;
  readonly client: SandboxClient;
}

export async function createSandbox(gameSessionId: string): Promise<Result<SandboxHandle>> {
  const config = getSolariConfig();
  if (!config.isOk) return config;
  const client = new SandboxClient({ apiKey: config.value.apiKey });
  try {
    const sandbox = await client.create({
      template: "base",
      idleTimeoutMs: config.value.ttlSeconds * MS_PER_SECOND,
      metadata: {
        [APP_METADATA_KEY]: APP_METADATA_VALUE,
        [CREATED_AT_METADATA_KEY]: String(Date.now()),
        [SESSION_METADATA_KEY]: gameSessionId,
      },
    });
    return ok({ sandbox, client });
  } catch (error) {
    return fail("sandbox-failed", describeError(error));
  }
}

/** Writes files (path relative to the site dir) and starts a static server; returns the preview URL. */
export async function serveFiles(
  handle: SandboxHandle,
  files: Readonly<Record<string, string>>,
): Promise<Result<string>> {
  const { sandbox } = handle;
  try {
    await sandbox.commands.run("mkdir", { args: ["-p", SITE_DIR] });
    for (const [relativePath, content] of Object.entries(files)) {
      await sandbox.files.write(`${SITE_DIR}/${relativePath}`, content);
    }
    await sandbox.commands.run("sh", {
      args: ["-c", `cd ${SITE_DIR} && nohup python3 -m http.server ${SERVER_PORT} >/dev/null 2>&1 &`],
    });
    return ok((await sandbox.previewUrl(SERVER_PORT)).url);
  } catch (error) {
    return fail("sandbox-failed", describeError(error));
  }
}

export async function snapshotSandbox(handle: SandboxHandle, name: string): Promise<Result<string>> {
  try {
    return ok(await handle.sandbox.snapshot(name));
  } catch (error) {
    return fail("sandbox-failed", describeError(error));
  }
}

export async function revertSandbox(handle: SandboxHandle, snapshotId: string): Promise<Result<true>> {
  try {
    await handle.sandbox.revert(snapshotId);
    return ok(true);
  } catch (error) {
    return fail("sandbox-failed", describeError(error));
  }
}

/** Idempotent. Safe to call from finally blocks. */
export async function killSandbox(handle: SandboxHandle): Promise<Result<true>> {
  try {
    await handle.sandbox.kill();
    return ok(true);
  } catch (error) {
    return fail("cleanup-failed", describeError(error));
  }
}
