/**
 * File: game3d/level.ts
 * Purpose: Gray-box JSON level format, validation and loading.
 *          Adapted from carbon-footprint game src/level/jsonLevel.ts (speedrun fields dropped;
 *          interactables and npcs added per CHESHIRE_3D_BUILD_PROMPT Appendix B).
 * Date: 2026-11-21
 */
import { LEVELS_PATH } from "./config";

export type Vec3 = readonly [number, number, number];

export const INTERACTABLE_KINDS = ["door", "npc", "sign", "key", "screen"] as const;
export type InteractableKind = (typeof INTERACTABLE_KINDS)[number];

/**
 * Gray-box palette per tag (floor light gray, walls muted purple, interactables saturated).
 * Special tags: `invisible` = collider only (an entity draws it), `tree` = drawn as trunk + canopy,
 * `glass` = translucent.
 */
export const TAG_COLORS = {
  floor: 0xd8d6cc,
  wall: 0x8a7a9e,
  ceiling: 0x6d6280,
  prop: 0xb9a6d3,
  interactable: 0xe0559a,
  tree: 0x5b4636,
  glass: 0xbfe6ff,
  curtain: 0x8e1f2f,
  invisible: 0x000000,
} as const;
export type GeometryTag = keyof typeof TAG_COLORS;
const GEOMETRY_TAGS = Object.keys(TAG_COLORS) as GeometryTag[];

export interface LevelBox {
  readonly center: Vec3;
  readonly size: Vec3;
  /** Rotation about the vertical axis, radians. */
  readonly rotY: number;
  readonly tags: readonly GeometryTag[];
  readonly color: number;
}

export interface LevelInteractable {
  readonly id: string;
  readonly kind: InteractableKind;
  readonly pos: Vec3;
  readonly radius: number;
  readonly label: string;
  readonly enabled: boolean;
}

export interface LevelNpc {
  readonly id: string;
  readonly pos: Vec3;
  readonly branchPositions: readonly Vec3[];
}

export interface LevelData {
  readonly id: string;
  readonly name: string;
  readonly spawn: Vec3;
  readonly yaw: number;
  readonly boxes: readonly LevelBox[];
  readonly interactables: readonly LevelInteractable[];
  readonly npcs: readonly LevelNpc[];
}

function record(value: unknown, what: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`Expected ${what} object`);
  return value as Record<string, unknown>;
}

function finite(value: unknown, what: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`Invalid ${what}`);
  return value;
}

function text(value: unknown, what: string): string {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`Invalid ${what}`);
  return value;
}

function vec3(value: unknown, what: string): Vec3 {
  if (!Array.isArray(value) || value.length !== 3) throw new Error(`Invalid ${what} coordinates`);
  return [finite(value[0], what), finite(value[1], what), finite(value[2], what)];
}

function list(value: unknown, what: string): unknown[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error(`Expected ${what} list`);
  return value;
}

function parseBox(value: unknown): LevelBox {
  const raw = record(value, "geometry");
  if (raw.shape !== "box") throw new Error("Only box geometry is supported");
  const size = vec3(raw.size, "geometry size");
  if (size.some((v) => v <= 0)) throw new Error("Geometry size must be positive");
  const tags = list(raw.tags, "tags");
  if (!tags.length || !tags.every((t): t is GeometryTag => GEOMETRY_TAGS.includes(t as GeometryTag))) {
    throw new Error("Unknown geometry tag");
  }
  const colorTag = GEOMETRY_TAGS.find((t) => tags.includes(t) && t !== "floor") ?? "floor";
  return {
    center: vec3(raw.pos, "geometry position"),
    size,
    rotY: raw.rotY === undefined ? 0 : finite(raw.rotY, "geometry rotY"),
    tags,
    color: TAG_COLORS[colorTag],
  };
}

function parseInteractable(value: unknown): LevelInteractable {
  const raw = record(value, "interactable");
  if (!INTERACTABLE_KINDS.includes(raw.kind as InteractableKind)) throw new Error("Unknown interactable kind");
  const radius = finite(raw.radius, "interactable radius");
  if (radius <= 0) throw new Error("Interactable radius must be positive");
  if (typeof raw.enabled !== "boolean") throw new Error("Invalid interactable enabled flag");
  return {
    id: text(raw.id, "interactable id"),
    kind: raw.kind as InteractableKind,
    pos: vec3(raw.pos, "interactable position"),
    radius,
    label: text(raw.label, "interactable label"),
    enabled: raw.enabled,
  };
}

function parseNpc(value: unknown): LevelNpc {
  const raw = record(value, "npc");
  return {
    id: text(raw.id, "npc id"),
    pos: vec3(raw.pos, "npc position"),
    branchPositions: list(raw.branchPositions, "branchPositions").map((p) => vec3(p, "npc branch")),
  };
}

/** Validates a level JSON value. Throws a descriptive Error on any malformed field. */
export function parseLevel(value: unknown): LevelData {
  const raw = record(value, "level");
  const spawn = record(raw.spawn, "spawn");
  if (!Array.isArray(raw.geometry) || raw.geometry.length === 0) throw new Error("Level needs geometry");
  const interactables = list(raw.interactables, "interactables").map(parseInteractable);
  const ids = new Set(interactables.map((i) => i.id));
  if (ids.size !== interactables.length) throw new Error("Duplicate interactable id");
  return {
    id: text(raw.id, "level id"),
    name: text(raw.name, "level name"),
    spawn: vec3(spawn.pos, "spawn"),
    yaw: finite(spawn.yaw, "spawn yaw"),
    boxes: raw.geometry.map(parseBox),
    interactables,
    npcs: list(raw.npcs, "npcs").map(parseNpc),
  };
}

const LEVEL_ID_PATTERN = /^[a-z0-9-]+$/;

export async function loadLevel(id: string): Promise<LevelData> {
  if (!LEVEL_ID_PATTERN.test(id)) throw new Error("Invalid level id");
  const response = await fetch(`${LEVELS_PATH}${id}.level.json`);
  if (!response.ok) throw new Error(`Could not load level "${id}" (${response.status})`);
  return parseLevel(await response.json());
}
