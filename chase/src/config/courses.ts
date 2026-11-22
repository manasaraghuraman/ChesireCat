import thresholds from "./medals.json";
import rules from "./leaks.json";
import catalog from "./levels.json";
export type LevelId = keyof typeof thresholds;
export const courses = (Object.keys(catalog) as LevelId[]).map((id) => ({
  id,
  course: id,
  name: catalog[id].name,
  tip: id === "c1_l1" ? rules.small.light.tip : rules.big.water_heater.tip,
}));
// HUMAN TODO: Set Ace thresholds from developer playtests.
export function medal(id: LevelId, time: number) {
  const target: { ace: number | null; gold: number; silver: number } =
    thresholds[id];
  if (target.ace !== null && time <= target.ace) return "Ace of Hearts";
  if (time <= target.gold) return "Gold Pocket Watch";
  if (time <= target.silver) return "Silver Spoon";
  return "Copper Teacup";
}
