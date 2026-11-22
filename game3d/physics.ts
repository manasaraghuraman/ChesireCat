/**
 * File: game3d/physics.ts
 * Purpose: Rapier world with a kinematic capsule player and box colliders built from level data.
 *          The capsule resizes with Alice's size, keeping her feet planted, and only grows where
 *          it fits. Adapted from carbon-footprint game src/physics/world.ts (hazards, power-ups,
 *          knockback, breakables, vents and phaseables removed). Caller must `await RAPIER.init()`.
 * Date: 2026-11-21
 */
import RAPIER from "@dimforge/rapier3d-compat";
import { BODY, EXPLORE_MOVEMENT, SIZE_SCALING } from "./config";
import type { MoveCommand } from "./input";
import type { LevelBox, Vec3 } from "./level";
import { DT } from "./loop";
import { Movement } from "./player";

interface CapsuleSize {
  readonly height: number;
  readonly radius: number;
}

export class PhysicsWorld {
  readonly world = new RAPIER.World({ x: 0, y: -EXPLORE_MOVEMENT.gravity, z: 0 });
  readonly movement = new Movement();
  readonly body: RAPIER.RigidBody;
  private readonly capsule: RAPIER.Collider;
  private readonly controller: RAPIER.KinematicCharacterController;
  private grounded = false;
  private size: CapsuleSize = {
    height: SIZE_SCALING.baseColliderHeight,
    radius: SIZE_SCALING.baseColliderRadius,
  };
  /** A requested size that didn't fit yet (e.g. growing under a low ceiling). */
  private pending: CapsuleSize | null = null;

  constructor(
    boxes: readonly LevelBox[],
    private readonly spawn: Vec3,
  ) {
    this.world.timestep = DT;
    const [x, y, z] = spawn;
    this.body = this.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(x, y, z));
    this.capsule = this.world.createCollider(this.capsuleDesc(this.size), this.body);
    this.controller = this.world.createCharacterController(BODY.skin);
    this.controller.enableSnapToGround(BODY.snapToGround);
    this.controller.setSlideEnabled(true);
    this.controller.enableAutostep(BODY.autostepHeight, BODY.autostepMinWidth, false);

    for (const box of boxes) {
      const half = box.rotY / 2;
      this.world.createCollider(
        RAPIER.ColliderDesc.cuboid(box.size[0] / 2, box.size[1] / 2, box.size[2] / 2)
          .setTranslation(...box.center)
          .setRotation({ x: 0, y: Math.sin(half), z: 0, w: Math.cos(half) }),
      );
    }
    this.reset();
  }

  private capsuleDesc({ height, radius }: CapsuleSize): RAPIER.ColliderDesc {
    return RAPIER.ColliderDesc.capsule(Math.max(0, height / 2 - radius), radius);
  }

  get colliderHeight(): number {
    return this.size.height;
  }

  /** World position of Alice's feet (bottom of the capsule). */
  get feet(): { x: number; y: number; z: number } {
    const p = this.body.translation();
    return { x: p.x, y: p.y - this.size.height / 2, z: p.z };
  }

  /** Requests a new capsule size; applied on the next tick if (and once) it fits. */
  setSize(height: number, radius: number): void {
    const r = Math.min(radius, height / 2);
    this.pending = height === this.size.height && r === this.size.radius ? null : { height, radius: r };
  }

  /** Swaps the capsule, keeping the feet where they are. Returns false if the new shape would overlap geometry. */
  private tryResize(next: CapsuleSize): boolean {
    const p = this.body.translation();
    const center = { x: p.x, y: p.y + (next.height - this.size.height) / 2, z: p.z };
    const shape = new RAPIER.Capsule(Math.max(0, next.height / 2 - next.radius), next.radius);
    const growing = next.height > this.size.height || next.radius > this.size.radius;
    if (
      growing &&
      this.world.intersectionWithShape(
        center,
        this.body.rotation(),
        shape,
        RAPIER.QueryFilterFlags.EXCLUDE_SENSORS,
        undefined,
        this.capsule,
      )
    ) {
      return false;
    }
    this.capsule.setShape(shape);
    this.body.setTranslation(center, true);
    this.body.setNextKinematicTranslation(center);
    this.world.propagateModifiedBodyPositionsToColliders();
    this.size = next;
    return true;
  }

  reset(): void {
    const [x, y, z] = this.spawn;
    const p = { x, y: y + this.size.height / 2, z };
    this.body.setTranslation(p, true);
    this.body.setNextKinematicTranslation(p);
    this.movement.reset();
    this.grounded = false;
    this.world.step();
  }

  /** Applies a pending size now if it fits. Called every tick; also callable right after setSize(). */
  applyPendingSize(): void {
    if (this.pending && this.tryResize(this.pending)) this.pending = null;
  }

  tick(command: MoveCommand, speedScale = 1): void {
    this.applyPendingSize();

    const v = this.movement;
    v.tick(command, this.grounded, DT, speedScale);
    this.controller.computeColliderMovement(
      this.capsule,
      { x: v.vx * DT, y: v.vy * DT, z: v.vz * DT },
      RAPIER.QueryFilterFlags.EXCLUDE_SENSORS,
    );
    const moved = this.controller.computedMovement();
    const p = this.body.translation();
    this.body.setNextKinematicTranslation({ x: p.x + moved.x, y: p.y + moved.y, z: p.z + moved.z });
    this.grounded = this.controller.computedGrounded() && v.vy <= 0;

    // Stop pushing into what we hit: bonk heads on ceilings, kill velocity into walls.
    for (let i = 0; i < this.controller.numComputedCollisions(); i++) {
      const normal = this.controller.computedCollision(i)?.normal1;
      if (!normal) continue;
      if (normal.y < -0.5 && v.vy > 0) v.vy = 0;
      if (Math.abs(normal.y) < 0.1) {
        const into = Math.min(0, v.vx * normal.x + v.vz * normal.z);
        v.vx -= into * normal.x;
        v.vz -= into * normal.z;
      }
    }
    this.world.step();
    if (this.body.translation().y < BODY.fallLimit) this.reset();
  }

  dispose(): void {
    this.world.free();
  }
}
