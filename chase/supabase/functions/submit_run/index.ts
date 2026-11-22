import { serve, response } from "../_shared/http.ts";
import levels from "../../../src/config/levels.json" with { type: "json" };
import medals from "../../../src/config/medals.json" with { type: "json" };
serve(2097152, async (db, user, b) => {
  const id = b.level as keyof typeof levels,
    ticks = Number(b.ticks),
    name = b.name,
    optional = b.optional;
  if (
    !Object.hasOwn(levels, id) ||
    !Number.isSafeInteger(ticks) ||
    ticks < levels[id].minTicks ||
    typeof name !== "string" ||
    !name.trim() ||
    name.trim().length > 24 ||
    !Array.isArray(optional)
  )
    return response("Invalid run", 400);
  const meta = levels[id];
  if (
    optional.some(
      (i) => !Number.isInteger(i) || i < 0 || i >= meta.optionalCuts.length,
    ) ||
    new Set(optional).size !== optional.length
  )
    return response("Invalid optional leaks", 400);
  const ghost = b.ghost as { version: number; ticks: number; data: string };
  const bytes = 20 * (1 + Math.ceil(ticks / 4));
  if (
    !ghost ||
    ghost.version !== 1 ||
    ghost.ticks !== ticks ||
    typeof ghost.data !== "string" ||
    ghost.data.length !== 4 * Math.ceil(bytes / 3)
  )
    return response("Invalid recording", 400);
  try {
    const binary = atob(ghost.data);
    if (binary.length !== bytes) throw Error();
    const floats = new DataView(
      Uint8Array.from(binary, (c) => c.charCodeAt(0)).buffer,
    );
    for (let i = 0; i < bytes; i += 4)
      if (!Number.isFinite(floats.getFloat32(i, true))) throw Error();
  } catch {
    return response("Invalid poses", 400);
  }
  const time = Math.max(
      0,
      ticks / 120 - optional.reduce((s, i) => s + meta.optionalCuts[i], 0),
    ),
    m = medals[id];
  const medal =
    m.ace !== null && time <= m.ace
      ? "Ace of Hearts"
      : time <= m.gold
        ? "Gold Pocket Watch"
        : time <= m.silver
          ? "Silver Spoon"
          : "Copper Teacup";
  const key = crypto.randomUUID(),
    path = id + "/" + user + "/" + key + ".json",
    bucket = db.storage.from("ghosts");
  const uploaded = await bucket.upload(path, JSON.stringify(ghost), {
    contentType: "application/json",
  });
  if (uploaded.error) return response("Ghost upload failed", 503);
  const { error } = await db.rpc("record_run", {
    p_id: key,
    p_player: user,
    p_name: name.trim(),
    p_level: id,
    p_ticks: ticks,
    p_ms: Math.round(time * 1000),
    p_leaks: meta.required + optional.length,
    p_optional: optional.length,
    p_medal: medal,
    p_path: path,
  });
  if (error) {
    await bucket.remove([path]);
    return response(
      "Could not record run",
      error.message.includes("cooldown") ? 429 : 503,
    );
  }
  return response({ id: key });
});
