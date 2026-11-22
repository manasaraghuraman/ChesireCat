/**
 * File: lib/carbonContent.test.ts
 * Purpose: Tests for the signpost, tip-board, clue and people rules, and for the maze: every board and the exit
 *          reachable from the start, the level file matching its layout, and ids matching content.
 * Author: manasa
 * Date: 2026-11-22
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseLevel } from "../game3d/level";
import {
  BOARDS,
  CAT_INSTRUCTIONS,
  EVIDENCE,
  judgeBoard,
  judgeEvidence,
  judgeSignpost,
  MAZE_EXIT_ID,
  PEOPLE,
  personLine,
  RED_FLAG_COUNT,
  REAL_BOARD_IDS,
} from "./carbonContent";
import { MAZE_GRID, mazeLevelData } from "./mazeLayout";

describe("judgeSignpost", () => {
  it("the lower-carbon signpost is correct and gives the key; the drive-alone signpost isn't", () => {
    expect(judgeSignpost("sign-real")?.isCorrect).toBe(true);
    expect(judgeSignpost("sign-fake")?.isCorrect).toBe(false);
  });

  it("ignores anything that is not a signpost", () => {
    expect(judgeSignpost("cheshire-cat")).toBeNull();
    expect(judgeSignpost("")).toBeNull();
  });

  it("the Cat only instructs: it never says which signpost is right", () => {
    expect(CAT_INSTRUCTIONS).toMatch(/press E/i);
    expect(CAT_INSTRUCTIONS).not.toMatch(/left|right|walk or cycle|bike|\bcycle\b|drive alone|0 kg/i);
  });
});

describe("judgeBoard", () => {
  it("collects a real source and counts up", () => {
    const first = judgeBoard("board-real-1", new Set());
    expect(first).toMatchObject({ kind: "real", isNew: true, collectedCount: 1, isMazeComplete: false });
  });

  it("does not double-count a source collected twice", () => {
    const again = judgeBoard("board-real-1", new Set(["board-real-1"]));
    expect(again).toMatchObject({ isNew: false, collectedCount: 1 });
  });

  it("completes the maze on the last real source", () => {
    const done = judgeBoard("board-real-3", new Set(["board-real-1", "board-real-2"]));
    expect(done).toMatchObject({ collectedCount: 3, isMazeComplete: true });
  });

  it("a fake board never collects or completes, however many are read", () => {
    const fake = judgeBoard("board-fake-1", new Set(["board-real-1", "board-real-2", "board-real-3"]));
    expect(fake).toMatchObject({ kind: "fake", isNew: false, isMazeComplete: false });
  });

  it("returns null for unknown ids", () => {
    expect(judgeBoard("nope", new Set())).toBeNull();
  });
});

function reachableCells(): Set<string> {
  const start = MAZE_GRID.flatMap((line, row) => [...line].map((char, column) => ({ char, row, column }))).find((c) => c.char === "S");
  if (!start) throw new Error("no start");
  const seen = new Set([`${start.row},${start.column}`]);
  const queue = [[start.row, start.column] as const];
  while (queue.length) {
    const [row, column] = queue.shift()!;
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const key = `${row + dr},${column + dc}`;
      if (MAZE_GRID[row + dr]?.[column + dc] && MAZE_GRID[row + dr]![column + dc] !== "#" && !seen.has(key)) {
        seen.add(key);
        queue.push([row + dr, column + dc]);
      }
    }
  }
  return seen;
}

describe("the maze", () => {
  it("is rectangular and fully walled at the edges (except the exit gap)", () => {
    expect(new Set(MAZE_GRID.map((line) => line.length)).size).toBe(1);
    expect(MAZE_GRID[0]).toMatch(/^#+$/);
    expect(MAZE_GRID.at(-1)).toMatch(/^#+$/);
  });

  it("can be completed: every board and the exit are reachable from the start", () => {
    const seen = reachableCells();
    MAZE_GRID.forEach((line, row) =>
      [...line].forEach((char, column) => {
        if ("RFEP".includes(char)) expect(seen.has(`${row},${column}`), `${char} at ${row},${column}`).toBe(true);
      }),
    );
  });

  it("has exactly 3 real boards, 3 fake boards, 3 people and 1 exit", () => {
    const count = (ch: string) => MAZE_GRID.join("").split(ch).length - 1;
    expect([count("R"), count("F"), count("P"), count("E"), count("S")]).toEqual([3, 3, 3, 1, 1]);
  });

  it("matches the shipped level file exactly (regenerate if this fails)", () => {
    const file = JSON.parse(readFileSync(join(process.cwd(), "public/levels/maze.level.json"), "utf8"));
    expect(file).toEqual(JSON.parse(JSON.stringify(mazeLevelData())));
  });

  it("parses, and its interactables are exactly the content ids plus the exit", () => {
    const level = parseLevel(JSON.parse(readFileSync(join(process.cwd(), "public/levels/maze.level.json"), "utf8")));
    expect(level.interactables.map((i) => i.id).sort()).toEqual([...Object.keys(BOARDS), ...Object.keys(PEOPLE), MAZE_EXIT_ID].sort());
    expect(REAL_BOARD_IDS).toHaveLength(3);
  });
});

describe("Greenwash Check evidence cards", () => {
  const redFlags = Object.keys(EVIDENCE).filter((id) => EVIDENCE[id]?.isRedFlag);
  const decoys = Object.keys(EVIDENCE).filter((id) => !EVIDENCE[id]?.isRedFlag);

  it("mixes exactly three red flags with decoys, so the player has to decide", () => {
    expect(redFlags).toHaveLength(RED_FLAG_COUNT);
    expect(RED_FLAG_COUNT).toBe(3);
    expect(decoys.length).toBeGreaterThanOrEqual(2);
  });

  it("counts red flags up and completes on the last one", () => {
    expect(judgeEvidence(redFlags[0] ?? "", new Set())).toMatchObject({ kind: "red-flag", isNew: true, count: 1, isComplete: false });
    expect(judgeEvidence(redFlags[2] ?? "", new Set([redFlags[0] ?? "", redFlags[1] ?? ""]))).toMatchObject({ count: 3, isComplete: true });
  });

  it("never double-counts a repeated red flag", () => {
    expect(judgeEvidence(redFlags[0] ?? "", new Set([redFlags[0] ?? ""]))).toMatchObject({ isNew: false, count: 1 });
  });

  it("a decoy never counts and never completes, even after every real flag was found", () => {
    const all = new Set(redFlags);
    for (const id of decoys) {
      expect(judgeEvidence(id, all)).toMatchObject({ kind: "not-a-flag", isComplete: false, count: all.size });
      expect(judgeEvidence(id, all)?.message).toMatch(/Not a red flag/);
    }
  });

  it("returns null for unknown cards", () => {
    expect(judgeEvidence("nope", new Set())).toBeNull();
  });
});

describe("people in the maze", () => {
  it("cycles each person's lines and wraps around", () => {
    const first = personLine("person-1", 0);
    expect(first).toContain(PEOPLE["person-1"]?.name);
    expect(personLine("person-1", 1)).not.toBe(first);
    expect(personLine("person-1", PEOPLE["person-1"]?.lines.length ?? 0)).toBe(first);
  });

  it("is safe for unknown people and odd counts", () => {
    expect(personLine("nobody", 0)).toBeNull();
    expect(personLine("person-2", -1)).not.toBeNull();
  });

  it("never gives away which specific board is real", () => {
    for (const person of Object.values(PEOPLE)) {
      for (const line of person.lines) expect(line).not.toMatch(/board-real|board-fake/);
    }
  });
});
