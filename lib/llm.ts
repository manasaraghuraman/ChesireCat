/**
 * File: lib/llm.ts
 * Purpose: Server-only Groq access: model selection, streamed text, and
 *          zod-validated structured output (retry once, then fallback).
 * Author: varenya
 * Date: 2026-11-21
 */
import { createGroq, type GroqLanguageModelChatOptions } from "@ai-sdk/groq";
import { generateText, Output, streamText, type LanguageModel, type ModelMessage } from "ai";
import type { z } from "zod";

const DEFAULT_TEXT_MODEL = "openai/gpt-oss-20b";
const DEFAULT_VISION_MODEL = "qwen/qwen3.8-27b";

/** Structured calls are tried this many times before the fallback is used. */
export const STRUCTURED_ATTEMPTS = 2;

function requireApiKey(): string {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    throw new Error("GROQ_API_KEY is not set. Add it to .env.local (server-side only).");
  }
  return key;
}

let provider: ReturnType<typeof createGroq> | undefined;

function groq(): ReturnType<typeof createGroq> {
  provider ??= createGroq({ apiKey: requireApiKey() });
  return provider;
}

/** Text model: NPC dialogue, Referee. */
export function textModel(): LanguageModel {
  return groq()(process.env.GROQ_MODEL || DEFAULT_TEXT_MODEL);
}

/** Vision model: anything that sends an image (Rabbit, link checker, Trial evidence). */
export function visionModel(): LanguageModel {
  return groq()(process.env.GROQ_VISION_MODEL || DEFAULT_VISION_MODEL);
}

interface Prompted {
  readonly system: string;
  readonly messages: ModelMessage[];
  readonly temperature?: number;
  /** Cap on reply length in tokens (includes reasoning tokens for gpt-oss). */
  readonly maxOutputTokens?: number;
  /** gpt-oss/qwen thinking budget; "low" is much faster for chat. */
  readonly reasoningEffort?: GroqLanguageModelChatOptions["reasoningEffort"];
  readonly abortSignal?: AbortSignal;
}

function callSettings(options: Prompted) {
  return {
    system: options.system,
    messages: options.messages,
    temperature: options.temperature,
    maxOutputTokens: options.maxOutputTokens,
    abortSignal: options.abortSignal,
    providerOptions: options.reasoningEffort
      ? { groq: { reasoningEffort: options.reasoningEffort } satisfies GroqLanguageModelChatOptions }
      : undefined,
  };
}

export interface StreamTextOptions extends Prompted {
  readonly model?: LanguageModel;
  readonly onError?: (error: unknown) => void;
}

/**
 * Streams plain text (NPC lines, narration). Groq can't combine streaming with
 * structured output, so anything that needs JSON uses generateStructured instead.
 */
export function streamLine(options: StreamTextOptions): AsyncIterable<string> {
  const result = streamText({
    model: options.model ?? textModel(),
    ...callSettings(options),
    onError: ({ error }) => options.onError?.(error),
  });
  return result.textStream;
}

export interface StructuredOptions<Wire extends z.ZodType, Full extends z.ZodType> extends Prompted {
  readonly model?: LanguageModel;
  /** Schema Groq sees (strict-mode friendly: all fields required, no limits). */
  readonly wireSchema: Wire;
  /** Schema the game trusts; parsed after the model answers. */
  readonly schema: Full;
  /** Returned when every attempt fails (e.g. a safe in-character line). */
  readonly fallback: z.infer<Full>;
  readonly onAttemptFailed?: (attempt: number, error: unknown) => void;
}

export interface StructuredResult<T> {
  readonly value: T;
  readonly usedFallback: boolean;
  readonly attempts: number;
}

/**
 * Non-streamed JSON call: wire schema → Groq strict JSON → full zod parse.
 * Any failure (API error, bad JSON, rule violation) retries once, then returns
 * the fallback instead of throwing, so a route can always answer in character.
 */
export async function generateStructured<Wire extends z.ZodType, Full extends z.ZodType>(
  options: StructuredOptions<Wire, Full>,
): Promise<StructuredResult<z.infer<Full>>> {
  for (let attempt = 1; attempt <= STRUCTURED_ATTEMPTS; attempt++) {
    try {
      const { output } = await generateText({
        model: options.model ?? textModel(),
        ...callSettings(options),
        output: Output.object({ schema: options.wireSchema }),
      });
      const parsed = options.schema.safeParse(output);
      if (parsed.success) {
        return { value: parsed.data, usedFallback: false, attempts: attempt };
      }
      options.onAttemptFailed?.(attempt, parsed.error);
    } catch (error) {
      if (options.abortSignal?.aborted) throw error;
      options.onAttemptFailed?.(attempt, error);
    }
  }
  return { value: options.fallback, usedFallback: true, attempts: STRUCTURED_ATTEMPTS };
}
