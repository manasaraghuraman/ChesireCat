export type Box = {
  center: [number, number, number];
  size: [number, number, number];
  color: number;
  obstacle?: "vent" | "breakable" | "phaseable";
  tilt?: number;
  partition?: boolean;
  shell?: boolean;
  wallrun?: boolean;
};
const floor = 0xd6d5c8,
  wall = 0x39cfcb;
/** Start terrace, takeoff ramp, central trench and return lane. */
export const boxes: Box[] = [
  { center: [0, -0.5, 7], size: [14, 1, 20], color: floor },
  { center: [0, -0.5, -19], size: [14, 1, 22], color: floor },
  { center: [5.9, -0.5, -5.5], size: [2.2, 1, 5], color: floor },
  {
    center: [-0.7, 0.38, -0.5],
    size: [4, 0.3, 5],
    tilt: 0.19,
    color: 0xf2bd77,
  },
  { center: [-5, 2, -6], size: [0.6, 4, 21], wallrun: true, color: wall },
  { center: [2.8, 2, -13], size: [0.6, 4, 15], wallrun: true, color: wall },
  { center: [0, -0.1, -24], size: [5, 0.5, 6], tilt: 0.22, color: 0xf2bd77 },
];
