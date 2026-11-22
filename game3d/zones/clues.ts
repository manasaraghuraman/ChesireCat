/**
 * File: game3d/zones/clues.ts
 * Purpose: SCENE_CLUES, the Greenwash Check (mini game #2): an "eco" bottle ad and six evidence cards,
 *          all readable at once. Only three are real red flags; the rest are normal details. Walk up to
 *          (or press E on) a card to pick it: right picks turn green, wrong picks turn red and explain.
 *          Finding all three red flags collapses the ad and awards the Hatter key. Rules: lib/carbonContent.ts.
 * Date: 2026-11-22
 */
import * as THREE from "three";
import { emit, on } from "../../game/bridge";
import { SCENE_CLUES, SCENE_HALL } from "../../lib/constants";
import { CLUE_POST, EVIDENCE, HATTER_LESSON, judgeEvidence, RED_FLAG_COUNT } from "../../lib/carbonContent";
import { useGameStore } from "../../lib/state/store";
import { createDoor } from "../entities/door";
import { panel } from "../labels";
import type { LevelInteractable } from "../level";
import { nearbyIds, PROXIMITY_METERS } from "../proximity";
import { flatMaterial } from "../scenery";
import type { Zone, ZoneContext } from "./types";

const BACKDROP = 0x1f2a3a;
const TINT_RIGHT = 0x7dff9a;
const TINT_WRONG = 0xff8a8a;
const CARD_WIDTH_METERS = 3.2;
const isCard = (id: string) => Object.hasOwn(EVIDENCE, id);

function awardHatterKey(): void {
  const store = useGameStore.getState();
  if (store.keys.includes("hatter")) return;
  store.awardKey("hatter");
  store.addLesson(HATTER_LESSON);
  emit("key-awarded", { piece: "hatter", lesson: HATTER_LESSON });
}

export function createCluesZone(): Zone {
  const offs: Array<() => void> = [];
  const found = new Set<string>();
  const sprites = new Map<string, THREE.Sprite>();
  let inside = new Set<string>();
  let pick: ((id: string) => void) | null = null;
  let cards: readonly LevelInteractable[] = [];
  let eye: ZoneContext["eyePosition"] | null = null;

  return {
    id: SCENE_CLUES,
    levelId: "clues",
    enter(ctx: ZoneContext) {
      useGameStore.getState().goToLevel("hatter");
      found.clear();
      sprites.clear();
      inside = new Set();
      eye = ctx.eyePosition;
      ctx.scene.background = new THREE.Color(BACKDROP);
      ctx.scene.fog = new THREE.Fog(BACKDROP, 14, 40);
      ctx.root.add(new THREE.HemisphereLight(0xdfe8ff, 0x303848, 2.2));
      const exit = createDoor({ position: [0, 0, 10.6], rotY: Math.PI, width: 1.45, height: 2.4 });
      exit.setState("open");
      ctx.root.add(exit.group);

      // The suspicious "eco" bottle and its ad.
      const bottle = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 1.1, 14), flatMaterial(0x4aa3ff));
      body.position.y = 0.55;
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.2, 10), flatMaterial(0x2a6fc0));
      cap.position.y = 1.2;
      bottle.add(body, cap);
      bottle.position.set(0, 0, -4.6);
      ctx.root.add(bottle);
      const ad = panel(CLUE_POST, { widthMeters: 4.4, background: "#ffe9a8" });
      ad.position.set(0, 3.1, -4.6);
      ctx.root.add(ad);

      const base = ctx.level?.interactables ?? [];
      cards = base.filter((item) => isCard(item.id));
      for (const item of cards) {
        const sign = panel(EVIDENCE[item.id]?.text ?? "", { widthMeters: CARD_WIDTH_METERS });
        sign.position.set(item.pos[0], item.pos[1] + 0.2, item.pos[2]);
        sprites.set(item.id, sign);
        ctx.root.add(sign);
      }
      ctx.setInteractables(base);
      emit("hint", {
        text: `An 'eco' ad! Read all the cards, then walk up to the ${RED_FLAG_COUNT} that are real red flags. Careful: some are just normal details. (Press H for the Hall.)`,
        tone: "info",
      });
      pick = (id: string) => {
        const result = judgeEvidence(id, found);
        if (!result) return;
        const isFlag = result.kind === "red-flag";
        if (isFlag) found.add(id);
        sprites.get(id)?.material.color.set(isFlag ? TINT_RIGHT : TINT_WRONG);
        emit("hint", {
          text: result.message + (result.isComplete ? " That's all of them: it's GREENWASH!" : ""),
          tone: isFlag ? "good" : "bad",
        });
        if (result.isComplete) {
          body.material = flatMaterial(0x999999); // the bottle's "eco" shine drops away
          ad.material.color.set(0xaaaaaa);
          awardHatterKey();
        }
      };
      offs.push(
        on("interact", ({ id }) => (id === "exit-hall" ? ctx.goTo(SCENE_HALL) : pick?.(id))),
        on("exit-level", () => ctx.goTo(SCENE_HALL)),
      );
    },
    update() {
      if (!eye || !pick) return;
      const [x, , z] = eye();
      const near = new Set(nearbyIds(cards, x, z, PROXIMITY_METERS, isCard));
      for (const id of near) if (!inside.has(id)) pick(id);
      inside = near;
    },
    exit() {
      offs.splice(0).forEach((off) => off());
      found.clear();
      sprites.clear();
      inside = new Set();
      pick = null;
      eye = null;
      cards = [];
    },
  };
}
