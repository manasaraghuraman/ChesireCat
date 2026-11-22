/**
 * File: game3d/zones/maze.ts
 * Purpose: SCENE_MAZE, the Carbon Maze: walk the maze and read the choice boards.
 *          Walking up to a board (or pressing E on it) judges it: low-carbon choices are collected,
 *          high-carbon choices explain why they cost carbon. Collect all three, reach the exit, and the Caterpillar key is yours. Rules live in
 *          lib/carbonContent.ts.
 * Date: 2026-11-22
 */
import * as THREE from "three";
import { emit, on } from "../../game/bridge";
import { SCENE_HALL } from "../../lib/constants";
import { BOARDS, judgeBoard, MAZE_EXIT_ID, MAZE_KEY_LESSON, PEOPLE, personLine, REAL_BOARD_IDS } from "../../lib/carbonContent";
import { useGameStore } from "../../lib/state/store";
import { createPerson, type PersonStyle } from "../entities/person";
import { panel } from "../labels";
import type { LevelInteractable } from "../level";
import { nearbyIds, PROXIMITY_METERS, yawToward } from "../proximity";
import { flatMaterial } from "../scenery";
import type { Zone, ZoneContext } from "./types";

const SKY = 0x1c2340;
const PERSON_STYLES: readonly PersonStyle[] = [
  { shirt: 0x3b82f6, pants: 0x2c3e5a, hair: 0x5b3a1e, skin: 0xe8b894 },
  { shirt: 0x10b981, pants: 0x4a4a52, hair: 0x1c1c1c, skin: 0xc68a63 },
  { shirt: 0xf59e0b, pants: 0x6b4a8c, hair: 0xd9b45a, skin: 0xf0c8a0 },
];
const isPerson = (id: string) => Object.hasOwn(PEOPLE, id);
export { PROXIMITY_METERS };
const BOARD_WIDTH_METERS = 2.8;

function addBoard(ctx: ZoneContext, item: LevelInteractable, text: string): void {
  const [x, y, z] = item.pos;
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, y, 0.1), flatMaterial(0x40404a));
  post.position.set(x, y / 2, z);
  const sign = panel(text, { widthMeters: BOARD_WIDTH_METERS });
  sign.position.set(x, y + 0.2, z);
  ctx.root.add(post, sign);
}

/** Ids of the boards whose centre is within `distance` of (x, z). Pure. */
export function boardsNear(items: readonly LevelInteractable[], x: number, z: number, distance: number): string[] {
  return nearbyIds(items, x, z, distance, (id) => Boolean(BOARDS[id]));
}

function awardMazeKey(): void {
  const store = useGameStore.getState();
  if (store.keys.includes("caterpillar")) return;
  store.awardKey("caterpillar");
  store.addLesson(MAZE_KEY_LESSON);
  emit("key-awarded", { piece: "caterpillar", lesson: MAZE_KEY_LESSON });
}

export function createMazeZone(): Zone {
  const offs: Array<() => void> = [];
  const collected = new Set<string>();
  let inside = new Set<string>();
  let judge: ((id: string) => void) | null = null;
  let boards: readonly LevelInteractable[] = [];
  let eye: (() => readonly [number, number, number]) | null = null;
  let exitItem: LevelInteractable | null = null;
  let people: readonly LevelInteractable[] = [];
  let figures: readonly THREE.Group[] = [];
  let insidePeople = new Set<string>();
  const spoken = new Map<string, number>();
  let talk: ((id: string) => void) | null = null;

  return {
    id: "Maze",
    levelId: "maze",
    enter(ctx: ZoneContext) {
      useGameStore.getState().goToLevel("trial");
      collected.clear();
      inside = new Set();
      eye = ctx.eyePosition;
      ctx.scene.background = new THREE.Color(SKY);
      ctx.scene.fog = new THREE.Fog(SKY, 8, 30);
      ctx.root.add(new THREE.HemisphereLight(0xcfd8ff, 0x303040, 2.2));
      const base = ctx.level?.interactables ?? [];
      boards = base.filter((item) => BOARDS[item.id]);
      exitItem = base.find((item) => item.id === MAZE_EXIT_ID) ?? null;
      people = base.filter((item) => isPerson(item.id));
      insidePeople = new Set();
      spoken.clear();
      const made: THREE.Group[] = [];
      people.forEach((item, index) => {
        const style = PERSON_STYLES[index % PERSON_STYLES.length] ?? PERSON_STYLES[0]!;
        const person = createPerson(PEOPLE[item.id]?.name ?? "Person", style, item.pos, ctx.level?.spawn);
        ctx.root.add(person);
        made.push(person);
      });
      figures = made;
      talk = (id: string) => {
        const line = personLine(id, spoken.get(id) ?? 0);
        if (!line) return;
        spoken.set(id, (spoken.get(id) ?? 0) + 1);
        emit("hint", { text: line, tone: "info" });
      };
      for (const item of boards) addBoard(ctx, item, BOARDS[item.id]?.text ?? "");
      const refresh = () =>
        ctx.setInteractables(
          base.map((item) =>
            item.id === MAZE_EXIT_ID ? { ...item, enabled: collected.size >= REAL_BOARD_IDS.length, label: "the maze exit" } : item,
          ),
        );
      refresh();
      emit("hint", {
        text: `Walk up to each board to read it, and talk to the people you meet. Collect all ${REAL_BOARD_IDS.length} low-carbon choices (avoid the high-carbon ones), then reach the exit for your key. (Press H to go back to the Hall.)`,
        tone: "info",
      });
      judge = (id: string) => {
        const result = judgeBoard(id, collected);
        if (!result) return;
        if (result.kind === "real") collected.add(id);
        const done = result.isMazeComplete ? " The exit is open!" : "";
        emit("hint", { text: result.message + done, tone: result.kind === "real" ? "good" : "bad" });
        refresh();
      };
      offs.push(
        on("interact", ({ id }) => {
          if (id === MAZE_EXIT_ID) {
            if (collected.size >= REAL_BOARD_IDS.length) awardMazeKey();
          } else if (isPerson(id)) talk?.(id);
          else judge?.(id);
        }),
        on("exit-level", () => ctx.goTo(SCENE_HALL)),
      );
    },
    update() {
      if (!eye || !judge) return;
      const [x, , z] = eye();
      const near = new Set(boardsNear(boards, x, z, PROXIMITY_METERS));
      for (const id of near) if (!inside.has(id)) judge(id); // fires once each time you walk up to a board
      inside = near;
      // Everyone turns to face the player, so you always see them from the front.
      for (const figure of figures) figure.rotation.y = yawToward(figure.position.x, figure.position.z, x, z);
      const nearPeople = new Set(nearbyIds(people, x, z, PROXIMITY_METERS, isPerson));
      for (const id of nearPeople) if (!insidePeople.has(id)) talk?.(id); // they speak when you walk up
      insidePeople = nearPeople;
      // Reaching the open exit awards the key (no aiming needed).
      const isAtExit = exitItem && Math.hypot(exitItem.pos[0] - x, exitItem.pos[2] - z) <= PROXIMITY_METERS;
      if (isAtExit && collected.size >= REAL_BOARD_IDS.length) awardMazeKey();
    },
    exit() {
      offs.splice(0).forEach((off) => off());
      collected.clear();
      inside = new Set();
      judge = null;
      eye = null;
      boards = [];
      exitItem = null;
      people = [];
      figures = [];
      insidePeople = new Set();
      spoken.clear();
      talk = null;
    },
  };
}
