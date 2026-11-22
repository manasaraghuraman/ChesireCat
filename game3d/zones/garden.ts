import * as THREE from "three";
import { emit, on } from "../../game/bridge";
import { SCENE_GARDEN, SCENE_HALL } from "../../lib/constants";
import { createDoor } from "../entities/door";
import { createWhiteRabbit, type WhiteRabbit } from "../entities/whiteRabbit";
import { flatMaterial } from "../scenery";
import type { Zone } from "./types";

const REVEAL = "The White Rabbit left lights and appliances running all through the cottage. Follow him and cut the energy waste he left behind.";

export function createGardenZone(): Zone {
  const offs: Array<() => void> = [];
  let rabbit: WhiteRabbit | null = null;
  let reduced = false;
  return {
    id: SCENE_GARDEN,
    levelId: "garden",
    enter(ctx) {
      reduced = ctx.reducedMotion;
      ctx.scene.background = new THREE.Color(0xbdd9bc);
      ctx.scene.fog = new THREE.Fog(0xbdd9bc, 15, 35);
      ctx.root.add(new THREE.HemisphereLight(0xffefc8, 0x638861, 2.3));

      const grass = new THREE.Mesh(new THREE.PlaneGeometry(13.9, 19.8), flatMaterial(0x678449));
      grass.rotation.x = -Math.PI / 2;
      grass.position.set(0, 0.012, -5);
      ctx.root.add(grass);
      const path = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 18.8), flatMaterial(0xc2a478));
      path.rotation.x = -Math.PI / 2;
      path.position.set(0, 0.02, -4.9);
      ctx.root.add(path);

      const shrubs = new THREE.IcosahedronGeometry(1, 2);
      const leaves = flatMaterial(0x406d44);
      const flowers = [flatMaterial(0xcc728d), flatMaterial(0xf0d286)];
      for (const side of [-1, 1]) {
        for (let i = 0; i < 9; i++) {
          const z = 3 - i * 2.1;
          const bush = new THREE.Mesh(shrubs, leaves);
          bush.position.set(side * (5.65 + (i % 2) * 0.3), 0.6, z);
          bush.scale.set(1.2, 0.9 + (i % 3) * 0.15, 1.25);
          ctx.root.add(bush);
          const flower = new THREE.Mesh(shrubs, flowers[i % flowers.length]);
          flower.scale.setScalar(0.18);
          flower.position.set(side * (1.65 + (i % 2) * 0.23), 0.23, z);
          ctx.root.add(flower);
        }
      }

      const chaseDoor = createDoor({ position: [0, 0, -11.5], rotY: 0, width: 1.5, height: 2.55 });
      chaseDoor.setState("earned");
      const hallDoor = createDoor({ position: [0, 0, 4.7], rotY: Math.PI, width: 1.25, height: 2.4 });
      hallDoor.setState("open");
      ctx.root.add(chaseDoor.group, hallDoor.group);
      if (ctx.level) ctx.setInteractables(ctx.level.interactables);
      rabbit = createWhiteRabbit([0, 0, -1.5]);
      rabbit.walk([[0.45, 0, -6], [0, 0, -12.25]]);
      ctx.root.add(rabbit.group);

      const toHall = () => ctx.goTo(SCENE_HALL);
      offs.push(
        on("exit-level", toHall),
        on("scene-changed", (scene) => {
          if (scene === SCENE_GARDEN) emit("hint", { text: REVEAL, tone: "info" });
        }),
        on("interact", ({ id }) => {
          if (id === "garden-return") toHall();
          if (id === "carbon-chase-door") emit("chase-open", null);
        }),
      );
    },
    update(dt, elapsed) {
      rabbit?.update(dt, elapsed, reduced);
      if (rabbit && !rabbit.isWalking()) rabbit.group.visible = false;
    },
    exit() {
      rabbit = null;
      offs.splice(0).forEach((off) => off());
    },
  };
}
