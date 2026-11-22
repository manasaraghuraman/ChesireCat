import { axis, type Pad } from "./gamepad";
import { DT } from "../core/loop";
import { MOVEMENT } from "../config/movement.config";
/** Capture edge-triggered actions once per simulation tick. */
export class Input {
  yaw = 0;
  pitch = 0;
  private keys = new Set<string>();
  private interactPressed = false;
  private jump = false;
  private slide = false;
  clear() {
    this.keys.clear();
    this.interactPressed = false;
    this.jump = false;
    this.slide = false;
  }
  key(code: string, down: boolean) {
    if (!down) {
      this.keys.delete(code);
      return;
    }
    if (this.keys.has(code)) return;
    this.keys.add(code);
    if (code === "KeyE") this.interactPressed = true;
    if (code === "Space") this.jump = true;
    if (/^(Shift|Control)(Left|Right)$/.test(code)) this.slide = true;
  }
  look(x: number, y: number) {
    this.yaw -= x * MOVEMENT.mouseSensitivity;
    this.pitch = Math.max(
      -Math.PI / 2,
      Math.min(Math.PI / 2, this.pitch - y * MOVEMENT.mouseSensitivity),
    );
  }
  read(pad?: Pad, invert = false) {
    const sticks = pad?.current?.axes ?? [];
    this.look(
      axis(sticks[2]) * DT * 1100,
      axis(sticks[3]) * DT * 900 * (invert ? -1 : 1),
    );
    const right =
      axis(sticks[0]) +
      Number(this.keys.has("KeyD")) -
      Number(this.keys.has("KeyA"));
    const forward =
      -axis(sticks[1]) +
      Number(this.keys.has("KeyW")) -
      Number(this.keys.has("KeyS"));
    const len = Math.max(1, Math.hypot(right, forward)),
      s = Math.sin(this.yaw),
      c = Math.cos(this.yaw);
    const cmd = {
      x: (right * c - forward * s) / len,
      z: (-right * s - forward * c) / len,
      pressed: !!pad?.take(2) || this.interactPressed,
      held: !!pad?.held(2) || this.keys.has("KeyE"),
      jump: !!pad?.take(0) || this.jump,
      slide: !!pad?.take(1) || this.slide,
    };
    this.interactPressed = false;
    this.jump = false;
    this.slide = false;
    return cmd;
  }
}
