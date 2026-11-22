/**
 * File: lib/client/rabbitState.ts
 * Purpose: Pure reducer folding the Rabbit's SSE events (narration deltas, screenshot, verdict,
 *          replay) into what the panel shows. Kept out of the component so it is easy to test.
 * Author: manasa
 * Date: 2026-11-21
 */
import type { RabbitEventType } from "../schemas";

export interface RabbitViewState {
  readonly narration: string;
  readonly screenshot: { readonly pngBase64: string; readonly address: string } | null;
  readonly verdict: { readonly safe: boolean; readonly reasons: readonly string[] } | null;
  readonly replayUrl: string | null;
}

export const INITIAL_RABBIT_VIEW: RabbitViewState = { narration: "", screenshot: null, verdict: null, replayUrl: null };

export type RabbitAction = RabbitEventType | { readonly type: "reset" };

export function rabbitReducer(state: RabbitViewState, action: RabbitAction): RabbitViewState {
  switch (action.type) {
    case "reset":
      return INITIAL_RABBIT_VIEW;
    case "narration":
      return { ...state, narration: state.narration + action.text };
    case "screenshot":
      return { ...state, screenshot: { pngBase64: action.pngBase64, address: action.url } };
    case "verdict":
      return { ...state, verdict: { safe: action.safe, reasons: action.reasons } };
    case "replay":
      return { ...state, replayUrl: action.replayUrl };
  }
}
