/**
 * File: game/scenes/Trial.ts
 * Purpose: Act 3 courtroom (placeholder art). The React TrialPanel runs the rapid-fire round and
 *          the evidence check; on "trial-won" Alice declares "You're nothing but a pack of cards!"
 *          and the scam pages collapse into falling cards, then the Garden opens.
 * Author: manasa
 * Date: 2026-11-21
 */
import * as Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, PACK_OF_CARDS_LINE, SCENE_GARDEN, SCENE_TRIAL } from "../../lib/constants";
import { useGameStore } from "../../lib/state/store";
import { emit, on } from "../bridge";
import { prefersReducedMotion } from "./NpcStage";

const CARD_COUNT = 36;
const CARD_WIDTH = 36;
const CARD_HEIGHT = 52;
const FALL_MIN_MS = 1200;
const FALL_MAX_MS = 2600;
const GARDEN_DELAY_MS = 3200;
const GARDEN_DELAY_REDUCED_MS = 1200;

export class TrialScene extends Phaser.Scene {
  constructor() {
    super(SCENE_TRIAL);
  }

  create(): void {
    emit("scene-changed", SCENE_TRIAL);
    useGameStore.getState().goToLevel("trial");
    this.add.text(GAME_WIDTH / 2, 30, "The Trial of the Knave of Hearts", { fontSize: "18px" }).setOrigin(0.5);
    this.add.rectangle(GAME_WIDTH * 0.75, GAME_HEIGHT * 0.5, 90, 160, 0xc0392b);
    this.add.rectangle(GAME_WIDTH * 0.25, GAME_HEIGHT * 0.6, 40, 70, 0x2c3e50);
    this.add.rectangle(GAME_WIDTH * 0.5, GAME_HEIGHT * 0.45, 260, 90, 0xfdf6e3).setAlpha(0.9);
    const unsubscribe = on("trial-won", () => this.collapse());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, unsubscribe);
  }

  private collapse(): void {
    const isReducedMotion = prefersReducedMotion();
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.45, PACK_OF_CARDS_LINE, { fontSize: "24px", color: "#2a1a4a", wordWrap: { width: 240 } })
      .setOrigin(0.5)
      .setDepth(2);
    if (!isReducedMotion) this.dropCards();
    this.time.delayedCall(isReducedMotion ? GARDEN_DELAY_REDUCED_MS : GARDEN_DELAY_MS, () =>
      this.scene.start(SCENE_GARDEN),
    );
  }

  private dropCards(): void {
    for (let card = 0; card < CARD_COUNT; card++) {
      const rectangle = this.add
        .rectangle(Phaser.Math.Between(0, GAME_WIDTH), Phaser.Math.Between(0, GAME_HEIGHT / 2), CARD_WIDTH, CARD_HEIGHT, 0xffffff)
        .setStrokeStyle(2, 0xc0392b);
      this.tweens.add({
        targets: rectangle,
        y: GAME_HEIGHT + CARD_HEIGHT,
        angle: Phaser.Math.Between(-360, 360),
        duration: Phaser.Math.Between(FALL_MIN_MS, FALL_MAX_MS),
        ease: "Sine.easeIn",
      });
    }
  }
}
