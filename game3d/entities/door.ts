/**
 * File: game3d/entities/door.ts
 * Purpose: A door (frame + panel) whose colour shows its state: locked, open, or earned (gold).
 *          Also used for the tiny garden door. Visual only; colliders come from the level JSON.
 * Date: 2026-11-21
 */
import * as THREE from "three";
import { flatMaterial } from "../scenery";

export type DoorState = "locked" | "open" | "earned";

const STATE_COLORS: Record<DoorState, number> = {
  locked: 0x5a5466,
  open: 0x8b5a2b,
  earned: 0xffc83d,
};
const FRAME_COLOR = 0x2d2238;
const FRAME_THICKNESS = 0.12;

export interface DoorOptions {
  readonly position: readonly [number, number, number];
  /** Rotation about Y so the door's front (+Z) faces into the room. */
  readonly rotY: number;
  readonly width: number;
  readonly height: number;
}

export interface Door {
  readonly group: THREE.Group;
  setState(state: DoorState): void;
}

export function createDoor({ position, rotY, width, height }: DoorOptions): Door {
  const group = new THREE.Group();
  group.position.set(position[0], position[1], position[2]);
  group.rotation.y = rotY;

  const panelMaterial = flatMaterial(STATE_COLORS.locked);
  const panel = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.08), panelMaterial);
  panel.position.y = height / 2;
  group.add(panel);

  const frameMaterial = flatMaterial(FRAME_COLOR);
  const side = new THREE.BoxGeometry(FRAME_THICKNESS, height + FRAME_THICKNESS, 0.16);
  for (const x of [-1, 1]) {
    const post = new THREE.Mesh(side, frameMaterial);
    post.position.set((x * (width + FRAME_THICKNESS)) / 2, (height + FRAME_THICKNESS) / 2, 0);
    group.add(post);
  }
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(width + FRAME_THICKNESS * 2, FRAME_THICKNESS, 0.16), frameMaterial);
  lintel.position.y = height + FRAME_THICKNESS / 2;
  group.add(lintel);

  const knob = new THREE.Mesh(new THREE.SphereGeometry(Math.max(0.03, width * 0.05), 10, 8), flatMaterial(0xe9d38a));
  knob.position.set(width * 0.35, height * 0.48, 0.07);
  group.add(knob);

  return {
    group,
    setState(state) {
      panelMaterial.color.setHex(STATE_COLORS[state]);
      panelMaterial.emissive.setHex(state === "earned" ? 0x6b4a00 : 0x000000);
    },
  };
}
