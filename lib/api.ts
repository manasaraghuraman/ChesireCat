/**
 * File: lib/api.ts
 * Purpose: Shared route-handler helpers: validated JSON bodies (OWASP A03) and uniform errors
 *          that never leak internals.
 * Author: manasa
 * Date: 2026-11-21
 */
import type { z } from "zod";

export type ParsedBody<T> =
  | { readonly isOk: true; readonly value: T }
  | { readonly isOk: false; readonly response: Response };

export function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

/** Parses the request JSON against a zod schema; the failure case carries the Response to return. */
export async function parseBody<S extends z.ZodType>(request: Request, schema: S): Promise<ParsedBody<z.infer<S>>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { isOk: false, response: jsonError("Invalid JSON.", 400) };
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return { isOk: false, response: jsonError("Invalid request.", 400) };
  return { isOk: true, value: parsed.data };
}

export const TOO_MANY_REQUESTS = "Too many requests. Take a breath and try again in a minute.";
