/**
 * File: game/scenes/HallOfDoors.ts
 * Purpose: Hub scene: the garden door (opens the Trial once the needed keys are earned) and the
 *          four trial doors (placeholder art).
 * Author: manasa
 * Date: 2026-11-21 (updated: all four doors, garden door to the Trial)
 */
import * as Phaser from "phaser";
import {
  GAME_HEIGHT,
  GAME_WIDTH,
  KEY_PIECES,
  SCENE_CATERPILLAR,
  SCENE_CHESHIRE,
  SCENE_GARDEN,
  SCENE_HALL,
  SCENE_HATTER,
  SCENE_QUEEN,
  SCENE_TRIAL,
} from "../../lib/constants";
import { hasRequiredKeys, requiredKeys } from "../../lib/progress";
import { useGameStore } from "../../lib/state/store";
import { emit } from "../bridge";

const DOOR_WIDTH = 90;
const DOOR_HEIGHT = 160;
const DOOR_SPACING = 160;
const DOOR_Y = GAME_HEIGHT / 2 + 60;
const GARDEN_SIZE = 50;
const GARDEN_Y = 70;
const COLOR_OPEN = 0x8b5a2b;
const COLOR_GARDEN_LOCKED = 0x2d6b3f;
const COLOR_GARDEN = 0x44cc66;
const COLOR_EARNED = 0xffd700;

const DOOR_SCENES: Readonly<Record<(typeof KEY_PIECES)[number], string>> = {
  caterpillar: SCENE_CATERPILLAR,
  cheshire: SCENE_CHESHIRE,
  hatter: SCENE_HATTER,
  queen: SCENE_QUEEN,
};

export class HallOfDoorsScene extends Phaser.Scene {
  constructor() {
    super(SCENE_HALL);
  }

  create(): void {
    emit("scene-changed", SCENE_HALL);
    useGameStore.getState().goToLevel("caterpillar");
    this.drawGardenDoor();
    this.drawDoors();
  }

  private drawGardenDoor(): void {
    const { keys, hasWon } = useGameStore.getState();
    const isOpen = hasWon || hasRequiredKeys(keys);
    const door = this.add.rectangle(GAME_WIDTH / 2, GARDEN_Y, GARDEN_SIZE, GARDEN_SIZE, isOpen ? COLOR_GARDEN : COLOR_GARDEN_LOCKED);
    const needed = requiredKeys().filter((piece) => !keys.includes(piece));
    const label = isOpen ? "The garden (click to enter)" : `The garden (needs the Golden Key: ${needed.join(", ")})`;
    this.add.text(GAME_WIDTH / 2, GARDEN_Y + 50, label, { fontSize: "16px" }).setOrigin(0.5);
    if (!isOpen) return;
    door.setInteractive({ useHandCursor: true });
    door.on("pointerdown", () => this.scene.start(hasWon ? SCENE_GARDEN : SCENE_TRIAL));
  }

  private drawDoors(): void {
    const startX = GAME_WIDTH / 2 - (DOOR_SPACING * (KEY_PIECES.length - 1)) / 2;
    KEY_PIECES.forEach((piece, index) => {
      const x = startX + index * DOOR_SPACING;
      const isEarned = useGameStore.getState().keys.includes(piece);
      const door = this.add.rectangle(x, DOOR_Y, DOOR_WIDTH, DOOR_HEIGHT, isEarned ? COLOR_EARNED : COLOR_OPEN);
      this.add.text(x, DOOR_Y + DOOR_HEIGHT / 2 + 14, isEarned ? `${piece} ✓` : piece, { fontSize: "14px" }).setOrigin(0.5);
      door.setInteractive({ useHandCursor: true });
      door.on("pointerdown", () => this.scene.start(DOOR_SCENES[piece]));
      this.add.text(x, DOOR_Y, "Enter", { fontSize: "14px" }).setOrigin(0.5);
    });
  }
}
