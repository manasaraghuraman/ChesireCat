/**
 * Footprint challenge scoring. A level starts at the sum of its action points
 * and the Rabbit hole opens once the player brings it down to `footprintTarget`
 * (set per level, default 0). These are game points, not carbon figures.
 */
export const footprintActions: Readonly<
  Record<string, { label: string; points: number; why: string }>
> = {
  light: {
    label: "Flip the light switch off",
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
  standby: {
    label: "Switch off the standby radio",
    points: 1,
    why: "Devices on standby keep drawing power around the clock.",
  },
  drip: {
    label: "Close the dripping hot tap",
    points: 2,
    why: "A dripping hot tap wastes the energy used to heat that water.",
  },
  stove: {
    label: "Turn off the stove burner",
    points: 3,
    why: "A burner left on with nothing cooking heats the kitchen, not your dinner.",
  },
  tv: {
    label: "Switch off the TV",
    points: 2,
    why: "A TV playing to an empty room uses electricity for no one.",
  },
  faucet: {
    label: "Turn off the running tap",
    points: 2,
    why: "Running water has to be pumped and treated, and hot water must be heated.",
  },
  computer: {
    label: "Shut down the computer",
    points: 2,
    why: "A computer and monitor left on overnight keep using power while idle.",
  },
  fan: {
    label: "Switch off the fan",
    points: 1,
    why: "Fans cool people, not rooms. Switch them off when you leave.",
  },
  space_heater: {
    label: "Turn off the space heater",
    points: 4,
    why: "Electric heaters are some of the hungriest appliances in a home.",
  },
};
