/**
 * File: game/scenes/Garden.ts
 * Purpose: The ending (spec §2): Alice steps into the garden, the safe internet. A React ending
 *          card lists the lessons and unlocks Looking-Glass mode.
 * Author: manasa
 * Date: 2026-11-21
 */
import * as Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, SCENE_GARDEN } from "../../lib/constants";
import { useGameStore } from "../../lib/state/store";
import { emit } from "../bridge";

const FLOWER_COUNT = 14;
const FLOWER_COLORS = [0xff7675, 0xfdcb6e, 0xa29bfe, 0xfd79a8] as const;

export class GardenScene extends Phaser.Scene {
  constructor() {
    super(SCENE_GARDEN);
  }

  create(): void {
    emit("scene-changed", SCENE_GARDEN);
    useGameStore.getState().markWon();
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x2ecc71);
    for (let flower = 0; flower < FLOWER_COUNT; flower++) {
      const color = FLOWER_COLORS[flower % FLOWER_COLORS.length] ?? 0xff7675;
      this.add.circle(Phaser.Math.Between(20, GAME_WIDTH - 20), Phaser.Math.Between(GAME_HEIGHT / 2, GAME_HEIGHT - 20), 12, color);
    }
    this.add.text(GAME_WIDTH / 2, 50, "The Garden", { fontSize: "28px" }).setOrigin(0.5);
  }
}
