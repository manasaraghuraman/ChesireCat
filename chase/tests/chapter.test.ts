import { beforeAll, it, expect } from "vitest";
import R from "@dimforge/rapier3d-compat";
import { parseLevel, type LevelData } from "../src/level/jsonLevel";
import { TrainingWorld } from "../src/physics/world";
import { LevelRun } from "../src/level/run";
import { ringTicks } from "../src/config/ring";
import { DT } from "../src/core/loop";
const levels = import.meta.glob("../public/levels/*.level.json", {
  eager: true,
  import: "default",
});
beforeAll(async () => {
  await R.init();
});

const CELL = 0.25,
  CLEAR = 0.5;
/** A walking grid built only from the level's own collision boxes. */
function walkGrid(level: LevelData) {
  const floors = level.boxes.filter((b) => b.center[1] < 0);
  const walls = level.boxes.filter((b) => {
    const bottom = b.center[1] - b.size[1] / 2,
      top = b.center[1] + b.size[1] / 2;
    return top > 0.05 && bottom < 1.7;
  });
  const x0 = Math.min(...floors.map((b) => b.center[0] - b.size[0] / 2)),
    x1 = Math.max(...floors.map((b) => b.center[0] + b.size[0] / 2)),
    z0 = Math.min(...floors.map((b) => b.center[2] - b.size[2] / 2)),
    z1 = Math.max(...floors.map((b) => b.center[2] + b.size[2] / 2));
  const nx = Math.ceil((x1 - x0) / CELL),
    nz = Math.ceil((z1 - z0) / CELL);
  const at = (i: number, k: number): [number, number] => [
    x0 + (i + 0.5) * CELL,
    z0 + (k + 0.5) * CELL,
  ];
  const open = new Uint8Array(nx * nz);
  for (let i = 0; i < nx; i++)
    for (let k = 0; k < nz; k++) {
      const [x, z] = at(i, k);
      const onFloor = floors.some(
        (b) =>
          Math.abs(x - b.center[0]) <= b.size[0] / 2 &&
          Math.abs(z - b.center[2]) <= b.size[2] / 2,
      );
      const hit = walls.some(
        (b) =>
          Math.abs(x - b.center[0]) <= b.size[0] / 2 + CLEAR &&
          Math.abs(z - b.center[2]) <= b.size[2] / 2 + CLEAR,
      );
      open[i + k * nx] = onFloor && !hit ? 1 : 0;
    }
  const cell = (x: number, z: number) =>
    Math.min(nx - 1, Math.max(0, Math.floor((x - x0) / CELL))) +
    Math.min(nz - 1, Math.max(0, Math.floor((z - z0) / CELL))) * nx;
  /** Shortest path from (x, z) to any open cell within `radius` of the goal. */
  function path(x: number, z: number, gx: number, gz: number, radius: number) {
    const prev = new Int32Array(nx * nz).fill(-2);
    let start = cell(x, z);
    // Knockback can leave the player inside the wall margin; start from the nearest open cell.
    if (!open[start]) {
      let best = -1,
        bestD = Infinity;
      for (let c = 0; c < open.length; c++) {
        if (!open[c]) continue;
        const [cx, cz] = at(c % nx, Math.floor(c / nx));
        const d = Math.hypot(cx - x, cz - z);
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
      start = best;
    }
    prev[start] = -1;
    const queue = [start];
    for (let q = 0; q < queue.length; q++) {
      const c = queue[q],
        i = c % nx,
        k = (c - i) / nx;
      const [cx, cz] = at(i, k);
      if (Math.hypot(cx - gx, cz - gz) <= radius) {
        const out: [number, number][] = [];
        for (let n = c; n >= 0; n = prev[n])
          out.push(at(n % nx, Math.floor(n / nx)));
        return out.reverse();
      }
      for (const [di, dk] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const a = i + di,
          b = k + dk;
        if (a < 0 || b < 0 || a >= nx || b >= nz) continue;
        const n = a + b * nx;
        if (open[n] && prev[n] === -2) {
          prev[n] = c;
          queue.push(n);
        }
      }
    }
    return null;
  }
  return { path };
}

for (const raw of Object.values(levels)) {
  const level = parseLevel(raw);
  it(`finishes ${level.name} by walking to every task it needs`, () => {
    const world = new TrainingWorld(level.boxes, level.spawn),
      run = new LevelRun(level, world),
      grid = walkGrid(level);
    let budget = 120 * 600;
    const step = (x: number, z: number, hold = false) => {
      if (--budget < 0) throw Error("Ran out of time in " + level.name);
      const p = world.body.translation(),
        dx = x - p.x,
        dz = z - p.z,
        length = Math.max(1e-6, Math.hypot(dx, dz));
      const scale = hold ? Math.min(1, length) : 1;
      world.look = { x: dx / length, y: 0, z: dz / length };
      world.tick({
        x: (dx / length) * scale,
        z: (dz / length) * scale,
        jump: false,
        slide: false,
      });
      run.tick({ pressed: hold, held: hold });
    };
    /** Walk until within `radius` of the goal, replanning after knockbacks and launches. */
    function walkTo(gx: number, gz: number, radius: number) {
      for (let attempt = 0; attempt < 40; attempt++) {
        const p = world.body.translation();
        if (Math.hypot(p.x - gx, p.z - gz) <= radius) return;
        const route = grid.path(p.x, p.z, gx, gz, radius);
        if (!route) throw Error(`No route to ${gx},${gz} in ${level.name}`);
        for (let i = 0; i < route.length;) {
          const here = world.body.translation();
          if (Math.hypot(here.x - gx, here.z - gz) <= radius) return;
          const ahead = route[Math.min(route.length - 1, i + 3)];
          step(ahead[0], ahead[1]);
          const now = world.body.translation();
          const gap = (j: number) =>
            Math.hypot(now.x - route[j][0], now.z - route[j][1]);
          // Skip waypoints we cut past on a corner.
          while (i < route.length - 1 && gap(i + 1) <= gap(i)) i++;
          if (gap(i) < 0.45) i++;
          // A soldier or a power-up moved us off the route: plan again.
          else if (gap(i) > 2.5) break;
        }
      }
      throw Error(`Could not reach ${gx},${gz} in ${level.name}`);
    }
    try {
      for (let round = 0; !run.exitOpen; round++) {
        expect(round).toBeLessThan(80);
        const p = world.body.translation();
        const todo = level.leaks
          .map((l, i) => ({ l, i }))
          .filter(({ i }) => run.progress[i] < ringTicks)
          .sort(
            (a, b) =>
              Math.hypot(a.l.pos[0] - p.x, a.l.pos[2] - p.z) -
              Math.hypot(b.l.pos[0] - p.x, b.l.pos[2] - p.z),
          );
        const { l, i } = todo[0];
        const big = l.kind === "big";
        walkTo(l.pos[0], l.pos[2], big ? 1 : 0.55);
        for (let t = 0; t < 720 && run.progress[i] < ringTicks; t++)
          step(l.pos[0], l.pos[2], true);
      }
      walkTo(level.exit[0], level.exit[2], 0.4);
      for (let t = 0; t < 120 && !run.finished; t++)
        step(level.exit[0], level.exit[2]);
      expect(run.finished).toBe(true);
      expect(run.hazards.pranks).toBeLessThanOrEqual(level.rabbitMischief);
      if (run.challenge)
        expect(run.footprintPoints).toBeLessThanOrEqual(run.challenge.target);
      console.info(
        `${level.name}: finished in ${(run.ticks * DT).toFixed(1)} s with ` +
          `${run.hazards.pranks} Rabbit prank(s), ${run.progress.filter((v) => v === ringTicks).length}/${level.leaks.length} tasks done`,
      );
    } finally {
      world.world.free();
    }
  });
}
