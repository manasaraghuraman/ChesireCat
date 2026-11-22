import * as T from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { parseLevel, type Point } from "./jsonLevel";
type Marker = { pos: Point };
const position = (n: T.Object3D): Point =>
  n.getWorldPosition(new T.Vector3()).toArray();
const dimensions = (n: T.Object3D) => new T.Box3().setFromObject(n, true);
/** Convert Blender extras in world coordinates into the same validated course as JSON. */
export function fromScene(root: T.Object3D, id: string, name: string) {
  root.updateMatrixWorld(true);
  let spawn: { pos: Point; yaw: number } | undefined,
    rabbitHole: Marker | undefined,
    glove: Marker | undefined,
    rabbitPath: Point[] = [];
  const geometry: unknown[] = [],
    leaks: unknown[] = [],
    soldiers: unknown[] = [],
    smogZones: unknown[] = [];
  const markers: T.Object3D[] = [];
  root.traverse((n) => {
    const e = n.userData,
      pos = position(n);
    if (e.type === "spawn") {
      spawn = {
        pos,
        yaw: new T.Euler().setFromQuaternion(
          n.getWorldQuaternion(new T.Quaternion()),
          "YXZ",
        ).y,
      };
    } else if (e.type === "rabbit_hole") rabbitHole = { pos };
    else if (e.type === "glove") glove = { pos };
    else if (e.type === "leak_small" || e.type === "leak_big")
      leaks.push({
        kind: e.type === "leak_small" ? "small" : "big",
        type: e.leakType,
        pos,
        required: e.required ?? true,
      });
    else if (e.type === "soldier_path" || e.type === "rabbit_path") {
      const route = [...n.children]
        .sort((a, b) => (a.userData.order ?? 0) - (b.userData.order ?? 0))
        .map(position);
      if (e.type === "rabbit_path") rabbitPath = route;
      else soldiers.push({ path: route, speed: e.speed });
    } else if (e.type === "smog_zone" || typeof e.tags === "string") {
      const bounds = dimensions(n),
        size = bounds.getSize(new T.Vector3()).toArray(),
        center = bounds.getCenter(new T.Vector3()).toArray();
      if (e.type === "smog_zone")
        smogZones.push({ pos: center, size, linkedLeak: e.linkedLeak });
      else
        geometry.push({
          shape: "box",
          pos: center,
          size,
          tags: e.tags.split(",").map((s: string) => s.trim()),
        });
    } else return;
    markers.push(n);
  });
  const level = parseLevel({
    id,
    name,
    spawn,
    geometry,
    leaks,
    rabbitHole,
    glove,
    rabbitPath,
    soldiers,
    smogZones,
  });
  for (const node of markers) node.visible = false;
  return { ...level, art: root };
}
export async function loadGlb(
  url: string,
  id: string,
  name: string,
  renderer: T.WebGLRenderer,
) {
  const ktx = new KTX2Loader()
    .setTranscoderPath(import.meta.env.BASE_URL + "basis/")
    .detectSupport(renderer);
  try {
    const gltf = await new GLTFLoader()
      .setMeshoptDecoder(MeshoptDecoder)
      .setKTX2Loader(ktx)
      .loadAsync(url);
    return fromScene(gltf.scene, id, name);
  } finally {
    ktx.dispose();
  }
}
