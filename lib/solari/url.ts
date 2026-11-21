/**
 * File: lib/solari/url.ts
 * Purpose: Validate and allowlist URLs before any server-side browser visit (OWASP A10).
 * Author: manasa
 * Date: 2026-11-21
 */
import { fail, ok, type Result } from "./result";

export const MAX_URL_LENGTH = 2048;
const ALLOWED_PROTOCOLS: ReadonlySet<string> = new Set(["http:", "https:"]);
const BLOCKED_SUFFIXES = [".local", ".internal", ".localhost"] as const;
const IPV4_PATTERN = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
const PRIVATE_FIRST_OCTETS: ReadonlySet<number> = new Set([0, 10, 127]);
const LINK_LOCAL_FIRST_OCTET = 169;
const CGNAT_FIRST_OCTET = 100;
const CGNAT_SECOND_MIN = 64;
const CGNAT_SECOND_MAX = 127;
const PRIVATE_172_FIRST = 16;
const PRIVATE_172_LAST = 31;

function isPrivateIpv4(host: string): boolean {
  const match = IPV4_PATTERN.exec(host);
  if (!match) return false;
  const [first = 0, second = 0] = [Number(match[1]), Number(match[2])];
  return (
    PRIVATE_FIRST_OCTETS.has(first) ||
    first === LINK_LOCAL_FIRST_OCTET ||
    (first === 172 && second >= PRIVATE_172_FIRST && second <= PRIVATE_172_LAST) ||
    (first === 192 && second === 168) ||
    (first === CGNAT_FIRST_OCTET && second >= CGNAT_SECOND_MIN && second <= CGNAT_SECOND_MAX)
  );
}

function isInternalHost(host: string): boolean {
  if (host === "localhost" || host.includes(":")) return true; // IPv6 literals are not allowed at all
  if (BLOCKED_SUFFIXES.some((suffix) => host.endsWith(suffix))) return true;
  return isPrivateIpv4(host);
}

export function validateTargetUrl(raw: string): Result<URL> {
  if (raw.length === 0 || raw.length > MAX_URL_LENGTH) return fail("invalid-url", "URL length is not allowed.");
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return fail("invalid-url", "URL could not be parsed.");
  }
  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) return fail("invalid-url", "Only http(s) URLs are allowed.");
  if (parsed.username || parsed.password) return fail("invalid-url", "URLs with credentials are not allowed.");
  if (isInternalHost(parsed.hostname)) return fail("invalid-url", "Internal addresses are not allowed.");
  return ok(parsed);
}
