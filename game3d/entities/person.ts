/**
 * File: game3d/entities/person.ts
 * Purpose: A simple low-poly person (body, head and a name board above) for characters the player can
 *          talk to. Placeholder art; no animation.
 * Date: 2026-11-22
 */
import * as THREE from "three";
import { panel } from "../labels";
import { flatMaterial } from "../scenery";

const BODY_HEIGHT = 1.1;
const HEAD_RADIUS = 0.22;
const SKIN = 0xf0c8a0;
const NAME_WIDTH_METERS = 1.7;

export function createPerson(name: string, color: number, at: readonly [number, number, number]): THREE.Group {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, BODY_HEIGHT, 10), flatMaterial(color));
  body.position.y = BODY_HEIGHT / 2;
  const head = new THREE.Mesh(new THREE.SphereGeometry(HEAD_RADIUS, 12, 10), flatMaterial(SKIN));
  head.position.y = BODY_HEIGHT + HEAD_RADIUS;
  const tag = panel(name, { widthMeters: NAME_WIDTH_METERS, background: "#fff7d6" });
  tag.position.y = BODY_HEIGHT + HEAD_RADIUS * 2 + 0.35;
  group.add(body, head, tag);
  group.position.set(at[0], 0, at[2]);
  return group;
}
