import { beforeAll, expect, it } from "vitest";
import R from "@dimforge/rapier3d-compat";
import challenge from "../public/levels/c1_l1.level.json";
import source from "./fixtures/prototype.level.json";
import { parseLevel } from "../src/level/jsonLevel";
import { LevelRun } from "../src/level/run";
import { ringTicks } from "../src/config/ring";
import { TrainingWorld } from "../src/physics/world";
import { DT } from "../src/core/loop";
beforeAll(async () => {
  await R.init();
});
it("completes the authored level using movement inputs, pauses charge on exit, and restarts in place", () => {
  const level = parseLevel(source),
    world = new TrainingWorld(level.boxes, level.spawn),
    run = new LevelRun(level, world);
  const walk = (ticks: number, x = 0, z = 0, held = true) => {
    for (let i = 0; i < ticks; i++) {
      world.tick({ x, z, jump: false, slide: false });
      run.tick({ held, pressed: held && i === 0 });
    }
  };
  try {
    while (world.body.translation().z > 7.15) walk(1, 0, -1, false);
    walk(100, 0, 0, false);
    expect(run.progress[0]).toBe(0);
    walk(120);
    walk(30, 0, 0, false);
    expect(run.progress[0]).toBe(120);
    walk(ringTicks - 121);
    expect(run.progress[0]).toBe(ringTicks - 1);
    walk(1);
    walk(180, 0, -1);
    expect(run.progress[0]).toBe(ringTicks);
    expect(run.finished).toBe(false);
    expect(run.remaining).toBe(1);
    const partial = run.progress[1];
    expect(partial).toBeGreaterThan(0);
    walk(15);
    expect(run.progress[1]).toBe(partial);
    for (let i = 0; i < 240 && world.body.translation().z < -1.5; i++)
      walk(1, 0, 1);
    walk(ringTicks + 10);
    expect(run.remaining).toBe(0);
    for (let i = 0; i < 250 && !run.finished; i++) walk(1, 0, -1);
    expect(run.finished).toBe(true);
    const ticks = run.ticks;
    walk(20);
    expect(run.ticks).toBe(ticks);
    expect(run.finalTime).toBe(ticks * DT);
    const start = performance.now();
    world.reset();
    run.reset();
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(100);
    expect(run.progress).toEqual([0, 0, 0]);
    expect(run.remaining).toBe(2);
    expect(run.ticks).toBe(0);
    expect(run.finished).toBe(false);
    world.body.setTranslation({ x: 4.5, y: 1.8, z: -3 }, true);
    walk(1);
    expect(run.cut).toBe(0.2);
    expect(run.remaining).toBe(2);
  } finally {
    world.world.free();
  }
});
it("rejects an unknown leak type before spawning", () => {
  const bad = structuredClone(source);
  bad.leaks[0].type = "unknown";
  expect(() => parseLevel(bad)).toThrow("Unknown leak");
});
it("collects the glove on contact without clearing leaks or cutting time", () => {
  const level = parseLevel(source),
    world = new TrainingWorld(level.boxes, level.spawn),
    run = new LevelRun(level, world);
  try {
    const [x, y, z] = level.glove!;
    world.body.setTranslation({ x, y, z }, true);
    world.tick({ x: 0, z: 0, jump: false, slide: false });
    run.tick({ held: false, pressed: false });
    expect(run.gloveFound).toBe(true);
    expect(run.cut).toBe(0);
    expect(run.remaining).toBe(2);
    expect(run.finalTime).toBe(DT);
    run.reset();
    expect(run.gloveFound).toBe(true);
  } finally {
    world.world.free();
  }
});

it("keeps the footprint exit locked below the savings goal and resets the challenge", () => {
  const level = parseLevel(challenge);
  const world = new TrainingWorld(level.boxes, level.spawn);
  const run = new LevelRun(level, world);
  function interactAt([x, , z]: [number, number, number], pressed: boolean) {
    world.body.setTranslation({ x, y: 0.95, z }, true);
    world.tick({ x: 0, z: 0, jump: false, slide: false });
    run.tick({ pressed, held: pressed });
  }
  try {
    expect(run.footprintPoints).toBe(10);
    interactAt(level.leaks[0].pos, false);
    expect(run.actionAt(run.activeRing)?.points).toBe(1);
    interactAt(level.leaks[0].pos, true);
    interactAt(level.leaks[0].pos, true);
    interactAt(level.leaks[1].pos, true);
    interactAt(level.exit, false);
    expect(run.footprintPoints).toBe(8);
    expect(run.pointsToOpen).toBe(5);
    expect(run.finished).toBe(false);
    interactAt(level.leaks[2].pos, true);
    expect(run.footprintPoints).toBe(3);
    expect(run.latestCompletion?.type).toBe("laundry");
    interactAt(level.exit, false);
    expect(run.finished).toBe(true);
    run.reset();
    expect(run.footprintPoints).toBe(10);
    expect(run.completedActions).toEqual([]);
    expect(run.latestCompletion).toBeUndefined();
    expect(run.exitOpen).toBe(false);
  } finally {
    world.world.free();
  }
});

it("blocks movement through the visible exterior cottage wall", () => {
  const level = parseLevel(challenge);
  const world = new TrainingWorld(level.boxes, level.spawn);
  try {
    for (let i = 0; i < 300; i++)
      world.tick({ x: 1, z: 0, jump: false, slide: false });
    const position = world.body.translation();
    expect(position.x).toBeGreaterThan(5);
    expect(position.x).toBeLessThan(6);
    expect(position.y).toBeGreaterThan(0.8);
  } finally {
    world.world.free();
  }
});
