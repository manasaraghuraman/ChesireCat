<!--
File: PROJECT_OVERVIEW.md
Purpose: Detailed description of the project: what it is, how it plays, how it teaches, how it is built,
         and what state it is in. For teammates, judges and anyone new to the repo.
Author: manasa
Date: 2026-11-22
-->

# Down the Rabbit Hole: Carbon Edition

A first-person browser game set in Alice's Wonderland where the world is full of everyday choices, and every
choice has a **carbon footprint**. Players win by making low-carbon choices, ignoring myths, spotting
greenwashing, and finally chasing a White Rabbit who turns out not to be very carbon-friendly himself.

> Wonderland isn't a place you escape to. It is the world you already live in, and what you do in it adds up.

---

## 1. Why this exists

Most students, including the people who made this, are not familiar with how ordinary habits (leaving lights on,
driving a few minutes to a shop, throwing away food) add up to the emissions behind climate change. Statistics and
lectures don't stick. A game that makes you *decide* does.

The Alice in Wonderland theme gives the lessons a memorable world: tiny doors, a grinning cat, a rabbit who is
always late. Rushing, as the opening pop-up shows, is exactly how carbon gets wasted.

**What a player should leave with**

- Your carbon footprint is the CO2 your choices release: making things, moving things and powering things.
- Short trips are the easiest to swap (walk or bike), and wasted food and idle electricity are real sources.
- Big claims like "eco-friendly!" need proof you can check, otherwise they are greenwashing.
- Small habits add up, and they're easy to start.

---

## 2. The player's journey

```
Opening pop-up ──► The Fall ──► Hall of Doors ──► three challenge rooms ──► tiny garden door
                                                                                    │
        Back to the Hall ◄── (each level: Next level / Back to Hall) ◄── Carbon Chase ◄┘
```

1. **Opening pop-up.** The Rabbit shouts that he's late for a very important date and can't get to the meeting
   until the garden door opens. Clicking "Follow the Rabbit" starts the fall.
2. **The Fall.** A tumble down a long shaft into Wonderland.
3. **The Hall of Doors.** A checkered hall with four doors, a glass table with an empty Golden Key slot, and a
   tiny glowing garden door at the far end. Three doors are open. Each room awards one key piece.
4. **Three challenge rooms**, each a small mini game (section 3).
5. **The garden.** With all three key pieces, walk up to the tiny door and it opens. In the garden the player
   finds out the White Rabbit left lights and appliances running all through his cottage.
6. **Carbon Chase.** Chase him through six speedrun levels (section 4). After every level the player chooses
   **Next level** or **Back to the Hall of Doors**.

---

## 3. The three rooms

All three rooms share one idea: *you read the evidence, then decide.* Pressing **E** on something, or simply
walking up to it, makes your choice. Wrong choices never end the game. They explain why, and you can try again.

### 3.1 The Cheshire Cat's wood: pick the lower-carbon way

- The Cheshire Cat only gives **instructions**. It never says which answer is right.
- Two signposts stand side by side, with identical colouring so nothing hints at the answer:
  - **"Walk or cycle to school: about 0 kg of CO2 (no fuel burned)"**
  - **"Drive alone, 3 km each way: about 1 kg of CO2 a day (burns fuel for one person)"**
- Choosing the walk-or-cycle sign awards the **Cheshire key piece** and a lesson card. The other sign explains
  that driving alone burns fuel and releases CO2.

### 3.2 The Carbon Maze: everyday choices

- A generated maze with six choice boards and three people to talk to.
- **Collect the three low-carbon choices:**
  - Walk or bike to the store when it's only 5 minutes away
  - Only buy the food you know you'll eat (less food waste)
  - Switch things off when you leave the room (lights, TV, chargers)
- **Avoid the three high-carbon choices:**
  - Take the car to a store 5 minutes away instead of walking or biking
  - Buy way more food than you can eat "just in case"
  - Leave the TV, lights and consoles on all night
- Every board explains itself when you walk up to it ("Good choice: ..." or "High-carbon choice: ..."), and
  collecting the same board twice never double-counts.
- **Ranger Hare**, **Inspector Dodo** and **Gossip Dormouse** talk to you as you pass. The first two give real
  facts (everything has a carbon footprint, food waste rots into methane, standby still draws power). The
  Dormouse is a comic unreliable narrator: "I'm just a rumour, so check for yourself!"
- Collect all three good choices, reach the exit, and the **Carbon Maze key piece** is yours. (It sits behind the
  Hall door that used to be the Caterpillar's.)

### 3.3 The Greenwash Check: spot the red flags

- A suspicious "ECO HERO" bottle ad ("100% planet-friendly! Buy 10 today and save the Earth!") with **six evidence
  cards**, all readable at once.
- Only **three** are genuine greenwash red flags:
  - Plain new plastic ("eco" is only in the name)
  - No certificate, no numbers, no test results
  - Flown in by air, one bottle per box
- The other three are normal details that merely sound suspicious (made in a factory, comes with a receipt, has a
  screw-top lid). They explain why they are *not* red flags.
- Right picks turn a card green and count up; wrong picks turn red and teach. Find all three red flags and the ad
  "falls apart" and the **Greenwash Check key piece** is awarded. The point is to judge evidence, not to be
  suspicious of everything.

---

## 4. Carbon Chase: the speedrun finale

After the garden, the player chases the Rabbit through a complete first-person speedrun game, embedded in the
main game. It was built by a teammate as a standalone project and is included here as a vendored copy.

**The six levels:** *Lights Out*, *Under the Sink*, *The Boiler Room*, *Laundry Leap*, *Last Call at the
Cottage* and the *Power-up lab*.

**How a level works**

- Run through Alice's cottage and shut off energy "leaks" (lights, chargers, drips, standby, and big appliances
  such as the water heater, thermostat, dryer, fridge and oven) to cut your time.
- Appliance power-ups use Wonderland themes: **Drink Me**, **Eat Me**, **Flamingo**, **Hatter Hop**, **Tea Time**
  and **Cheshire**.
- Hazards: the White Rabbit's calls, patrolling soldiers, and smog that slows you.
- Each completed task shows an annual carbon-savings example with its assumptions. These are estimates and are
  labelled as such, based on typical US electricity and gasoline figures.
- Medals (Gold Pocket Watch, Silver Spoon, Copper Teacup), personal bests, replay ghosts and a collectible glove
  are saved locally in the browser.

**Between levels:** after each level the game offers exactly two choices, **Next level** or **Back to the Hall of
Doors**. Finishing a level remembers your place, and leaving an unfinished level keeps that level ready to retry.
Finishing the last level ends with "You caught the White Rabbit!", where he agrees to switch things off, use less
hot water and hang his laundry to dry.

---

## 5. Controls

| Input | Action |
|---|---|
| Mouse | Look around |
| **W A S D** | Move |
| **Space** | Jump (chase) |
| **Shift / Ctrl** | Slide (chase) |
| **E** | Interact (doors, objects) / hold E at appliances in the chase |
| **H** | Return to the Hall of Doors from a room |
| **R** | Restart a chase run |
| **Esc** | Pause / release the mouse |

Walking up to boards, cards and the garden door triggers them automatically, so you never have to aim at a
small target.

---

## 6. How it's built

### 6.1 Two games in one

| Part | What it is | Stack |
|---|---|---|
| **Wonderland** (the main game) | The Fall, Hall of Doors, three rooms, garden, HUD and cards | Next.js 16, React 19, three.js, Rapier physics, Zustand, Zod, Tailwind CSS, TypeScript |
| **Carbon Chase** (`chase/`) | The six-level speedrun, vendored | Vite, Preact, three.js, Rapier, TypeScript |

Carbon Chase is built to static files in `public/chase/` and shown in a full-screen **iframe**. The two games talk
through a same-origin `postMessage` channel carrying only the level, whether it was completed, and the
player's choice. The parent validates the sender and the message shape before acting on it. Each game keeps its own
dependencies, tests and build.

### 6.2 Architecture of the main game

- **`game3d/world.ts`** runs the render and physics loop, pointer-lock input, the player body and what the
  reticle is pointing at.
- **Zones** (`game3d/zones/`) stage one scene each: `fall`, `hall`, `cheshire`, `maze`, `clues`, `garden`. A zone
  builds its visuals, registers interactables and emits intents. It never decides game outcomes.
- **Levels** are JSON (`public/levels/*.level.json`): boxes with tags, a spawn point and interactables. The
  maze level is **generated from an ASCII grid** (`lib/mazeLayout.ts`), and a test fails if the shipped file ever
  drifts from the layout.
- **Content and rules are separate from rendering.** Everything the player reads and every rule (right/wrong
  signpost, counting boards, evidence cards, what the people say) lives in `lib/carbonContent.ts` as pure
  functions. That is why it is fully unit-tested.
- **Event bridge** (`game/bridge.ts`) is a small typed bus between the 3D world and the React overlays (hints, key
  cards, the garden, the chase).
- **State** (`lib/state/store.ts`) is a persisted Zustand store holding key pieces and lessons.
- **Walk-up triggers** (`game3d/proximity.ts`) decide which boards or cards you're standing next to.
- **Readable text in 3D** (`game3d/labels.ts`) draws word-wrapped, high-contrast text boards.

### 6.3 Repository map

```
app/                  Next.js pages (title screen, /play) and API routes
components/           React overlays: HUD, messages, key card, pause menu, Carbon Chase iframe
game/                 Typed event bridge
game3d/               3D engine: world, physics, input, interaction, zones, entities
lib/                  Carbon content and rules, maze layout, chase logic, state, shared helpers
public/levels/        Level JSON (hall, cheshire, maze, clues, garden)
chase/                Vendored Carbon Chase game (own package.json, tests and build)
public/chase/         Chase build output (generated, not committed)
```

### 6.4 Testing

- The main app has roughly **190 tests** (Vitest) covering the room rules, the maze (every board and the exit
  must be reachable from the start), level files, text wrapping, walk-up triggers, the store and the chase
  message handling.
- Carbon Chase keeps its own suite (about 30 tests) for movement, hazards, power-ups, replays and saves.
- `npm test` runs the main suite, and `npm run test:chase` runs the chase suite.

---

## 7. Running it

```bash
npm ci
npm run dev        # builds the vendored chase first, then starts http://localhost:3000
```

Open `http://localhost:3000` and press **Begin**, or go straight to `/play`. `npm run build` builds both games for
production, and `npm run typecheck` checks the main app.

---

## 8. Honest status and limits

- **Placeholder art.** The 3D world uses simple low-poly shapes and text boards. There are no custom models,
  textures or sound.
- **Estimates, not measurements.** The carbon figures are simple examples (about 0 kg for walking, about 1 kg a day
  for a short drive alone) and the chase's own savings figures are labelled with their assumptions. They teach
  scale and direction, not exact accounting.
- **Earlier AI features are not in the current flow.** The repository still contains an earlier media-literacy
  version's AI characters (Groq models through the Vercel AI SDK) and Solari cloud-browser code. The current
  carbon game doesn't call them.
- **Online leaderboards are optional and off by default.** The chase includes optional Supabase leaderboard code
  that only activates if credentials are configured.
- **Browser support.** It needs a desktop browser with WebGL 2 and mouse pointer-lock. There's no mobile control
  scheme yet.

---

## 9. Credits and history

- **Story and setting:** *Alice's Adventures in Wonderland* by Lewis Carroll (1865, public domain).
- **Carbon Chase:** vendored from [`vgarg492/carbon-footprint-game`](https://github.com/vgarg492/carbon-footprint-game).
  The level format and some engine pieces in the main 3D game were adapted from the same project.
- **History:** the project began as a 2D (Phaser) online-safety game about media literacy and was rebuilt in 3D, then
  its content was changed to carbon footprints. The 2D version is preserved on the `feat/solari` branch.

### Branches

| Branch | Contents |
|---|---|
| `main` | The current game: 3D Wonderland, carbon content, garden and Carbon Chase |
| `feat/carbon-chase` | The carbon content and chase work |
| `feat/3d-world` | The 3D game with the original media-literacy rooms |
| `feat/solari` | The 2D Phaser game with AI characters and Solari |
