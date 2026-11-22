/**
 * File: game/scenes/Hatter.ts
 * Purpose: Mad Hatter level stage (placeholder art): a long tea table with a tipping teapot.
 *          Shared stage logic lives in NpcStage.
 * Author: manasa
 * Date: 2026-11-21
 */
import { SCENE_HATTER } from "../../lib/constants";
import { NpcStage, STAGE_GROUND_Y, STAGE_NPC_X } from "./NpcStage";

const TABLE_WIDTH = 320;
const TABLE_Y = STAGE_GROUND_Y - 30;
const TEAPOT_TILT_DEGREES = 12;
const TEAPOT_MS = 900;

export class HatterScene extends NpcStage {
  constructor() {
    super(SCENE_HATTER, "hatter", "The Mad Hatter's tea party");
  }

  protected drawNpc(isReducedMotion: boolean): void {
    this.add.rectangle(STAGE_NPC_X, TABLE_Y, TABLE_WIDTH, 16, 0x8b5a2b);
    this.add.circle(STAGE_NPC_X - 80, TABLE_Y - 70, 38, 0x2c3e50);
    this.add.rectangle(STAGE_NPC_X - 80, TABLE_Y - 118, 54, 40, 0x2c3e50);
    const teapot = this.add.ellipse(STAGE_NPC_X + 70, TABLE_Y - 24, 56, 40, 0xe67e22);
    if (!isReducedMotion) {
      this.tweens.add({ targets: teapot, angle: TEAPOT_TILT_DEGREES, duration: TEAPOT_MS, yoyo: true, repeat: -1 });
    }
  }
}
