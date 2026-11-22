/**
 * File: game3d/zones/clues.ts
 * Purpose: SCENE_CLUES, the Clue Room (mini game #2): a suspicious viral post and four clues around it.
 *          Walk up to each clue (or press E) to inspect it, then walk up to a verdict podium, REAL or
 *          FAKE. The right verdict (after all clues) awards the Hatter key. Rules: lib/mediaLiteracy.ts.
 * Date: 2026-11-22
 */
import * as THREE from "three";
import { emit, on } from "../../game/bridge";
import { SCENE_CLUES, SCENE_HALL } from "../../lib/constants";
import { CLUE_POST, CLUES, HATTER_LESSON, judgeClue, judgeVerdict } from "../../lib/mediaLiteracy";
import { useGameStore } from "../../lib/state/store";
import { createDoor } from "../entities/door";
import { panel } from "../labels";
import type { LevelInteractable } from "../level";
import { nearbyIds, PROXIMITY_METERS } from "../proximity";
import type { Zone, ZoneContext } from "./types";

const BACKDROP = 0x1f2a3a;
const isClue = (id: string) => Object.hasOwn(CLUES, id);
const isTarget = (id: string) => isClue(id) || id === "verdict-real" || id === "verdict-fake";

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
  let inside = new Set<string>();
  let act: ((id: string) => void) | null = null;
  let targets: readonly LevelInteractable[] = [];
  let eye: ZoneContext["eyePosition"] | null = null;

  return {
    id: SCENE_CLUES,
    levelId: "clues",
    enter(ctx: ZoneContext) {
      useGameStore.getState().goToLevel("hatter");
      found.clear();
      inside = new Set();
      eye = ctx.eyePosition;
      ctx.scene.background = new THREE.Color(BACKDROP);
      ctx.scene.fog = new THREE.Fog(BACKDROP, 14, 40);
      ctx.root.add(new THREE.HemisphereLight(0xdfe8ff, 0x303848, 2.2));
      const exit = createDoor({ position: [0, 0, 10.6], rotY: Math.PI, width: 1.45, height: 2.4 });
      exit.setState("open");
      ctx.root.add(exit.group);

      const post = panel(CLUE_POST, { widthMeters: 4.4, background: "#ffe9a8" });
      post.position.set(0, 3.1, -4.6);
      ctx.root.add(post);

      const base = ctx.level?.interactables ?? [];
      targets = base.filter((item) => isTarget(item.id));
      for (const item of targets) {
        const text = CLUES[item.id] ?? (item.id === "verdict-fake" ? "VERDICT:\nFAKE" : "VERDICT:\nREAL");
        const sign = panel(text, { widthMeters: isClue(item.id) ? 3.2 : 2.2 });
        sign.position.set(item.pos[0], item.pos[1] + 0.2, item.pos[2]);
        ctx.root.add(sign);
      }
      ctx.setInteractables(base);
      emit("hint", {
        text: "A viral post! Walk up to all 4 clues to investigate it, then walk to your verdict: REAL or FAKE. (Press H for the Hall.)",
        tone: "info",
      });
      act = (id: string) => {
        if (isClue(id)) {
          const result = judgeClue(id, found);
          if (!result) return;
          found.add(id);
          emit("hint", { text: result.message + (result.isAllFound ? " Now choose a verdict!" : ""), tone: "info" });
          return;
        }
        const verdict = judgeVerdict(id, found.size);
        if (!verdict) return;
        emit("hint", { text: verdict.message, tone: verdict.kind === "correct" ? "good" : verdict.kind === "wrong" ? "bad" : "info" });
        if (verdict.kind === "correct") awardHatterKey();
      };
      offs.push(
        on("interact", ({ id }) => (id === "exit-hall" ? ctx.goTo(SCENE_HALL) : act?.(id))),
        on("exit-level", () => ctx.goTo(SCENE_HALL)),
      );
    },
    update() {
      if (!eye || !act) return;
      const [x, , z] = eye();
      const near = new Set(nearbyIds(targets, x, z, PROXIMITY_METERS, isTarget));
      for (const id of near) if (!inside.has(id)) act(id);
      inside = near;
    },
    exit() {
      offs.splice(0).forEach((off) => off());
      found.clear();
      inside = new Set();
      act = null;
      eye = null;
      targets = [];
    },
  };
}
