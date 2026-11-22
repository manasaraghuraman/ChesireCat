import { useEffect, useState } from "preact/hooks";
import { online, identity, displayName } from "../net/online";
import { ringTicks } from "../config/ring";
import type { LevelRun } from "../level/run";
export function Commentary({ run, medal }: { run: LevelRun; medal: string }) {
  const fallback = {
    line: "A very curious finish. Even my grin had to hurry!",
    tip: "Try a different route past the optional leak.",
  };
  const [comment, setComment] = useState<typeof fallback | null>(null);
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      if (active) {
        active = false;
        setComment(fallback);
      }
    }, 2700);
    async function request() {
      if (!online || !displayName()) return fallback;
      await identity();
      if (!active) return fallback;
      const cleared = run.progress.filter((v) => v === ringTicks).length;
      const { data, error } = await online.functions.invoke(
        "cheshire_commentary",
        {
          body: {
            level: run.level.id,
            finalTime: run.finalTime,
            medal,
            cleared,
            skipped: run.progress.length - cleared,
            powers: run.usedPowers,
            splits: run.splits,
          },
        },
      );
      return !error &&
        typeof data?.line === "string" &&
        typeof data?.tip === "string"
        ? data
        : fallback;
    }
    request()
      .catch(() => fallback)
      .then((v) => {
        if (active) {
          setComment(v);
          clearTimeout(timer);
        }
      });
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [run, medal]);
  return (
    <div aria-live="polite">
      <h3>Cheshire Cat</h3>
      <p>{comment ? comment.line : "The Cat is considering your run…"}</p>
      {comment && <small>{comment.tip}</small>}
    </div>
  );
}
