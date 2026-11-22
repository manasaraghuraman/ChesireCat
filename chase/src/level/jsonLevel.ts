import rules from "../config/leaks.json";
import { footprintActions } from "../config/footprint";
import {
  cottageBounds,
  cottageShell,
  partitionBoxes,
  type Partition,
} from "./partitions";
import type { Box } from "./testRoom";
export type Point = [number, number, number];
export type Leak = {
  kind: "small" | "big";
  type: string;
  pos: Point;
  required: boolean;
  timeCut: number;
};
export interface LevelData {
  id: string;
  name: string;
  footprintChallenge?: boolean;
  /** Footprint points at the start and the goal that opens the Rabbit hole. */
  footprint?: { start: number; target: number };
  /** How many times the Rabbit may switch a finished task back on. */
  rabbitMischief: number;
  spawn: { x: number; y: number; z: number };
  yaw: number;
  boxes: Box[];
  partitions?: Partition[];
  leaks: Leak[];
  glove: Point | null;
  exit: Point;
  rabbitPath: Point[];
  soldiers: { path: Point[]; speed: number }[];
  smogZones: { pos: Point; size: Point; linkedLeak: number }[];
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error("Expected a level object");
  return value as Record<string, unknown>;
}
function point(value: unknown): Point {
  if (
    !Array.isArray(value) ||
    value.length !== 3 ||
    !value.every(Number.isFinite)
  )
    throw Error("Invalid coordinates");
  return [value[0], value[1], value[2]];
}
function list(value: unknown): unknown[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw Error("Expected a level list");
  return value;
}
function path(value: unknown): Point[] {
  const points = list(value).map(point);
  if (
    points.length === 1 ||
    points.some((p, i) => i > 0 && p.every((v, k) => v === points[i - 1][k]))
  )
    throw Error("Invalid actor path");
  return points;
}
/** Validate the playable fields and resolve tag materials and scoring settings. */
export function parseLevel(value: unknown): LevelData {
  const raw = record(value),
    spawn = record(raw.spawn),
    [x, y, z] = point(spawn.pos);
  if (
    typeof raw.id !== "string" ||
    typeof raw.name !== "string" ||
    typeof spawn.yaw !== "number" ||
    !Number.isFinite(spawn.yaw) ||
    !Array.isArray(raw.geometry) ||
    !Array.isArray(raw.leaks)
  )
    throw Error("Invalid level header");
  const boxes = raw.geometry.map((value) => {
    const b = record(value),
      size = point(b.size);
    if (b.shape !== "box" || !Array.isArray(b.tags) || size.some((v) => v <= 0))
      throw Error("Invalid level geometry");
    const wallrun = b.tags.includes("wallrun");
    const tags = b.tags;
    const obstacle = (["breakable", "vent", "phaseable"] as const).find((tag) =>
      tags.includes(tag),
    );
    return {
      obstacle,
      center: point(b.pos),
      size,
      wallrun,
      partition: tags.includes("partition"),
      color: obstacle
        ? { breakable: 0xe58c51, vent: 0xe0bb54, phaseable: 0xc25caf }[obstacle]
        : wallrun
          ? 0x39cfcb
          : 0xd6d5c8,
    };
  });
  const partitions = list(raw.partitions).map((entry): Partition => {
    const partition = record(entry);
    const z = partition.z;
    if (typeof z !== "number" || !Number.isFinite(z))
      throw Error("Invalid partition position");
    const doors = list(partition.doors)
      .map((entry) => {
        const { x, width, room } = record(entry);
        if (
          typeof x !== "number" ||
          !Number.isFinite(x) ||
          typeof width !== "number" ||
          !Number.isFinite(width) ||
          width < 1.4 ||
          typeof room !== "string" ||
          !room.trim()
        )
          throw Error("Invalid cottage doorway");
        return { x, width, room };
      })
      .sort((a, b) => a.x - b.x);
    if (!doors.length) throw Error("Partition needs a doorway");
    return { z, doors };
  });
  const halfWidth = partitions.length ? cottageBounds(boxes).halfWidth : 0;
  if (partitions.length && !Number.isFinite(halfWidth))
    throw Error("Cottage partitions need a floor");
  const walls = partitions.flatMap((partition) => {
    let left = -halfWidth;
    for (const door of partition.doors) {
      const right = door.x + door.width / 2;
      if (door.x - door.width / 2 < left || right > halfWidth)
        throw Error("Cottage doorways overlap or extend outside the wall");
      left = right;
    }
    return partitionBoxes(partition, halfWidth);
  });
  const leaks = raw.leaks.map((value): Leak => {
    const l = record(value);
    if (
      (l.kind !== "small" && l.kind !== "big") ||
      typeof l.type !== "string" ||
      typeof l.required !== "boolean"
    )
      throw Error("Invalid leak");
    const catalog: Record<string, { timeCutSeconds: number }> = rules[l.kind];
    if (!Object.hasOwn(catalog, l.type)) throw Error("Unknown leak type");
    return {
      kind: l.kind,
      type: l.type,
      pos: point(l.pos),
      required: l.required,
      timeCut: catalog[l.type].timeCutSeconds,
    };
  });
  let footprint: LevelData["footprint"];
  if (raw.footprintChallenge === true) {
    const start = leaks.reduce(
      (sum, leak) => sum + (footprintActions[leak.type]?.points ?? 0),
      0,
    );
    const target = raw.footprintTarget ?? 0;
    if (
      leaks.some(
        (leak) =>
          leak.kind !== "small" || !Object.hasOwn(footprintActions, leak.type),
      ) ||
      typeof target !== "number" ||
      !Number.isInteger(target) ||
      target < 0 ||
      target >= start
    )
      throw Error("Invalid footprint challenge actions");
    footprint = { start, target };
  }
  const mischief = raw.rabbitMischief ?? 0;
  if (
    typeof mischief !== "number" ||
    !Number.isInteger(mischief) ||
    mischief < 0
  )
    throw Error("Invalid rabbit mischief count");
  const exit = point(record(raw.rabbitHole).pos),
    rabbitPath = path(raw.rabbitPath);
  if (rabbitPath.length && rabbitPath.at(-1)!.some((v, i) => v !== exit[i]))
    rabbitPath.push(exit);
  const soldiers = list(raw.soldiers).map((item) => {
    const soldier = record(item),
      route = path(soldier.path);
    if (
      !route.length ||
      typeof soldier.speed !== "number" ||
      !Number.isFinite(soldier.speed) ||
      soldier.speed <= 0
    )
      throw Error("Invalid soldier patrol");
    return { path: route, speed: soldier.speed };
  });
  const smogZones = list(raw.smogZones).map((item) => {
    const zone = record(item),
      size = point(zone.size),
      idx = zone.linkedLeak;
    if (
      size.some((v) => v <= 0) ||
      typeof idx !== "number" ||
      !Number.isInteger(idx) ||
      !leaks[idx]
    )
      throw Error("Invalid smog zone or linked leak");
    return { pos: point(zone.pos), size, linkedLeak: idx };
  });
  return {
    id: raw.id,
    name: raw.name,
    footprintChallenge: raw.footprintChallenge === true,
    footprint,
    rabbitMischief: mischief,
    spawn: { x, y, z },
    yaw: spawn.yaw,
    boxes: partitions.length
      ? [...boxes, ...walls, ...cottageShell(boxes)]
      : boxes,
    partitions,
    leaks,
    exit,
    glove: raw.glove ? point(record(raw.glove).pos) : null,
    rabbitPath,
    soldiers,
    smogZones,
  };
}
export async function loadLevel(id = "c1_l1") {
  const response = await fetch(
    import.meta.env.BASE_URL + "levels/" + id + ".level.json",
  );
  if (!response.ok) throw Error("Could not load Lights Out");
  return parseLevel(await response.json());
}
