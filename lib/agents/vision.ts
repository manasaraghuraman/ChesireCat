/**
 * File: lib/agents/vision.ts
 * Purpose: Structured JSON from a screenshot + text. Tries the vision model; because the preview
 *          vision model may be removed at short notice (spec §4), a failed attempt falls back to
 *          the text model with page text only, then to the caller's offline fallback.
 * Author: manasa
 * Date: 2026-11-21
 */
import type { z } from "zod";
import { generateStructured, textModel, visionModel, type StructuredOptions, type StructuredResult } from "../llm";

export interface VisionStructuredOptions<Wire extends z.ZodType, Full extends z.ZodType>
  extends Omit<StructuredOptions<Wire, Full>, "messages" | "model"> {
  readonly text: string;
  readonly imageBase64: string;
}

export async function structuredWithVision<Wire extends z.ZodType, Full extends z.ZodType>(
  options: VisionStructuredOptions<Wire, Full>,
): Promise<StructuredResult<z.infer<Full>>> {
  const { text, imageBase64, ...shared } = options;
  const withImage = await generateStructured({
    ...shared,
    model: visionModel(),
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text },
          { type: "file", data: imageBase64, mediaType: "image/png" },
        ],
      },
    ],
  });
  if (!withImage.usedFallback) return withImage;
  return generateStructured({ ...shared, model: textModel(), messages: [{ role: "user", content: text }] });
}
