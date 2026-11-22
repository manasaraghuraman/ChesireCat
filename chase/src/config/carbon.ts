// EPA eGRID 2023 U.S. generation average, converted from lb/MWh to kg/kWh.
const grid = (770.884 * 0.45359237) / 1000;
export const gridSource = "https://www.epa.gov/egrid/summary-data";
export const gasSource =
  "https://www.epa.gov/energy/greenhouse-gas-equivalencies-calculator-calculations-and-references";

function electricity(label: string, kWh: number, example: string) {
  return { label, example, kg: kWh * grid, unit: "CO₂e" };
}

export const carbonActions: Readonly<
  Record<string, ReturnType<typeof electricity> | undefined>
> = {
  light: electricity(
    "Lights off",
    (10 * 3 * 365) / 1000,
    "Switch off one 10 W LED for 3 hours a day instead of leaving it on.",
  ),
  charger: electricity(
    "Idle charger unplugged",
    (0.2 * 20 * 365) / 1000,
    "Unplug a charger that draws 0.2 W while idle for 20 hours a day.",
  ),
  laundry: electricity(
    "Laundry air-dried",
    2 * 52,
    "Air-dry one load a week in place of a 2 kWh electric dryer cycle.",
  ),
  dryer: electricity(
    "Dryer cycle avoided",
    2 * 52,
    "Hang one load a week to dry in place of a 2 kWh electric dryer cycle.",
  ),
  drip: electricity(
    "Hot-water drip fixed",
    (2 * 35 * 4.186 * 365) / 3600,
    "Stop a drip wasting 2 litres of hot water a day heated 35°C above incoming water. Example uses electric resistance heat.",
  ),
  standby: electricity(
    "Standby power off",
    (5 * 18 * 365) / 1000,
    "Switch off a device drawing 5 W in standby for 18 hours a day.",
  ),
  water_heater: electricity(
    "Less hot water used",
    0.5 * 365,
    "Use less hot water so an electric water heater draws 0.5 kWh less per day.",
  ),
  thermostat: electricity(
    "Heating demand reduced",
    0.5 * 120,
    "Lower the thermostat when comfortable and safe. This example assumes 0.5 kWh less electric heating on 120 days.",
  ),
  fridge: electricity(
    "Fridge energy reduced",
    0.2 * 365,
    "Keep the door closed and check its seal. This example assumes 0.2 kWh less electricity per day.",
  ),
  oven: electricity(
    "Oven energy reduced",
    0.5 * 52,
    "Cook two dishes together once a week, avoiding 0.5 kWh of oven use each time.",
  ),
  car_keys: {
    label: "Gasoline trip replaced",
    example:
      "Walk or cycle instead of driving 5 miles a week in a 25 mpg car. This estimates tailpipe emissions.",
    kg: (5 * 52 * 8.887) / 25,
    unit: "CO₂",
  },
};

export function carbonAmount(
  action: NonNullable<(typeof carbonActions)[string]>,
) {
  return `About ${action.kg.toLocaleString(undefined, { maximumSignificantDigits: 2 })} kg ${action.unit} per year`;
}
