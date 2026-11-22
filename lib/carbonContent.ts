/**
 * File: lib/carbonContent.ts
 * Purpose: All the carbon-footprint content and rules for the rooms: the Cheshire signposts (pick the
 *          lower-carbon choice), the Carbon Maze choice boards (good choice vs high-carbon choice), the Greenwash
 *          Check clues (genuine vs greenwash) and the people in the maze. Pure data and functions so
 *          every rule is unit-tested; zones only stage them.
 * Author: manasa
 * Date: 2026-11-22
 */
export const CAT_INSTRUCTIONS =
  "Two signposts, two ways to get to school, and one is much kinder to the planet. Read both signposts " +
  "carefully, then walk up to the one with the smaller carbon footprint and press E to take the key. " +
  "Choose wisely, and you may try again!";

export const CHESHIRE_LESSON =
  "Your carbon footprint is the CO2 your choices release. Walking or cycling burns no fuel, so it beats driving alone.";

export const SIGN_TEXT: Readonly<Record<string, string>> = {
  "sign-real": "Walk or cycle to school\nAbout 0 kg of CO2\n(no fuel burned)",
  "sign-fake": "Drive alone, 3 km each way\nAbout 1 kg of CO2 a day\n(burns fuel for one person)",
};

export interface SignResult {
  readonly isCorrect: boolean;
  readonly message: string;
}

export function judgeSignpost(id: string): SignResult | null {
  if (id === "sign-real") return { isCorrect: true, message: "Correct! Walking or cycling has the smaller footprint. Here's your key." };
  if (id === "sign-fake") {
    return { isCorrect: false, message: "Not that one: driving alone burns fuel and releases CO2. Try the other signpost." };
  }
  return null;
}

export interface Board {
  readonly text: string;
  readonly isReal: boolean;
  readonly message: string;
}

export const BOARDS: Readonly<Record<string, Board>> = {
  "board-real-1": {
    text: "Walk or bike to the store\nwhen it's only 5 minutes away",
    isReal: true,
    message: "Good choice: a short trip on foot or by bike burns no fuel.",
  },
  "board-real-2": {
    text: "Only buy the food\nyou know you'll eat\n(less food waste)",
    isReal: true,
    message: "Good choice: wasted food rots and releases methane, so buying only what you'll eat cuts carbon.",
  },
  "board-real-3": {
    text: "Switch things off\nwhen you leave the room\n(lights, TV, chargers)",
    isReal: true,
    message: "Good choice: less electricity used means less CO2.",
  },
  "board-fake-1": {
    text: "Take the car to a store\n5 minutes away instead of\nwalking or biking",
    isReal: false,
    message: "High-carbon choice: the car burns fuel for a trip you could easily walk or bike.",
  },
  "board-fake-2": {
    text: "Buy way more food\nthan you can eat\n'just in case'",
    isReal: false,
    message: "High-carbon choice: wasted food releases methane and wastes the energy it took to make.",
  },
  "board-fake-3": {
    text: "Leave the TV, lights and\nconsoles on all night",
    isReal: false,
    message: "High-carbon choice: running things all night burns electricity for nothing.",
  },
};

export const REAL_BOARD_IDS: readonly string[] = Object.keys(BOARDS).filter((id) => BOARDS[id]?.isReal);
export const MAZE_LESSON =
  "Small everyday choices add up: walk or bike for short trips, buy only the food you'll eat, and switch things off.";
export const MAZE_EXIT_ID = "maze-exit";

export interface BoardResult {
  readonly kind: "real" | "fake";
  readonly isNew: boolean;
  readonly message: string;
  readonly collectedCount: number;
  readonly isMazeComplete: boolean;
}

/** Judges a board the player inspected. Unknown ids return null. Collecting twice never double-counts. */
export function judgeBoard(id: string, collected: ReadonlySet<string>): BoardResult | null {
  const board = BOARDS[id];
  if (!board) return null;
  if (!board.isReal) {
    return { kind: "fake", isNew: false, message: board.message, collectedCount: collected.size, isMazeComplete: false };
  }
  const isNew = !collected.has(id);
  const count = collected.size + (isNew ? 1 : 0);
  return {
    kind: "real",
    isNew,
    message: `${board.message} (${count}/${REAL_BOARD_IDS.length})`,
    collectedCount: count,
    isMazeComplete: count >= REAL_BOARD_IDS.length,
  };
}

export const MAZE_KEY_LESSON = MAZE_LESSON;
export const HATTER_LESSON =
  "Before you trust an 'eco' label, ask what it's made of, what proof there is, how it was shipped, and whether it just wants you to buy more.";
export const GARDEN_LESSON =
  "You picked low-carbon choices and caught greenwashing. That's how you shrink your carbon footprint: check the facts, then act.";

export const CLUE_POST = "ECO HERO bottle: 100% planet-friendly!\nBuy 10 today and save the Earth!";

export interface Evidence {
  readonly text: string;
  readonly isRedFlag: boolean;
  readonly message: string;
}

/** Six cards, all readable at once: three real greenwash red flags and three normal details. */
export const EVIDENCE: Readonly<Record<string, Evidence>> = {
  "clue-1": {
    text: "It was made in a factory",
    isRedFlag: false,
    message: "Not a red flag: almost every product is made in a factory. What matters is proof of how it's made.",
  },
  "clue-2": {
    text: "Plain new plastic.\n'Eco' is only in the name.",
    isRedFlag: true,
    message: "Red flag! The word 'eco' is only a name. New plastic has a big carbon footprint.",
  },
  "clue-3": {
    text: "It comes with a receipt",
    isRedFlag: false,
    message: "Not a red flag: a receipt is normal and says nothing about the carbon footprint.",
  },
  "clue-4": {
    text: "No certificate, no numbers,\nno test results",
    isRedFlag: true,
    message: "Red flag! A real green claim shows proof you can check.",
  },
  "clue-5": {
    text: "Flown in by air,\none bottle per box",
    isRedFlag: true,
    message: "Red flag! Air freight for single bottles releases a lot of CO2.",
  },
  "clue-6": {
    text: "It has a screw-top lid",
    isRedFlag: false,
    message: "Not a red flag: a lid says nothing about how green the bottle is.",
  },
};
export const RED_FLAG_COUNT = Object.values(EVIDENCE).filter((card) => card.isRedFlag).length;

export interface EvidenceResult {
  readonly kind: "red-flag" | "not-a-flag";
  readonly isNew: boolean;
  readonly count: number;
  readonly isComplete: boolean;
  readonly message: string;
}

/** Picking an evidence card. Only genuine red flags count, and picking the same one twice never double-counts. */
export function judgeEvidence(id: string, found: ReadonlySet<string>): EvidenceResult | null {
  const card = EVIDENCE[id];
  if (!card) return null;
  if (!card.isRedFlag) {
    return { kind: "not-a-flag", isNew: false, count: found.size, isComplete: false, message: card.message };
  }
  const isNew = !found.has(id);
  const count = found.size + (isNew ? 1 : 0);
  return {
    kind: "red-flag",
    isNew,
    count,
    isComplete: count >= RED_FLAG_COUNT,
    message: `${card.message} (${count}/${RED_FLAG_COUNT})`,
  };
}

export interface Person {
  readonly name: string;
  readonly lines: readonly string[];
}

export const PEOPLE: Readonly<Record<string, Person>> = {
  "person-1": {
    name: "Ranger Hare",
    lines: [
      "Everything has a carbon footprint: the CO2 released making it, moving it and powering it.",
      "Short trips are the easiest to swap. If it's only a few minutes, walk or bike!",
    ],
  },
  "person-2": {
    name: "Inspector Dodo",
    lines: [
      "Food you throw away took energy to grow and ship, then rots into methane. Buy only what you'll eat.",
      "Switching things off, or unplugging standby devices, saves electricity all day long.",
    ],
  },
  "person-3": {
    name: "Gossip Dormouse",
    lines: [
      "My cousin says taking the car is quicker, even for five minutes. But I'm just a rumour, so check for yourself!",
      "I heard buying extra food is thrifty. A guy told me. That's not a source, dear.",
    ],
  },
};

/** The line a person says on their Nth conversation; cycles through their lines. Null for unknown ids. */
export function personLine(id: string, timesSpoken: number): string | null {
  const person = PEOPLE[id];
  if (!person || person.lines.length === 0) return null;
  const line = person.lines[((timesSpoken % person.lines.length) + person.lines.length) % person.lines.length];
  return `${person.name}: "${line}"`;
}
