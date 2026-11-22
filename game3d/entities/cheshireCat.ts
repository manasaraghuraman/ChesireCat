/**
 * File: game3d/entities/cheshireCat.ts
 * Purpose: The Cheshire Cat on its branch: a low-poly body that fades in and out on a loop, and a
 *          grin billboard that never fades (it always faces the camera). Under reduced motion the
 *          fade becomes a slow opacity step. It can reappear on another branch.
 * Date: 2026-11-21
 */
import * as THREE from "three";
import type { Vec3 } from "../level";
import { flatMaterial } from "../scenery";

const FADE_PERIOD = 3.6;
const STEP_PERIOD = 4;
const MIN_OPACITY = 0.08;
const REDUCED_LOW_OPACITY = 0.35;
const HEAD_OFFSET: Vec3 = [0, 0.55, 0.15];

function grinTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#fff8f0";
    ctx.strokeStyle = "#2a0f2e";
    ctx.lineWidth = 6;
    // A wide crescent of teeth.
    ctx.beginPath();
    ctx.moveTo(12, 30);
    ctx.quadraticCurveTo(128, 150, 244, 30);
    ctx.quadraticCurveTo(128, 80, 12, 30);
    ctx.fill();
    ctx.stroke();
    for (let x = 40; x < 230; x += 24) {
      ctx.beginPath();
      ctx.moveTo(x, 40 + Math.sin(((x - 12) / 232) * Math.PI) * 30);
      ctx.lineTo(x, 58 + Math.sin(((x - 12) / 232) * Math.PI) * 36);
      ctx.stroke();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export interface CheshireCat {
  readonly group: THREE.Group;
  /** Where to look when talking to the Cat. */
  head(): Vec3;
  moveTo(pos: Vec3): void;
  update(elapsed: number, reducedMotion: boolean): void;
}

export function createCheshireCat(pos: Vec3): CheshireCat {
  const group = new THREE.Group();
  const bodyMaterials = [
    flatMaterial(0x9b59b6, { transparent: true, flatShading: true }),
    flatMaterial(0xd98fe8, { transparent: true, flatShading: true }),
  ];
  const [purple, pink] = bodyMaterials as [THREE.MeshStandardMaterial, THREE.MeshStandardMaterial];

  const torso = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 8), purple);
  torso.scale.set(1.2, 0.8, 1);
  group.add(torso);
  const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.06, 6, 16), pink);
  stripe.rotation.y = Math.PI / 2;
  group.add(stripe);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 8), purple);
  head.position.set(...HEAD_OFFSET);
  group.add(head);
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.24, 5), pink);
    ear.position.set(side * 0.2, HEAD_OFFSET[1] + 0.32, HEAD_OFFSET[2]);
    ear.rotation.z = -side * 0.3;
    group.add(ear);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), flatMaterial(0xfff36b, { transparent: true, emissive: 0x806f00 }));
    eye.position.set(side * 0.12, HEAD_OFFSET[1] + 0.08, HEAD_OFFSET[2] + 0.3);
    group.add(eye);
    bodyMaterials.push(eye.material as THREE.MeshStandardMaterial);
  }
  const tail = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.06, 6, 12, Math.PI * 1.2), purple);
  tail.position.set(-0.45, 0.1, -0.2);
  tail.rotation.z = Math.PI / 2;
  group.add(tail);

  // The grin: a sprite always facing the camera, never faded, drawn on top.
  const grin = new THREE.Sprite(new THREE.SpriteMaterial({ map: grinTexture(), depthTest: false, transparent: true }));
  grin.scale.set(0.55, 0.28, 1);
  grin.position.set(HEAD_OFFSET[0], HEAD_OFFSET[1] - 0.12, HEAD_OFFSET[2] + 0.36);
  grin.renderOrder = 10;
  group.add(grin);

  group.position.set(...pos);

  const setOpacity = (opacity: number) => {
    for (const m of bodyMaterials) m.opacity = opacity;
  };

  return {
    group,
    head: () => [group.position.x + HEAD_OFFSET[0], group.position.y + HEAD_OFFSET[1], group.position.z + HEAD_OFFSET[2]],
    moveTo(next) {
      group.position.set(...next);
    },
    update(elapsed, reducedMotion) {
      if (reducedMotion) {
        setOpacity(Math.floor(elapsed / STEP_PERIOD) % 2 ? REDUCED_LOW_OPACITY : 1);
        return;
      }
      const wave = 0.5 + 0.5 * Math.cos((elapsed / FADE_PERIOD) * Math.PI * 2);
      setOpacity(MIN_OPACITY + (1 - MIN_OPACITY) * wave);
      group.position.y += Math.sin(elapsed * 1.3) * 0.0008;
    },
  };
}
