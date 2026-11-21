/**
 * File: game/scenes/HallOfDoors.ts
 * Purpose: Hub scene: garden door, key slot, and four trial doors (placeholder art).
 * Author: manasa
 * Date: 2026-11-21
 */
import * as Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, KEY_PIECES, SCENE_HALL } from "../../lib/constants";
import { useGameStore } from "../../lib/state/store";
import { emit } from "../bridge";

const DOOR_WIDTH = 90;
const DOOR_HEIGHT = 160;
const DOOR_SPACING = 160;
const DOOR_Y = GAME_HEIGHT / 2 + 60;
const GARDEN_SIZE = 50;
const DEMO_UNLOCKED_DOOR = "cheshire";
const COLOR_LOCKED = 0x555555;
const COLOR_OPEN = 0x8b5a2b;
const COLOR_GARDEN = 0x44cc66;

export class HallOfDoorsScene extends Phaser.Scene {
  constructor() {
    super(SCENE_HALL);
  }

  create(): void {
    emit("scene-changed", SCENE_HALL);
    useGameStore.getState().goToLevel("caterpillar");
    this.add.rectangle(GAME_WIDTH / 2, 70, GARDEN_SIZE, GARDEN_SIZE, COLOR_GARDEN);
    this.add.text(GAME_WIDTH / 2, 120, "The garden (needs the Golden Key)", { fontSize: "16px" }).setOrigin(0.5);
    this.drawDoors();
  }

  private drawDoors(): void {
    const startX = GAME_WIDTH / 2 - (DOOR_SPACING * (KEY_PIECES.length - 1)) / 2;
    KEY_PIECES.forEach((piece, index) => {
      const x = startX + index * DOOR_SPACING;
      const isUnlocked = piece === DEMO_UNLOCKED_DOOR;
      this.add.rectangle(x, DOOR_Y, DOOR_WIDTH, DOOR_HEIGHT, isUnlocked ? COLOR_OPEN : COLOR_LOCKED);
      this.add.text(x, DOOR_Y + DOOR_HEIGHT / 2 + 14, piece, { fontSize: "14px" }).setOrigin(0.5);
    });
  }
}
