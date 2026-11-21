/**
 * File: lib/solari/result.ts
 * Purpose: Typed success/failure result so Solari wrappers never throw to callers.
 * Author: manasa
 * Date: 2026-11-21
 */
export type SolariFailureCode =
  | "invalid-config"
  | "invalid-url"
  | "launch-failed"
  | "navigation-failed"
  | "sandbox-failed"
  | "cleanup-failed";

export interface SolariFailure {
  readonly code: SolariFailureCode;
  /** Safe to show to developers; never contains keys or preview tokens. */
  readonly message: string;
}

export type Result<T> =
  | { readonly isOk: true; readonly value: T }
  | { readonly isOk: false; readonly error: SolariFailure };

export const ok = <T>(value: T): Result<T> => ({ isOk: true, value });

export const fail = (code: SolariFailureCode, message: string): Result<never> => ({
  isOk: false,
  error: { code, message },
});

/** Short, key-free description of an unknown thrown value. */
export function describeError(error: unknown): string {
  return error instanceof Error ? error.name + ": " + error.message : "unknown error";
}
