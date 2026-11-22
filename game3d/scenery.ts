/**
 * File: game3d/scenery.ts
 * Purpose: Builds gray-box meshes from level boxes, interactable labels, and disposes object trees.
 * Date: 2026-11-21
 */
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { label } from "./labels";
import type { LevelBox, LevelInteractable } from "./level";

const EDGE_COLOR = 0x3b2f4f;
const LABEL_HEIGHT = 0.9;
/** NPCs need their label above their ears; signposts carry their own text. */
const NPC_LABEL_HEIGHT = 1.6;
const CANOPY_COLOR = 0x3f6b4a;
const TRUNK_COLOR = 0x5b4636;

/** Toon-ish flat material: high roughness, no shine. */
export function flatMaterial(color: number, extra: THREE.MeshStandardMaterialParameters = {}): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0, ...extra });
}

function treeMesh(box: LevelBox, trunkMaterial: THREE.Material, canopyMaterial: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  const [w, h] = box.size;
  const radius = w / 2;
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.8, radius * 1.1, h, 7), trunkMaterial);
  group.add(trunk);
  const canopy = new THREE.Mesh(new THREE.ConeGeometry(radius * 5, h * 0.7, 7), canopyMaterial);
  canopy.position.y = h / 2 + h * 0.15;
  group.add(canopy);
  group.position.set(...box.center);
  group.rotation.y = box.rotY;
  return group;
}

/**
 * Static gray-box geometry, merged into one mesh per colour (and one line set for all edges) to keep
 * draw calls low. Trees are drawn as trunk + canopy; `invisible` boxes are colliders only.
 */
export function buildLevelMeshes(boxes: readonly LevelBox[]): THREE.Group {
  const group = new THREE.Group();
  const byColor = new Map<number, { readonly glass: boolean; readonly parts: THREE.BufferGeometry[] }>();
  const edges: THREE.BufferGeometry[] = [];
  const trunkMaterial = flatMaterial(TRUNK_COLOR, { flatShading: true });
  const canopyMaterial = flatMaterial(CANOPY_COLOR, { flatShading: true });
  const matrix = new THREE.Matrix4();
  const rotation = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const one = new THREE.Vector3(1, 1, 1);

  for (const box of boxes) {
    if (box.tags.includes("invisible")) continue;
    if (box.tags.includes("tree")) {
      group.add(treeMesh(box, trunkMaterial, canopyMaterial));
      continue;
    }
    rotation.setFromAxisAngle(up, box.rotY);
    matrix.compose(new THREE.Vector3(...box.center), rotation, one);
    const geometry = new THREE.BoxGeometry(...box.size).applyMatrix4(matrix);
    const bucket = byColor.get(box.color) ?? { glass: box.tags.includes("glass"), parts: [] };
    bucket.parts.push(geometry);
    byColor.set(box.color, bucket);
    if (!box.tags.includes("floor")) edges.push(new THREE.EdgesGeometry(new THREE.BoxGeometry(...box.size)).applyMatrix4(matrix));
  }

  byColor.forEach(({ glass, parts }, color) => {
    const merged = mergeGeometries(parts);
    parts.forEach((part) => part.dispose());
    if (!merged) return;
    const material = glass
      ? flatMaterial(color, { transparent: true, opacity: 0.35, roughness: 0.1 })
      : flatMaterial(color);
    group.add(new THREE.Mesh(merged, material));
  });
  if (edges.length) {
    const mergedEdges = mergeGeometries(edges);
    edges.forEach((edge) => edge.dispose());
    if (mergedEdges) group.add(new THREE.LineSegments(mergedEdges, new THREE.LineBasicMaterial({ color: EDGE_COLOR })));
  }
  return group;
}

/** Floating label sprites above each interactable. Returns a group to swap out when they change. */
export function buildLabels(items: readonly LevelInteractable[]): THREE.Group {
  const group = new THREE.Group();
  for (const item of items) {
    if (item.kind === "sign") continue;
    const sprite = label(item.label.charAt(0).toUpperCase() + item.label.slice(1));
    const height = item.kind === "npc" ? NPC_LABEL_HEIGHT : LABEL_HEIGHT;
    sprite.position.set(item.pos[0], item.pos[1] + height, item.pos[2]);
    group.add(sprite);
  }
  return group;
}

export function disposeObject(root: THREE.Object3D): void {
  root.traverse((object) => {
    const withGeometry = object as Partial<THREE.Mesh>;
    withGeometry.geometry?.dispose();
    const material = withGeometry.material;
    const list = Array.isArray(material) ? material : material ? [material] : [];
    for (const m of list) {
      for (const value of Object.values(m)) if (value instanceof THREE.Texture) value.dispose();
      m.dispose();
    }
  });
}
