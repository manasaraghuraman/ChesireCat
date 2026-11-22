import { medal, type LevelId } from "../config/courses";
import { encode, decode, type Track } from "../replay/codec";
export const defaults = {
  sensitivity: 0.0022,
  fov: 100,
  volume: 0.5,
  invertY: false,
  showGhost: true,
  shake: true,
};
export type Settings = typeof defaults;
const storageKey = (key: string) =>
  (key === "c1_l1" ? "rabbit-hole.footprint." : "rabbit-hole.v1.") + key;
const bounded = (v: unknown, min: number, max: number, fallback: number) =>
  typeof v === "number" && Number.isFinite(v)
    ? Math.max(min, Math.min(v, max))
    : fallback;
function clean(o: Record<string, unknown>): Settings {
  return {
    sensitivity: bounded(o.sensitivity, 0.0005, 0.008, defaults.sensitivity),
    fov: bounded(o.fov, 65, 120, defaults.fov),
    volume: bounded(o.volume, 0, 1, defaults.volume),
    shake: o.shake !== false,
    showGhost: o.showGhost !== false,
    invertY: o.invertY === true,
  };
}
/** Each level owns its records. An unavailable store falls back to session memory. */
export class LocalSave {
  private memory = new Map<string, string>();
  private sessionGhosts = new Map<string, { best: unknown; ghost: unknown }>();
  persistent = true;
  constructor(private storage: () => Pick<Storage, "getItem" | "setItem">) {}
  private read(key: string): Record<string, unknown> {
    let raw = this.memory.get(key);
    try {
      if (this.persistent) raw = this.storage().getItem(storageKey(key)) ?? raw;
    } catch {
      this.persistent = false;
    }
    try {
      if (raw) this.memory.set(key, raw);
      const data = JSON.parse(raw ?? "{}");
      return data && typeof data === "object" ? data : {};
    } catch {
      return {};
    }
  }
  private write(key: string, data: object) {
    const value = JSON.stringify(data);
    this.memory.set(key, value);
    try {
      if (this.persistent) {
        try {
          this.storage().setItem(storageKey(key), value);
          this.sessionGhosts.delete(key);
        } catch (error) {
          if (!("ghost" in data) || !data.ghost) throw error;
          this.storage().setItem(
            storageKey(key),
            JSON.stringify({ ...data, ghost: undefined }),
          );
          this.sessionGhosts.set(key, {
            best: "best" in data ? data.best : null,
            ghost: data.ghost,
          });
        }
      }
    } catch {
      this.persistent = false;
    }
  }
  settings() {
    return clean(this.read("settings"));
  }
  setSettings(change: Partial<Settings>) {
    const next = clean({ ...this.settings(), ...change });
    this.write("settings", next);
    return next;
  }
  record(id: LevelId) {
    const raw = this.read(id);
    const best =
      typeof raw.best === "number" && Number.isFinite(raw.best) && raw.best >= 0
        ? raw.best
        : null;
    return {
      best,
      medal: best === null ? null : medal(id, best),
      glove:
        raw.glove === true || (id === "c1_l1" && this.legacyLightsOutGlove()),
    };
  }
  private legacyLightsOutGlove() {
    if (!this.persistent) return false;
    try {
      return (
        JSON.parse(this.storage().getItem("rabbit-hole.chapter1.c1_l1") ?? "{}")
          ?.glove === true
      );
    } catch {
      return false;
    }
  }
  ghost(id: LevelId) {
    const raw = this.read(id),
      session = this.sessionGhosts.get(id);
    return decode(
      raw.ghost ??
        (session && session.best === raw.best ? session.ghost : null),
    );
  }
  ghostIsSessionOnly(id: LevelId) {
    return this.sessionGhosts.has(id);
  }
  collect(id: LevelId) {
    const record = this.record(id);
    if (!record.glove) {
      const raw = this.read(id),
        session = this.sessionGhosts.get(id);
      this.write(id, {
        ...raw,
        ...record,
        glove: true,
        ghost:
          raw.ghost ??
          (session?.best === record.best ? session?.ghost : undefined),
      });
    }
  }
  finish(id: LevelId, time: number, track?: Track) {
    const record = this.record(id);
    if (
      Number.isFinite(time) &&
      time >= 0 &&
      (record.best === null ||
        time < record.best ||
        (time === record.best && track && !this.ghost(id)))
    )
      this.write(id, {
        ...record,
        best: time,
        medal: medal(id, time),
        ghost: track ? encode(track) : undefined,
      });
  }
}
