export const DT = 1 / 120;
export const MAX_STEPS = 8;
/** Retain fractional ticks for rendering and discard backlog after a stall. */
export class FixedLoop {
  private remainder = 0;
  reset() {
    this.remainder = 0;
  }
  advance(seconds: number, step: () => void) {
    this.remainder += Math.min(Math.max(0, seconds), DT * MAX_STEPS);
    const count = Math.min(MAX_STEPS, Math.floor(this.remainder / DT + 1e-10));
    for (let i = 0; i < count; i++) step();
    this.remainder = Math.max(0, this.remainder - count * DT);
    return this.remainder / DT;
  }
}
