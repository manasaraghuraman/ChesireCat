import { beforeAll, it, expect } from "vitest";
import R from "@dimforge/rapier3d-compat";
import { parseLevel } from "../src/level/jsonLevel";
import { TrainingWorld } from "../src/physics/world";
import { LevelRun } from "../src/level/run";
import { ringTicks } from "../src/config/ring";
const levels = import.meta.glob("../public/levels/*.level.json", {
  eager: true,
  import: "default",
});
beforeAll(async () => {
  await R.init();
});
for (const raw of Object.values(levels)) {
  const level = parseLevel(raw);
  const routes = level.footprintChallenge ? ["light", "charger"] : [null];
  it.each(routes)(
    "finishes " + level.name + " using movement and interaction (%s)",
    (smallAction) => {
      const world = new TrainingWorld(level.boxes, level.spawn),
        run = new LevelRun(level, world);
      const move = (x: number, z: number, hold = false) => {
        const p = world.body.translation(),
          dx = x - p.x,
          dz = z - p.z,
          length = Math.max(1, Math.hypot(dx, dz));
        world.tick({
          x: dx / length,
          z: dz / length,
          jump: false,
          slide: false,
        });
        run.tick({ pressed: hold, held: hold });
      };
      function walkTo(x: number, z: number) {
        for (let t = 0; t < 1800; t++) {
          const p = world.body.translation();
          if (Math.hypot(p.x - x, p.z - z) < 0.45) return;
          move(x, z);
        }
        throw Error(
          "Missed waypoint " +
            [x, z] +
            " from " +
            JSON.stringify(world.body.translation()),
        );
      }
      function go(x: number, z: number) {
        const start = world.body.translation();
        const direction = Math.sign(z - start.z);
        const crossings = (level.partitions ?? []).filter(
          (wall) =>
            (wall.z - start.z) * direction > 0 && (z - wall.z) * direction > 0,
        );
        crossings.sort((a, b) => (a.z - b.z) * direction);
        for (const wall of crossings) {
          const current = world.body.translation();
          const door = [...wall.doors].sort(
            (a, b) =>
              Math.abs(current.x - a.x) +
              Math.abs(x - a.x) -
              (Math.abs(current.x - b.x) + Math.abs(x - b.x)),
          )[0];
          walkTo(current.x, wall.z - direction * 1.25);
          walkTo(door.x, wall.z - direction * 1.25);
          walkTo(door.x, wall.z + direction * 1.25);
        }
        walkTo(x, z);
      }
      try {
        const exit = level.exit[2],
          gap = level.id === "c1_l1" ? -1 : exit + 8;
        const hasGap = level.id !== "power_lab";
        let crossed = false;
        function bridge() {
          go(-4, gap + 1.8);
          go(-4, gap - 6.3);
          crossed = true;
        }
        const targets = level.leaks.map((l, i) => ({ l, i }));
        if (smallAction === "charger")
          [targets[0], targets[1]] = [targets[1], targets[0]];
        for (const { l, i } of targets) {
          if (!run.hunt && !l.required) continue;
          if (smallAction && l.type === "laundry") go(-4, gap + 1.8);
          if (smallAction && i !== targets[0].i && l.type !== "laundry") {
            const { x } = world.body.translation();
            go(x, 3.3);
            go(l.pos[0], 3.3);
          }
          if (hasGap && !crossed && l.pos[2] < gap - 5) bridge();
          if (l.type === "dryer")
            world.look = { x: 0, y: 0.34, z: -Math.sqrt(1 - 0.34 ** 2) };
          go(l.pos[0], l.pos[2]);
          for (let t = 0; t < 720 && run.progress[i] < ringTicks; t++)
            move(l.pos[0], l.pos[2], true);
          expect(run.progress[i]).toBe(ringTicks);
          if (l.type === "dryer") {
            for (let t = 0; t < 95; t++) move(0, l.pos[2] - 15);
          }
        }
        if (level.id === "c1_l4") {
          go(3.6, -24.15);
          go(-4, -24.15);
        }
        if (hasGap && !crossed) bridge();
        go(level.exit[0], exit);
        for (let t = 0; t < 60 && !run.finished; t++) move(level.exit[0], exit);
        expect(run.finished).toBe(true);
        if (smallAction) {
          expect(run.footprintPoints).toBe(3);
          expect(run.completedActions).toHaveLength(3);
          expect(run.cut).toBe(0);
        }
      } finally {
        world.world.free();
      }
    },
  );
}
