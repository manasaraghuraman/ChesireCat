/**
 * File: components/RabbitBubble.tsx
 * Purpose: The White Rabbit's voice: captions at the bottom of the screen (mirrored as a speech
 *          bubble in 3D), his guide intro in the Hall, and the Cheshire midpoint twist: he browses
 *          the Cat's page in Solari (defenses off), gets prompt-injected, and Alice cures him by
 *          pointing out the trick; then he looks again with defenses on. The store records the cure.
 * Date: 2026-11-21
 */
"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { emit, on, type RabbitPhase } from "@/game/bridge";
import { NPC_MAX_TEXT, SCENE_CHESHIRE, SCENE_HALL } from "@/lib/constants";
import { readSse } from "@/lib/sse";
import { useGameStore } from "@/lib/state/store";
import { useWorldUi } from "./useWorldUi";

const INTRO_LINES = [
  "Oh my ears and whiskers — sorry about that pop-up! Clicking it was the very first mistake: never click something just because it shouts.",
  "I'm the White Rabbit, your guide. See the tiny door at the end? The garden — the safe internet — needs the Golden Key.",
  "The key is in four pieces. Each character behind these doors holds one. See through their trick to earn it.",
  "Mouse to look, WASD to move, E to talk or open a door. Start with the Cheshire Cat's door. I'm late, I'm late!",
];
const INTRO_LINE_SECONDS = 5.5;
const ARRIVE_SECONDS = 3;
const NETWORK_FALLBACK = "Oh dear, my browser fell down a rabbit hole! But a note on that page said it was verified… so it looks fine to me!";

type Phase = "idle" | "arriving" | "browsing" | "fooled" | "curing" | "cured";

export default function RabbitBubble() {
  const { scene, locked } = useWorldUi();
  const rabbitCured = useGameStore((s) => s.rabbitCured);
  const heldKey = useGameStore((s) => s.heldKey);
  const [caption, setCaption] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [draft, setDraft] = useState("");
  const [isRabbitChatOpen, setIsRabbitChatOpen] = useState(false);
  const [isDialogueOpen, setIsDialogueOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const introShownRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const say = useCallback((text: string | null) => {
    setCaption(text);
    emit("rabbit-say", text);
  }, []);
  const setStage = useCallback((next: Phase) => {
    setPhase(next);
    const stage: RabbitPhase = next === "idle" ? "away" : next === "curing" ? "fooled" : next;
    emit("rabbit-state", stage);
  }, []);
  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  const playIntro = useCallback(() => {
    clearTimers();
    INTRO_LINES.forEach((line, i) => {
      timersRef.current.push(setTimeout(() => say(line), i * INTRO_LINE_SECONDS * 1000));
    });
    timersRef.current.push(setTimeout(() => say(null), INTRO_LINES.length * INTRO_LINE_SECONDS * 1000));
  }, [say]);

  /** One Rabbit run: streams narration, screenshot, verdict and replay from /api/rabbit. */
  const browse = useCallback(
    async (defenses: "on" | "off") => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setStage(defenses === "off" ? "browsing" : "cured");
      let narration = "";
      try {
        const response = await fetch("/api/rabbit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ defenses }),
          signal: controller.signal,
        });
        if (!response.ok || !response.body) throw new Error("rabbit unavailable");
        for await (const { event, data } of readSse(response.body)) {
          const payload = data as Record<string, unknown>;
          if (event === "narration" && typeof payload.text === "string") {
            narration += payload.text;
            say(narration);
          } else if (event === "screenshot" && typeof payload.pngBase64 === "string" && typeof payload.url === "string") {
            emit("show-page", { url: payload.url, pngBase64: payload.pngBase64 });
          } else if (event === "replay" && typeof payload.replayUrl === "string" && defenses === "off") {
            emit("rabbit-replay", payload.replayUrl); // the moment he was fooled
          } else if (event === "error") {
            throw new Error("rabbit stream failed");
          }
        }
      } catch {
        if (controller.signal.aborted) return;
        if (defenses === "off") say(NETWORK_FALLBACK);
      }
      if (defenses === "off") setStage("fooled");
    },
    [say, setStage],
  );

  // Bridge: scene changes, the Cat showing its page, E on the Rabbit, dialogue state.
  useEffect(() => {
    const offs = [
      on("show-page", (page) => {
        // The Cat (no screenshot) showing its page is the Rabbit's cue to come and "help".
        if (page && !page.pngBase64) setPhase((p) => (p === "idle" ? "arriving" : p));
      }),
      on("interact", ({ id }) => {
        if (id === "white-rabbit") setIsRabbitChatOpen(true);
      }),
      on("dialogue-open", ({ levelId }) => {
        setIsDialogueOpen(true);
        if (levelId === "rabbit") setIsRabbitChatOpen(true);
      }),
      on("dialogue-close", () => {
        setIsDialogueOpen(false);
        setIsRabbitChatOpen(false);
      }),
    ];
    return () => offs.forEach((off) => off());
  }, []);

  // Hall: the guide intro on first arrival; E on him replays it.
  useEffect(() => {
    if (scene === SCENE_HALL && !introShownRef.current) {
      introShownRef.current = true;
      playIntro();
    }
  }, [scene, playIntro]);
  useEffect(() => {
    if (scene === SCENE_HALL && isRabbitChatOpen) {
      setIsRabbitChatOpen(false);
      playIntro();
    }
  }, [scene, isRabbitChatOpen, playIntro]);

  // Leaving the wood resets an unfinished twist (it replays next visit).
  useEffect(() => {
    if (scene === SCENE_CHESHIRE) return;
    abortRef.current?.abort();
    setPhase((p) => (p === "cured" ? p : "idle"));
    if (scene !== SCENE_HALL) say(null);
  }, [scene, say]);

  // A win before the cure also brings the Rabbit in.
  useEffect(() => {
    if (scene === SCENE_CHESHIRE && heldKey && phase === "idle") setPhase("arriving");
  }, [scene, heldKey, phase]);

  // Arriving → walk in, then browse with defenses off.
  useEffect(() => {
    if (phase !== "arriving" || scene !== SCENE_CHESHIRE) return undefined;
    if (rabbitCured) {
      setPhase("cured");
      return undefined;
    }
    clearTimers();
    setStage("arriving");
    say("I'm late, I'm late! Wait, Alice — let me check that page for you!");
    const timer = setTimeout(() => void browse("off"), ARRIVE_SECONDS * 1000);
    return () => clearTimeout(timer);
  }, [phase, scene, rabbitCured, browse, say, setStage]);

  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(() => {
    if (phase === "fooled" && isRabbitChatOpen) inputRef.current?.focus();
  }, [phase, isRabbitChatOpen]);

  // Esc closes the Rabbit reply box when it's the open dialogue.
  useEffect(() => {
    if (!isRabbitChatOpen) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") emit("dialogue-close", null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isRabbitChatOpen]);

  async function sendCure(event: FormEvent): Promise<void> {
    event.preventDefault();
    const text = draft.trim();
    if (!text || phase !== "fooled") return;
    setPhase("curing");
    setDraft("");
    let result = { cured: false, reply: "Hmm? It looked perfectly fine to me… What exactly did you notice?" };
    try {
      const response = await fetch("/api/rabbit/cure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (response.ok) result = (await response.json()) as typeof result;
    } catch {
      // keep the puzzled default; the player can try again
    }
    say(result.reply);
    if (!result.cured) {
      setPhase("fooled");
      return;
    }
    setStage("cured");
    const outcome = useGameStore.getState().cureRabbit();
    if (outcome.keyAwarded && outcome.piece) emit("key-awarded", { piece: outcome.piece, lesson: outcome.lesson });
    timersRef.current.push(setTimeout(() => void browse("on"), ARRIVE_SECONDS * 1000));
  }

  const isWood = scene === SCENE_CHESHIRE;
  const showCure = isWood && (phase === "fooled" || phase === "curing");
  if (!caption && !showCure) return null;

  // Sit above the dialogue panel while it's open, otherwise at the bottom.
  const position = isDialogueOpen && !isRabbitChatOpen ? "top-24" : "bottom-6";
  return (
    <section
      aria-label="The White Rabbit"
      className={`fixed left-1/2 z-30 w-[min(44rem,calc(100vw-2rem))] -translate-x-1/2 ${position} rounded-xl border border-white/20 bg-white/95 p-4 font-sans text-[#2a1020] shadow-2xl`}
    >
      <p className="mb-1 text-xs font-bold uppercase tracking-wider text-[#c8352f]">🐇 White Rabbit</p>
      {caption && (
        <p aria-live="polite" className="text-base leading-snug">
          {caption}
        </p>
      )}
      {showCure && (
        <form onSubmit={sendCure} className="mt-3 flex flex-col gap-2">
          <label htmlFor="rabbit-reply" className="text-sm font-semibold">
            The Rabbit says that page is safe. Do you agree? Tell him what you noticed.
          </label>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              id="rabbit-reply"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={NPC_MAX_TEXT}
              autoComplete="off"
              disabled={phase === "curing"}
              placeholder={locked ? "Press E on the Rabbit (or Esc) to answer him" : "Tell the Rabbit…"}
              className="flex-1 rounded border border-[#2a1020]/30 px-3 py-2"
            />
            <button
              type="submit"
              disabled={phase === "curing" || !draft.trim()}
              className="rounded bg-[#c8352f] px-4 py-2 font-bold text-white disabled:opacity-50"
            >
              Tell him
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
