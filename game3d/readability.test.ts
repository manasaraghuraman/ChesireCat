/**
 * File: game3d/readability.test.ts
 * Purpose: Tests for what makes the news boards readable and collectable: text wrapping, the
 *          walk-up trigger, and that boards sit above eye level in the maze file.
 * Date: 2026-11-22
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { wrapLines } from "./labels";
import { parseLevel } from "./level";
import { yawToward } from "./proximity";
import { boardsNear, PROXIMITY_METERS } from "./zones/maze";

const measure = (line: string) => line.length * 10;

describe("wrapLines", () => {
  it("keeps explicit newlines as separate lines", () => {
    expect(wrapLines("one\ntwo\nthree", 1000, measure)).toEqual(["one", "two", "three"]);
  });

  it("wraps long lines at word boundaries and never loses words", () => {
    const lines = wrapLines("real news names its sources and can be checked", 150, measure);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.every((line) => measure(line) <= 150)).toBe(true);
    expect(lines.join(" ")).toBe("real news names its sources and can be checked");
  });

  it("keeps a single over-long word on its own line instead of looping forever", () => {
    expect(wrapLines("SUPERCALIFRAGILISTIC ok", 50, measure)).toEqual(["SUPERCALIFRAGILISTIC", "ok"]);
  });

  it("handles empty text", () => {
    expect(wrapLines("", 100, measure)).toEqual([""]);
  });
});

describe("maze boards", () => {
  const level = parseLevel(JSON.parse(readFileSync(join(process.cwd(), "public/levels/maze.level.json"), "utf8")));
  const boards = level.interactables.filter((i) => i.id.startsWith("board-"));

  it("fires for a board you stand next to, and not for one a corridor away", () => {
    const first = boards[0];
    if (!first) throw new Error("no boards");
    const [x, , z] = first.pos;
    expect(boardsNear(boards, x, z, PROXIMITY_METERS)).toContain(first.id);
    expect(boardsNear(boards, x + PROXIMITY_METERS + 0.5, z, PROXIMITY_METERS)).not.toContain(first.id);
  });

  it("puts boards above eye height so they don't block the corridor, with a generous reach", () => {
    for (const board of boards) {
      expect(board.pos[1]).toBeGreaterThan(1.8);
      expect(board.radius).toBeGreaterThanOrEqual(1.4);
    }
  });

  it("never treats the exit as a board", () => {
    const exit = level.interactables.find((i) => i.id === "maze-exit");
    expect(exit && boardsNear([exit], exit.pos[0], exit.pos[2], 5)).toEqual([]);
  });

  it("starts the player further than the trigger distance from every board", () => {
    const [sx, , sz] = level.spawn;
    expect(boardsNear(boards, sx, sz, PROXIMITY_METERS)).toEqual([]);
  });
});

describe("yawToward (people face the player)", () => {
  it("is 0 when the target is straight ahead (+z, the way a person faces by default)", () => {
    expect(yawToward(0, 0, 0, 5)).toBeCloseTo(0, 6);
  });

  it("turns a quarter turn for targets to the side and a half turn for behind", () => {
    expect(yawToward(0, 0, 5, 0)).toBeCloseTo(Math.PI / 2, 6);
    expect(yawToward(0, 0, -5, 0)).toBeCloseTo(-Math.PI / 2, 6);
    expect(Math.abs(yawToward(0, 0, 0, -5))).toBeCloseTo(Math.PI, 6);
  });

  it("depends only on direction, not distance or position", () => {
    expect(yawToward(10, 10, 12, 12)).toBeCloseTo(yawToward(0, 0, 100, 100), 6);
  });

  it("does not blow up when the player stands exactly on the person", () => {
    expect(Number.isFinite(yawToward(3, 3, 3, 3))).toBe(true);
  });
});
