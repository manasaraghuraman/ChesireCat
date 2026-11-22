/**
 * File: game3d/movement.test.ts
 * Purpose: Tests for the fixed-step loop, input mapping and ground/air movement.
 * Date: 2026-11-21
 */
import { describe, expect, it } from "vitest";
import { EXPLORE_MOVEMENT } from "./config";
import { Input, type MoveCommand } from "./input";
import { DT, FixedLoop, MAX_STEPS } from "./loop";
import { Movement } from "./player";

const IDLE: MoveCommand = { x: 0, z: 0, jump: false, hurry: false, interact: false };
const FORWARD: MoveCommand = { ...IDLE, z: -1 };

describe("FixedLoop", () => {
  it("runs whole ticks and returns the leftover fraction", () => {
    const loop = new FixedLoop();
    let steps = 0;
    const alpha = loop.advance(DT * 2.5, () => steps++);
    expect(steps).toBe(2);
    expect(alpha).toBeCloseTo(0.5);
  });

  it("caps work after a stall", () => {
    let steps = 0;
    new FixedLoop().advance(5, () => steps++);
    expect(steps).toBe(MAX_STEPS);
  });
});

describe("Input", () => {
  it("maps W at yaw 0 to -Z and normalises diagonals", () => {
    const input = new Input();
    input.key("KeyW", true);
    expect(input.read()).toMatchObject({ x: 0, z: -1 });
    input.key("KeyD", true);
    const { x, z } = input.read();
    expect(Math.hypot(x, z)).toBeCloseTo(1);
  });

  it("supports arrow keys and Shift to hurry", () => {
    const input = new Input();
    input.key("ArrowUp", true);
    input.key("ShiftLeft", true);
    expect(input.read()).toMatchObject({ z: -1, hurry: true });
  });

  it("makes jump and interact edge-triggered", () => {
    const input = new Input();
    input.key("Space", true);
    input.key("KeyE", true);
    expect(input.read()).toMatchObject({ jump: true, interact: true });
    input.key("Space", true); // auto-repeat while held
    expect(input.read()).toMatchObject({ jump: false, interact: false });
  });

  it("clamps pitch", () => {
    const input = new Input();
    input.look(0, -1e6, 0.01);
    expect(input.pitch).toBeLessThan(Math.PI / 2);
  });
});

describe("Movement", () => {
  function run(movement: Movement, command: MoveCommand, seconds: number, grounded = true) {
    for (let t = 0; t < seconds; t += DT) movement.tick(command, grounded, DT);
  }

  it("reaches walk speed but not more", () => {
    const m = new Movement();
    run(m, FORWARD, 2);
    expect(Math.hypot(m.vx, m.vz)).toBeCloseTo(EXPLORE_MOVEMENT.walkSpeed, 1);
  });

  it("goes faster when hurrying, and slower when speedScale < 1", () => {
    const hurry = new Movement();
    run(hurry, { ...FORWARD, hurry: true }, 2);
    expect(Math.hypot(hurry.vx, hurry.vz)).toBeCloseTo(EXPLORE_MOVEMENT.hurrySpeed, 1);
    const small = new Movement();
    for (let t = 0; t < 2; t += DT) small.tick(FORWARD, true, DT, 0.5);
    expect(Math.hypot(small.vx, small.vz)).toBeCloseTo(EXPLORE_MOVEMENT.walkSpeed * 0.5, 1);
  });

  it("jumps from the ground and within coyote time, not after", () => {
    const m = new Movement();
    m.tick({ ...IDLE, jump: true }, true, DT);
    expect(m.vy).toBe(EXPLORE_MOVEMENT.jumpVelocity);

    const coyote = new Movement();
    coyote.tick(IDLE, true, DT);
    coyote.tick({ ...IDLE, jump: true }, false, DT);
    expect(coyote.vy).toBe(EXPLORE_MOVEMENT.jumpVelocity);

    const late = new Movement();
    late.tick(IDLE, true, DT);
    run(late, IDLE, EXPLORE_MOVEMENT.coyoteTime + 0.05, false);
    late.tick({ ...IDLE, jump: true }, false, DT);
    expect(late.vy).toBeLessThan(0);
  });

  it("buffers a jump pressed just before landing", () => {
    const m = new Movement();
    m.tick({ ...IDLE, jump: true }, false, DT);
    m.tick(IDLE, true, DT);
    expect(m.vy).toBe(EXPLORE_MOVEMENT.jumpVelocity);
  });
});
