/**
 * File: game3d/loop.ts
 * Purpose: Fixed 120 Hz simulation step with an accumulator; returns the render interpolation alpha.
 *          Adapted from carbon-footprint game src/core/loop.ts.
 * Date: 2026-11-21
 */

export const DT = 1 / 120;
export const MAX_STEPS = 8;

/** Keeps fractional ticks for rendering and discards backlog after a stall (tab switch, GC pause). */
export class FixedLoop {
  private remainder = 0;

  reset(): void {
    this.remainder = 0;
  }

  /** Runs `step` zero or more times for `seconds` of elapsed time; returns alpha in [0, 1). */
  advance(seconds: number, step: () => void): number {
    this.remainder += Math.min(Math.max(0, seconds), DT * MAX_STEPS);
    const count = Math.min(MAX_STEPS, Math.floor(this.remainder / DT + 1e-10));
    for (let i = 0; i < count; i++) step();
    this.remainder = Math.max(0, this.remainder - count * DT);
    return this.remainder / DT;
  }
}
