/**
 * File: lib/schemas.ts
 * Purpose: Zod schemas for game state; validates persisted data at the boundary.
 * Author: manasa
 * Date: 2026-11-21 (updated: Rabbit, link checker, Trial, Looking-Glass contracts)
 */
import { z } from "zod";
import {
  CURE_TEXT_MAX_LENGTH,
  KEY_PIECES,
  LEVEL_IDS,
  LINK_URL_MAX_LENGTH,
  NPC_MAX_TEXT,
  NPC_MAX_TURNS,
  SCAM_TEXT_MAX_LENGTH,
  SIZE_MAX,
  SIZE_MIN,
} from "./constants";

export const LevelId = z.enum(LEVEL_IDS);
export const KeyPiece = z.enum(KEY_PIECES);

export const GameState = z.object({
  size: z.number().min(SIZE_MIN).max(SIZE_MAX),
  keys: z.array(KeyPiece),
  rewindsLeft: z.record(LevelId, z.number()),
  rabbitCured: z.boolean(),
  currentLevel: LevelId,
  lessons: z.array(z.string()),
  /** True after the Trial is won; unlocks Looking-Glass mode. Older saves default to false. */
  hasWon: z.boolean().default(false),
});

export type LevelIdType = z.infer<typeof LevelId>;
export type KeyPieceType = z.infer<typeof KeyPiece>;
export type GameStateType = z.infer<typeof GameState>;

/*
 * LLM output contracts (spec §8).
 *
 * Each contract has two schemas:
 *  - `*Wire`: sent to Groq as the JSON schema. Groq strict mode needs every
 *    field required (no .optional()/.default()) and may reject min/max, so
 *    "optional" fields are .nullable() and there are no numeric/length limits.
 *  - the full schema: run with zod afterwards to enforce the game's real rules.
 *    A failure there counts as a schema failure (retry once, then fallback).
 */

const NPC_ACTIONS = ["none", "open_page", "vanish", "appear", "countdown"] as const;
const REFEREE_OUTCOMES = ["fell_for_it", "resisted", "neutral"] as const;
const LINK_VERDICTS = ["likely-safe", "suspicious", "likely-scam"] as const;

export const RefereeVerdictWire = z.object({
  outcome: z.enum(REFEREE_OUTCOMES),
  sizeDelta: z.number(),
  redFlagsNamed: z.array(z.string()),
  keyEarned: z.boolean(),
  levelComplete: z.boolean(),
  lesson: z.string().nullable(),
  oversharedRealInfo: z.boolean(),
});

export const RefereeVerdict = z.object({
  outcome: z.enum(REFEREE_OUTCOMES),
  sizeDelta: z.number().min(-25).max(20),
  redFlagsNamed: z.array(z.string()),
  keyEarned: z.boolean(),
  levelComplete: z.boolean(),
  lesson: z.string().max(160).nullable(),
  oversharedRealInfo: z.boolean(),
});

export const NpcReplyWire = z.object({
  line: z.string(),
  action: z.enum(NPC_ACTIONS),
  url: z.string().nullable(),
});

export const NpcReply = z.object({
  line: z.string().min(1).max(400),
  action: z.enum(NPC_ACTIONS),
  url: z.string().nullable(),
});

/** What the model decides; the server adds finalUrl and the screenshot itself. */
export const LinkJudgementWire = z.object({
  verdict: z.enum(LINK_VERDICTS),
  reasons: z.array(z.string()),
  checkNext: z.string(),
});

export const LinkJudgement = z.object({
  verdict: z.enum(LINK_VERDICTS),
  reasons: z.array(z.string().min(1)).min(1).max(4),
  checkNext: z.string().min(1),
});

/** One line of an NPC conversation, as the client sends it. */
export const DialogueTurn = z.object({
  role: z.enum(["player", "npc"]),
  text: z.string().trim().min(1).max(NPC_MAX_TEXT),
});

/** Body of POST /api/npc/[id]. The last turn must be the player's. */
export const NpcRequest = z.object({
  turns: z
    .array(DialogueTurn)
    .min(1)
    .max(NPC_MAX_TURNS)
    .refine((turns) => turns.at(-1)?.role === "player", { message: "last turn must be the player's" }),
});

export type DialogueTurnType = z.infer<typeof DialogueTurn>;
export type RefereeVerdictType = z.infer<typeof RefereeVerdict>;
export type NpcReplyType = z.infer<typeof NpcReply>;
export type LinkJudgementType = z.infer<typeof LinkJudgement>;

/*
 * Phase 5-12 contracts: sessions, Rabbit, link checker, Trial, Looking-Glass.
 */

export const SessionId = z.string().uuid();
export const WonderPage = z.enum(["crown-shop", "free-crown", "royal-bank", "tea-times", "court-evidence"]);
export type WonderPageType = z.infer<typeof WonderPage>;

export const SessionBody = z.object({ sessionId: SessionId });
export const LevelStartBody = SessionBody.extend({ isRabbitCured: z.boolean().default(false) });
export const RabbitBody = SessionBody.extend({ page: WonderPage });
export const CureBody = SessionBody.extend({ message: z.string().trim().min(1).max(CURE_TEXT_MAX_LENGTH) });
export const LinkCheckBody = z.object({ url: z.string().trim().min(1).max(LINK_URL_MAX_LENGTH) });
export const ScamBody = z.object({ message: z.string().trim().min(1).max(SCAM_TEXT_MAX_LENGTH) });

export const RabbitEvent = z.discriminatedUnion("type", [
  z.object({ type: z.literal("narration"), text: z.string() }),
  z.object({ type: z.literal("screenshot"), pngBase64: z.string(), url: z.string() }),
  z.object({ type: z.literal("verdict"), safe: z.boolean(), reasons: z.array(z.string()) }),
  z.object({ type: z.literal("replay"), replayUrl: z.string() }),
]);
export type RabbitEventType = z.infer<typeof RabbitEvent>;

export const RabbitVerdictWire = z.object({ safe: z.boolean(), reasons: z.array(z.string()) });
export const RabbitVerdict = z.object({
  safe: z.boolean(),
  reasons: z.array(z.string().min(1)).min(1).max(4),
});
export type RabbitVerdictType = z.infer<typeof RabbitVerdict>;

export const CureJudgementWire = z.object({ isCured: z.boolean(), rabbitReply: z.string() });
export const CureJudgement = z.object({ isCured: z.boolean(), rabbitReply: z.string().min(1).max(300) });
export type CureJudgementType = z.infer<typeof CureJudgement>;

export const LinkVerdict = z.object({
  finalUrl: z.string(),
  verdict: z.enum(["likely-safe", "suspicious", "likely-scam"]),
  reasons: z.array(z.string()).min(1).max(4),
  checkNext: z.string(),
  screenshotPngBase64: z.string(),
});
export type LinkVerdictType = z.infer<typeof LinkVerdict>;

export const EvidenceAnalysisWire = z.object({ isFake: z.boolean(), flaws: z.array(z.string()) });
export const EvidenceAnalysis = z.object({
  isFake: z.boolean(),
  flaws: z.array(z.string().min(1)).min(1).max(5),
});
export type EvidenceAnalysisType = z.infer<typeof EvidenceAnalysis>;

export const ScamDetectionWire = z.object({
  isCaught: z.boolean(),
  redFlagsNamed: z.array(z.string()),
  explanation: z.string(),
});
export const ScamDetection = z.object({
  isCaught: z.boolean(),
  redFlagsNamed: z.array(z.string().min(1)).max(5),
  explanation: z.string().min(1).max(300),
});
export type ScamDetectionType = z.infer<typeof ScamDetection>;
