/**
 * File: game/scenes/NpcStage.ts
 * Purpose: Shared stage for the four NPC trials (placeholder art): title, Alice scaled by size,
 *          exit handling. Subclasses draw their character. Dialogue is a React overlay.
 * Author: manasa
 * Date: 2026-11-21
 */
import * as Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, SCENE_HALL, SIZE_START } from "../../lib/constants";
import type { LevelIdType } from "../../lib/schemas";
import { useGameStore } from "../../lib/state/store";
import { emit, on } from "../bridge";

export const STAGE_NPC_X = GAME_WIDTH * 0.7;
export const STAGE_GROUND_Y = GAME_HEIGHT * 0.75;
const ALICE_X = GAME_WIDTH * 0.3;
const ALICE_BASE_RADIUS = 30;
const ALICE_COLOR = 0x66ccff;
const SIZE_TWEEN_MS = 400;
const TITLE_Y = 30;

export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export abstract class NpcStage extends Phaser.Scene {
  protected constructor(
    private readonly sceneKey: string,
    private readonly levelId: LevelIdType,
    private readonly title: string,
  ) {
    super(sceneKey);
  }

  /** Draws the character and scenery. Tweens belong to the scene, so Phaser cleans them up. */
  protected abstract drawNpc(isReducedMotion: boolean): void;

  create(): void {
    emit("scene-changed", this.sceneKey);
    useGameStore.getState().goToLevel(this.levelId);
    const isReducedMotion = prefersReducedMotion();
    this.add.text(GAME_WIDTH / 2, TITLE_Y, this.title, { fontSize: "18px" }).setOrigin(0.5);
    this.drawNpc(isReducedMotion);
    const unsubscribeSize = this.drawAlice(isReducedMotion);
    const unsubscribeExit = on("exit-level", () => this.scene.start(SCENE_HALL));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      unsubscribeSize();
      unsubscribeExit();
    });
  }

  private drawAlice(isReducedMotion: boolean): () => void {
    const alice = this.add.circle(ALICE_X, STAGE_GROUND_Y, ALICE_BASE_RADIUS, ALICE_COLOR).setOrigin(0.5, 1);
    alice.setScale(useGameStore.getState().size / SIZE_START);
    return useGameStore.subscribe((state, previous) => {
      if (state.size === previous.size) return;
      const scale = state.size / SIZE_START;
      if (isReducedMotion) alice.setScale(scale);
      else this.tweens.add({ targets: alice, scale, duration: SIZE_TWEEN_MS });
    });
  }
}
