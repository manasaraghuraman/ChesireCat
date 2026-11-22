/**
 * File: lib/mediaLiteracy.ts
 * Purpose: All the media-literacy content and rules for the two rooms: the Cheshire signposts
 *          (spot the look-alike web address) and the maze news boards (trustworthy source vs fake
 *          news). Pure data and functions so every rule is unit-tested; zones only stage them.
 * Author: manasa
 * Date: 2026-11-22
 */
export const CAT_INSTRUCTIONS =
  "Two signposts, two shops, only one honest. Read both signposts carefully, then walk up to the one " +
  "you trust and press E to take the key. Choose wisely, and you may try again!";

export const CHESHIRE_LESSON =
  "Check where a link really goes. A familiar name on the wrong address is a grin without a cat.";

export const SIGN_TEXT: Readonly<Record<string, string>> = {
  "sign-real": "queensroyalshop.wonder\nThe Queen's REAL shop\n(the address matches the name)",
  "sign-fake": "royal-crowns-free.wonder\nFREE CROWNS!!! HURRY!!!\n(wrong address, too good to be true)",
};

export interface SignResult {
  readonly isCorrect: boolean;
  readonly message: string;
}

export function judgeSignpost(id: string): SignResult | null {
  if (id === "sign-real") return { isCorrect: true, message: "Correct! The address matches the real shop. Here's your key." };
  if (id === "sign-fake") {
    return { isCorrect: false, message: "Not that one: the address doesn't match and it shouts FREE. Try the other signpost." };
  }
  return null;
}

export interface Board {
  readonly text: string;
  readonly isReal: boolean;
  readonly message: string;
}

const GOOD = "Good source: it names an author, shows evidence and can be checked.";
const BAD = "Fake news clue: no real source and it tries to hurry or shock you.";

export const BOARDS: Readonly<Record<string, Board>> = {
  "board-real-1": { text: "Wonderland Gazette\nBy Dr. A. Hare\n3 named experts, corrections page", isReal: true, message: GOOD },
  "board-real-2": { text: "Tea Times Science Desk\nStudy in a journal,\nfull paper linked below", isReal: true, message: GOOD },
  "board-real-3": { text: "Royal Courier\nTwo independent outlets\nconfirm this report", isReal: true, message: GOOD },
  "board-fake-1": { text: "SHOCKING!!! DOCTORS HATE THIS!!!\nShare before it's DELETED!!!", isReal: false, message: BAD },
  "board-fake-2": { text: "Anonymous post\n'my cousin heard it from a guy'\n0 sources", isReal: false, message: BAD },
  "board-fake-3": { text: "100% TRUE!!!\n(no author, no date, no links)", isReal: false, message: BAD },
};

export const REAL_BOARD_IDS: readonly string[] = Object.keys(BOARDS).filter((id) => BOARDS[id]?.isReal);
export const MAZE_LESSON = "Real news names its sources and can be checked. Fake news shouts, hurries you, and hides who said it.";
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
  "Before you share: check who posted it, whether anyone else reports it, and what it wants from you.";
export const GARDEN_LESSON =
  "You checked the address, the sources and the claims. That's how you stay safe online: slow down, check, then trust.";

export const CLUE_POST = "BREAKING: Free tablets for ALL students!\nShare now and log in with your school password to claim yours!";

export const CLUES: Readonly<Record<string, string>> = {
  "clue-1": "Who posted it?\nThe account was made yesterday and has no other posts.",
  "clue-2": "Does anyone else report it?\nNo news site does. A search finds only copies of this post.",
  "clue-3": "Where is the proof?\nNo date, no author, and no link to any article.",
  "clue-4": "What does it want from you?\nTo share it fast and type in your school password.",
};
export const CLUE_COUNT = Object.keys(CLUES).length;

export interface ClueResult {
  readonly isNew: boolean;
  readonly count: number;
  readonly isAllFound: boolean;
  readonly message: string;
}

/** Inspecting a clue. Finding the same clue twice never double-counts. Unknown ids return null. */
export function judgeClue(id: string, found: ReadonlySet<string>): ClueResult | null {
  const text = CLUES[id];
  if (!text) return null;
  const isNew = !found.has(id);
  const count = found.size + (isNew ? 1 : 0);
  const message = `Clue ${count}/${CLUE_COUNT}: ${text.replace("\n", " ")}`;
  return { isNew, count, isAllFound: count >= CLUE_COUNT, message };
}

export interface VerdictResult {
  readonly kind: "early" | "correct" | "wrong";
  readonly message: string;
}

/** Walking up to a verdict podium. You must inspect every clue first; the post is FAKE. */
export function judgeVerdict(id: string, foundCount: number): VerdictResult | null {
  if (id !== "verdict-real" && id !== "verdict-fake") return null;
  if (foundCount < CLUE_COUNT) {
    return { kind: "early", message: `Not yet! Investigate first: you've found ${foundCount} of ${CLUE_COUNT} clues.` };
  }
  return id === "verdict-fake"
    ? { kind: "correct", message: "Correct: it's FAKE. Every clue pointed that way. Here's your key." }
    : { kind: "wrong", message: "Look at the clues again: a new account, no other sources, no proof, and it wants your password. Try the other podium." };
}

export interface Person {
  readonly name: string;
  readonly lines: readonly string[];
}

export const PEOPLE: Readonly<Record<string, Person>> = {
  "person-1": {
    name: "Reporter Hare",
    lines: [
      "I always ask two questions: who wrote it, and can I check it?",
      "A real story names its sources. If it only says 'experts say', keep walking.",
    ],
  },
  "person-2": {
    name: "Fact-Checker Dodo",
    lines: [
      "If a board shouts, rushes you, or hides who said it, be suspicious.",
      "Look for boards that name an author and show where the evidence is.",
    ],
  },
  "person-3": {
    name: "Gossip Dormouse",
    lines: [
      "My cousin says the loud boards are the fake ones. But I'm just a rumour, so check for yourself!",
      "I heard it from a guy who heard it from a guy. That's not a source, dear.",
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
