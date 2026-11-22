/**
 * File: components/Hud.tsx
 * Purpose: First-person HUD over the full-screen 3D world: reticle, interact prompt, size meter,
 *          rewinds, objective, key pieces and the click-to-look hint. Every number comes from the
 *          Zustand store or the bridge, never from the 3D side's own copies.
 * Date: 2026-11-21
 */
"use client";

import { useEffect, useState } from "react";
import { on } from "@/game/bridge";
import { KEY_PIECES, SCENE_CHESHIRE, SCENE_FALL, SCENE_HALL, SIZE_MAX, SIZE_TOO_SMALL } from "@/lib/constants";
import type { KeyPieceType } from "@/lib/schemas";
import { useGameStore } from "@/lib/state/store";
import InteractPrompt from "./InteractPrompt";
import { useWorldUi } from "./useWorldUi";

const PIECE_NAMES: Record<(typeof KEY_PIECES)[number], string> = {
  caterpillar: "Caterpillar",
  cheshire: "Cheshire Cat",
  hatter: "Mad Hatter",
  queen: "Queen of Hearts",
};

const PANEL = "rounded-lg bg-black/55 text-white shadow-lg backdrop-blur-sm";
const SIGN_SECONDS = 8;

/** One line telling the player what to do next, from the scene and progress (spec §2.7). */
export function objectiveFor(scene: string | null, keys: readonly KeyPieceType[]): string | null {
  const hasCheshire = keys.includes("cheshire");
  if (scene === SCENE_HALL) return hasCheshire ? "Open the garden door" : "Find the Cheshire Cat's door";
  if (scene === SCENE_CHESHIRE) return hasCheshire ? "Return to the Hall" : "Find the Cheshire Cat in the Tulgey Wood";
  return null;
}

/** Text from an inspected signpost or the key slot; fades after a few seconds. */
function SignText() {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const off = on("sign-read", (sign) => {
      clearTimeout(timer);
      setText(sign?.text ?? null);
      if (sign) timer = setTimeout(() => setText(null), SIGN_SECONDS * 1000);
    });
    return () => {
      off();
      clearTimeout(timer);
    };
  }, []);
  if (!text) return null;
  return (
    <p
      role="status"
      className="absolute left-1/2 top-[calc(50%+4.5rem)] max-w-md -translate-x-1/2 rounded-lg border border-amber-300/60 bg-[#2b1d12]/90 px-4 py-3 text-center font-serif text-amber-100 shadow-lg"
    >
      {text}
    </p>
  );
}

function SizeMeter({ size }: { readonly size: number }) {
  const percent = (size / SIZE_MAX) * 100;
  const tooSmallPercent = (SIZE_TOO_SMALL / SIZE_MAX) * 100;
  const isTooSmall = size < SIZE_TOO_SMALL;
  return (
    <div className="flex items-end gap-3">
      <div
        role="meter"
        aria-label="Size"
        aria-valuemin={0}
        aria-valuemax={SIZE_MAX}
        aria-valuenow={size}
        className="relative h-36 w-7 overflow-hidden rounded-b-xl rounded-t-md border-2 border-amber-200/70 bg-black/40"
      >
        <div
          className={`absolute inset-x-0 bottom-0 transition-[height] duration-500 motion-reduce:transition-none ${
            isTooSmall ? "bg-rose-400" : "bg-gradient-to-t from-amber-500 to-amber-300"
          }`}
          style={{ height: `${percent}%` }}
        />
        <div className="absolute inset-x-0 border-t-2 border-dashed border-white/80" style={{ bottom: `${tooSmallPercent}%` }} />
      </div>
      <div className="pb-1 text-xs leading-tight">
        <p className="text-base font-bold">
          Size <span aria-live="polite">{size}</span>
        </p>
        <p className="text-white/70">- - - {SIZE_TOO_SMALL}: too small for the key</p>
      </div>
    </div>
  );
}

interface HudProps {
  readonly objective?: string;
  /** Hide everything (e.g. during the Fall animation). */
  readonly hidden?: boolean;
}

export default function Hud({ objective, hidden = false }: HudProps) {
  const size = useGameStore((s) => s.size);
  const keys = useGameStore((s) => s.keys);
  const rewinds = useGameStore((s) => s.rewindsLeft[s.currentLevel] ?? 0);
  const { locked, focus, awaitingClick, scene } = useWorldUi();

  // Hide during loading and the Fall animation (the pop-up is its own overlay).
  if (hidden || scene === null || scene === SCENE_FALL) return null;
  const line = objective ?? objectiveFor(scene, keys);

  return (
    <div className="pointer-events-none fixed inset-0 z-10 select-none font-sans">
      {/* Top-left: size, rewinds, objective */}
      <div className={`absolute left-4 top-4 flex flex-col gap-2 p-3 ${PANEL}`}>
        <SizeMeter size={size} />
        <p className="text-sm" aria-label={`${rewinds} rewinds left`}>
          <span aria-hidden>⏱</span> × {rewinds}
        </p>
        {line && <p className="max-w-56 text-sm text-amber-200">{line}</p>}
      </div>

      {/* Top-centre: key pieces */}
      <div className={`absolute left-1/2 top-4 -translate-x-1/2 px-3 py-2 ${PANEL}`}>
        <ul aria-live="polite" aria-label="Key pieces" className="flex gap-2">
          {KEY_PIECES.map((piece) => {
            const earned = keys.includes(piece);
            return (
              <li
                key={piece}
                title={PIECE_NAMES[piece]}
                className={`flex h-9 w-9 items-center justify-center rounded-md border-2 text-lg ${
                  earned ? "border-amber-300 bg-amber-400 text-black" : "border-white/30 text-white/30"
                }`}
              >
                <span aria-hidden>🗝</span>
                <span className="sr-only">
                  {PIECE_NAMES[piece]}: {earned ? "earned" : "missing"}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Centre: reticle + prompt */}
      {locked && (
        <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
          <div
            aria-hidden
            className={`rounded-full transition-all duration-150 motion-reduce:transition-none ${
              focus ? "h-6 w-6 border-2 border-white/90" : "h-1.5 w-1.5 bg-white/90"
            }`}
          />
        </div>
      )}
      {locked && (
        <div aria-live="polite" className="absolute left-1/2 top-[calc(50%+2rem)] -translate-x-1/2">
          <InteractPrompt focus={focus} />
        </div>
      )}

      <SignText />

      {!locked && awaitingClick && (
        <p className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-2 ${PANEL}`}>
          Click to look around
        </p>
      )}
    </div>
  );
}
