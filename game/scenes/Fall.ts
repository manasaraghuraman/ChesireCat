/**
 * File: game/scenes/Fall.ts
 * Purpose: Act 1 tutorial: the forced pop-up click, then Alice falls to the hub.
 * Author: manasa
 * Date: 2026-11-21
 */
import * as Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, SCENE_FALL, SCENE_HALL } from "../../lib/constants";
import { useGameStore } from "../../lib/state/store";
import { emit } from "../bridge";

const POPUP_WIDTH = 360;
const POPUP_HEIGHT = 140;
const FALL_MS = 1500;
const FALL_MS_REDUCED = 200;
const ALICE_RADIUS = 20;

export class FallScene extends Phaser.Scene {
  constructor() {
    super(SCENE_FALL);
  }

  create(): void {
    emit("scene-changed", SCENE_FALL);
    useGameStore.getState().goToLevel("fall");
    const popup = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, POPUP_WIDTH, POPUP_HEIGHT, 0xffffff)
      .setInteractive({ useHandCursor: true });
    const label = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, "I'm late!\nClick NOW!", {
        color: "#c00",
        fontSize: "32px",
        align: "center",
      })
      .setOrigin(0.5);
    popup.once("pointerdown", () => this.fall([popup, label]));
  }

  private fall(popupParts: Phaser.GameObjects.GameObject[]): void {
    popupParts.forEach((part) => part.destroy());
    const alice = this.add.circle(GAME_WIDTH / 2, 0, ALICE_RADIUS, 0x66ccff);
    const isReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.tweens.add({
      targets: alice,
      y: GAME_HEIGHT,
      duration: isReducedMotion ? FALL_MS_REDUCED : FALL_MS,
      onComplete: () => this.scene.start(SCENE_HALL),
    });
  }
}
