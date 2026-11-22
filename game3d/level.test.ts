/**
 * File: game3d/level.test.ts
 * Purpose: Tests for gray-box level JSON validation.
 * Date: 2026-11-21
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseLevel, TAG_COLORS } from "./level";

function validLevel(): Record<string, unknown> {
  return {
    id: "t",
    name: "Test",
    spawn: { pos: [0, 0, 0], yaw: 0 },
    geometry: [{ shape: "box", pos: [0, -0.5, 0], size: [10, 1, 10], tags: ["floor"] }],
    interactables: [{ id: "d", kind: "door", pos: [0, 1, -4], radius: 1, label: "Door", enabled: false }],
    npcs: [{ id: "cheshire", pos: [0, 3, 0], branchPositions: [[1, 3, 1]] }],
  };
}

describe("parseLevel", () => {
  it("parses a valid level and resolves tag colours", () => {
    const level = parseLevel(validLevel());
    expect(level.spawn).toEqual([0, 0, 0]);
    expect(level.boxes[0]?.color).toBe(TAG_COLORS.floor);
    expect(level.boxes[0]?.rotY).toBe(0);
    expect(level.interactables[0]?.enabled).toBe(false);
    expect(level.npcs[0]?.branchPositions).toHaveLength(1);
  });

  it("defaults optional lists to empty", () => {
    const raw = validLevel();
    delete raw.interactables;
    delete raw.npcs;
    const level = parseLevel(raw);
    expect(level.interactables).toEqual([]);
    expect(level.npcs).toEqual([]);
  });

  it.each([
    ["non-object", null],
    ["missing geometry", { ...validLevel(), geometry: [] }],
    ["bad spawn", { ...validLevel(), spawn: { pos: [0, 0], yaw: 0 } }],
    ["non-finite yaw", { ...validLevel(), spawn: { pos: [0, 0, 0], yaw: Number.NaN } }],
    ["non-box shape", { ...validLevel(), geometry: [{ shape: "sphere", pos: [0, 0, 0], size: [1, 1, 1], tags: ["floor"] }] }],
    ["zero size", { ...validLevel(), geometry: [{ shape: "box", pos: [0, 0, 0], size: [1, 0, 1], tags: ["floor"] }] }],
    ["unknown tag", { ...validLevel(), geometry: [{ shape: "box", pos: [0, 0, 0], size: [1, 1, 1], tags: ["lava"] }] }],
    ["unknown kind", { ...validLevel(), interactables: [{ id: "x", kind: "bomb", pos: [0, 0, 0], radius: 1, label: "X", enabled: true }] }],
    ["missing enabled", { ...validLevel(), interactables: [{ id: "x", kind: "sign", pos: [0, 0, 0], radius: 1, label: "X" }] }],
    [
      "duplicate ids",
      {
        ...validLevel(),
        interactables: [
          { id: "x", kind: "sign", pos: [0, 0, 0], radius: 1, label: "X", enabled: true },
          { id: "x", kind: "door", pos: [1, 0, 0], radius: 1, label: "Y", enabled: true },
        ],
      },
    ],
  ])("rejects %s", (_name, raw) => {
    expect(() => parseLevel(raw)).toThrow();
  });

  it("accepts the shipped Hall of Doors", () => {
    const raw: unknown = JSON.parse(readFileSync(join(process.cwd(), "public/levels/hall.level.json"), "utf8"));
    expect(parseLevel(raw).id).toBe("hall");
  });
});
