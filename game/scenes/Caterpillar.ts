/**
 * File: game/scenes/Caterpillar.ts
 * Purpose: Caterpillar level stage (placeholder art): a sleepy caterpillar on a mushroom blowing
 *          smoke rings. Shared stage logic lives in NpcStage.
 * Author: manasa
 * Date: 2026-11-21
 */
import { SCENE_CATERPILLAR } from "../../lib/constants";
import { NpcStage, STAGE_GROUND_Y, STAGE_NPC_X } from "./NpcStage";

const SEGMENT_COUNT = 5;
const SEGMENT_RADIUS = 22;
const SEGMENT_SPACING = 34;
const MUSHROOM_Y = STAGE_GROUND_Y - 60;
const RING_RISE_PX = 90;
const RING_MS = 2600;

export class CaterpillarScene extends NpcStage {
  constructor() {
    super(SCENE_CATERPILLAR, "caterpillar", "The Caterpillar's mushroom");
  }

  protected drawNpc(isReducedMotion: boolean): void {
    this.add.rectangle(STAGE_NPC_X, MUSHROOM_Y + 30, 30, 90, 0xe8d8b0);
    this.add.ellipse(STAGE_NPC_X, MUSHROOM_Y - 10, 190, 70, 0xc0392b);
    for (let segment = 0; segment < SEGMENT_COUNT; segment++) {
      const x = STAGE_NPC_X - (SEGMENT_SPACING * (SEGMENT_COUNT - 1)) / 2 + segment * SEGMENT_SPACING;
      this.add.circle(x, MUSHROOM_Y - 55, SEGMENT_RADIUS, 0x6ab04c);
    }
    const ring = this.add.text(STAGE_NPC_X + 90, MUSHROOM_Y - 70, "○", { fontSize: "32px" }).setOrigin(0.5);
    if (!isReducedMotion) {
      this.tweens.add({ targets: ring, y: ring.y - RING_RISE_PX, alpha: 0, duration: RING_MS, repeat: -1 });
    }
  }
}
