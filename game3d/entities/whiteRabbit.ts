/**
 * File: game3d/entities/whiteRabbit.ts
 * Purpose: The White Rabbit: a low-poly figure (capsule body, long ears, waistcoat, pocket-watch)
 *          that walks a short scripted path, holds a small in-world screen showing what he browses
 *          in Solari, and shows his current line in a speech-bubble sprite. Visual only.
 * Date: 2026-11-21
 */
import * as THREE from "three";
import { label } from "../labels";
import type { Vec3 } from "../level";
import { flatMaterial } from "../scenery";
import { createScreen, type PageView } from "./screen";

const WALK_SPEED = 1.6;
const BUBBLE_HEIGHT = 2.05;
const MAX_BUBBLE_CHARS = 56;

export interface WhiteRabbit {
  readonly group: THREE.Group;
  /** Head height point, for look-at and the interact target. */
  head(): Vec3;
  walk(path: readonly Vec3[]): void;
  isWalking(): boolean;
  say(text: string | null): void;
  showPage(page: PageView | null): void;
  /** Turn to face a point on the ground plane. */
  face(target: Vec3): void;
  update(dt: number, elapsed: number, reducedMotion: boolean): void;
}

/** The last sentence, shortened to fit a speech bubble. Captions carry the full text. */
export function bubbleText(text: string): string {
  const sentences = text.trim().split(/(?<=[.!?…])\s+/);
  const last = (sentences.at(-1) ?? "").trim();
  return last.length > MAX_BUBBLE_CHARS ? `${last.slice(0, MAX_BUBBLE_CHARS - 1)}…` : last;
}

export function createWhiteRabbit(start: Vec3): WhiteRabbit {
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  const fur = flatMaterial(0xf4f1ea, { flatShading: true });
  const pink = flatMaterial(0xf2a5b5);
  const coat = flatMaterial(0xc8352f, { flatShading: true });
  const gold = flatMaterial(0xe0b84a, { metalness: 0.4, roughness: 0.4 });

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.55, 4, 8), fur);
  torso.position.y = 0.75;
  const waistcoat = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.32, 0.45, 8, 1, true), coat);
  waistcoat.position.y = 0.8;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), fur);
  head.position.y = 1.45;
  body.add(torso, waistcoat, head);
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.45, 3, 6), fur);
    ear.position.set(side * 0.1, 1.85, 0);
    ear.rotation.z = -side * 0.15;
    const inner = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.35, 3, 6), pink);
    inner.position.set(side * 0.1, 1.85, 0.04);
    inner.rotation.z = -side * 0.15;
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 5), flatMaterial(0x2a1020));
    eye.position.set(side * 0.09, 1.5, 0.21);
    body.add(ear, inner, eye);
  }
  const watch = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.03, 16), gold);
  watch.rotation.x = Math.PI / 2;
  watch.position.set(0.3, 0.9, 0.22);
  body.add(watch);

  const screen = createScreen(0.9);
  screen.group.position.set(0, 1.25, 0.55);
  group.add(screen.group);

  let bubble: THREE.Sprite | null = null;
  let path: Vec3[] = [];
  group.position.set(...start);

  const disposeBubble = () => {
    if (!bubble) return;
    group.remove(bubble);
    bubble.material.map?.dispose();
    bubble.material.dispose();
    bubble = null;
  };

  return {
    group,
    head: () => [group.position.x, group.position.y + 1.45, group.position.z],
    walk(next) {
      path = [...next];
    },
    isWalking: () => path.length > 0,
    say(text) {
      disposeBubble();
      const line = text ? bubbleText(text) : "";
      if (!line) return;
      bubble = label(line, { background: "rgba(255,255,255,0.92)", color: "#2a1020" });
      bubble.position.y = BUBBLE_HEIGHT;
      group.add(bubble);
    },
    showPage(page) {
      screen.show(page);
    },
    face(target) {
      group.rotation.y = Math.atan2(target[0] - group.position.x, target[2] - group.position.z);
    },
    update(dt, elapsed, reducedMotion) {
      const next = path[0];
      if (next) {
        const dx = next[0] - group.position.x;
        const dz = next[2] - group.position.z;
        const distance = Math.hypot(dx, dz);
        const step = reducedMotion ? distance : WALK_SPEED * dt;
        if (distance <= step) {
          group.position.set(...next);
          path.shift();
        } else {
          group.position.x += (dx / distance) * step;
          group.position.z += (dz / distance) * step;
          group.rotation.y = Math.atan2(dx, dz);
        }
      }
      if (!reducedMotion) body.position.y = next ? Math.abs(Math.sin(elapsed * 9)) * 0.06 : 0;
    },
  };
}
