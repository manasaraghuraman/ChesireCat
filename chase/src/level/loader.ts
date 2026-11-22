import catalog from "../config/levels.json";
import type { LevelId } from "../config/courses";
import { loadLevel, type LevelData } from "./jsonLevel";
import type { Object3D, WebGLRenderer } from "three";
export async function loadCourse(
  id: LevelId,
  renderer: WebGLRenderer,
): Promise<LevelData & { art?: Object3D }> {
  const entry: { name: string; asset?: string } = catalog[id];
  if (!entry.asset) return loadLevel(id);
  const { loadGlb } = await import("./gltfLevel");
  return loadGlb(
    import.meta.env.BASE_URL + "levels/" + entry.asset,
    id,
    entry.name,
    renderer,
  );
}
