import { sampleTicks, type Track } from "./codec";
/** Tick zero, every fourth tick, and the exact finish form the replay timeline. */
export class Recorder {
  private values: number[] = [];
  reset() {
    this.values = [];
  }
  capture(
    tick: number,
    pos: { x: number; y: number; z: number },
    yaw: number,
    pitch: number,
    finished = false,
  ) {
    if (tick % sampleTicks === 0 || finished)
      this.values.push(pos.x, pos.y, pos.z, yaw, pitch);
  }
  finish(ticks: number): Track {
    return { ticks, poses: Float32Array.from(this.values) };
  }
}
