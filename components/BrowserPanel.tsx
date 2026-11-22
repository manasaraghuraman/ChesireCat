/**
 * File: components/BrowserPanel.tsx
 * Purpose: Top-right HUD mirror of the in-world screen: the page's address as plain text, and the
 *          Solari screenshot (or a placeholder mock before one exists) at full resolution, because
 *          text on a 3D plane is hard to read (spec §2.6).
 * Date: 2026-11-21
 */
"use client";

import { useEffect, useState } from "react";
import { on } from "@/game/bridge";
import { displayPageFor } from "@/lib/wonderweb/display";

interface Page {
  readonly url: string;
  readonly pngBase64?: string;
}

function Mock({ url }: { readonly url: string }) {
  const page = displayPageFor(url);
  return (
    <div className="flex flex-col items-center gap-2 bg-[#fff6dc] px-4 py-5 text-center font-serif text-[#3b2a12]">
      <p className="text-lg font-bold text-[#7a1f1f]">{page.title}</p>
      {page.lines.map((line) => (
        <p key={line} className="text-sm">
          {line}
        </p>
      ))}
      <p className="w-4/5 rounded border-2 border-[#7a1f1f] bg-white px-2 py-1 font-sans text-xs text-[#8a7a6a]">{page.field}</p>
      <p className="rounded bg-[#c8102e] px-4 py-1 font-sans text-xs font-bold text-white">{page.cta}</p>
    </div>
  );
}

export default function BrowserPanel() {
  const [page, setPage] = useState<Page | null>(null);
  useEffect(() => {
    const offs = [on("show-page", setPage), on("scene-changed", () => setPage(null))];
    return () => offs.forEach((off) => off());
  }, []);
  if (!page) return null;

  return (
    <aside
      aria-label="Web page the character is showing"
      className="fixed right-4 top-4 z-20 w-[min(26rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-white/20 bg-black/80 font-sans shadow-2xl"
    >
      <div className="flex items-center gap-2 bg-[#e9e4ef] px-2 py-1.5">
        <span aria-hidden className="text-xs">🔒</span>
        <p className="flex-1 truncate rounded bg-white px-2 py-0.5 font-mono text-sm font-bold text-[#b3261e]" title={page.url}>
          {page.url}
        </p>
        <button type="button" onClick={() => setPage(null)} aria-label="Close page" className="px-1 text-black/70 hover:text-black">
          ✕
        </button>
      </div>
      {page.pngBase64 ? (
        // eslint-disable-next-line @next/next/no-img-element -- base64 screenshot, nothing to optimize
        <img src={`data:image/png;base64,${page.pngBase64}`} alt={`Screenshot of ${page.url}`} className="block w-full" />
      ) : (
        <Mock url={page.url} />
      )}
    </aside>
  );
}
