/**
 * File: game3d/zones/hall.ts
 * Purpose: SCENE_HALL — the Hall of Doors hub: checkered floor, curtains, the glass key table,
 *          four trial doors (only the Cheshire door is open in the demo, as in the Phaser hub),
 *          and the tiny garden door glowing green at the far end. Reads the store; never writes
 *          anything but goToLevel, exactly as the Phaser hub did.
 * Date: 2026-11-21
 */
import * as THREE from "three";
import { emit, on } from "../../game/bridge";
import { GARDEN_KEYS, KEY_PIECES, SCENE_CHESHIRE, SCENE_HALL, SCENE_MAZE, SCENE_CLUES } from "../../lib/constants";
import type { KeyPieceType } from "../../lib/schemas";
import { useGameStore } from "../../lib/state/store";
import { GARDEN_LESSON } from "../../lib/mediaLiteracy";
import { createDoor, type Door } from "../entities/door";
import { createKeyTable } from "../entities/keyTable";
import { createWhiteRabbit, type WhiteRabbit } from "../entities/whiteRabbit";
import type { LevelInteractable } from "../level";
import { flatMaterial } from "../scenery";
import type { Zone, ZoneContext } from "./types";

/** Same rule as the Phaser hub: only this trial door opens in the demo build. */
export const DEMO_UNLOCKED_DOOR: KeyPieceType = "cheshire";
/** Doors that lead somewhere playable in this build. */
const DOOR_ZONES: Partial<Record<KeyPieceType, string>> = {
  cheshire: SCENE_CHESHIRE,
  caterpillar: SCENE_MAZE,
  hatter: SCENE_CLUES,
};
const DOOR_WIDTH = 1.2;
const DOOR_HEIGHT = 2.4;
const PIECE_NAMES: Record<KeyPieceType, string> = {
  caterpillar: "News Maze",
  cheshire: "Cheshire Cat",
  hatter: "Clue Room",
  queen: "Queen of Hearts",
};

const doorId = (piece: KeyPieceType) => `door-${piece}`;
export const RABBIT_ID = "white-rabbit";

/** Interactables for the current progress: the open door is enabled, earned doors get a ✓. Pure. */
export function hallInteractables(
  base: readonly LevelInteractable[],
  keys: readonly KeyPieceType[],
): LevelInteractable[] {
  const hasAllKeys = GARDEN_KEYS.every((piece) => keys.includes(piece));
  return base.map((item) => {
    if (item.id === "garden-door") {
      return { ...item, enabled: hasAllKeys, label: hasAllKeys ? "the garden: unlock it with the Golden Key" : item.label };
    }
    const piece = KEY_PIECES.find((p) => item.id === doorId(p));
    if (!piece) return item;
    return {
      ...item,
      enabled: Boolean(DOOR_ZONES[piece]),
      label: keys.includes(piece) ? `${item.label} ✓` : item.label,
    };
  });
}

/** What happens when the player walks up to the tiny garden door. Pure. */
export function gardenApproach(keys: readonly KeyPieceType[]): { readonly isOpen: boolean; readonly message: string } {
  const have = GARDEN_KEYS.filter((piece) => keys.includes(piece)).length;
  return have === GARDEN_KEYS.length
    ? { isOpen: true, message: "All three key pieces click together into the Golden Key... the garden door opens!" }
    : { isOpen: false, message: `The tiny garden door needs all ${GARDEN_KEYS.length} key pieces. You have ${have}.` };
}

/** Walk this close (metres, flat) to the garden door and it reacts: no staring at the floor needed. */
export const GARDEN_TRIGGER_METERS = 2.4;
const GARDEN_Z = -30.6;

export function keyTableText(keys: readonly KeyPieceType[]): string {
  const earned = GARDEN_KEYS.filter((p) => keys.includes(p)).map((p) => PIECE_NAMES[p]);
  const count = `${earned.length} of ${GARDEN_KEYS.length} key pieces`;
  return earned.length
    ? `The Golden Key slot: ${count} (${earned.join(", ")}). The tiny garden door needs all of them.`
    : `The Golden Key slot is empty: ${count}. Win a room's mini game to earn a piece.`;
}

function checkerTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const cell = size / 2;
    for (let y = 0; y < 2; y++) {
      for (let x = 0; x < 2; x++) {
        ctx.fillStyle = (x + y) % 2 ? "#2b2233" : "#efe6d4";
        ctx.fillRect(x * cell, y * cell, cell, cell);
      }
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(5, 17);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  return texture;
}

/** Positions of the four trial doors: [x, z, rotY]. Left wall faces +X, right wall faces −X. */
const DOOR_PLACES: Record<KeyPieceType, readonly [number, number, number]> = {
  caterpillar: [-4.98, -8, Math.PI / 2],
  cheshire: [-4.98, -20, Math.PI / 2],
  hatter: [4.98, -8, -Math.PI / 2],
  queen: [4.98, -20, -Math.PI / 2],
};

export function createHallZone(): Zone {
  const offs: Array<() => void> = [];
  let table: ReturnType<typeof createKeyTable> | null = null;
  let rabbit: WhiteRabbit | null = null;
  let reduced = false;
  let eye: ZoneContext["eyePosition"] | null = null;
  let isNearGarden = false;

  return {
    id: SCENE_HALL,
    levelId: "hall",
    enter(ctx: ZoneContext) {
      useGameStore.getState().goToLevel("caterpillar"); // as the Phaser hub did
      reduced = ctx.reducedMotion;
      eye = ctx.eyePosition;
      isNearGarden = false;
      ctx.scene.background = new THREE.Color(0x1d1428);
      ctx.scene.fog = new THREE.Fog(0x1d1428, 18, 45);
      ctx.root.add(new THREE.HemisphereLight(0xfff0d8, 0x3a2c4a, 1.8));
      for (const z of [-4, -14, -24]) {
        const lamp = new THREE.PointLight(0xffd9a0, 18, 14);
        lamp.position.set(0, 4.4, z);
        ctx.root.add(lamp);
      }

      const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 34), flatMaterial(0xffffff, { map: checkerTexture() }));
      floor.rotation.x = -Math.PI / 2;
      floor.position.set(0, 0.002, -14);
      ctx.root.add(floor);

      const doors = new Map<KeyPieceType, Door>();
      for (const piece of KEY_PIECES) {
        const [x, z, rotY] = DOOR_PLACES[piece];
        const door = createDoor({ position: [x, 0, z], rotY, width: DOOR_WIDTH, height: DOOR_HEIGHT });
        ctx.root.add(door.group);
        doors.set(piece, door);
      }

      // The tiny garden door, with green light spilling from its keyhole.
      const garden = createDoor({ position: [0, 0, -30.98], rotY: 0, width: 0.45, height: 0.7 });
      garden.setState("locked");
      ctx.root.add(garden.group);
      const keyhole = new THREE.Mesh(
        new THREE.CircleGeometry(0.05, 12),
        new THREE.MeshBasicMaterial({ color: 0x8dff9e }),
      );
      keyhole.position.set(0, 0.35, -30.92);
      ctx.root.add(keyhole);
      const glow = new THREE.PointLight(0x66ff88, 6, 5);
      glow.position.set(0, 0.4, -30.4);
      ctx.root.add(glow);

      table = createKeyTable([0, 0, -14]);
      ctx.root.add(table.group);

      // The White Rabbit waits near the entrance; React narrates his intro (RabbitBubble).
      const rabbitAt = ctx.level?.npcs.find((n) => n.id === RABBIT_ID)?.pos ?? [1.6, 0, -3];
      rabbit = createWhiteRabbit(rabbitAt);
      rabbit.face(ctx.level?.spawn ?? [0, 0, 0]);
      ctx.root.add(rabbit.group);
      const rabbitItem: LevelInteractable = {
        id: RABBIT_ID,
        kind: "npc",
        pos: rabbit.head(),
        radius: 0.6,
        label: "the White Rabbit",
        enabled: true,
      };

      const base = ctx.level?.interactables ?? [];
      const refresh = (keys: readonly KeyPieceType[]) => {
        for (const piece of KEY_PIECES) {
          const isOpen = Boolean(DOOR_ZONES[piece]);
          doors.get(piece)?.setState(keys.includes(piece) ? "earned" : isOpen ? "open" : "locked");
        }
        table?.setEarned(keys);
        garden.setState(GARDEN_KEYS.every((piece) => keys.includes(piece)) ? "open" : "locked");
        ctx.setInteractables([...hallInteractables(base, keys), rabbitItem]);
      };
      refresh(useGameStore.getState().keys);

      offs.push(
        useGameStore.subscribe((state, previous) => {
          if (state.keys !== previous.keys) refresh(state.keys);
        }),
        on("interact", ({ id }) => {
          const piece = KEY_PIECES.find((p) => id === doorId(p));
          const target = piece && DOOR_ZONES[piece];
          if (target) ctx.goTo(target);
          else if (id === "key-table") emit("sign-read", { text: keyTableText(useGameStore.getState().keys) });
          else if (id === "garden-door") {
            emit("game-won", { title: "You unlocked the garden!", lesson: GARDEN_LESSON });
          }
        }),
        on("rabbit-say", (line) => rabbit?.say(line)),
      );
    },
    update(dt, elapsed) {
      table?.update(elapsed, reduced);
      rabbit?.update(dt, elapsed, reduced);
      if (eye) {
        const [x, , z] = eye();
        const isNear = Math.hypot(x, z - GARDEN_Z) <= GARDEN_TRIGGER_METERS;
        if (isNear && !isNearGarden) {
          const result = gardenApproach(useGameStore.getState().keys);
          if (result.isOpen) emit("game-won", { title: "You unlocked the garden!", lesson: GARDEN_LESSON });
          else emit("hint", { text: result.message, tone: "info" });
        }
        isNearGarden = isNear;
      }
    },
    exit() {
      offs.splice(0).forEach((off) => off());
      emit("sign-read", null);
      table = null;
      rabbit = null;
      eye = null;
      isNearGarden = false;
    },
  };
}
