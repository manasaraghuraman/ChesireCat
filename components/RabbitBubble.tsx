/**
 * File: components/RabbitBubble.tsx
 * Purpose: The White Rabbit's speech bubble. Narration streams in as real text (caption and
 *          screen-reader friendly, spec §12).
 * Author: manasa
 * Date: 2026-11-21
 */
interface Props {
  readonly text: string;
  /** True while the Rabbit is talking: announces new text politely to screen readers. */
  readonly isLive?: boolean;
}

export default function RabbitBubble({ text, isLive = false }: Props) {
  return (
    <figure className="flex items-start gap-3 rounded-2xl bg-white/90 p-3 text-purple-950">
      <span aria-hidden="true" className="text-3xl">
        🐇
      </span>
      <figcaption className="flex-1">
        <span className="block text-xs font-bold uppercase tracking-wide">White Rabbit</span>
        <span aria-live={isLive ? "polite" : "off"} className="block">
          {text || "…"}
        </span>
      </figcaption>
    </figure>
  );
}
