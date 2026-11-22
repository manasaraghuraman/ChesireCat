import { expect, it } from "vitest";
import { chaseChoice, chaseLevels, nextChaseLevel } from "./chase";

it("traverses the complete vendored course list in order and ends after the lab", () => {
  expect(chaseLevels).toEqual(["c1_l1", "c1_l2", "c1_l3", "c1_l4", "c1_l5", "power_lab"]);
  chaseLevels.forEach((level, i) => expect(nextChaseLevel(level)).toBe(chaseLevels[i + 1] ?? null));
});

it("accepts hall exits and completed next choices only for the active course", () => {
  const message = { source: "carbon-chase", level: "c1_l1" };
  expect(chaseChoice({ ...message, choice: "hall", completed: false }, "c1_l1")).toEqual({ choice: "hall", completed: false });
  expect(chaseChoice({ ...message, choice: "next", completed: true }, "c1_l1")).toEqual({ choice: "next", completed: true });
  expect(chaseChoice({ ...message, choice: "next", completed: false }, "c1_l1")).toBeNull();
  expect(chaseChoice({ ...message, choice: "next", completed: true }, "c1_l2")).toBeNull();
  expect(chaseChoice({ ...message, source: "other", choice: "hall", completed: true }, "c1_l1")).toBeNull();
});
