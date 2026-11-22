/**
 * File: game/scenes/Queen.ts
 * Purpose: Queen of Hearts level stage (placeholder art): the Queen and a ticking fake countdown
 *          (the pressure the player must resist). Shared stage logic lives in NpcStage.
 * Author: manasa
 * Date: 2026-11-21
 */
import * as Phaser from "phaser";
import { SCENE_QUEEN } from "../../lib/constants";
import { NpcStage, STAGE_GROUND_Y, STAGE_NPC_X } from "./NpcStage";

const COUNTDOWN_START_SECONDS = 120;
const MS_PER_SECOND = 1000;
const QUEEN_RADIUS = 60;
const QUEEN_Y = STAGE_GROUND_Y - 120;

function formatClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export class QueenScene extends NpcStage {
  constructor() {
    super(SCENE_QUEEN, "queen", "The Queen's croquet court");
  }

  protected drawNpc(isReducedMotion: boolean): void {
    this.add.circle(STAGE_NPC_X, QUEEN_Y, QUEEN_RADIUS, 0xc0392b);
    this.add.text(STAGE_NPC_X, QUEEN_Y, "♥", { fontSize: "56px", color: "#fff" }).setOrigin(0.5);
    const clock = this.add.text(STAGE_NPC_X, QUEEN_Y - 110, formatClock(COUNTDOWN_START_SECONDS), {
      fontSize: "28px",
      color: "#ff6b6b",
    });
    clock.setOrigin(0.5);
    // The countdown is pure pressure: nothing happens at zero. Reduced motion freezes it.
    if (isReducedMotion) return;
    let remaining = COUNTDOWN_START_SECONDS;
    this.time.addEvent({
      delay: MS_PER_SECOND,
      repeat: COUNTDOWN_START_SECONDS - 1,
      callback: () => {
        remaining -= 1;
        clock.setText(formatClock(remaining));
      },
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.time.removeAllEvents());
  }
}
