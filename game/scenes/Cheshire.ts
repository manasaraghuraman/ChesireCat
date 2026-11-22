/**
 * File: game/scenes/Cheshire.ts
 * Purpose: Cheshire Cat level stage (placeholder art): the Cat's body fades in and out while its
 *          grin stays. Shared stage logic lives in NpcStage.
 * Author: varenya
 * Date: 2026-11-21 (updated: refactored onto NpcStage)
 */
import { SCENE_CHESHIRE } from "../../lib/constants";
import { NpcStage, STAGE_GROUND_Y, STAGE_NPC_X } from "./NpcStage";

const CAT_RADIUS = 55;
const CAT_Y = STAGE_GROUND_Y - 200;
const TREE_WIDTH = 20;
const TREE_HEIGHT = 300;
const GRIN_FADE_MS = 1800;

export class CheshireScene extends NpcStage {
  constructor() {
    super(SCENE_CHESHIRE, "cheshire", "The Cheshire Cat's tree");
  }

  protected drawNpc(isReducedMotion: boolean): void {
    this.add.rectangle(STAGE_NPC_X, STAGE_GROUND_Y - TREE_HEIGHT / 2, TREE_WIDTH, TREE_HEIGHT, 0x4a3020);
    const cat = this.add.circle(STAGE_NPC_X, CAT_Y, CAT_RADIUS, 0x9b59b6);
    this.add.text(STAGE_NPC_X, CAT_Y, "◡", { fontSize: "64px", color: "#fff" }).setOrigin(0.5).setDepth(1);
    if (!isReducedMotion) {
      // The body vanishes and returns; the grin stays (spec §7.2).
      this.tweens.add({ targets: cat, alpha: 0.1, duration: GRIN_FADE_MS, yoyo: true, repeat: -1 });
    }
  }
}
