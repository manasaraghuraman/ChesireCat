/**
 * File: game3d/entities/person.ts
 * Purpose: A simple low-poly human (legs, shoes, torso, arms, hands, neck, head, hair, eyes) with a name
 *          board above, for characters the player can talk to. Placeholder art; no animation.
 * Date: 2026-11-22 (updated: full humanoid instead of a cylinder and a ball)
 */
import * as THREE from "three";
import { panel } from "../labels";
import { yawToward } from "../proximity";
import { flatMaterial } from "../scenery";

export interface PersonStyle {
  readonly shirt: number;
  readonly pants: number;
  readonly hair: number;
  readonly skin: number;
}

const SHOE = 0x2b2420;
const EYE = 0x1a1a1a;
const LEG_HEIGHT = 0.8;
const TORSO_HEIGHT = 0.62;
const HEAD_RADIUS = 0.2;
const NAME_WIDTH_METERS = 1.7;

function part<T extends THREE.BufferGeometry>(geometry: T, color: number, x: number, y: number, z = 0): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, flatMaterial(color));
  mesh.position.set(x, y, z);
  return mesh;
}

function limbs(style: PersonStyle): THREE.Mesh[] {
  const shoulderY = LEG_HEIGHT + TORSO_HEIGHT - 0.12;
  return [-1, 1].flatMap((side) => [
    part(new THREE.CylinderGeometry(0.09, 0.08, LEG_HEIGHT, 8), style.pants, side * 0.13, LEG_HEIGHT / 2),
    part(new THREE.BoxGeometry(0.15, 0.08, 0.26), SHOE, side * 0.13, 0.04, 0.05),
    part(new THREE.CylinderGeometry(0.065, 0.055, 0.56, 8), style.shirt, side * 0.34, shoulderY - 0.24),
    part(new THREE.SphereGeometry(0.06, 8, 6), style.skin, side * 0.34, shoulderY - 0.54),
  ]);
}

function head(style: PersonStyle, y: number): THREE.Group {
  const group = new THREE.Group();
  group.position.y = y;
  group.add(part(new THREE.SphereGeometry(HEAD_RADIUS, 14, 12), style.skin, 0, 0));
  // Hair: a cap over the top and back of the head.
  const hair = part(new THREE.SphereGeometry(HEAD_RADIUS * 1.06, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), style.hair, 0, 0.01, -0.01);
  group.add(hair);
  for (const side of [-1, 1]) group.add(part(new THREE.SphereGeometry(0.025, 6, 6), EYE, side * 0.07, 0.03, HEAD_RADIUS * 0.93));
  group.add(part(new THREE.BoxGeometry(0.03, 0.04, 0.04), style.skin, 0, -0.02, HEAD_RADIUS));
  return group;
}

export function createPerson(name: string, style: PersonStyle, at: readonly [number, number, number], faceToward?: readonly [number, number, number]): THREE.Group {
  const group = new THREE.Group();
  const torsoY = LEG_HEIGHT + TORSO_HEIGHT / 2;
  const neckY = LEG_HEIGHT + TORSO_HEIGHT + 0.04;
  const headY = neckY + HEAD_RADIUS + 0.02;
  group.add(
    ...limbs(style),
    part(new THREE.BoxGeometry(0.5, TORSO_HEIGHT, 0.28), style.shirt, 0, torsoY),
    part(new THREE.CylinderGeometry(0.06, 0.07, 0.08, 8), style.skin, 0, neckY),
    head(style, headY),
  );
  const tag = panel(name, { widthMeters: NAME_WIDTH_METERS, background: "#fff7d6" });
  tag.position.y = headY + HEAD_RADIUS + 0.4;
  group.add(tag);
  group.position.set(at[0], 0, at[2]);
  if (faceToward) group.rotation.y = yawToward(at[0], at[2], faceToward[0], faceToward[2]);
  return group;
}
