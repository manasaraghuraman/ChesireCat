/**
 * File: components/BottleShelf.tsx
 * Purpose: Hub "Drink Me / Eat Me" bottles (spec §3.5): inspect a download's file name, source and
 *          size before using it. A bad one only shows a harmless pretend "files locked" screen.
 * Author: manasa
 * Date: 2026-11-21
 */
"use client";

import { useState } from "react";
import { BOTTLES, resolveBottle, type Bottle, type BottleOutcome } from "@/lib/bottles";
import { useGameStore } from "@/lib/state/store";

interface Resolved {
  readonly outcome: BottleOutcome;
}

export default function BottleShelf() {
  const changeSize = useGameStore((s) => s.changeSize);
  const [inspected, setInspected] = useState<ReadonlySet<string>>(new Set());
  const [resolved, setResolved] = useState<Readonly<Record<string, Resolved>>>({});

  function decide(bottle: Bottle, isUsing: boolean): void {
    if (resolved[bottle.id]) return;
    const outcome = resolveBottle(bottle, { hasInspected: inspected.has(bottle.id), isUsing });
    changeSize(outcome.sizeDelta);
    setResolved((current) => ({ ...current, [bottle.id]: { outcome } }));
  }

  return (
    <section aria-label="Bottles" className="flex flex-col gap-3 rounded bg-black/50 p-4">
      <h2 className="text-lg font-bold">Bottles on the shelf</h2>
      <p className="text-sm">Some of these are safe and some aren&apos;t. Look closely before you drink or eat.</p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {BOTTLES.map((bottle) => (
          <li key={bottle.id} className="flex flex-col gap-2 rounded border border-amber-400/60 p-3">
            <p className="font-bold">{bottle.label}</p>
            {inspected.has(bottle.id) ? (
              <dl className="text-sm">
                <dt className="font-bold">File</dt>
                <dd>{bottle.fileName}</dd>
                <dt className="font-bold">From</dt>
                <dd>{bottle.source}</dd>
                <dt className="font-bold">Size</dt>
                <dd>{bottle.sizeKilobytes.toLocaleString()} KB</dd>
              </dl>
            ) : (
              <button onClick={() => setInspected((current) => new Set(current).add(bottle.id))} className="self-start underline">
                Inspect
              </button>
            )}
            <BottleActions bottle={bottle} result={resolved[bottle.id]} onDecide={decide} />
          </li>
        ))}
      </ul>
    </section>
  );
}

interface ActionsProps {
  readonly bottle: Bottle;
  readonly result: Resolved | undefined;
  readonly onDecide: (bottle: Bottle, isUsing: boolean) => void;
}

function BottleActions({ bottle, result, onDecide }: ActionsProps) {
  if (!result) {
    return (
      <div className="flex gap-2">
        <button onClick={() => onDecide(bottle, true)} className="rounded bg-amber-400 px-3 py-1 font-bold text-purple-950">
          Use it
        </button>
        <button onClick={() => onDecide(bottle, false)} className="rounded border border-amber-400 px-3 py-1">
          Leave it
        </button>
      </div>
    );
  }
  return (
    <div role="status" className="text-sm">
      {result.outcome.isLockedScreen && (
        <p className="mb-1 rounded bg-red-900 p-2 font-bold">
          YOUR FILES ARE LOCKED! (Just pretend: nothing happened to your computer. This is what a bad download can
          do.)
        </p>
      )}
      <p>{result.outcome.message}</p>
    </div>
  );
}
