/**
 * File: game3d/zones.test.ts
 * Purpose: Tests for zone logic that doesn't need WebGL: Hall door rules, key-slot text,
 *          shipped level files, and comfort settings.
 * Date: 2026-11-21
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { Group, PerspectiveCamera, Scene } from "three";
import { emit, on } from "../game/bridge";
import { SCENE_GARDEN, SCENE_HALL } from "../lib/constants";
import { createGardenZone } from "./zones/garden";
import { parseLevel } from "./level";
import { cleanSettings, DEFAULT_SETTINGS, loadSettings, saveSettings, SETTINGS_KEY } from "./settings";
import { KEY_HEIGHT } from "./sizing";
import { DEMO_UNLOCKED_DOOR, gardenApproach, hallInteractables, keyTableText } from "./zones/hall";

function level(id: string) {
  return parseLevel(JSON.parse(readFileSync(join(process.cwd(), `public/levels/${id}.level.json`), "utf8")));
}

describe("hall", () => {
  const base = level("hall").interactables;

  it("opens exactly the Cheshire, Carbon Maze and Greenwash Check doors and keeps the garden locked", () => {
    const items = hallInteractables(base, []);
    const enabled = items.filter((i) => i.kind === "door" && i.enabled).map((i) => i.id);
    expect(enabled.sort()).toEqual([`door-caterpillar`, `door-hatter`, `door-${DEMO_UNLOCKED_DOOR}`].sort());
    expect(items.find((i) => i.id === "garden-door")?.enabled).toBe(false);
  });

  it("unlocks the garden door only with all three garden keys", () => {
    const garden = (keys: Parameters<typeof hallInteractables>[1]) =>
      hallInteractables(base, keys).find((i) => i.id === "garden-door")?.enabled;
    expect(garden([])).toBe(false);
    expect(garden(["cheshire", "caterpillar"])).toBe(false);
    expect(garden(["cheshire", "caterpillar", "hatter"])).toBe(true);
    expect(garden(["cheshire", "caterpillar", "queen"])).toBe(false);
  });

  it("garden approach opens only with all three keys and says how many you have otherwise", () => {
    expect(gardenApproach(["cheshire", "caterpillar", "hatter"]).isOpen).toBe(true);
    const two = gardenApproach(["cheshire", "hatter"]);
    expect(two.isOpen).toBe(false);
    expect(two.message).toMatch(/You have 2/);
    expect(gardenApproach([]).message).toMatch(/You have 0/);
  });

  it("makes the garden door easy to trigger: not a floor-level, tiny-radius target", () => {
    const garden = base.find((i) => i.id === "garden-door");
    expect(garden?.pos[1]).toBeGreaterThanOrEqual(0.9);
    expect(garden?.radius).toBeGreaterThanOrEqual(1.2);
  });

  it("marks earned doors with a tick", () => {
    const items = hallInteractables(base, ["cheshire"]);
    expect(items.find((i) => i.id === "door-cheshire")?.label).toMatch(/✓$/);
    expect(items.find((i) => i.id === "door-hatter")?.label).not.toMatch(/✓/);
  });

  it("puts the key slot at KEY_HEIGHT so the size rule is physical", () => {
    expect(base.find((i) => i.id === "key-table")?.pos[1]).toBeCloseTo(KEY_HEIGHT, 6);
  });

  it("describes the key slot from the store's keys", () => {
    expect(keyTableText([])).toMatch(/empty/);
    expect(keyTableText(["cheshire"])).toMatch(/1 of 3.*Cheshire Cat/);
  });
});

describe("shipped levels", () => {
  it.each(["hall", "cheshire", "maze", "clues", "garden"])("%s parses", (id) => {
    expect(level(id).id).toBe(id);
  });
});

it("opens the chase from the garden door and returns to the Hall", () => {
  vi.stubGlobal("document", { createElement: () => ({ getContext: () => null }) });
  const zone = createGardenZone();
  const opened = vi.fn();
  const goTo = vi.fn();
  const off = on("chase-open", opened);
  try {
    zone.enter({
      root: new Group(),
      scene: new Scene(),
      camera: new PerspectiveCamera(),
      level: level("garden"),
      reducedMotion: false,
      goTo,
      setInteractables: vi.fn(),
      setCinematic: vi.fn(),
      lookAt: vi.fn(),
      openDialogue: vi.fn(),
      eyePosition: () => [0, 1.5, -10],
    });
    emit("interact", { id: "carbon-chase-door" });
    expect(opened).toHaveBeenCalledOnce();
    emit("exit-level", null);
    expect(goTo).toHaveBeenCalledWith(SCENE_HALL);
    expect(zone.id).toBe(SCENE_GARDEN);
  } finally {
    zone.exit();
    off();
    vi.unstubAllGlobals();
  }
});

describe("settings", () => {
  it("clamps and defaults bad values", () => {
    expect(cleanSettings({ fov: 500, mouseSensitivity: "fast", invertY: "yes" })).toEqual({
      ...DEFAULT_SETTINGS,
      fov: 100,
    });
    expect(cleanSettings(null)).toEqual(DEFAULT_SETTINGS);
  });

  it("round-trips through storage under its own key and survives broken storage", () => {
    const data = new Map<string, string>();
    const storage = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
    saveSettings(storage, { ...DEFAULT_SETTINGS, fov: 90, invertY: true });
    expect([...data.keys()]).toEqual([SETTINGS_KEY]);
    expect(loadSettings(storage)).toMatchObject({ fov: 90, invertY: true });
    const broken = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(loadSettings(broken)).toEqual(DEFAULT_SETTINGS);
    expect(() => saveSettings(broken, DEFAULT_SETTINGS)).not.toThrow();
  });
});
