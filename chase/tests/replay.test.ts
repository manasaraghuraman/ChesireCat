import { expect, it } from "vitest";
import { Scene, Vector3 } from "three";
import { LocalSave } from "../src/save/localSave";
import { decode, encode } from "../src/replay/codec";
import { Recorder } from "../src/replay/recorder";
import { sample, GhostPlayer } from "../src/replay/player";
function record(ticks: number) {
  const recorder = new Recorder();
  for (let t = 0; t <= ticks; t++)
    recorder.capture(t, { x: t, y: 1, z: -t }, t * 0.03, t * 0.01, t === ticks);
  return recorder.finish(ticks);
}
it("records 30 Hz plus an exact final pose and interpolates the short last interval", () => {
  for (const ticks of [1, 4, 9, 120]) {
    const track = record(ticks),
      decoded = decode(encode(track))!;
    expect(decoded.poses.length).toBe((Math.ceil(ticks / 4) + 1) * 5);
    const out = new Float32Array(5);
    for (const t of [0, ticks / 2, ticks - 0.5, ticks]) {
      sample(decoded, t, out);
      expect(out[0]).toBeCloseTo(t);
      expect(out[2]).toBeCloseTo(-t);
      expect(out[3]).toBeCloseTo(t * 0.03);
    }
  }
  expect(decode({ version: 1, ticks: 8, data: "x" })).toBeNull();
});
it("freezes at the same sim tick, rewinds on restart and honors visibility", () => {
  const scene = new Scene(),
    player = new GhostPlayer(scene),
    track = record(24),
    eye = new Vector3(0, 2, 8);
  player.render(track, 12, true, eye);
  const p = player.root.position.clone();
  player.render(track, 12, true, eye);
  expect(player.root.position).toEqual(p);
  expect(player.root.visible).toBe(true);
  player.render(track, 0, true, eye);
  expect(player.root.position.x).toBe(0);
  player.render(track, 12, false, eye);
  expect(player.root.visible).toBe(false);
  player.render(track, 25, true, eye);
  expect(player.root.visible).toBe(false);
});
it("reopens the best ghost by adjusted score, keeps it on glove pickup and ignores slower attempts", () => {
  const data = new Map<string, string>();
  const storage = () => ({
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => {
      data.set(k, v);
    },
  });
  const save = new LocalSave(storage);
  save.finish("c1_l1", 10);
  expect(save.ghost("c1_l1")).toBeNull();
  save.finish("c1_l1", 10, record(1200));
  save.finish("c1_l1", 9.9, record(1212));
  save.collect("c1_l1");
  save.finish("c1_l1", 11, record(1320));
  save.setSettings({ showGhost: false });
  const reopened = new LocalSave(storage);
  expect(reopened.record("c1_l1").best).toBe(9.9);
  expect(reopened.ghost("c1_l1")?.ticks).toBe(1212);
  expect(reopened.ghost("power_lab")).toBeNull();
  expect(reopened.settings().showGhost).toBe(false);
});
it("preserves the score and other settings when the replay exceeds storage quota", () => {
  const data = new Map<string, string>(),
    storage = () => ({
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => {
        if (v.length > 400) throw Error("quota");
        data.set(k, v);
      },
    });
  const save = new LocalSave(storage);
  save.finish("c1_l1", 5, record(600));
  expect(save.ghost("c1_l1")?.ticks).toBe(600);
  save.collect("c1_l1");
  save.setSettings({ showGhost: false });
  expect(save.ghost("c1_l1")?.ticks).toBe(600);
  const reopened = new LocalSave(storage);
  expect(reopened.record("c1_l1").best).toBe(5);
  expect(reopened.ghost("c1_l1")).toBeNull();
  expect(reopened.settings().showGhost).toBe(false);
});
