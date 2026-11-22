import * as T from "three";
import { box, surface } from "./cottageMaterials";
import { label } from "../entities/leaks";
import {
  cottageBounds,
  doorwayHeight,
  partitionHeight,
} from "../level/partitions";
import type { LevelData } from "../level/jsonLevel";

const oak = surface(0x65432b);
const plaster = surface(0xc5b493);
const stone = surface(0x79736a);
const mortar = surface(0x544e47);
const linen = surface(0xc8ae85);
const ceramic = surface(0x788c76, 0.42);
const copper = surface(0xa36743, 0.42, 0.48);
const rug = surface(0x865e51);
const rugTrim = surface(0xc6a376);
let glass: T.MeshBasicMaterial | undefined;
function windowView() {
  if (glass) return glass;
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 320;
  const ctx = canvas.getContext("2d")!;
  const sky = ctx.createLinearGradient(0, 0, 0, 215);
  sky.addColorStop(0, "#96abb9");
  sky.addColorStop(1, "#fbebc1");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 256, 320);
  for (const [i, color] of ["#9ba887", "#778765", "#5e7251"].entries()) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, 320);
    for (let x = 0; x <= 256; x += 4) {
      const y = 188 + i * 30 + 17 * Math.sin(x / 57 + i * 1.8);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(256, 320);
    ctx.fill();
  }
  ctx.fillStyle = "#f8f0d632";
  ctx.beginPath();
  ctx.moveTo(0, 100);
  ctx.lineTo(192, 0);
  ctx.lineTo(233, 0);
  ctx.lineTo(0, 140);
  ctx.fill();
  const map = new T.CanvasTexture(canvas);
  map.colorSpace = T.SRGBColorSpace;
  glass = new T.MeshBasicMaterial({ map });
  return glass;
}
const paint: Record<string, number> = {
  c1_l1: 0x7a8970,
  c1_l2: 0x6a8584,
  c1_l3: 0x9a7858,
  c1_l4: 0x888d9b,
  c1_l5: 0x9b806a,
  power_lab: 0x688478,
};

export function furnishCottage(group: T.Group, level: LevelData) {
  const { halfWidth: half, front, back } = cottageBounds(level.boxes);
  const width = 2 * half;
  const depth = front - back;
  const center = (front + back) / 2;
  const height = partitionHeight;
  const panel = surface(paint[level.id] ?? paint.c1_l1);
  const wall = level.id === "c1_l3" ? stone : plaster;
  for (const side of [-1, 1]) {
    const x = side * (half + 0.18);
    box(group, wall, [0.32, height, depth], [x, height / 2, center]);
    box(group, stone, [0.32, 3.5, depth], [x, -1.75, center]);
    box(group, panel, [0.38, 1.25, depth], [x, 0.625, center]);
    for (const y of [0.12, 1.25, 3.8, height - 0.12])
      box(group, oak, [0.47, 0.15, depth], [x, y, center]);
    for (let z = front - 1; z > back + 1; z -= 4.8) {
      box(group, oak, [0.44, height, 0.16], [x, height / 2, z]);
      if (side === 1) windowAt(group, half - 0.05, z - 2.35);
      else if (
        z > back + 4 &&
        (z > 7 || Math.round((front - z) / 4.8) % 3 === 2)
      )
        wallStorage(group, level.id, -half + 0.24, z - 2.35);
      box(group, oak, [width + 0.5, 0.23, 0.18], [0, height - 0.3, z]);
    }
  }
  for (const z of [back, front]) {
    box(group, plaster, [width, height, 0.28], [0, height / 2, z]);
    box(group, stone, [width, 3.5, 0.28], [0, -1.75, z]);
    box(group, panel, [width, 1.25, 0.34], [0, 0.625, z]);
    box(group, oak, [width, 0.16, 0.41], [0, 1.25, z]);
  }
  box(group, oak, [width, 0.18, depth], [0, height, center]);
  box(group, rug, [2.25, 0.012, 3.1], [0, 0.008, level.spawn.z]);
  for (const offset of [-1, 1]) {
    box(
      group,
      rugTrim,
      [0.045, 0.006, 2.92],
      [offset * 1.04, 0.017, level.spawn.z],
    );
    box(
      group,
      rugTrim,
      [2.12, 0.006, 0.046],
      [0, 0.017, level.spawn.z + offset * 1.44],
    );
  }
  const doorway = new T.Group();
  doorway.position.set(0, 0, back + 0.17);
  group.add(doorway);
  box(doorway, oak, [1.83, 2.93, 0.15], [0, 1.47, 0]);
  box(doorway, panel, [1.57, 2.68, 0.14], [0, 1.35, 0.075]);
  for (const y of [0.66, 1.9])
    box(doorway, oak, [1.22, 0.86, 0.055], [0, y, 0.16]);
  box(doorway, copper, [0.1, 0.07, 0.09], [0.58, 1.24, 0.18]);
  for (const partition of level.partitions ?? []) {
    for (const door of partition.doors) {
      for (const jamb of [-1, 1]) {
        box(
          group,
          oak,
          [0.14, doorwayHeight + 0.08, 0.41],
          [
            door.x + jamb * (door.width / 2 + 0.055),
            doorwayHeight / 2,
            partition.z,
          ],
        );
      }
      box(
        group,
        oak,
        [door.width + 0.27, 0.18, 0.41],
        [door.x, doorwayHeight + 0.07, partition.z],
      );
      const sign = label(door.room, 0.29);
      sign.position.set(door.x, doorwayHeight + 0.34, partition.z + 0.23);
      group.add(sign);
    }
    for (const wall of level.boxes) {
      if (
        !wall.partition ||
        wall.center[2] !== partition.z ||
        wall.center[1] !== height / 2
      )
        continue;
      box(
        group,
        panel,
        [wall.size[0], 1.17, 0.31],
        [wall.center[0], 0.585, partition.z],
      );
      box(
        group,
        oak,
        [wall.size[0], 0.105, 0.37],
        [wall.center[0], 1.17, partition.z],
      );
    }
  }
  // The cellar is visible through breaks in the course floor.
  box(group, mortar, [width, 0.2, depth], [0, -3.5, center]);
  for (let z = front - 0.4; z > back; z -= 2.4)
    box(group, stone, [width, 0.03, 0.05], [0, -3.39, z]);
}

function windowAt(group: T.Group, x: number, z: number) {
  box(group, oak, [0.16, 2.24, 1.7], [x, 2.6, z]);
  const pane = new T.Mesh(new T.PlaneGeometry(1.44, 1.98), windowView());
  pane.rotation.y = -Math.PI / 2;
  pane.position.set(x - 0.086, 2.6, z);
  group.add(pane);
  box(group, oak, [0.2, 0.06, 1.48], [x - 0.08, 2.6, z]);
  box(group, oak, [0.2, 2, 0.06], [x - 0.08, 2.6, z]);
  box(group, oak, [0.35, 0.13, 1.9], [x - 0.12, 1.53, z]);
  box(group, copper, [0.07, 0.07, 2.16], [x - 0.28, 3.77, z]);
  for (const side of [-1, 1]) {
    for (let fold = 0; fold < 4; fold++)
      box(
        group,
        linen,
        [0.08, 1.95, 0.097],
        [x - 0.29 + 0.026 * (fold % 2), 2.76, z + side * (0.69 + fold * 0.075)],
      );
  }
}

function wallStorage(parent: T.Group, id: string, x: number, z: number) {
  const shelf = new T.Group();
  shelf.position.set(x, 0, z);
  shelf.rotation.y = Math.PI / 2;
  parent.add(shelf);
  box(shelf, oak, [1.82, 1.13, 0.27], [0, 1.55, -0.04]);
  box(shelf, linen, [1.66, 0.99, 0.045], [0, 1.55, 0.105]);
  for (const y of [1.09, 1.59, 2.05])
    box(shelf, oak, [1.88, 0.065, 0.39], [0, y, 0.12]);
  for (const offset of [-0.62, 0, 0.62]) {
    if (id === "c1_l3" || id === "power_lab") {
      for (const y of [1.19, 1.69])
        box(shelf, copper, [0.36, 0.13, 0.22], [offset, y, 0.18]);
    } else if (id === "c1_l4") {
      for (const y of [1.17, 1.27, 1.68, 1.78])
        box(
          shelf,
          y > 1.5 ? ceramic : rug,
          [0.47, 0.08, 0.28],
          [offset, y, 0.18],
        );
    } else {
      for (const y of [1.24, 1.74]) {
        const pot = new T.Mesh(
          new T.CylinderGeometry(0.12, 0.105, 0.23, 18),
          ceramic,
        );
        pot.position.set(offset, y, 0.19);
        shelf.add(pot);
        box(shelf, oak, [0.17, 0.035, 0.17], [offset, y + 0.13, 0.19]);
      }
    }
  }
}
