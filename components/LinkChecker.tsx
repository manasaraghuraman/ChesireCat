/**
 * File: components/LinkChecker.tsx
 * Purpose: Hub tool (spec §3.6): paste a real link, Solari opens it in isolation, the AI explains
 *          whether it looks trustworthy. Only a screenshot comes back; the page never loads here.
 * Author: manasa
 * Date: 2026-11-21
 */
"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { LINK_URL_MAX_LENGTH } from "@/lib/constants";
import { checkLinkRequest } from "@/lib/client/requests";
import type { LinkVerdictType } from "@/lib/schemas";
import BrowserView from "./BrowserView";

const VERDICT_LABELS: Readonly<Record<LinkVerdictType["verdict"], string>> = {
  "likely-safe": "Looks safe",
  suspicious: "Looks suspicious",
  "likely-scam": "Looks like a scam",
};

export default function LinkChecker() {
  const [url, setUrl] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<LinkVerdictType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  async function check(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!url.trim() || isChecking) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setIsChecking(true);
    setError(null);
    setResult(null);
    try {
      setResult(await checkLinkRequest(url.trim(), controller.signal));
    } catch (caught) {
      if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "Something went wrong.");
    } finally {
      setIsChecking(false);
    }
  }

  return (
    <section aria-label="Link checker" className="flex flex-col gap-3 rounded bg-black/50 p-4">
      <h2 className="text-lg font-bold">Link checker</h2>
      <p className="text-sm">
        Paste a link you&apos;re unsure about. The Rabbit opens it far away in a safe bubble and tells you what it
        sees. I&apos;m a learning aid, not a guarantee, so always check with a trusted adult too.
      </p>
      <form onSubmit={check} className="flex gap-2">
        <label htmlFor="link-url" className="sr-only">
          Link to check
        </label>
        <input
          id="link-url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          maxLength={LINK_URL_MAX_LENGTH}
          inputMode="url"
          autoComplete="off"
          placeholder="https://…"
          className="flex-1 rounded bg-white/90 px-3 py-2 text-purple-950"
        />
        <button type="submit" disabled={isChecking || !url.trim()} className="rounded bg-amber-400 px-4 py-2 font-bold text-purple-950 disabled:opacity-50">
          {isChecking ? "Checking…" : "Check it"}
        </button>
      </form>
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      {result && <LinkResult result={result} />}
    </section>
  );
}

function LinkResult({ result }: { readonly result: LinkVerdictType }) {
  return (
    <div role="status" className="flex flex-col gap-2">
      <p className="text-lg font-bold">{VERDICT_LABELS[result.verdict]}</p>
      <ul className="list-disc pl-5 text-sm">
        {result.reasons.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
      <p className="text-sm">
        <strong>Check next:</strong> {result.checkNext}
      </p>
      <BrowserView pngBase64={result.screenshotPngBase64} address={result.finalUrl} alt="Screenshot of the checked page" />
    </div>
  );
}
