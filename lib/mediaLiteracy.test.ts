/**
 * File: lib/mediaLiteracy.test.ts
 * Purpose: Tests for the signpost and news-board rules, and for the maze: every board and the exit
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
  CLUE_COUNT,
  CLUES,
  judgeBoard,
  judgeClue,
  judgeSignpost,
  judgeVerdict,
  MAZE_EXIT_ID,
  PEOPLE,
  personLine,
  REAL_BOARD_IDS,
} from "./mediaLiteracy";
import { MAZE_GRID, mazeLevelData } from "./mazeLayout";

describe("judgeSignpost", () => {
  it("the real shop's signpost is correct and gives the key; the look-alike isn't", () => {
    expect(judgeSignpost("sign-real")?.isCorrect).toBe(true);
    expect(judgeSignpost("sign-fake")?.isCorrect).toBe(false);
  });

  it("ignores anything that is not a signpost", () => {
    expect(judgeSignpost("cheshire-cat")).toBeNull();
    expect(judgeSignpost("")).toBeNull();
  });

  it("the Cat only instructs: it never says which signpost is right", () => {
    expect(CAT_INSTRUCTIONS).toMatch(/press E/i);
    expect(CAT_INSTRUCTIONS).not.toMatch(/left|right|real|queensroyalshop|royal-crowns/i);
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

describe("Clue Room", () => {
  const all = new Set(Object.keys(CLUES));

  it("counts clues and never double-counts a repeat", () => {
    expect(judgeClue("clue-1", new Set())).toMatchObject({ isNew: true, count: 1, isAllFound: false });
    expect(judgeClue("clue-1", new Set(["clue-1"]))).toMatchObject({ isNew: false, count: 1 });
    expect(judgeClue("clue-4", new Set(["clue-1", "clue-2", "clue-3"]))).toMatchObject({ count: CLUE_COUNT, isAllFound: true });
    expect(judgeClue("nope", new Set())).toBeNull();
  });

  it("makes the player investigate before judging", () => {
    expect(judgeVerdict("verdict-fake", 0)?.kind).toBe("early");
    expect(judgeVerdict("verdict-fake", CLUE_COUNT - 1)?.kind).toBe("early");
    expect(judgeVerdict("verdict-real", CLUE_COUNT - 1)?.kind).toBe("early");
  });

  it("FAKE is correct and REAL is wrong once every clue is found", () => {
    expect(judgeVerdict("verdict-fake", all.size)?.kind).toBe("correct");
    expect(judgeVerdict("verdict-real", all.size)?.kind).toBe("wrong");
    expect(judgeVerdict("clue-1", all.size)).toBeNull();
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
