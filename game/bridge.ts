/**
 * File: game/bridge.ts
 * Purpose: Minimal typed event bus between Phaser scenes and React overlays.
 * Author: manasa
 * Date: 2026-11-21
 */
export interface BridgeEvents {
  readonly "scene-changed": string;
}

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
