import { beforeAll, expect, it } from "vitest";
import R from "@dimforge/rapier3d-compat";
import { DT, FixedLoop } from "../src/core/loop";
import { Movement } from "../src/player/controller";
import { TrainingWorld } from "../src/physics/world";
import { MOVEMENT as m } from "../src/config/movement.config";
const idle = { x: 0, z: 0, jump: false, slide: false };
const run = { ...idle, z: -1 };
const ground = { ground: true, wall: null },
  air = { ground: false, wall: null };
it("carries fractional steps, caps stalls and clears paused time", () => {
  const loop = new FixedLoop();
  let ticks = 0;
  const step = () => ticks++;
  expect(loop.advance(DT / 2, step)).toBeCloseTo(0.5);
  loop.advance(DT / 2, step);
  expect(ticks).toBe(1);
  loop.advance(4, step);
  expect(ticks).toBe(9);
  loop.advance(DT / 2, step);
  loop.reset();
  expect(loop.advance(0, step)).toBe(0);
});
it("consumes buffered jumps on landing and coyote jumps once", () => {
  const v = new Movement();
  v.tick({ ...idle, jump: true }, air, DT);
  v.tick(idle, ground, DT);
  expect(v.vy).toBe(m.jumpVelocity);
  v.tick(run, ground, DT);
  v.tick(run, air, DT);
  v.tick({ ...run, jump: true }, air, DT);
  expect(v.vy).toBe(m.jumpVelocity);
  v.tick({ ...run, jump: true }, air, DT);
  expect(v.vy).toBeLessThan(m.jumpVelocity);
});
it("boosts a ground slide once and returns to ground movement", () => {
  const v = new Movement();
  for (let i = 0; i < 60; i++) v.tick(run, ground, DT);
  const speed = -v.vz;
  v.tick({ ...run, slide: true }, ground, DT);
  expect(v.state).toBe("Sliding");
  expect(-v.vz).toBeGreaterThan(speed);
  for (let i = 0; i < 80; i++) v.tick(run, ground, DT);
  expect(v.state).toBe("Grounded");
});
it("limits a continuous wall run and launches a wall jump outward", () => {
  const wall = { ground: false, wall: { id: 1, x: 1, z: 0 } };
  const v = new Movement();
  v.vz = -10;
  v.tick(run, wall, DT);
  expect(v.state).toBe("WallRunning");
  v.tick({ ...run, jump: true }, wall, DT);
  expect(v.state).toBe("Airborne");
  expect(v.vx).toBe(m.wallJumpOut);
  expect(v.vy).toBe(m.wallJumpUp);
  const timed = new Movement();
  timed.vz = -10;
  for (let i = 0; i < 200; i++) timed.tick(run, wall, DT);
  expect(timed.state).toBe("Airborne");
});
beforeAll(async () => {
  await R.init();
});
it("runs, jumps, lands and wall-jumps in the actual Rapier room", () => {
  const world = new TrainingWorld();
  try {
    for (let i = 0; i < 30; i++) world.tick(idle);
    expect(world.movement.state).toBe("Grounded");
    const base = world.body.translation().y;
    world.tick({ ...idle, jump: true });
    for (let i = 0; i < 15; i++) world.tick(idle);
    expect(world.body.translation().y).toBeGreaterThan(base + 0.5);
    for (let i = 0; i < 120; i++) world.tick(idle);
    expect(world.movement.state).toBe("Grounded");
    world.body.setTranslation({ x: -4.33, y: 1, z: 3 }, true);
    for (let i = 0; i < 30; i++) world.tick(run);
    world.tick({ ...run, jump: true });
    world.tick(run);
    expect(world.movement.state).toBe("WallRunning");
    world.tick({ ...run, jump: true });
    expect(world.movement.vx).toBeGreaterThan(6);
    world.reset();
    expect(world.body.translation().z).toBe(11);
  } finally {
    world.world.free();
  }
});
