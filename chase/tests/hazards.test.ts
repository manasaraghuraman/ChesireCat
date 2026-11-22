import { beforeAll, expect, it } from "vitest";
import R from "@dimforge/rapier3d-compat";
import source from "./fixtures/prototype.level.json";
import { TrainingWorld } from "../src/physics/world";
import { LevelRun } from "../src/level/run";
import { parseLevel, type LevelData } from "../src/level/jsonLevel";
import { ringTicks } from "../src/config/ring";
import { HAZARDS } from "../src/config/hazards";
beforeAll(async () => {
  await R.init();
});
const idle = { x: 0, z: 0, jump: false, slide: false };
function setup(level: LevelData) {
  const world = new TrainingWorld(level.boxes, level.spawn),
    run = new LevelRun(level, world);
  const step = (ticks: number) => {
    for (let i = 0; i < ticks; i++) {
      world.tick(idle);
      run.tick({ held: false, pressed: false });
    }
  };
  return { world, run, step };
}
it("replays identical routes after restart, slows actors at Tea Time, and idles at the exit", () => {
  const { world, run, step } = setup(parseLevel(source));
  try {
    const sample = () => [
      run.hazards.rabbit.pos.toArray(),
      ...run.hazards.soldiers.map((s) => s.pos.toArray()),
    ];
    step(48);
    const early = sample();
    step(72);
    const later = sample();
    expect(later).not.toEqual(early);
    world.reset();
    run.reset();
    step(120);
    expect(sample()).toEqual(later);
    world.reset();
    run.reset();
    world.power.activate("tea_time");
    step(120);
    sample().forEach((p, i) =>
      p.forEach((n, j) => expect(n).toBeCloseTo(early[i][j], 9)),
    );
    expect(run.ticks).toBe(120);
    step(1000);
    expect(run.hazards.arrived).toBe(true);
    expect(run.hazards.rabbit.pos.toArray()).toEqual(run.level.exit);
    step(180);
    expect(run.hazards.rabbit.pos.toArray()).toEqual(run.level.exit);
  } finally {
    world.world.free();
  }
});
it("relights cleared small leaks, reseals the exit and restores linked smog", () => {
  const level = parseLevel(source);
  level.soldiers = [
    {
      path: [
        [0, 0, 6],
        [0, 0, -1],
      ],
      speed: 2,
    },
  ];
  level.smogZones = [{ pos: [0, 1, 11], size: [4, 3, 4], linkedLeak: 0 }];
  const { world, run, step } = setup(level);
  try {
    run.progress.fill(ringTicks);
    expect(run.remaining).toBe(0);
    step(1);
    expect(run.progress[0]).toBe(0);
    expect(run.remaining).toBe(1);
    expect(run.hazards.inSmog).toBe(true);
    expect(world.terrainSpeed).toBe(0.6);
    step(420);
    expect(run.progress[1]).toBe(ringTicks);
    run.progress[0] = ringTicks;
    step(1);
    expect(world.terrainSpeed).toBe(1);
    world.body.setTranslation({ x: 6, y: 1, z: 10 }, true);
    run.progress[0] = 0;
    step(1);
    expect(run.hazards.inSmog).toBe(false);
  } finally {
    world.world.free();
  }
});
it("pushes the player out of the heater ring at six metres per second and preserves partial charge", () => {
  const level = parseLevel(source);
  level.spawn = { x: 0.15, y: 0.92, z: -1 };
  level.soldiers = [
    {
      path: [
        [0, 0, -1],
        [0, 0, 3],
      ],
      speed: 1,
    },
  ];
  const { world, run, step } = setup(level);
  try {
    run.progress[1] = 30;
    step(2);
    expect(world.horizontalSpeed).toBeCloseTo(HAZARDS.knockbackSpeed, 3);
    step(55);
    expect(world.body.translation().x).toBeGreaterThan(2);
    expect(run.activeRing).toBe(-1);
    expect(run.progress[1]).toBe(30);
  } finally {
    world.world.free();
  }
});

it("lets the Rabbit switch back on the task finished longest ago, then return to the hole", () => {
  const level = parseLevel(source);
  level.rabbitMischief = 1;
  level.soldiers = [];
  level.leaks = level.leaks.map((l) => ({
    ...l,
    kind: "small" as const,
    required: true,
  }));
  const { world, run, step } = setup(level);
  try {
    step(1);
    // Two tasks done; a third left open so the exit stays sealed.
    run.progress[0] = ringTicks;
    run.splits[0] = 5;
    run.progress[1] = ringTicks;
    run.splits[1] = 2;
    run.progress[2] = 0;
    // Stand far from both tasks so the Rabbit is willing to prank.
    world.body.setTranslation({ x: 40, y: 1, z: 40 }, true);
    let relit = -1;
    for (let t = 0; t < 120 * 60 && relit < 0; t++) {
      step(1);
      if (run.progress[1] === 0) relit = 1;
      if (run.progress[0] === 0) relit = 0;
    }
    expect(relit).toBe(1);
    expect(run.relit?.index).toBe(1);
    expect(run.splits[1]).toBeUndefined();
    expect(run.hazards.prank).not.toBeNull();
    step(Math.ceil(HAZARDS.mischiefVisit * 120));
    expect(run.hazards.prank).toBeNull();
    expect(run.hazards.rabbit.pos.toArray()).toEqual(run.level.exit);
    // The prank budget is spent, so finished tasks now stay finished.
    run.progress[1] = ringTicks;
    step(120 * 40);
    expect(run.progress[1]).toBe(ringTicks);
    expect(run.hazards.pranks).toBe(1);
    run.reset();
    expect(run.hazards.pranks).toBe(0);
    expect(run.relit).toBeNull();
  } finally {
    world.world.free();
  }
});
