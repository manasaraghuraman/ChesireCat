import type { Box } from "./testRoom";

export const partitionHeight = 6.4;
export const doorwayHeight = 2.65;

export type Doorway = { x: number; width: number; room: string };
export type Partition = { z: number; doors: Doorway[] };

export function partitionBoxes(partition: Partition, halfWidth: number) {
  const boxes: Box[] = [];
  function wall(left: number, right: number, bottom: number) {
    if (right <= left) return;
    boxes.push({
      center: [(left + right) / 2, (partitionHeight + bottom) / 2, partition.z],
      size: [right - left, partitionHeight - bottom, 0.28],
      color: 0xc5b493,
      partition: true,
    });
  }
  let left = -halfWidth;
  for (const door of partition.doors) {
    const start = door.x - door.width / 2;
    const end = door.x + door.width / 2;
    wall(left, start, 0);
    wall(start, end, doorwayHeight);
    left = end;
  }
  wall(left, halfWidth, 0);
  return boxes;
}

export function cottageBounds(boxes: Box[]) {
  const floors = boxes.filter((box) => box.center[1] < 0);
  return {
    halfWidth: Math.max(
      ...floors.map((box) => Math.abs(box.center[0]) + box.size[0] / 2),
    ),
    front:
      Math.max(...floors.map((box) => box.center[2] + box.size[2] / 2)) + 0.8,
    back:
      Math.min(...floors.map((box) => box.center[2] - box.size[2] / 2)) - 0.3,
  };
}

export function cottageShell(boxes: Box[]): Box[] {
  const { halfWidth, front, back } = cottageBounds(boxes);
  const height = partitionHeight + 3.5;
  const y = partitionHeight - height / 2;
  const middle = (front + back) / 2;
  return [
    ...[-1, 1].map((side): Box => ({
      center: [side * (halfWidth + 0.18), y, middle],
      size: [0.32, height, front - back],
      color: 0xc5b493,
      shell: true,
    })),
    ...[front, back].map((z): Box => ({
      center: [0, y, z],
      size: [2 * halfWidth + 0.35, height, 0.28],
      color: 0xc5b493,
      shell: true,
    })),
  ];
}
