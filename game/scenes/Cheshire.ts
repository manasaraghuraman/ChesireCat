/**
 * File: game/scenes/Cheshire.ts
 * Purpose: Cheshire Cat level stage (placeholder art): Alice scales with size,
 *          the Cat's grin fades in and out. Dialogue is a React overlay.
 * Author: varenya
 * Date: 2026-11-21
 */
import * as Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, SCENE_CHESHIRE, SCENE_HALL, SIZE_START } from "../../lib/constants";
import { useGameStore } from "../../lib/state/store";
import { emit, on } from "../bridge";

const ALICE_X = GAME_WIDTH * 0.3;
const CAT_X = GAME_WIDTH * 0.7;
const GROUND_Y = GAME_HEIGHT * 0.75;
const ALICE_BASE_RADIUS = 30;
const CAT_RADIUS = 55;
const GRIN_FADE_MS = 1800;
const SIZE_TWEEN_MS = 400;

export class CheshireScene extends Phaser.Scene {
  constructor() {
    super(SCENE_CHESHIRE);
  }

  create(): void {
    emit("scene-changed", SCENE_CHESHIRE);
    useGameStore.getState().goToLevel("cheshire");
    const isReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    this.add.text(GAME_WIDTH / 2, 30, "The Cheshire Cat's tree", { fontSize: "18px" }).setOrigin(0.5);
    this.add.rectangle(CAT_X, GROUND_Y - 150, 20, 300, 0x4a3020);

    const alice = this.add.circle(ALICE_X, GROUND_Y, ALICE_BASE_RADIUS, 0x66ccff).setOrigin(0.5, 1);
    alice.setScale(useGameStore.getState().size / SIZE_START);

    const cat = this.add.circle(CAT_X, GROUND_Y - 200, CAT_RADIUS, 0x9b59b6);
    const grin = this.add.text(CAT_X, GROUND_Y - 200, "◡", { fontSize: "64px", color: "#fff" }).setOrigin(0.5);
    if (!isReducedMotion) {
      // The body vanishes and returns; the grin stays (spec §7.2).
      this.tweens.add({ targets: cat, alpha: 0.1, duration: GRIN_FADE_MS, yoyo: true, repeat: -1 });
    }

    const unsubscribeSize = useGameStore.subscribe((state, previous) => {
      if (state.size === previous.size) return;
      const scale = state.size / SIZE_START;
      if (isReducedMotion) alice.setScale(scale);
      else this.tweens.add({ targets: alice, scale, duration: SIZE_TWEEN_MS });
    });
    const unsubscribeExit = on("exit-level", () => this.scene.start(SCENE_HALL));

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      unsubscribeSize();
      unsubscribeExit();
    });
    grin.setDepth(1);
  }
}
