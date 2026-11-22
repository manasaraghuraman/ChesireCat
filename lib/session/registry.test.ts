/**
 * File: lib/session/registry.test.ts
 * Purpose: Tests for server sessions: locked sandbox boot (no double sandboxes), fallback hosting,
 *          idle sweep, session cap, rewind and cleanup (Solari sandbox wrapper mocked).
 * Author: manasa
 * Date: 2026-11-21
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../solari/ready", () => ({ waitUntilServing: vi.fn(async () => true) }));
vi.mock("../solari/sandbox", () => ({
  createSandbox: vi.fn(),
  serveFiles: vi.fn(),
  snapshotSandbox: vi.fn(),
  revertSandbox: vi.fn(),
  killSandbox: vi.fn(),
}));

const HANDLE = { sandbox: {}, client: {} } as never;
const ok = <T>(value: T) => ({ isOk: true as const, value });
const failure = { isOk: false as const, error: { code: "sandbox-failed" as const, message: "no capacity" } };

async function load() {
  vi.resetModules();
  delete (globalThis as { __rabbitRegistry?: unknown }).__rabbitRegistry;
  vi.stubEnv("SOLARI_API_KEY", "slr_live_test");
  vi.stubEnv("SOLARI_SESSION_TTL_SECONDS", "600");
  vi.stubEnv("WONDERWEB_FALLBACK_URL", "");
  const registry = await import("./registry");
  const sandbox = vi.mocked(await import("../solari/sandbox"));
  sandbox.createSandbox.mockResolvedValue(ok(HANDLE));
  sandbox.serveFiles.mockResolvedValue(ok("https://preview.example"));
  sandbox.snapshotSandbox.mockResolvedValue(ok("snap_1"));
  sandbox.revertSandbox.mockResolvedValue(ok(true));
  sandbox.killSandbox.mockResolvedValue(ok(true));
  return { registry, sandbox };
}

beforeEach(() => vi.clearAllMocks());

describe("sessions", () => {
  it("creates unguessable ids and looks them up; unknown ids are undefined", async () => {
    const { registry } = await load();
    const id = await registry.createSession();
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect(registry.getSession(id)?.id).toBe(id);
    expect(registry.getSession("nope")).toBeUndefined();
  });

  it("ends a session once and kills its sandbox", async () => {
    const { registry, sandbox } = await load();
    const session = registry.getSession(await registry.createSession())!;
    await registry.ensureRuntime(session);
    expect(await registry.endSession(session.id)).toBe(true);
    expect(await registry.endSession(session.id)).toBe(false);
    expect(sandbox.killSandbox).toHaveBeenCalledOnce();
  });

  it("sweeps sessions idle past the TTL and keeps recent ones", async () => {
    const { registry } = await load();
    const stale = await registry.createSession(0);
    const fresh = await registry.createSession(30_000); // inside the lazy-sweep interval: no sweep yet
    expect(await registry.sweepExpiredSessions(620_000)).toBe(1);
    expect(registry.getSession(stale)).toBeUndefined();
    expect(registry.getSession(fresh, 620_000)).toBeDefined();
  });

  it("sweeps lazily when a new session is created after the sweep interval", async () => {
    const { registry } = await load();
    const stale = await registry.createSession(0);
    await registry.createSession(900_000);
    expect(registry.getSession(stale)).toBeUndefined();
  });

  it("evicts the oldest session when the cap is reached", async () => {
    const { registry } = await load();
    const { MAX_LIVE_SESSIONS } = await import("../constants");
    const first = await registry.createSession(1);
    for (let count = 1; count < MAX_LIVE_SESSIONS; count++) await registry.createSession(2 + count);
    await registry.createSession(1000);
    expect(registry.getSession(first)).toBeUndefined();
  });
});

describe("ensureRuntime", () => {
  it("boots one sandbox even when called concurrently", async () => {
    const { registry, sandbox } = await load();
    const session = registry.getSession(await registry.createSession())!;
    const [first, second] = await Promise.all([registry.ensureRuntime(session), registry.ensureRuntime(session)]);
    expect(first.isOk && second.isOk).toBe(true);
    expect(sandbox.createSandbox).toHaveBeenCalledOnce();
    expect(first.isOk && first.value.snapshotId).toBe("snap_1");
  });

  it("waits for the preview to serve before declaring the level ready, and still boots if it never does", async () => {
    const { registry } = await load();
    const ready = vi.mocked(await import("../solari/ready"));
    ready.waitUntilServing.mockResolvedValueOnce(false);
    const session = registry.getSession(await registry.createSession())!;
    const result = await registry.ensureRuntime(session);
    expect(ready.waitUntilServing).toHaveBeenCalledWith("https://preview.example/crown-shop/");
    expect(result.isOk).toBe(true);
  });

  it("reuses the running sandbox on later calls", async () => {
    const { registry, sandbox } = await load();
    const session = registry.getSession(await registry.createSession())!;
    await registry.ensureRuntime(session);
    await registry.ensureRuntime(session);
    expect(sandbox.createSandbox).toHaveBeenCalledOnce();
  });

  it("fails cleanly with no fallback URL, and kills a half-built sandbox", async () => {
    const { registry, sandbox } = await load();
    sandbox.serveFiles.mockResolvedValue(failure);
    const session = registry.getSession(await registry.createSession())!;
    const result = await registry.ensureRuntime(session);
    expect(result.isOk).toBe(false);
    expect(sandbox.killSandbox).toHaveBeenCalledOnce();
  });

  it("serves from the main app when a fallback URL is configured", async () => {
    const { registry, sandbox } = await load();
    vi.stubEnv("WONDERWEB_FALLBACK_URL", "https://game.example/wonderweb");
    sandbox.createSandbox.mockResolvedValue(failure);
    const session = registry.getSession(await registry.createSession())!;
    const result = await registry.ensureRuntime(session);
    expect(result).toMatchObject({ isOk: true, value: { handle: null, baseUrl: "https://game.example/wonderweb" } });
  });
});

describe("rewindRuntime", () => {
  it("reverts to the snapshot and restarts the static server", async () => {
    const { registry, sandbox } = await load();
    const session = registry.getSession(await registry.createSession())!;
    await registry.ensureRuntime(session);
    sandbox.serveFiles.mockClear();
    expect((await registry.rewindRuntime(session)).isOk).toBe(true);
    expect(sandbox.revertSandbox).toHaveBeenCalledWith(HANDLE, "snap_1");
    expect(sandbox.serveFiles).toHaveBeenCalledOnce();
  });

  it("succeeds trivially when there is nothing to revert", async () => {
    const { registry, sandbox } = await load();
    const session = registry.getSession(await registry.createSession())!;
    expect((await registry.rewindRuntime(session)).isOk).toBe(true);
    expect(sandbox.revertSandbox).not.toHaveBeenCalled();
  });

  it("reports a failed revert so the client can rely on its state JSON", async () => {
    const { registry, sandbox } = await load();
    const session = registry.getSession(await registry.createSession())!;
    await registry.ensureRuntime(session);
    sandbox.revertSandbox.mockResolvedValue(failure);
    expect((await registry.rewindRuntime(session)).isOk).toBe(false);
  });
});
