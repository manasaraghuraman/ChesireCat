import { expect, it } from "vitest";
import { handAngle } from "../src/core/watch";
it("moves clockwise and repeats after a revolution", () => {
  expect(handAngle(15, 60)).toBeCloseTo(-Math.PI / 2);
  expect(handAngle(75, 60)).toBe(handAngle(15, 60));
});
