import rules from "./leaks.json";
import { DT } from "../core/loop";
export const ringTicks = Math.round(rules.ringSeconds / DT);
