import { HAZARDS } from "../config/hazards";
import { PowerUps } from "../powerups";
import { powers } from "../config/powers";
import R from "@dimforge/rapier3d-compat";
import { MOVEMENT as m, ROOM } from "../config/movement.config";
import { boxes } from "../level/testRoom";
import { DT } from "../core/loop";
import { Movement, type Command, type Contact } from "../player/controller";

/** A deterministic kinematic capsule and its tagged training geometry. */
export class TrainingWorld {
  readonly world = new R.World({ x: 0, y: -m.gravity, z: 0 });
  readonly body = this.world.createRigidBody(
    R.RigidBodyDesc.kinematicPositionBased().setTranslation(
      ROOM.spawn.x,
      ROOM.spawn.y,
      ROOM.spawn.z,
    ),
  );
  readonly capsule = this.world.createCollider(
    R.ColliderDesc.capsule(m.playerHeight / 2 - m.playerRadius, m.playerRadius),
    this.body,
  );
  private readonly controller = this.world.createCharacterController(ROOM.skin);
  private readonly walls = new Set<number>();
  readonly obstacles = new Map<
    number,
    { box: (typeof boxes)[number]; collider: R.Collider }
  >();
  readonly broken = new Set<(typeof boxes)[number]>();
  private passing: R.Collider | null = null;
  private crossed = false;
  horizontalSpeed = 0;
  terrainSpeed = 1;
  private push = { x: 0, z: 0, ticks: 0 };
  knockback(x: number, z: number) {
    this.push = {
      x: x * HAZARDS.knockbackSpeed,
      z: z * HAZARDS.knockbackSpeed,
      ticks: Math.round(HAZARDS.knockbackSeconds / DT),
    };
  }
  lastWorldScale = 1;
  small = false;
  look = { x: 0, y: 0, z: -1 };
  readonly power = new PowerUps({
    shrink: () => this.resize(true),
    launch: () => {
      this.movement.vx += this.look.x * powers.flamingo.launch;
      this.movement.vz += this.look.z * powers.flamingo.launch;
      this.movement.vy +=
        this.look.y * powers.flamingo.launch + powers.flamingo.lift;
      this.ground = false;
    },
  });
  get height() {
    return this.small ? powers.drink_me.height : m.playerHeight;
  }
  private resize(small: boolean, force = false) {
    if (this.small === small && !force) return;
    const old = this.capsule.halfHeight() * 2 + this.capsule.radius() * 2;
    const height = small ? powers.drink_me.height : m.playerHeight,
      radius = Math.min(height / 2, m.playerRadius);
    const pos = this.body.translation();
    pos.y += (height - old) / 2;
    const shape = new R.Capsule(height / 2 - radius, radius);
    if (
      !small &&
      !force &&
      this.world.intersectionWithShape(
        pos,
        this.body.rotation(),
        shape,
        R.QueryFilterFlags.EXCLUDE_SENSORS,
        undefined,
        this.capsule,
      )
    )
      return;
    this.capsule.setShape(shape);
    this.body.setTranslation(pos, true);
    this.body.setNextKinematicTranslation(pos);
    this.world.propagateModifiedBodyPositionsToColliders();
    this.small = small;
  }
  refreshSize() {
    this.resize(this.small, true);
  }
  private ground = false;
  movement = new Movement();
  constructor(
    geometry = boxes,
    private spawn = ROOM.spawn,
  ) {
    this.world.timestep = DT;
    this.controller.enableSnapToGround(ROOM.groundProbe);
    for (const box of geometry) {
      const [x, y, z] = box.size;
      const angle = (box.tilt ?? 0) / 2;
      const coll = this.world.createCollider(
        R.ColliderDesc.cuboid(x / 2, y / 2, z / 2)
          .setTranslation(...box.center)
          .setRotation({ x: Math.sin(angle), y: 0, z: 0, w: Math.cos(angle) }),
      );
      if (box.obstacle)
        this.obstacles.set(coll.handle, { box, collider: coll });
      if (box.wallrun) this.walls.add(coll.handle);
    }
    this.reset();
  }
  reset() {
    this.horizontalSpeed = 0;
    this.terrainSpeed = 1;
    this.push.ticks = 0;
    this.power.end();
    this.passing = null;
    this.crossed = false;
    this.resize(false, true);
    for (const { collider } of this.obstacles.values())
      collider.setEnabled(true);
    this.broken.clear();
    this.body.setTranslation(this.spawn, true);
    this.body.setNextKinematicTranslation(this.spawn);
    this.movement = new Movement();
    this.ground = false;
    this.world.step();
  }
  private wall(): Contact["wall"] {
    // Both training walls run along Z. Probe sideways even when moving parallel.
    for (const x of [-1, 1]) {
      const hit = this.world.castRayAndGetNormal(
        new R.Ray(this.body.translation(), { x, y: 0, z: 0 }),
        m.playerRadius + ROOM.wallReach,
        true,
        undefined,
        undefined,
        this.capsule,
        undefined,
        (c) => this.walls.has(c.handle),
      );
      if (hit && Math.abs(hit.normal.y) < 0.1)
        return { id: hit.collider.handle, x: hit.normal.x, z: hit.normal.z };
    }
    return null;
  }
  tick(cmd: Command) {
    const v = this.movement;
    this.lastWorldScale = this.power.worldScale;
    const used = v.tick(
      cmd,
      { ground: this.ground, wall: this.wall() },
      DT,
      this.power.speed,
      this.power.jump,
      this.power.airJumps,
    );
    if (used && --this.power.airJumps === 0) this.power.end();
    const pushed = this.push.ticks > 0;
    if (pushed) this.push.ticks--;
    this.controller.computeColliderMovement(
      this.capsule,
      {
        x: (pushed ? this.push.x : v.vx * this.terrainSpeed) * DT,
        y: v.vy * DT,
        z: (pushed ? this.push.z : v.vz * this.terrainSpeed) * DT,
      },
      R.QueryFilterFlags.EXCLUDE_SENSORS,
      undefined,
      (c) =>
        c.handle !== this.passing?.handle &&
        !(this.small && this.obstacles.get(c.handle)?.box.obstacle === "vent"),
    );
    const actual = this.controller.computedMovement(),
      p = this.body.translation();
    this.horizontalSpeed = Math.hypot(actual.x, actual.z) / DT;
    this.body.setNextKinematicTranslation({
      x: p.x + actual.x,
      y: p.y + actual.y,
      z: p.z + actual.z,
    });
    this.ground = this.controller.computedGrounded() && v.vy <= 0;
    for (let i = 0; i < this.controller.numComputedCollisions(); i++) {
      const hit = this.controller.computedCollision(i);
      const obj = hit?.collider && this.obstacles.get(hit.collider.handle);
      if (obj?.box.obstacle === "breakable" && this.power.id === "eat_me") {
        obj.collider.setEnabled(false);
        this.broken.add(obj.box);
        continue;
      }
      if (
        obj?.box.obstacle === "phaseable" &&
        this.power.id === "cheshire" &&
        !this.passing
      ) {
        this.passing = obj.collider;
        this.crossed = false;
        this.power.end();
        continue;
      }
      const normal = hit?.normal1;
      if (!normal) continue;
      if (normal.y < -0.5 && v.vy > 0) v.vy = 0;
      if (Math.abs(normal.y) < 0.1) {
        const into = Math.min(0, v.vx * normal.x + v.vz * normal.z);
        v.vx -= into * normal.x;
        v.vz -= into * normal.z;
      }
    }
    this.world.step();
    if (this.passing) {
      const touching = this.passing.intersectsShape(
        this.capsule.shape,
        this.body.translation(),
        this.body.rotation(),
      );
      if (touching) this.crossed = true;
      else if (
        this.crossed ||
        distanceFromWall(this.passing, this.body.translation()) >
          this.capsule.radius() + ROOM.skin * 3
      )
        this.passing = null;
    }
    this.power.tick();
    if (this.small && this.power.id !== "drink_me") this.resize(false);
  }
}

function distanceFromWall(wall: R.Collider, p: R.Vector) {
  const q = wall.projectPoint(p, true)?.point;
  if (!q) return Infinity;
  return Math.hypot(q.x - p.x, q.y - p.y, q.z - p.z);
}
