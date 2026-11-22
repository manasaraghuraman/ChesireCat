import { CatmullRomCurve3, CurvePath, LineCurve3, Vector3 } from "three";
import type { LevelData, Point } from "../level/jsonLevel";
import type { TrainingWorld } from "../physics/world";
import { DT } from "../core/loop";
import { HAZARDS as h } from "../config/hazards";
import rules from "../config/leaks.json";
import { ringTicks } from "../config/ring";
const vector = (p: Point) => new Vector3(...p);
function actor() {
  return { pos: new Vector3(), previous: new Vector3(), yaw: 0 };
}

/** Sample authored routes from simulation time; contact history lasts one attempt. */
export class Hazards {
  private readonly spline;
  readonly rabbit = actor();
  arrived = false;
  readonly soldiers;
  inSmog = false;
  /** The Rabbit's current prank: which task, when it started, and whether it has flipped yet. */
  prank: { leak: number; start: number; relit: boolean } | null = null;
  pranks = 0;
  private nextPrank = 0;
  private arrivedAt = -1;
  constructor(readonly level: LevelData) {
    this.spline = level.rabbitPath.length
      ? new CatmullRomCurve3(level.rabbitPath.map(vector))
      : null;
    this.soldiers = level.soldiers.map((s) => {
      const path = new CurvePath<Vector3>();
      for (let i = 1; i < s.path.length; i++)
        path.add(new LineCurve3(vector(s.path[i - 1]), vector(s.path[i])));
      return { ...actor(), path, speed: s.speed, touching: false };
    });
    this.reset();
  }
  private sample(seconds: number) {
    if (this.spline) {
      const u = Math.min(
        1,
        (seconds * h.rabbitSpeed) / this.spline.getLength(),
      );
      this.spline.getPointAt(u, this.rabbit.pos);
      this.arrived = u === 1;
      const dir = this.spline.getTangentAt(u);
      this.rabbit.yaw = Math.atan2(dir.x, dir.z);
    }
    for (const s of this.soldiers) {
      const length = s.path.getLength(),
        distance = (seconds * s.speed) % (2 * length),
        out = distance < length;
      const u = (out ? distance : 2 * length - distance) / length;
      s.pos.copy(s.path.getPoint(u));
      const dir = s.path.getTangent(u);
      s.yaw = Math.atan2(dir.x, dir.z) + (out ? 0 : Math.PI);
    }
  }
  reset() {
    this.prank = null;
    this.pranks = 0;
    this.nextPrank = 0;
    this.arrivedAt = -1;
    this.sample(0);
    this.rabbit.previous.copy(this.rabbit.pos);
    for (const s of this.soldiers) {
      s.previous.copy(s.pos);
      s.touching = false;
    }
    this.inSmog = false;
  }
  /**
   * After reaching the hole the Rabbit periodically pops over to the task the
   * player finished longest ago and switches it back on. Choices depend only on
   * simulation state, so runs stay deterministic.
   */
  private mischief(
    seconds: number,
    p: { x: number; z: number },
    progress: number[],
    splits: readonly number[],
    allowed: boolean,
  ) {
    const prank = this.prank;
    if (prank) {
      const age = seconds - prank.start;
      if (!prank.relit && age >= h.mischiefRelightAt) {
        prank.relit = true;
        if (progress[prank.leak] === ringTicks) progress[prank.leak] = 0;
      }
      if (age < h.mischiefVisit) {
        const [x, y, z] = this.level.leaks[prank.leak].pos;
        const away = new Vector3(p.x - x, 0, p.z - z);
        if (away.lengthSq() < 1e-6) away.set(0, 0, 1);
        away.normalize().multiplyScalar(0.85);
        this.rabbit.pos.set(x + away.x, Math.max(0, y - 1), z + away.z);
        this.rabbit.yaw = Math.atan2(-away.x, -away.z);
        return;
      }
      this.prank = null;
      this.rabbit.previous.copy(this.rabbit.pos);
      this.nextPrank = seconds + h.mischiefEvery;
      return;
    }
    if (!this.arrived || this.pranks >= this.level.rabbitMischief || !allowed)
      return;
    if (this.arrivedAt < 0) {
      this.arrivedAt = seconds;
      this.nextPrank = seconds + h.mischiefDelay;
    }
    if (seconds < this.nextPrank) return;
    let pick = -1;
    for (const [i, l] of this.level.leaks.entries()) {
      if (l.kind !== "small" || progress[i] !== ringTicks) continue;
      if (Math.hypot(l.pos[0] - p.x, l.pos[2] - p.z) < h.mischiefClearance)
        continue;
      if (pick < 0 || (splits[i] ?? 0) < (splits[pick] ?? 0)) pick = i;
    }
    if (pick < 0) return;
    this.pranks++;
    this.prank = { leak: pick, start: seconds, relit: false };
    this.mischief(seconds, p, progress, splits, allowed);
    this.rabbit.previous.copy(this.rabbit.pos);
  }
  tick(
    worldTicks: number,
    physics: TrainingWorld,
    progress: number[],
    splits: readonly number[] = [],
    mischiefAllowed = true,
  ) {
    this.rabbit.previous.copy(this.rabbit.pos);
    for (const s of this.soldiers) s.previous.copy(s.pos);
    this.sample(worldTicks * DT);
    const p = physics.body.translation(),
      radius = physics.capsule.radius();
    this.mischief(worldTicks * DT, p, progress, splits, mischiefAllowed);
    for (const s of this.soldiers) {
      for (const [i, l] of this.level.leaks.entries()) {
        if (
          this.level.partitions?.length ||
          this.level.footprintChallenge ||
          l.kind !== "small" ||
          progress[i] !== ringTicks
        )
          continue;
        const [x, y, z] = l.pos;
        const dy = Math.max(s.pos.y - y, 0, y - s.pos.y - h.soldierHeight);
        if (
          Math.hypot(x - s.pos.x, dy, z - s.pos.z) <=
          h.soldierRadius + rules.smallRadius
        )
          progress[i] = 0;
      }
      const dx = p.x - s.pos.x,
        dz = p.z - s.pos.z;
      const touch =
        Math.hypot(dx, dz) <= radius + h.soldierRadius &&
        p.y + physics.height / 2 > s.pos.y &&
        p.y - physics.height / 2 < s.pos.y + h.soldierHeight;
      if (touch && !s.touching) {
        const ring = this.level.leaks.find(
          (l, i) =>
            l.kind === "big" &&
            progress[i] < ringTicks &&
            Math.hypot(p.x - l.pos[0], p.z - l.pos[2]) <= rules.ringRadius &&
            p.y >= l.pos[1] &&
            p.y <= l.pos[1] + rules.ringHeight,
        );
        let x = ring ? p.x - ring.pos[0] : dx,
          z = ring ? p.z - ring.pos[2] : dz;
        if (!Math.hypot(x, z)) {
          x = dx;
          z = dz;
        }
        const len = Math.hypot(x, z);
        physics.knockback(
          len ? x / len : Math.sin(s.yaw),
          len ? z / len : Math.cos(s.yaw),
        );
      }
      s.touching = touch;
    }
    this.inSmog = this.level.smogZones.some(
      ({ pos, size, linkedLeak }) =>
        progress[linkedLeak] < ringTicks &&
        Math.abs(p.x - pos[0]) <= size[0] / 2 &&
        Math.abs(p.y - pos[1]) <= size[1] / 2 &&
        Math.abs(p.z - pos[2]) <= size[2] / 2,
    );
    physics.terrainSpeed = this.inSmog ? h.smogSpeed : 1;
  }
}
