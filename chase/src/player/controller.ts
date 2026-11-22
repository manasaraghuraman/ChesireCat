import { MOVEMENT as m } from "../config/movement.config";
export type State = "Grounded" | "Airborne" | "Sliding" | "WallRunning";
export interface Contact {
  ground: boolean;
  wall: { x: number; z: number; id: number } | null;
}
export interface Command {
  x: number;
  z: number;
  jump: boolean;
  slide: boolean;
}

/** Integrate the player's requested velocity from last tick's contacts. */
export class Movement {
  state: State = "Airborne";
  vx = 0;
  vy = 0;
  vz = 0;
  private grace = 0;
  private buffer = 0;
  private sliding = 0;
  private cooldown = 0;
  private wallTime = 0;
  private blockedWall: number | null = null;
  tick(
    cmd: Command,
    { ground, wall }: Contact,
    dt: number,
    speedScale = 1,
    jumpScale = 1,
    airJumps = 0,
  ) {
    let usedAirJump = false;
    this.buffer = cmd.jump ? m.jumpBuffer : Math.max(0, this.buffer - dt);
    this.grace = ground ? m.coyoteTime : Math.max(0, this.grace - dt);
    this.cooldown = Math.max(0, this.cooldown - dt);
    const speed = Math.hypot(this.vx, this.vz);
    if (ground || wall?.id !== this.blockedWall) this.blockedWall = null;
    if (ground) {
      this.wallTime = 0;
      if (cmd.slide && this.cooldown === 0 && this.sliding === 0 && speed > 0) {
        this.vx += (this.vx / speed) * m.slideBoost;
        this.vz += (this.vz / speed) * m.slideBoost;
        this.sliding = m.slideDuration;
        this.cooldown = m.slideDuration + m.slideCooldown;
      }
    } else this.sliding = 0;
    const tangentSpeed = wall
      ? Math.abs(this.vx * wall.z - this.vz * wall.x)
      : 0;
    const running =
      wall &&
      !ground &&
      wall.id !== this.blockedWall &&
      tangentSpeed >= m.wallRunMinSpeed &&
      this.wallTime < m.wallRunMaxTime;
    this.state = ground
      ? this.sliding > 0
        ? "Sliding"
        : "Grounded"
      : running
        ? "WallRunning"
        : "Airborne";
    if (this.state === "Sliding") {
      const factor = Math.max(0, 1 - m.slideFriction * dt);
      this.vx *= factor;
      this.vz *= factor;
      this.sliding = Math.max(0, this.sliding - dt);
    } else {
      if (ground) {
        const friction = Math.max(0, 1 - m.groundFriction * dt);
        this.vx *= friction;
        this.vz *= friction;
      }
      const gain = Math.max(
        0,
        Math.min(
          (ground ? m.groundAccel : m.airAccel) * dt,
          (ground ? m.maxGroundSpeed : m.maxAirSpeed) * speedScale -
            (this.vx * cmd.x + this.vz * cmd.z),
        ),
      );
      this.vx += gain * cmd.x;
      this.vz += gain * cmd.z;
      const s = Math.hypot(this.vx, this.vz);
      if (ground && s > m.maxGroundSpeed * speedScale) {
        this.vx *= (m.maxGroundSpeed * speedScale) / s;
        this.vz *= (m.maxGroundSpeed * speedScale) / s;
      }
    }
    if (running) {
      this.wallTime += dt;
      const normal = this.vx * wall.x + this.vz * wall.z;
      this.vx -= normal * wall.x;
      this.vz -= normal * wall.z;
      if (this.wallTime >= m.wallRunMaxTime) this.blockedWall = wall.id;
    } else this.wallTime = 0;
    this.vy =
      (ground ? 0 : this.vy) -
      m.gravity * (running ? m.wallRunGravityScale : 1) * dt;
    if (
      this.buffer > 0 &&
      (ground || this.grace > 0 || running || airJumps > 0)
    ) {
      usedAirJump = !ground && this.grace <= 0 && !running;
      this.vy = (running ? m.wallJumpUp : m.jumpVelocity) * jumpScale;
      if (running) {
        this.vx += wall.x * m.wallJumpOut;
        this.vz += wall.z * m.wallJumpOut;
        this.blockedWall = wall.id;
      }
      this.buffer = 0;
      this.grace = 0;
      this.sliding = 0;
      this.state = "Airborne";
    }
    return usedAirJump;
  }
}
