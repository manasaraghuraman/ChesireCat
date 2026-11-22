/**
 * File: game3d/zones.test.ts
 * Purpose: Tests for zone logic that doesn't need WebGL: Hall door rules, key-slot text,
 *          shipped level files, and comfort settings.
 * Date: 2026-11-21
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseLevel } from "./level";
import { cleanSettings, DEFAULT_SETTINGS, loadSettings, saveSettings, SETTINGS_KEY } from "./settings";
import { KEY_HEIGHT } from "./sizing";
import { DEMO_UNLOCKED_DOOR, hallInteractables, keyTableText } from "./zones/hall";

function level(id: string) {
  return parseLevel(JSON.parse(readFileSync(join(process.cwd(), `public/levels/${id}.level.json`), "utf8")));
}

describe("hall", () => {
  const base = level("hall").interactables;

  it("enables only the demo door and keeps the garden locked", () => {
    const items = hallInteractables(base, []);
    const enabled = items.filter((i) => i.kind === "door" && i.enabled).map((i) => i.id);
    expect(enabled).toEqual([`door-${DEMO_UNLOCKED_DOOR}`]);
    expect(items.find((i) => i.id === "garden-door")?.enabled).toBe(false);
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
    expect(keyTableText(["cheshire"])).toMatch(/1 of 4.*Cheshire Cat/);
  });
});

describe("shipped levels", () => {
  it.each(["hall", "cheshire"])("%s parses", (id) => {
    expect(level(id).id).toBe(id);
  });
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
