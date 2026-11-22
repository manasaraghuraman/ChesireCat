/**
 * File: components/InteractPrompt.tsx
 * Purpose: The line under the reticle: "E · Talk to the Cheshire Cat", "Locked — …", "Too small to reach — …".
 * Date: 2026-11-21
 */
"use client";

import type { FocusPayload, InteractKind } from "@/game/bridge";

const VERBS: Record<InteractKind, string> = {
  door: "Enter",
  npc: "Talk to",
  sign: "Read",
  key: "Pick up",
  screen: "Look at",
};

export function promptText(focus: FocusPayload): string {
  if (focus.reason === "locked") {
    return focus.kind === "door" ? "Locked — earn this key piece first" : `${focus.label} — not yet`;
  }
  if (focus.reason === "too-small") return "Too small to reach — spot more tricks to grow";
  return `E · ${VERBS[focus.kind]} ${focus.label}`;
}

export default function InteractPrompt({ focus }: { readonly focus: FocusPayload | null }) {
  if (!focus) return null;
  const blocked = Boolean(focus.reason);
  return (
    <p
      className={`rounded-md px-3 py-1.5 text-sm font-semibold shadow-lg backdrop-blur-sm ${
        blocked ? "bg-black/70 text-amber-300" : "bg-black/60 text-white"
      }`}
    >
      {promptText(focus)}
    </p>
  );
}
