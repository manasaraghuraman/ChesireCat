/**
 * File: game3d/zones/fall.ts
 * Purpose: SCENE_FALL — the tutorial fall. The "I'm late! Click NOW!" pop-up is a React overlay;
 *          clicking it emits "fall-start" and the camera drops down a long shaft past shelves, jars,
 *          clocks and a DRINK ME bottle (~3 s; a near-instant cut under reduced motion), then lands
 *          in the Hall. Look around, but no walking.
 * Date: 2026-11-21
 */
import * as THREE from "three";
import { SCENE_FALL, SCENE_HALL } from "../../lib/constants";
import { useGameStore } from "../../lib/state/store";
import { on } from "../../game/bridge";
import { label } from "../labels";
import { flatMaterial } from "../scenery";
import type { Zone, ZoneContext } from "./types";

const SHAFT_RADIUS = 3.2;
const SHAFT_HEIGHT = 70;
const START_Y = 64;
const END_Y = 3;
const FALL_SECONDS = 3;
const PROP_COUNT = 28;

/** Deterministic pseudo-random so the shaft looks the same every time. */
function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function buildShaft(root: THREE.Group): THREE.Object3D[] {
  const wall = new THREE.Mesh(
    new THREE.CylinderGeometry(SHAFT_RADIUS, SHAFT_RADIUS, SHAFT_HEIGHT, 24, 1, true),
    flatMaterial(0x4a3326, { side: THREE.BackSide }),
  );
  wall.position.y = SHAFT_HEIGHT / 2;
  root.add(wall);

  const random = seeded(7);
  const shelf = flatMaterial(0x8a5a35);
  const jar = flatMaterial(0xe0a96d, { transparent: true, opacity: 0.8 });
  const clockFace = flatMaterial(0xf5ecd7);
  const spinners: THREE.Object3D[] = [];
  for (let i = 0; i < PROP_COUNT; i++) {
    const angle = random() * Math.PI * 2;
    const y = 6 + (i / PROP_COUNT) * (START_Y - 6);
    const r = SHAFT_RADIUS - 0.35;
    const group = new THREE.Group();
    group.position.set(Math.cos(angle) * r, y, Math.sin(angle) * r);
    group.lookAt(0, y, 0);
    const kind = i % 3;
    if (kind === 0) {
      group.add(new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.4), shelf));
      const j = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.3, 10), jar);
      j.position.y = 0.19;
      group.add(j);
    } else if (kind === 1) {
      const face = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.06, 20), clockFace);
      face.rotation.x = Math.PI / 2;
      group.add(face);
      spinners.push(face);
    } else {
      const map = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.04), flatMaterial(0xc9b27a));
      group.add(map);
    }
    root.add(group);
  }

  // The floating DRINK ME bottle, about halfway down.
  const bottle = new THREE.Group();
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.5, 12), flatMaterial(0x7fc8f8, { transparent: true, opacity: 0.85 }));
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.2, 10), flatMaterial(0x7fc8f8));
  neck.position.y = 0.35;
  bottle.add(glass, neck);
  const tag = label("DRINK ME", { background: "#f5ecd7", color: "#7a1f1f" });
  tag.scale.multiplyScalar(0.35);
  tag.position.y = -0.05;
  tag.position.z = 0.25;
  bottle.add(tag);
  bottle.position.set(1.2, START_Y * 0.55, -1.4);
  root.add(bottle);
  spinners.push(bottle);
  return spinners;
}

export function createFallZone(): Zone {
  const offs: Array<() => void> = [];
  let spinners: THREE.Object3D[] = [];
  let falling = false;
  let t = 0;

  return {
    id: SCENE_FALL,
    levelId: null,
    enter(ctx: ZoneContext) {
      useGameStore.getState().goToLevel("fall");
      ctx.scene.background = new THREE.Color(0x120b1c);
      ctx.scene.fog = new THREE.Fog(0x120b1c, 4, 26);
      ctx.root.add(new THREE.HemisphereLight(0xffe6c0, 0x2a1a10, 1.6));
      const lamp = new THREE.PointLight(0xffd9a0, 30, 18);
      ctx.root.add(lamp);
      spinners = buildShaft(ctx.root);

      ctx.setCinematic((camera, dt) => {
        if (falling) t += dt;
        const progress = Math.min(1, t / FALL_SECONDS);
        const eased = progress * progress; // accelerate like a real fall
        camera.position.set(0, START_Y - (START_Y - END_Y) * eased, 0);
        lamp.position.set(0, camera.position.y - 2, 0);
        if (falling && progress >= 1) {
          falling = false;
          ctx.goTo(SCENE_HALL);
        }
      });

      offs.push(
        on("fall-start", () => {
          if (falling) return;
          if (ctx.reducedMotion) {
            ctx.goTo(SCENE_HALL);
            return;
          }
          falling = true;
          t = 0;
        }),
      );
    },
    update(dt) {
      for (const s of spinners) s.rotation.z += dt * 0.8;
    },
    exit() {
      offs.splice(0).forEach((off) => off());
      spinners = [];
      falling = false;
    },
  };
}
