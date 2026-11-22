"use client";

import { useEffect, useRef, useState } from "react";
import { emit, on } from "@/game/bridge";
import { chaseChoice, chaseLevels, nextChaseLevel, type ChaseLevel } from "@/lib/chase";

const FIRST_LEVEL = chaseLevels[0]!;

export default function CarbonChase() {
  const frame = useRef<HTMLIFrameElement>(null);
  const checkpoint = useRef<ChaseLevel>(FIRST_LEVEL);
  const [active, setActive] = useState<ChaseLevel | "finished" | null>(null);
  const isCourse = active !== null && active !== "finished";

  function returnToHall() {
    setActive(null);
    emit("exit-level", null);
  }

  useEffect(() => on("chase-open", () => {
    setActive((current) => current ?? checkpoint.current);
  }), []);

  useEffect(() => {
    if (!isCourse) return;
    const level = active;
    function receive(event: MessageEvent<unknown>) {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
      const result = chaseChoice(event.data, level);
      if (!result) return;

      const next = nextChaseLevel(level);
      if (result.completed) checkpoint.current = next ?? FIRST_LEVEL;
      if (result.choice === "hall") returnToHall();
      else setActive(next ?? "finished");
    }
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [active, isCourse]);

  if (active === null) return null;
  if (active === "finished") {
    return (
      <section aria-label="Carbon Chase complete" className="fixed inset-0 z-50 grid place-items-center bg-[#201a2a] p-5 text-amber-50">
        <div className="max-w-lg rounded-lg border border-amber-300 p-7">
          <h1 className="text-3xl font-bold">You caught the White Rabbit!</h1>
          <p className="mt-3">He agrees to slow down long enough to switch things off, use less hot water, and hang his laundry to dry. Pick one change from the chase and see where you could try it at home.</p>
          <button type="button" className="mt-6 rounded bg-amber-300 px-4 py-2 font-bold text-[#201a2a]" onClick={returnToHall}>
            Back to the Hall of Doors
          </button>
        </div>
      </section>
    );
  }
  return (
    <iframe
      key={active}
      ref={frame}
      title="Carbon Chase"
      src={`/chase/index.html?embed&level=${active}`}
      className="fixed inset-0 z-50 block h-dvh w-full border-0 bg-[#122c2c]"
    />
  );
}
