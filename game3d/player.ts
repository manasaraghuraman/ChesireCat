/**
 * File: game3d/player.ts
 * Purpose: Ground/air movement integration with coyote time and jump buffering.
 *          Adapted from carbon-footprint game src/player/controller.ts; wall-running and sliding removed.
 *          Pure (no three/Rapier), so it can be unit-tested.
 * Date: 2026-11-21
 */
import { EXPLORE_MOVEMENT as m } from "./config";
import type { MoveCommand } from "./input";

export type MoveState = "Grounded" | "Airborne";

export class Movement {
  state: MoveState = "Airborne";
  vx = 0;
  vy = 0;
  vz = 0;
  private coyote = 0;
  private buffer = 0;

  reset(): void {
    this.state = "Airborne";
    this.vx = this.vy = this.vz = 0;
    this.coyote = this.buffer = 0;
  }

  /**
   * Integrates one tick from last tick's ground contact.
   * `speedScale` lets Phase 2 slow small Alice down without touching the tuning.
   */
  tick(command: MoveCommand, grounded: boolean, dt: number, speedScale = 1): void {
    this.buffer = command.jump ? m.jumpBuffer : Math.max(0, this.buffer - dt);
    this.coyote = grounded ? m.coyoteTime : Math.max(0, this.coyote - dt);
    this.state = grounded ? "Grounded" : "Airborne";

    if (grounded) {
      const friction = Math.max(0, 1 - m.groundFriction * dt);
      this.vx *= friction;
      this.vz *= friction;
    }

    const maxSpeed = (command.hurry ? m.hurrySpeed : m.walkSpeed) * speedScale;
    const accel = grounded ? m.groundAccel : m.airAccel;
    const along = this.vx * command.x + this.vz * command.z;
    const gain = Math.max(0, Math.min(accel * dt, maxSpeed - along));
    this.vx += gain * command.x;
    this.vz += gain * command.z;

    const speed = Math.hypot(this.vx, this.vz);
    if (grounded && speed > maxSpeed) {
      this.vx *= maxSpeed / speed;
      this.vz *= maxSpeed / speed;
    }

    this.vy = (grounded ? 0 : this.vy) - m.gravity * dt;

    if (this.buffer > 0 && (grounded || this.coyote > 0)) {
      this.vy = m.jumpVelocity;
      this.buffer = 0;
      this.coyote = 0;
      this.state = "Airborne";
    }
  }
}
