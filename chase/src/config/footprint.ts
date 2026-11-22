export const footprintChallenge = {
  start: 10,
  target: 3,
};
export const footprintActions: Readonly<
  Record<string, { label: string; points: number; why: string }>
> = {
  light: {
    label: "Switch off the light",
    points: 1,
    why: "An empty room can stay dark, saving the electricity its light would use.",
  },
  charger: {
    label: "Unplug the idle charger",
    points: 1,
    why: "Some chargers still draw a small amount of electricity when nothing is charging.",
  },
  laundry: {
    label: "Hang the laundry to dry",
    points: 5,
    why: "Air-drying this load skips an entire electric dryer cycle.",
  },
};
