/**
 * File: lib/agents/personas/public.ts
 * Purpose: Client-safe registry of the four trial characters (names and opening lines only),
 *          keyed by key piece. Never import server-only persona or rubric files from client code.
 * Author: manasa
 * Date: 2026-11-21
 */
import type { KeyPieceType } from "../../schemas";
import { CATERPILLAR_PUBLIC } from "./caterpillar.public";
import { CHESHIRE_PUBLIC } from "./cheshire.public";
import { HATTER_PUBLIC } from "./hatter.public";
import { QUEEN_PUBLIC } from "./queen.public";

export interface PublicNpc {
  readonly displayName: string;
  readonly openingLine: string;
}

export const NPC_PUBLIC: Readonly<Record<KeyPieceType, PublicNpc>> = {
  caterpillar: CATERPILLAR_PUBLIC,
  cheshire: CHESHIRE_PUBLIC,
  hatter: HATTER_PUBLIC,
  queen: QUEEN_PUBLIC,
};
