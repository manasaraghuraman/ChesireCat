/**
 * File: lib/mazeLayout.ts
 * Purpose: The maze as an ASCII grid and the builder that turns it into a level (walls with colliders,
 *          spawn, news boards, exit). public/levels/maze.level.json is generated from this and a test
 *          checks they match, so the file can't drift. R = real board, F = fake board, P = person to talk to, E = exit.
 * Author: manasa
 * Date: 2026-11-22
 */
export const MAZE_GRID: readonly string[] = [
  "###########",
  "#S#   P   #",
  "# # ##### #",
  "#   #F#   #",
  "##### # ###",
  "#  P P  #R#",
  "# ####### #",
  "#F R F R E#",
  "###########",
];

export const CELL = 3;
const WALL_HEIGHT = 3;
const BOARD_Y = 2.1;
const BOARD_RADIUS = 1.5;
const PERSON_Y = 1.2;
const REAL_IDS = ["board-real-1", "board-real-2", "board-real-3"] as const;
const FAKE_IDS = ["board-fake-1", "board-fake-2", "board-fake-3"] as const;

type Vec3 = [number, number, number];

export function cellCenter(row: number, column: number): { x: number; z: number } {
  return { x: (column - MAZE_GRID[0]!.length / 2 + 0.5) * CELL, z: (row - MAZE_GRID.length / 2 + 0.5) * CELL };
}

function wallBoxes() {
  const boxes: { shape: "box"; pos: Vec3; size: Vec3; tags: string[] }[] = [];
  MAZE_GRID.forEach((line, row) =>
    [...line].forEach((char, column) => {
      if (char !== "#") return;
      const { x, z } = cellCenter(row, column);
      boxes.push({ shape: "box", pos: [x, WALL_HEIGHT / 2, z], size: [CELL, WALL_HEIGHT, CELL], tags: ["wall"] });
    }),
  );
  return boxes;
}

export function mazeLevelData() {
  const interactables: Record<string, unknown>[] = [];
  let spawn: Vec3 = [0, 0, 0];
  let reals = 0;
  let fakes = 0;
  let people = 0;
  MAZE_GRID.forEach((line, row) =>
    [...line].forEach((char, column) => {
      const { x, z } = cellCenter(row, column);
      if (char === "S") spawn = [x, 0, z];
      const id =
        char === "R" ? REAL_IDS[reals++] : char === "F" ? FAKE_IDS[fakes++] : char === "E" ? "maze-exit" : char === "P" ? `person-${++people}` : null;
      if (!id) return;
      const isExit = char === "E";
      const isPerson = char === "P";
      interactables.push({
        id,
        kind: isExit ? "door" : isPerson ? "npc" : "sign",
        pos: [x, isPerson ? PERSON_Y : BOARD_Y, z],
        radius: BOARD_RADIUS,
        label: isExit ? "the maze exit (collect 3 trustworthy sources first)" : isPerson ? "a person to talk to" : "a news board",
        enabled: !isExit,
      });
    }),
  );
  const width = MAZE_GRID[0]!.length * CELL;
  const depth = MAZE_GRID.length * CELL;
  const geometry = [{ shape: "box", pos: [0, -0.5, 0], size: [width + 6, 1, depth + 6], tags: ["floor"] }, ...wallBoxes()];
  return { id: "maze", name: "The News Maze", spawn: { pos: spawn, yaw: 0 }, geometry, interactables, npcs: [] };
}
