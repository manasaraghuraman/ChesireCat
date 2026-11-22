import { Hazards } from "../entities/hazards";
import type { PowerId } from "../config/powers";
import R from "@dimforge/rapier3d-compat";
import rules from "../config/leaks.json";
import { footprintActions, footprintChallenge } from "../config/footprint";
import { DT } from "../core/loop";
import type { LevelData } from "./jsonLevel";
import type { TrainingWorld } from "../physics/world";
import { ringTicks } from "../config/ring";
/** Track one attempt against persistent sensors. Only simulation ticks change the score. */
export class LevelRun {
  get power() {
    return this.physics.power;
  }
  readonly hazards: Hazards;
  worldTicks = 0;
  ticks = 0;
  finished = false;
  activeRing = -1;
  readonly progress: number[];
  private readonly sensors: R.Collider[];
  readonly usedPowers: PowerId[] = [];
  readonly splits: number[] = [];
  gloveFound = false;
  private readonly glove: R.Collider | null;
  private readonly hole: R.Collider;
  constructor(
    readonly level: LevelData,
    private physics: TrainingWorld,
  ) {
    this.hazards = new Hazards(level);
    this.progress = level.leaks.map(() => 0);
    const sensor = (desc: R.ColliderDesc) =>
      physics.world.createCollider(
        desc
          .setSensor(true)
          .setActiveCollisionTypes(R.ActiveCollisionTypes.ALL),
      );
    this.sensors = level.leaks.map((l) => {
      const [x, y, z] = l.pos;
      return sensor(
        l.kind === "small"
          ? R.ColliderDesc.ball(rules.smallRadius).setTranslation(x, y, z)
          : R.ColliderDesc.cylinder(
              rules.ringHeight / 2,
              rules.ringRadius,
            ).setTranslation(x, y + rules.ringHeight / 2, z),
      );
    });
    this.glove = level.glove
      ? sensor(
          R.ColliderDesc.ball(rules.smallRadius).setTranslation(...level.glove),
        )
      : null;
    const [x, y, z] = level.exit;
    this.hole = sensor(
      R.ColliderDesc.ball(rules.exitRadius).setTranslation(x, y, z),
    );
  }
  reset() {
    this.hazards.reset();
    this.physics.terrainSpeed = 1;
    this.worldTicks = 0;
    this.ticks = 0;
    this.finished = false;
    this.activeRing = -1;
    this.progress.fill(0);
    this.splits.length = 0;
    this.usedPowers.length = 0;
  }
  get hunt() {
    return Boolean(this.level.partitions?.length);
  }
  get required() {
    return this.hunt
      ? this.level.leaks.length
      : this.level.leaks.filter((l) => l.required).length;
  }
  get remaining() {
    return this.level.leaks.filter(
      (l, i) => (this.hunt || l.required) && this.progress[i] < ringTicks,
    ).length;
  }
  get challenge() {
    return this.level.footprintChallenge ? footprintChallenge : null;
  }
  actionAt(index: number) {
    return this.challenge
      ? footprintActions[this.level.leaks[index]?.type]
      : undefined;
  }
  get completedActions() {
    return this.progress.flatMap((value, i) => {
      const action = this.actionAt(i);
      return value === ringTicks && action ? [action] : [];
    });
  }
  get footprintPoints() {
    return (
      footprintChallenge.start -
      this.completedActions.reduce((sum, action) => sum + action.points, 0)
    );
  }
  get pointsToOpen() {
    return Math.max(0, this.footprintPoints - footprintChallenge.target);
  }
  get exitOpen() {
    return this.challenge ? this.pointsToOpen === 0 : this.remaining === 0;
  }
  get cut() {
    if (this.challenge) return 0;
    return this.level.leaks.reduce(
      (sum, l, i) =>
        sum + (!l.required && this.progress[i] === ringTicks ? l.timeCut : 0),
      0,
    );
  }
  get latestCompletion() {
    let index = -1;
    this.splits.forEach((tick, i) => {
      if (index === -1 || tick >= this.splits[index]) index = i;
    });
    if (index === -1 || (this.ticks - this.splits[index]) * DT >= 7)
      return undefined;
    return {
      index,
      type: this.level.leaks[index].type,
      tick: this.splits[index],
    };
  }
  get finalTime() {
    return Math.max(0, this.ticks * DT - this.cut);
  }
  tick(input: { pressed: boolean; held: boolean }) {
    if (this.finished) return;
    this.ticks++;
    this.worldTicks += this.physics.lastWorldScale;
    this.activeRing = -1;
    const player = this.physics.capsule;
    if (
      !this.gloveFound &&
      this.glove &&
      this.physics.world.intersectionPair(player, this.glove)
    )
      this.gloveFound = true;
    for (const [i, sensor] of this.sensors.entries()) {
      if (this.progress[i] === ringTicks) continue;
      const big = this.level.leaks[i].kind === "big";
      if (
        big
          ? sensor.containsPoint(player.translation())
          : this.physics.world.intersectionPair(player, sensor)
      ) {
        this.activeRing = i;
        const leak = this.level.leaks[i];
        if (!this.actionAt(i) && (big || leak.type === "light")) {
          if (input.held) this.progress[i]++;
        } else if (input.pressed) this.progress[i] = ringTicks;
        if (this.progress[i] === ringTicks) {
          this.activeRing = -1;
          this.splits[i] = this.ticks;
          if (big) {
            const settings = rules.big[leak.type as keyof typeof rules.big];
            this.usedPowers.push(settings.powerup as PowerId);
            this.power.activate(settings.powerup as PowerId);
          }
        }
      }
    }
    this.hazards.tick(this.worldTicks, this.physics, this.progress);
    this.finished =
      this.exitOpen && this.physics.world.intersectionPair(player, this.hole);
  }
}
