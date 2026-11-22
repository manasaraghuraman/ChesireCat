import { createClient } from "@supabase/supabase-js";
import type { LevelRun } from "../level/run";
import type { LevelId } from "../config/courses";
import { decode, encode, type Track } from "../replay/codec";
import { ringTicks } from "../config/ring";
import { isEmbedded } from "../embed";
const url = import.meta.env.VITE_SUPABASE_URL,
  key = import.meta.env.VITE_SUPABASE_ANON_KEY;
/**
 * Supabase powers the standalone game's online features (leaderboards, shared ghosts, AI commentary).
 * Inside the Cheshire Cat game's iframe the chase stays fully local: no client, no sign-in, no network.
 */
export const online = url && key && !isEmbedded ? createClient(url, key) : null;
let name = "";
try {
  name = localStorage.getItem("rabbit.display-name") ?? "";
} catch {
  /* Private browsing. */
}
export function displayName() {
  return name;
}
export function chooseName(value: string) {
  name = value.trim().slice(0, 24);
  try {
    localStorage.setItem("rabbit.display-name", name);
  } catch {
    /* Use session name. */
  }
}
let signing: Promise<string> | undefined;
export function identity() {
  return (signing ??= signIn().finally(() => {
    signing = undefined;
  }));
}
async function signIn() {
  if (!online) throw Error("Offline");
  const session = await online.auth.getSession();
  if (session.data.session) return session.data.session.user.id;
  const { data, error } = await online.auth.signInAnonymously();
  if (error || !data.user) throw Error("Sign-in unavailable");
  return data.user.id;
}
export let submission: Promise<boolean> = Promise.resolve(false);
export function submit(run: LevelRun, track: Track) {
  if (!online || !name || run.challenge) {
    submission = Promise.resolve(false);
    return;
  }
  const body = {
    name,
    level: run.level.id,
    ticks: run.ticks,
    optional: run.level.leaks
      .filter((l) => !l.required)
      .flatMap((l, i) =>
        run.progress[run.level.leaks.indexOf(l)] === ringTicks ? [i] : [],
      ),
    ghost: encode(track),
  };
  submission = identity()
    .then(
      async () =>
        !(await online.functions.invoke("submit_run", { body })).error,
    )
    .catch(() => false);
}
export interface Row {
  player_id: string;
  place: number;
  display_name: string;
  final_time_ms: number;
  ghost_path: string;
}
export async function scores(id: LevelId) {
  if (!online) throw Error("Offline");
  const query = () =>
    online
      .from("leaderboard")
      .select("player_id,place,display_name,final_time_ms,ghost_path")
      .eq("level_id", id);
  const uid = name ? await identity().catch(() => null) : null;
  const [top, own] = await Promise.all([
    query().order("place").order("player_id").limit(20),
    uid ? query().eq("player_id", uid).maybeSingle() : null,
  ]);
  if (top.error || own?.error) throw Error("Leaderboard unavailable");
  return { top: top.data as Row[], own: own?.data as Row | null };
}
export const opponents = new Map<LevelId, Track>();
export async function downloadGhost(id: LevelId, path: string) {
  if (!online) throw Error("Offline");
  const { data, error } = await online.storage.from("ghosts").download(path);
  if (error || !data || data.size > 2097152) throw Error("Ghost unavailable");
  const track = decode(JSON.parse(await data.text()));
  if (!track) throw Error("Invalid ghost");
  opponents.set(id, track);
}
