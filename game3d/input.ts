/**
 * File: game3d/input.ts
 * Purpose: Keyboard/mouse state captured once per simulation tick: WASD + arrows, Space jump,
 *          Shift hurry, E interact, mouse look with pitch clamp. DOM wiring lives in world.ts.
 *          Adapted from carbon-footprint game src/player/input.ts (slide key removed).
 * Date: 2026-11-21
 */
import { BODY } from "./config";

export interface MoveCommand {
  /** World-space unit move direction on the ground plane (zero when idle). */
  readonly x: number;
  readonly z: number;
  readonly jump: boolean;
  readonly hurry: boolean;
  readonly interact: boolean;
}

const FORWARD_KEYS = ["KeyW", "ArrowUp"];
const BACK_KEYS = ["KeyS", "ArrowDown"];
const LEFT_KEYS = ["KeyA", "ArrowLeft"];
const RIGHT_KEYS = ["KeyD", "ArrowRight"];
const HURRY_KEYS = ["ShiftLeft", "ShiftRight"];

/** Keys the world consumes, so the page doesn't scroll on Space or arrows. */
export const CAPTURED_KEYS = new Set([
  ...FORWARD_KEYS,
  ...BACK_KEYS,
  ...LEFT_KEYS,
  ...RIGHT_KEYS,
  "Space",
  "KeyE",
]);

export class Input {
  yaw = 0;
  pitch = 0;
  private readonly keys = new Set<string>();
  private jumpPressed = false;
  private interactPressed = false;

  clear(): void {
    this.keys.clear();
    this.jumpPressed = false;
    this.interactPressed = false;
  }

  key(code: string, down: boolean): void {
    if (!down) {
      this.keys.delete(code);
      return;
    }
    if (this.keys.has(code)) return; // ignore auto-repeat for edge-triggered actions
    this.keys.add(code);
    if (code === "Space") this.jumpPressed = true;
    if (code === "KeyE") this.interactPressed = true;
  }

  look(dx: number, dy: number, sensitivity: number, invertY = false): void {
    this.yaw -= dx * sensitivity;
    const pitch = this.pitch - (invertY ? -dy : dy) * sensitivity;
    this.pitch = Math.max(-BODY.pitchLimit, Math.min(BODY.pitchLimit, pitch));
  }

  /** Reads the yaw-relative move vector and consumes edge-triggered presses. */
  read(): MoveCommand {
    const any = (codes: readonly string[]) => codes.some((c) => this.keys.has(c));
    const right = Number(any(RIGHT_KEYS)) - Number(any(LEFT_KEYS));
    const forward = Number(any(FORWARD_KEYS)) - Number(any(BACK_KEYS));
    const length = Math.hypot(right, forward) || 1;
    const sin = Math.sin(this.yaw);
    const cos = Math.cos(this.yaw);
    const command: MoveCommand = {
      x: (right * cos - forward * sin) / length,
      z: (-right * sin - forward * cos) / length,
      jump: this.jumpPressed,
      hurry: any(HURRY_KEYS),
      interact: this.interactPressed,
    };
    this.jumpPressed = false;
    this.interactPressed = false;
    return command;
  }
}
