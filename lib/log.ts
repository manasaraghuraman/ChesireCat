/**
 * File: lib/log.ts
 * Purpose: Project logger: one structured line per event (timestamp, level, operation, outcome,
 *          optional request id). Callers must never pass secrets, tokens, URLs with tokens, or PII.
 * Author: manasa
 * Date: 2026-11-21
 */
export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

export interface LogEvent {
  readonly level: LogLevel;
  readonly operation: string;
  readonly outcome: string;
  readonly requestId?: string;
}

const SINKS: Readonly<Record<LogLevel, (line: string) => void>> = {
  DEBUG: (line) => console.debug(line),
  INFO: (line) => console.info(line),
  WARN: (line) => console.warn(line),
  ERROR: (line) => console.error(line),
};

export function formatLogLine(event: LogEvent, now: Date = new Date()): string {
  return JSON.stringify({ timestamp: now.toISOString(), ...event });
}

export function logEvent(event: LogEvent): void {
  SINKS[event.level](formatLogLine(event));
}

/** Short id that ties together the log lines of one request. */
export function newRequestId(): string {
  return crypto.randomUUID().slice(0, 8);
}
