/**
 * File: game/bridge.ts
 * Purpose: Minimal typed event bus between the game world (Phaser scenes, and the three.js world)
 *          and React overlays. Every `on` returns its unsubscribe.
 * Author: manasa
 * Date: 2026-11-21
 */
export type InteractKind = "door" | "npc" | "sign" | "key" | "screen";

export interface FocusPayload {
  readonly id: string;
  readonly label: string;
  readonly kind: InteractKind;
  readonly enabled: boolean;
  readonly reason?: "locked" | "too-small";
}

export interface BridgeEvents {
  readonly "scene-changed": string;
  /** React asks the active level scene to return to the Hall of Doors. */
  readonly "exit-level": null;
  /** World → HUD: what the reticle is on (null when nothing). */
  readonly "focus-changed": FocusPayload | null;
  /** World → React/zone: E pressed on the focused, enabled, reachable thing. */
  readonly interact: { readonly id: string };
  /** Zone → React. */
  readonly "dialogue-open": { readonly levelId: string };
  /** React → zone. */
  readonly "dialogue-close": null;
  /** World → HUD: true while controls are captured (pointer lock, or drag-to-look fallback). */
  readonly "pointer-lock": boolean;
  /** React → world: capture the mouse. Emitted from a click handler so the browser allows the lock. */
  readonly "capture-request": null;
  /** NPC action / Rabbit screenshot → screen + panel. */
  readonly "show-page": { readonly url: string; readonly pngBase64?: string } | null;
  /** Signpost inspected → HUD. */
  readonly "sign-read": { readonly text: string } | null;
  /** React → Fall zone: the player clicked the "I'm late!" pop-up. */
  readonly "fall-start": null;
  /** React → zones: what the White Rabbit is doing, and the line over his head. */
  readonly "rabbit-state": RabbitPhase;
  /** React → zones: the line the Rabbit is saying (speech-bubble sprite). */
  readonly "rabbit-say": string | null;
  /** Solari replay of the moment the Rabbit was fooled → lesson card. */
  readonly "rabbit-replay": string;
  /** A key piece the store awarded outside a verdict (held until the Rabbit was cured) → lesson card. */
  readonly "key-awarded": { readonly piece: string; readonly lesson: string | null };
  /** Zone → overlay: a short message for the player (instructions, right/wrong feedback). */
  readonly hint: { readonly text: string; readonly tone: "info" | "good" | "bad" };
  /** Maze zone → overlay: the player finished the game. */
  readonly "game-won": { readonly lesson: string; readonly title?: string };
  /** The store just rewound the level → play the rewind effect. */
  readonly rewind: null;
}

export type RabbitPhase = "away" | "arriving" | "browsing" | "fooled" | "cured";

type Handler<K extends keyof BridgeEvents> = (payload: BridgeEvents[K]) => void;

const handlers = new Map<keyof BridgeEvents, Set<Handler<keyof BridgeEvents>>>();

export function on<K extends keyof BridgeEvents>(event: K, handler: Handler<K>): () => void {
  const set = handlers.get(event) ?? new Set();
  set.add(handler as Handler<keyof BridgeEvents>);
  handlers.set(event, set);
  return () => {
    set.delete(handler as Handler<keyof BridgeEvents>);
  };
}

export function emit<K extends keyof BridgeEvents>(event: K, payload: BridgeEvents[K]): void {
  handlers.get(event)?.forEach((handler) => handler(payload));
}

/** Number of live handlers, for leak tests. */
export function handlerCount(event?: keyof BridgeEvents): number {
  if (event) return handlers.get(event)?.size ?? 0;
  let total = 0;
  handlers.forEach((set) => (total += set.size));
  return total;
}
