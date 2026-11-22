/**
 * File: components/BrowserView.tsx
 * Purpose: Shows a screenshot of a page opened inside Solari. The real page never loads on the
 *          player's machine: only this image does (spec §12).
 * Author: manasa
 * Date: 2026-11-21
 */
interface Props {
  readonly pngBase64: string;
  /** The pretend ".wonder" address, or the checked site's address. */
  readonly address: string;
  readonly alt: string;
}

export default function BrowserView({ pngBase64, address, alt }: Props) {
  return (
    <figure className="overflow-hidden rounded border-2 border-amber-400 bg-white">
      <figcaption className="bg-purple-950 px-3 py-1 font-mono text-xs text-amber-200">{address}</figcaption>
      {/* A data URI from our own server: next/image optimisation does not apply. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`data:image/png;base64,${pngBase64}`} alt={alt} className="w-full" />
    </figure>
  );
}
