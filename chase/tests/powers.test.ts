import { beforeAll, it, expect } from "vitest";
import R from "@dimforge/rapier3d-compat";
import source from "../public/levels/power_lab.level.json";
import { parseLevel } from "../src/level/jsonLevel";
import { TrainingWorld } from "../src/physics/world";
import { LevelRun } from "../src/level/run";
import { ringTicks } from "../src/config/ring";
import { DT } from "../src/core/loop";
import { Input } from "../src/player/input";
beforeAll(async () => {
  await R.init();
});
const lab = parseLevel(source),
  idle = { x: 0, z: 0, jump: false, slide: false };
function fixture() {
  const world = new TrainingWorld(lab.boxes, lab.spawn),
    run = new LevelRun(lab, world);
  function place(z: number, x = 0, y = world.height / 2 + 0.02) {
    world.body.setTranslation({ x, y, z }, true);
    world.body.setNextKinematicTranslation({ x, y, z });
  }
  function step(n: number, move = idle, held = false) {
    for (let i = 0; i < n; i++) {
      world.tick(move);
      run.tick({ held, pressed: held && i === 0 });
    }
  }
  return { world, run, place, step };
}
it("shrinks at the heater and only regrows after leaving the low tunnel", () => {
  const { world, place, step } = fixture();
  try {
    place(7);
    step(ringTicks, idle, true);
    expect(world.power.id).toBe("drink_me");
    expect(world.height).toBe(0.6);
    place(1);
    step(480);
    expect(world.power.id).toBeUndefined();
    expect(world.small).toBe(true);
    step(100, { ...idle, z: -1 });
    expect(world.body.translation().z).toBeLessThan(-2);
    expect(world.small).toBe(false);
    expect(world.body.translation().y).toBeGreaterThan(0.88);
  } finally {
    world.world.free();
  }
});
it("replaces timed effects, breaks only with Eat Me and restores the wall on restart", () => {
  const { world, place, step } = fixture();
  try {
    place(-6);
    step(100, { ...idle, z: -1 });
    expect(world.broken.size).toBe(0);
    expect(world.body.translation().z).toBeGreaterThan(-10);
    place(-6);
    world.power.activate("tea_time");
    step(ringTicks, idle, true);
    expect(world.power.id).toBe("eat_me");
    expect(world.height).toBe(1.8);
    step(100, { ...idle, z: -1 });
    expect(world.broken.size).toBe(1);
    expect(world.body.translation().z).toBeLessThan(-11);
    world.reset();
    expect(world.broken.size).toBe(0);
    expect(world.power.id).toBeUndefined();
  } finally {
    world.world.free();
  }
});
it("launches in the look direction and spends exactly three extra midair jumps", () => {
  const { world, place, step } = fixture();
  try {
    place(-15);
    world.look = { x: 1, y: 0, z: 0 };
    step(ringTicks, idle, true);
    expect(world.movement.vx).toBeCloseTo(22);
    expect(world.movement.vy).toBeGreaterThan(3);
    place(-25);
    world.movement.vx = 0;
    step(ringTicks, idle, true);
    expect(world.power.airJumps).toBe(3);
    step(1, { ...idle, jump: true });
    expect(world.power.airJumps).toBe(3);
    for (let i = 2; i >= 0; i--) {
      step(3);
      step(1, { ...idle, jump: true });
      expect(world.power.airJumps).toBe(i);
    }
    expect(world.power.id).toBeUndefined();
  } finally {
    world.world.free();
  }
});
it("slows the world for three seconds without slowing the scored timer", () => {
  const { world, run, place, step } = fixture();
  try {
    place(-34);
    step(ringTicks, idle, true);
    const before = run.worldTicks,
      start = run.ticks;
    step(360);
    expect((run.ticks - start) * DT).toBe(3);
    expect((run.worldTicks - before) * DT).toBeCloseTo(1.2);
    expect(world.power.id).toBeUndefined();
  } finally {
    world.world.free();
  }
});
it("passes through the first phaseable wall and collides on the return trip", () => {
  const { world, place, step } = fixture();
  try {
    place(-42);
    step(ringTicks, idle, true);
    expect(world.power.id).toBe("cheshire");
    step(110, { ...idle, z: -1 });
    expect(world.body.translation().z).toBeLessThan(-48);
    expect(world.power.id).toBeUndefined();
    step(180, { ...idle, z: 1 });
    expect(world.body.translation().z).toBeLessThan(-47);
  } finally {
    world.world.free();
  }
});
it("distinguishes holding E from pressing it, including taps between ticks", () => {
  const input = new Input();
  input.key("KeyE", true);
  expect(input.read()).toMatchObject({ held: true, pressed: true });
  expect(input.read()).toMatchObject({ held: true, pressed: false });
  input.clear();
  expect(input.read().held).toBe(false);
  input.key("KeyE", true);
  input.key("KeyE", false);
  expect(input.read()).toMatchObject({ held: false, pressed: true });
});
