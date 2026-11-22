/**
 * File: components/TrialPanel.tsx
 * Purpose: Act 3 UI (spec §2): a rapid-fire round mixing the four threat types, then the faked
 *          evidence (a Solari screenshot examined by the vision model). Exposing the fake plays the
 *          "pack of cards" finale in the Trial scene.
 * Author: manasa
 * Date: 2026-11-21
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { emit } from "@/game/bridge";
import { PACK_OF_CARDS_LINE } from "@/lib/constants";
import { fetchEvidence, startLevel } from "@/lib/client/requests";
import { answerChallenge, hasPassedRound, TRIAL_CHALLENGES, TRIAL_PASS_MARK, type ChallengeResult } from "@/lib/trial/challenges";
import { useGameStore } from "@/lib/state/store";
import BrowserView from "./BrowserView";
import RabbitBubble from "./RabbitBubble";

type Phase = "round" | "retry" | "evidence" | "won";
type Evidence = Awaited<ReturnType<typeof fetchEvidence>>;

export default function TrialPanel() {
  const changeSize = useGameStore((s) => s.changeSize);
  const [phase, setPhase] = useState<Phase>("round");
  const [index, setIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [lastResult, setLastResult] = useState<ChallengeResult | null>(null);

  useEffect(() => {
    // Warm up the WonderWeb sandbox so the evidence step is quick. Failure is retried there.
    startLevel("trial", useGameStore.getState().rabbitCured).catch(() => undefined);
  }, []);

  function choose(choiceIndex: number): void {
    const challenge = TRIAL_CHALLENGES[index];
    if (!challenge || lastResult) return;
    const result = answerChallenge(challenge, choiceIndex);
    changeSize(result.sizeDelta);
    setLastResult(result);
    if (result.isCorrect) setCorrectCount((count) => count + 1);
  }

  function next(): void {
    setLastResult(null);
    if (index + 1 < TRIAL_CHALLENGES.length) return setIndex(index + 1);
    setPhase(hasPassedRound(correctCount) ? "evidence" : "retry");
  }

  function retryRound(): void {
    setIndex(0);
    setCorrectCount(0);
    setLastResult(null);
    setPhase("round");
  }

  function exposeFake(): void {
    setPhase("won");
    emit("trial-won", null);
  }

  return (
    <div className="flex w-full max-w-[800px] flex-col gap-3">
      {phase === "round" && (
        <ChallengeCard index={index} lastResult={lastResult} onChoose={choose} onNext={next} />
      )}
      {phase === "retry" && (
        <section className="flex flex-col gap-2 rounded bg-black/50 p-4">
          <RabbitBubble text={`The jury isn't convinced: you needed ${TRIAL_PASS_MARK} right answers. Try the round again!`} />
          <button onClick={retryRound} className="self-start rounded bg-amber-400 px-4 py-2 font-bold text-purple-950">
            Try again
          </button>
        </section>
      )}
      {phase === "evidence" && <EvidenceStep onExpose={exposeFake} />}
      {phase === "won" && (
        <p role="status" className="rounded bg-black/50 p-4 text-center text-2xl font-bold">
          {PACK_OF_CARDS_LINE}
        </p>
      )}
    </div>
  );
}

interface ChallengeProps {
  readonly index: number;
  readonly lastResult: ChallengeResult | null;
  readonly onChoose: (choiceIndex: number) => void;
  readonly onNext: () => void;
}

function ChallengeCard({ index, lastResult, onChoose, onNext }: ChallengeProps) {
  const challenge = TRIAL_CHALLENGES[index];
  if (!challenge) return null;
  return (
    <section aria-label="Rapid-fire round" className="flex flex-col gap-3 rounded bg-black/50 p-4">
      <p className="text-sm">
        Round {index + 1} of {TRIAL_CHALLENGES.length}
      </p>
      <p className="text-lg">{challenge.prompt}</p>
      <ul className="flex flex-col gap-2">
        {challenge.options.map((option, optionIndex) => (
          <li key={option}>
            <button
              onClick={() => onChoose(optionIndex)}
              disabled={lastResult !== null}
              className="w-full rounded bg-amber-200 px-3 py-2 text-left text-purple-950 disabled:opacity-60"
            >
              {option}
            </button>
          </li>
        ))}
      </ul>
      {lastResult && (
        <div role="status" className="flex flex-col gap-2">
          <p className="font-bold">{lastResult.isCorrect ? "Well spotted!" : "Oh dear, that's a trap."}</p>
          <p>{challenge.lesson}</p>
          <button onClick={onNext} className="self-start rounded bg-amber-400 px-4 py-2 font-bold text-purple-950">
            Next
          </button>
        </div>
      )}
    </section>
  );
}

function EvidenceStep({ onExpose }: { readonly onExpose: () => void }) {
  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    abortRef.current = controller;
    setError(null);
    fetchEvidence(controller.signal)
      .then(setEvidence)
      .catch((caught: unknown) => {
        if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "The evidence went missing.");
      });
    return () => controller.abort();
  }, [attempt]);

  return (
    <section aria-label="The evidence" className="flex flex-col gap-3 rounded bg-black/50 p-4">
      <RabbitBubble text="Now the Queen's evidence! Let me take a very careful look…" />
      {!evidence && !error && <p role="status">Fetching the evidence…</p>}
      {error && (
        <div role="alert" className="flex flex-col gap-2 text-red-300">
          <p>{error}</p>
          <button onClick={() => setAttempt((count) => count + 1)} className="self-start underline">
            Try again
          </button>
        </div>
      )}
      {evidence && (
        <>
          <BrowserView pngBase64={evidence.screenshotPngBase64} address="Exhibit A" alt="Screenshot of the Queen's evidence" />
          <p className="font-bold">The Rabbit found these flaws:</p>
          <ul className="list-disc pl-5 text-sm">
            {evidence.flaws.map((flaw) => (
              <li key={flaw}>{flaw}</li>
            ))}
          </ul>
          <button onClick={onExpose} className="self-start rounded bg-amber-400 px-4 py-2 font-bold text-purple-950">
            It&apos;s a FAKE! Expose it!
          </button>
        </>
      )}
    </section>
  );
}
