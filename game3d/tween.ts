/**
 * File: game3d/tween.ts
 * Purpose: A tiny smoothstep tween: the full change from `value` to `target` takes `seconds`.
 * Date: 2026-11-21
 */
export class Tween {
  private from: number;
  private elapsed = 0;
  private seconds = 0;
  target: number;

  constructor(public value: number) {
    this.from = value;
    this.target = value;
  }

  to(target: number, seconds: number): void {
    this.from = this.value;
    this.target = target;
    this.seconds = seconds;
    this.elapsed = 0;
    if (seconds <= 0) this.value = target;
  }

  update(dt: number): number {
    if (this.value === this.target) return this.value;
    this.elapsed += dt;
    const t = Math.min(1, this.elapsed / this.seconds);
    this.value = this.from + (this.target - this.from) * (t * t * (3 - 2 * t));
    if (t >= 1) this.value = this.target;
    return this.value;
  }
}
