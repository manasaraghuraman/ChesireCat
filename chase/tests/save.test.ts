import { expect, it } from "vitest";
import { LocalSave, defaults } from "../src/save/localSave";
import { medal } from "../src/config/courses";
const memory = () => {
  const values = new Map<string, string>();
  return {
    getItem: (k: string) => values.get(k) ?? null,
    setItem: (k: string, v: string) => {
      values.set(k, v);
    },
  };
};
it("retains the faster final time, medal, collected glove and settings when reopened", () => {
  const storage = memory(),
    save = new LocalSave(() => storage);
  save.finish("c1_l1", 20.1 - 0.2);
  save.collect("c1_l1");
  save.finish("c1_l1", 29);
  save.setSettings({ invertY: true, volume: 0 });
  const reopened = new LocalSave(() => storage);
  expect(reopened.record("c1_l1")).toEqual({
    best: 20.1 - 0.2,
    medal: "Silver Spoon",
    glove: true,
  });
  expect(reopened.record("power_lab").best).toBeNull();
  expect(reopened.settings()).toMatchObject({ invertY: true, volume: 0 });
  reopened.finish("c1_l1", 13);
  expect(save.record("c1_l1")).toEqual({
    best: 13,
    medal: "Gold Pocket Watch",
    glove: true,
  });
  expect(medal("c1_l1", 21)).toBe("Copper Teacup");
});
it("recovers from damaged data and keeps progress in memory when storage is blocked", () => {
  const storage = memory();
  storage.setItem("rabbit-hole.v1.settings", "{");
  const save = new LocalSave(() => storage);
  expect(save.settings()).toEqual(defaults);
  const blocked = new LocalSave(() => {
    throw Error("disabled");
  });
  blocked.collect("power_lab");
  blocked.finish("power_lab", 44);
  expect(blocked.record("power_lab")).toEqual({
    best: 44,
    medal: "Silver Spoon",
    glove: true,
  });
  expect(blocked.persistent).toBe(false);
});
