/**
 * File: lib/api.test.ts
 * Purpose: Tests for route helpers: boundary validation and uniform errors.
 * Author: manasa
 * Date: 2026-11-21
 */
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { jsonError, parseBody } from "./api";

const schema = z.object({ name: z.string().min(1) });
const post = (body: string) => new Request("http://test", { method: "POST", body });

describe("parseBody", () => {
  it("returns the validated value", async () => {
    const result = await parseBody(post('{"name":"x"}'), schema);
    expect(result).toEqual({ isOk: true, value: { name: "x" } });
  });

  it("answers 400 for malformed JSON", async () => {
    const result = await parseBody(post("{nope"), schema);
    expect(result.isOk).toBe(false);
    if (!result.isOk) expect(result.response.status).toBe(400);
  });

  it("answers 400 for a body that fails the schema, without echoing it", async () => {
    const result = await parseBody(post('{"name":""}'), schema);
    expect(result.isOk).toBe(false);
    if (!result.isOk) expect(await result.response.json()).toEqual({ error: "Invalid request." });
  });
});

describe("jsonError", () => {
  it("sets status and message", async () => {
    const response = jsonError("nope", 429);
    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ error: "nope" });
  });
});
