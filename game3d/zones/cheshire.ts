/**
 * File: game3d/zones/cheshire.ts
 * Purpose: SCENE_CHESHIRE, the Tulgey Wood. The Cheshire Cat only gives instructions (E on it shows
 *          them). Two signposts: pressing E on the real shop's signpost awards the key; the other says
 *          why it is wrong. The door at the back returns to the Hall of Doors. Rules live in
 *          lib/mediaLiteracy.ts; this zone only stages them.
 * Date: 2026-11-22
 */
import * as THREE from "three";
import { emit, on } from "../../game/bridge";
import { CAT_INSTRUCTIONS, CHESHIRE_LESSON, judgeSignpost, SIGN_TEXT } from "../../lib/mediaLiteracy";
import { SCENE_CHESHIRE, SCENE_HALL } from "../../lib/constants";
import { useGameStore } from "../../lib/state/store";
import { createCheshireCat, type CheshireCat } from "../entities/cheshireCat";
import { createDoor } from "../entities/door";
import { panel } from "../labels";
import type { LevelInteractable, Vec3 } from "../level";
import { flatMaterial } from "../scenery";
import type { Zone, ZoneContext } from "./types";

const CAT_ID = "cheshire-cat";
const EXIT_ID = "exit-hall";
const DUSK = 0x3b2a55;
const DEFAULT_CAT_POS: Vec3 = [0, 3.3, -6.6];

function addSignpost(root: THREE.Group, x: number, z: number, text: string, isGood: boolean): void {
  const wood = flatMaterial(0x6b4a2b, { flatShading: true });
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.0, 0.12), wood);
  post.position.set(x, 0.9, z);
  const sign = panel(text, { background: isGood ? "#dff3e0" : "#f6e0d4", widthMeters: 2.4 });
  sign.position.set(x, 2.0, z + 0.07);
  root.add(post, sign);
}

function awardCheshireKey(): void {
  const store = useGameStore.getState();
  if (store.keys.includes("cheshire")) return;
  store.awardKey("cheshire");
  store.addLesson(CHESHIRE_LESSON);
  emit("key-awarded", { piece: "cheshire", lesson: CHESHIRE_LESSON });
}

export function createCheshireZone(): Zone {
  const offs: Array<() => void> = [];
  let cat: CheshireCat | null = null;
  let isReduced = false;

  return {
    id: SCENE_CHESHIRE,
    levelId: "cheshire",
    enter(ctx: ZoneContext) {
      useGameStore.getState().goToLevel("cheshire");
      isReduced = ctx.reducedMotion;
      ctx.scene.background = new THREE.Color(DUSK);
      ctx.scene.fog = new THREE.Fog(DUSK, 10, 34);
      ctx.root.add(new THREE.HemisphereLight(0xb7a0ff, 0x1e3a2a, 1.6));
      const ground = new THREE.Mesh(new THREE.CircleGeometry(14, 32), flatMaterial(0x2f4a33));
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = 0.003;
      ctx.root.add(ground);
      addSignpost(ctx.root, -1.4, 1.5, SIGN_TEXT["sign-real"] ?? "", true);
      addSignpost(ctx.root, 1.4, 1.5, SIGN_TEXT["sign-fake"] ?? "", false);
      const exit = createDoor({ position: [0, 0, 10.6], rotY: Math.PI, width: 1.45, height: 2.4 });
      exit.setState("open");
      ctx.root.add(exit.group);

      const npc = ctx.level?.npcs.find((n) => n.id === CAT_ID);
      cat = createCheshireCat(npc?.pos ?? DEFAULT_CAT_POS);
      ctx.root.add(cat.group);

      const base = ctx.level?.interactables ?? [];
      const refresh = () => {
        const items: LevelInteractable[] = [...base];
        ctx.setInteractables(items);
      };
      refresh();
      emit("hint", { text: "Walk up to the Cheshire Cat's tree and press E on the Cat to hear what to do. (Press H to go back to the Hall.)", tone: "info" });

      offs.push(
        on("interact", ({ id }) => {
          if (id === CAT_ID) return void emit("hint", { text: CAT_INSTRUCTIONS, tone: "info" });
          const result = judgeSignpost(id);
          if (result) {
            emit("hint", { text: result.message, tone: result.isCorrect ? "good" : "bad" });
            if (result.isCorrect) {
              awardCheshireKey();
              refresh();
            }
          } else if (id === EXIT_ID) ctx.goTo(SCENE_HALL);
        }),
        on("exit-level", () => ctx.goTo(SCENE_HALL)),
      );
    },
    update(_dt, elapsed) {
      cat?.update(elapsed, isReduced);
    },
    exit() {
      offs.splice(0).forEach((off) => off());
      cat = null;
    },
  };
}
