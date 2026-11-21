/**
 * File: lib/solari/sandbox.test.ts
 * Purpose: Tests for sandbox create/serve/snapshot/kill wrappers (SDK mocked).
 * Author: manasa
 * Date: 2026-11-21
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSandbox, killSandbox, revertSandbox, serveFiles, snapshotSandbox } from "./sandbox";

const create = vi.fn();
const sandbox = {
  commands: { run: vi.fn(async () => ({ exitCode: 0 })) },
  files: { write: vi.fn(async () => undefined) },
  previewUrl: vi.fn(async () => ({ url: "https://preview.example" })),
  snapshot: vi.fn(async () => "snap_1"),
  revert: vi.fn(async () => undefined),
  kill: vi.fn(async () => undefined),
};

vi.mock("@solarisdk/sandbox", () => ({
  SandboxClient: class {
    create = create;
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("SOLARI_API_KEY", "slr_live_test");
  vi.stubEnv("SOLARI_SESSION_TTL_SECONDS", "600");
  create.mockResolvedValue(sandbox);
});

const handle = () => ({ sandbox, client: {} }) as never;

describe("createSandbox", () => {
  it("tags the sandbox and sets an idle timeout from the TTL", async () => {
    const result = await createSandbox("game-1");
    expect(result.isOk).toBe(true);
    const options = create.mock.calls[0]?.[0] as { idleTimeoutMs: number; metadata: Record<string, string> };
    expect(options.idleTimeoutMs).toBe(600_000);
    expect(options.metadata).toMatchObject({ app: "rabbit-hole", gameSessionId: "game-1" });
  });

  it("returns a typed failure when creation fails", async () => {
    create.mockRejectedValueOnce(new Error("no capacity"));
    const result = await createSandbox("game-1");
    expect(!result.isOk && result.error.code).toBe("sandbox-failed");
  });
});

describe("serveFiles / snapshot / revert / kill", () => {
  it("writes files and returns the preview URL", async () => {
    const result = await serveFiles(handle(), { "index.html": "<p>hi</p>" });
    expect(result).toEqual({ isOk: true, value: "https://preview.example" });
    expect(sandbox.files.write).toHaveBeenCalledWith("/tmp/site/index.html", "<p>hi</p>");
  });

  it("snapshots and reverts", async () => {
    expect(await snapshotSandbox(handle(), "before-choice")).toEqual({ isOk: true, value: "snap_1" });
    expect((await revertSandbox(handle(), "snap_1")).isOk).toBe(true);
  });

  it("reports failures instead of throwing", async () => {
    sandbox.revert.mockRejectedValueOnce(new Error("not restorable"));
    expect((await revertSandbox(handle(), "snap_1")).isOk).toBe(false);
    sandbox.kill.mockRejectedValueOnce(new Error("gone"));
    const killed = await killSandbox(handle());
    expect(!killed.isOk && killed.error.code).toBe("cleanup-failed");
  });
});
