/**
 * File: lib/solari/config.ts
 * Purpose: Validated server-side Solari configuration read from the environment.
 * Author: manasa
 * Date: 2026-11-21
 */
import { z } from "zod";
import { fail, ok, type Result } from "./result";

export const TTL_MIN_SECONDS = 30;
export const TTL_MAX_SECONDS = 3600;
export const TTL_DEFAULT_SECONDS = 600;
export const MS_PER_SECOND = 1000;
export const APP_METADATA_KEY = "app";
export const APP_METADATA_VALUE = "rabbit-hole";

const EnvSchema = z.object({
  SOLARI_API_KEY: z.string().startsWith("slr_live_"),
  SOLARI_SESSION_TTL_SECONDS: z.coerce
    .number()
    .int()
    .min(TTL_MIN_SECONDS)
    .max(TTL_MAX_SECONDS)
    .default(TTL_DEFAULT_SECONDS),
});

export interface SolariConfig {
  readonly apiKey: string;
  readonly ttlSeconds: number;
}

export function getSolariConfig(env: Readonly<Record<string, string | undefined>> = process.env): Result<SolariConfig> {
  const parsed = EnvSchema.safeParse({
    SOLARI_API_KEY: env.SOLARI_API_KEY,
    SOLARI_SESSION_TTL_SECONDS: env.SOLARI_SESSION_TTL_SECONDS || undefined,
  });
  if (!parsed.success) {
    return fail("invalid-config", "SOLARI_API_KEY (slr_live_...) is missing or TTL is out of range. Check .env.local.");
  }
  return ok({ apiKey: parsed.data.SOLARI_API_KEY, ttlSeconds: parsed.data.SOLARI_SESSION_TTL_SECONDS });
}
