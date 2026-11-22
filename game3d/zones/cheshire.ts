/**
 * File: game3d/zones/cheshire.ts
 * Purpose: SCENE_CHESHIRE — the Tulgey Wood at dusk. The Cheshire Cat sits on a branch (fading body,
 *          permanent grin) and sometimes reappears on another branch; two signposts at a fork are
 *          clues; a floating screen shows the Cat's look-alike page on `show-page`; a door frame
 *          leads back to the Hall. E on the Cat opens the existing React dialogue. The Referee and
 *          the store decide everything; this zone only stages it.
 * Date: 2026-11-21
 */
import * as THREE from "three";
import { emit, on } from "../../game/bridge";
import { SCENE_CHESHIRE, SCENE_HALL } from "../../lib/constants";
import { useGameStore } from "../../lib/state/store";
import { CROWN_SHOP_PAGE, FREE_CROWN_PAGE } from "../../lib/wonderweb/display";
import { createCheshireCat, type CheshireCat } from "../entities/cheshireCat";
import { createDoor } from "../entities/door";
import { createScreen, type Screen } from "../entities/screen";
import { createWhiteRabbit, type WhiteRabbit } from "../entities/whiteRabbit";
import { label } from "../labels";
import type { LevelInteractable, Vec3 } from "../level";
import { flatMaterial } from "../scenery";
import type { Zone, ZoneContext } from "./types";

const CAT_ID = "cheshire-cat";
const SCREEN_ID = "page-screen";
const RABBIT_ID = "white-rabbit";
/** The Rabbit hurries in from the entrance path and stops beside Alice's route to the Cat. */
const RABBIT_PATH: readonly Vec3[] = [
  [-2.2, 0, 4.5],
  [-2.4, 0, 0.5],
];
const DUSK = 0x3b2a55;
const SCREEN_OFFSET: Vec3 = [2.3, -0.7, 0.8];

export const SIGN_TEXTS: Readonly<Record<string, string>> = {
  "sign-real": `← ${CROWN_SHOP_PAGE.url.replace(/^https:\/\//, "").replace(/\/$/, "")} — The Queen's Royal Shop. Est. 1865.`,
  "sign-fake": `${FREE_CROWN_PAGE.url.replace(/^https:\/\//, "").replace(/\/claim$/, "")} → FREE CROWNS!!! Hurry, only 9 left!!!`,
};

function addSignpost(root: THREE.Group, x: number, z: number, text: string, pointsLeft: boolean): void {
  const wood = flatMaterial(0x6b4a2b, { flatShading: true });
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.5, 0.12), wood);
  post.position.set(x, 0.75, z);
  root.add(post);
  const board = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.3, 0.06), wood);
  board.position.set(x + (pointsLeft ? -0.45 : 0.45), 1.3, z);
  root.add(board);
  const sign = label(text, { background: "#3a2614", color: "#ffe7b0" });
  sign.scale.multiplyScalar(0.42);
  sign.position.set(x + (pointsLeft ? -0.45 : 0.45), 1.3, z + 0.05);
  root.add(sign);
}

function addBranch(root: THREE.Group, at: Vec3, trunkX: number, trunkZ: number): void {
  const length = Math.hypot(at[0] - trunkX, at[2] - trunkZ) + 0.6;
  const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, length, 6), flatMaterial(0x4a3626, { flatShading: true }));
  branch.position.set((at[0] + trunkX) / 2, at[1] - 0.45, (at[2] + trunkZ) / 2);
  branch.rotation.z = Math.PI / 2;
  branch.rotation.y = -Math.atan2(at[2] - trunkZ, at[0] - trunkX);
  root.add(branch);
}

function addMushrooms(root: THREE.Group): void {
  const caps = [0xff7ad9, 0x7affe0, 0xffd27a];
  for (let i = 0; i < 10; i++) {
    const side = i % 2 ? 1 : -1;
    const z = 6 - i * 1.3;
    const x = side * (1.6 + (i % 3) * 0.3);
    const color = caps[i % caps.length] ?? 0xff7ad9;
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.9 }),
    );
    cap.position.set(x, 0.18, z);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.18, 6), flatMaterial(0xf2ead8));
    stem.position.set(x, 0.09, z);
    root.add(cap, stem);
    if (i % 3 === 0) {
      const glow = new THREE.PointLight(color, 1.2, 3);
      glow.position.set(x, 0.4, z);
      root.add(glow);
    }
  }
}

export function createCheshireZone(): Zone {
  const offs: Array<() => void> = [];
  let cat: CheshireCat | null = null;
  let screen: Screen | null = null;
  let rabbit: WhiteRabbit | null = null;
  let wasWalking = false;
  let refreshItems: (() => void) | null = null;
  let reduced = false;
  let inDialogue = false;

  return {
    id: SCENE_CHESHIRE,
    levelId: "cheshire",
    enter(ctx: ZoneContext) {
      useGameStore.getState().goToLevel("cheshire");
      reduced = ctx.reducedMotion;
      ctx.scene.background = new THREE.Color(DUSK);
      ctx.scene.fog = new THREE.Fog(DUSK, 8, 30);
      ctx.root.add(new THREE.HemisphereLight(0xb7a0ff, 0x1e3a2a, 1.4));
      const sunset = new THREE.DirectionalLight(0xffa86b, 1.3);
      sunset.position.set(-10, 6, 6);
      ctx.root.add(sunset);

      const ground = new THREE.Mesh(new THREE.CircleGeometry(14, 32), flatMaterial(0x2f4a33));
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = 0.003;
      ctx.root.add(ground);
      addMushrooms(ctx.root);
      addSignpost(ctx.root, -1.4, 1.5, "← queensroyalshop.wonder", true);
      addSignpost(ctx.root, 1.4, 1.5, "royal-crowns-free.wonder →", false);
      const exit = createDoor({ position: [0, 0, 10.6], rotY: Math.PI, width: 1.45, height: 2.4 });
      exit.setState("open");
      ctx.root.add(exit.group);

      const npc = ctx.level?.npcs.find((n) => n.id === CAT_ID);
      const branches: Vec3[] = npc ? [npc.pos, ...npc.branchPositions] : [[0, 3.3, -6.6]];
      // Each branch grows from the nearest tree trunk.
      const trunks = (ctx.level?.boxes ?? []).filter((b) => b.tags.includes("tree"));
      for (const at of branches) {
        const distance = (b: (typeof trunks)[number]) => Math.hypot(b.center[0] - at[0], b.center[2] - at[2]);
        const trunk = trunks.reduce<(typeof trunks)[number] | null>((best, b) => (!best || distance(b) < distance(best) ? b : best), null);
        if (trunk) addBranch(ctx.root, at, trunk.center[0], trunk.center[2]);
      }
      let branchIndex = 0;
      cat = createCheshireCat(branches[0] ?? [0, 3.3, -6.6]);
      ctx.root.add(cat.group);
      screen = createScreen();
      ctx.root.add(screen.group);

      // The White Rabbit stays off-stage until React says he's arriving (the midpoint twist).
      const rabbitStart = ctx.level?.npcs.find((n) => n.id === RABBIT_ID)?.pos ?? [-2.5, 0, 9];
      rabbit = createWhiteRabbit(rabbitStart);
      rabbit.group.visible = false;
      ctx.root.add(rabbit.group);

      const base = ctx.level?.interactables ?? [];
      let screenShown = false;
      const refresh = () => {
        const at = cat?.group.position;
        const items: LevelInteractable[] = base.map((item) =>
          item.id === CAT_ID && at ? { ...item, pos: [at.x, at.y, at.z] } : item,
        );
        if (screenShown && screen) {
          const p = screen.group.position;
          items.push({ id: SCREEN_ID, kind: "screen", pos: [p.x, p.y, p.z], radius: 0.9, label: "the crown page", enabled: true });
        }
        if (rabbit?.group.visible) {
          items.push({ id: RABBIT_ID, kind: "npc", pos: rabbit.head(), radius: 0.6, label: "the White Rabbit", enabled: true });
        }
        ctx.setInteractables(items);
      };

      const placeScreen = () => {
        if (!cat || !screen) return;
        const p = cat.group.position;
        screen.group.position.set(p.x + SCREEN_OFFSET[0], p.y + SCREEN_OFFSET[1], p.z + SCREEN_OFFSET[2]);
        const [ex, , ez] = ctx.eyePosition();
        screen.group.lookAt(ex, screen.group.position.y, ez);
      };

      const hop = () => {
        if (!cat || inDialogue) return;
        branchIndex = (branchIndex + 1) % branches.length;
        const next = branches[branchIndex];
        if (next) cat.moveTo(next);
        placeScreen();
        refresh();
      };
      refresh();
      refreshItems = refresh;

      let lastPage: { url: string; pngBase64?: string } | null = null;
      offs.push(
        on("interact", ({ id }) => {
          if (id === CAT_ID && cat) {
            inDialogue = true;
            ctx.openDialogue("cheshire", cat.head());
          } else if (id === "sign-real" || id === "sign-fake") {
            emit("sign-read", { text: SIGN_TEXTS[id] ?? "" });
          } else if (id === "exit-hall") {
            ctx.goTo(SCENE_HALL);
          } else if (id === SCREEN_ID && lastPage) {
            emit("show-page", lastPage);
          } else if (id === RABBIT_ID && rabbit) {
            ctx.openDialogue("rabbit", rabbit.head()); // React shows the reply box (RabbitBubble)
          }
        }),
        on("dialogue-close", () => {
          inDialogue = false;
          if (!reduced) hop(); // the Cat reappears somewhere else between conversations
        }),
        on("show-page", (page) => {
          if (page?.pngBase64) {
            rabbit?.showPage(page); // the Rabbit's live Solari screenshot goes on his own screen
            return;
          }
          if (page) lastPage = page;
          placeScreen();
          screen?.show(page);
          screenShown = Boolean(page);
          refresh();
        }),
        on("rabbit-state", (phase) => {
          if (!rabbit) return;
          if (phase === "away") {
            rabbit.group.visible = false;
            rabbit.showPage(null);
          } else if (phase === "arriving") {
            rabbit.group.visible = true;
            rabbit.walk(RABBIT_PATH);
          }
          refresh();
        }),
        on("rabbit-say", (line) => rabbit?.say(line)),
        on("exit-level", () => ctx.goTo(SCENE_HALL)),
      );
    },
    update(dt, elapsed) {
      cat?.update(elapsed, reduced);
      if (rabbit?.group.visible) {
        rabbit.update(dt, elapsed, reduced);
        const walking = rabbit.isWalking();
        if (wasWalking && !walking) {
          // Arrived: turn to the Cat and move his interact target to where he stands.
          if (cat) rabbit.face([cat.group.position.x, 0, cat.group.position.z]);
          refreshItems?.();
        }
        wasWalking = walking;
      }
    },
    exit() {
      offs.splice(0).forEach((off) => off());
      emit("show-page", null);
      emit("sign-read", null);
      cat = null;
      screen = null;
      rabbit = null;
      refreshItems = null;
      wasWalking = false;
      inDialogue = false;
    },
  };
}
