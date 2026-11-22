# AGENTS.md — Down the Rabbit Hole (working title)

A fast, first-person, level-based speedrun game in the browser. The feel is inspired by Neon White: short handcrafted levels, momentum-heavy movement, instant restarts, medals, ghosts and leaderboards. The theme is Alice in Wonderland plus reducing household carbon footprint.

> **How to use this file:** Build the game **one phase at a time** (see "Build Phases"). At the end of each phase, stop, summarize what was built, list how to test it, and wait for the human before starting the next phase. Do not skip ahead.
>
> **Codex environment notes:** Installing packages (`npm install`, Supabase CLI) needs network access. If the sandbox blocks it, ask the human to approve or run the command. Always verify with `npm run build`, `npm run test` and `npm run lint` before reporting a phase as done. Never run `supabase secrets set` or anything that touches real credentials. Tell the human the exact command to run instead.

---

## 1. Game Design (source of truth)

### 1.1 One-line pitch
The White Rabbit is late and careless. He dashes through each room leaving energy waste ("carbon leaks") behind. You play Alice in first person: clear the leaks at full speed to unlock the Rabbit hole, then dive in before the clock beats you.

### 1.2 Level flow
1. Player spawns. The Rabbit shouts "I'm late!" and dashes along a scripted path to the **Rabbit hole** (the exit).
2. The Rabbit hole is **sealed** until every **required leak** in the level is cleared.
3. Player clears leaks, reaches the open hole, and touches it. The timer stops.
4. Results screen: time, medal, leaks cleared, one-line real-world impact receipt.
5. **Instant restart** (R key) at any time, with no load screen.

### 1.3 Leaks
| Type | How it clears | Notes |
|---|---|---|
| **Small leak** (light, charger, drip, standby TV) | Instantly, by touching it (run through it) | Can be required or optional |
| **Big leak** (water heater, thermostat, dryer, car keys, fridge, oven) | Stand inside its **ring** for **3.0 seconds** | Grants a power-up automatically on completion |

**Ring rules:**
- The ring is a cylindrical sensor around the leak (default radius 2.0 m).
- Progress fills only while the player is inside. Leaving **pauses** progress (it does not reset).
- The player can move, jump and strafe freely inside the ring.
- At 3.0 s the leak clears and its power-up **activates immediately**. There is no inventory, no cards and no activation button.
- Show a radial fill around the leak in world space, plus a small HUD indicator.

**Optional leaks:** Clearing an optional leak subtracts `timeCutSeconds` from the final time (shown on the results screen). Bigger real-world impact gives a bigger time cut.

### 1.4 Power-ups (fixed mapping per big-leak type)
| Big leak | Power-up id | Effect | Duration |
|---|---|---|---|
| Water heater | `drink_me` | Shrink: collider height 1.8 m → 0.6 m, fits through `vent` openings, speed ×1.1 | 4.0 s |
| Thermostat | `eat_me` | Giant: camera height ×2, FOV +10, speed ×1.4, jump ×1.3, smashes `breakable` objects on contact | 4.0 s |
| Dryer | `flamingo` | Instant launch: impulse of 22 m/s along look direction + 4 m/s up | Instant |
| Car keys | `hatter_hop` | +3 extra midair jumps | 5.0 s (or until used) |
| Fridge | `tea_time` | World time scale 0.4 for everything except the player. **The run timer is NOT slowed.** | 3.0 s |
| Oven | `cheshire` | The next `phaseable` wall touched lets the player pass through | 5.0 s window |

Implementation notes:
- `eat_me` must **not** grow the physics collider (to avoid getting stuck). Scale camera height, FOV and movement values only.
- `drink_me`: when it ends, if there is no headroom, keep the player small until there is clearance. Never push the player into geometry.
- Only one timed power-up is active at a time. A new one replaces the old one.
- Power-ups are **not** used in any other way. **Do not add cards, an inventory or an activation key.**

### 1.5 The Rabbit
- Follows a scripted CatmullRom spline (`rabbit_path`) at a fixed speed, then idles at the Rabbit hole tapping his watch.
- Fully deterministic. Same behavior every run. It is cosmetic and guides the player; it does not need catching.
- Touching the hole after it unseals ends the level.

### 1.6 Hazards
- **Card soldiers:** walk patrol paths. If a soldier touches a cleared small leak, that leak turns back on. Soldiers push the player out of rings (knockback 6 m/s).
- **Smog zones:** trigger volumes that apply ×0.6 move speed until their linked leak is cleared.
- **Breakables:** only `eat_me` breaks them.
- **Vents:** only passable while `drink_me` is active.
- **Phaseable walls:** only passable during the `cheshire` window.

### 1.7 Medals
Per level, in `medals.json`: Copper Teacup → Silver Spoon → Gold Pocket Watch → **Ace of Hearts** (dev time). Medals use the final time after optional time cuts.

### 1.8 Collectible
One hidden **Rabbit's lost glove** per level, placed off the fast route. Collecting it unlocks a real-world tip card in a "Tips" menu. It does not affect time.

### 1.9 Structure (no story)
Chapters are level packs. Each chapter introduces one new big-leak type and power-up.
| Chapter | Setting | New big leak / power-up |
|---|---|---|
| 1 | Alice's Cottage | Water heater / `drink_me` (plus `eat_me` and `flamingo` for the MVP) |
| 2 | City Apartment | Car keys / `hatter_hop` |
| 3 | Suburban House | Fridge / `tea_time` |
| 4 | The Queen's Mansion | Oven / `cheshire` |
| 5 | Through the Looking-Glass | Mirrored remixes |

**MVP scope = Chapter 1 only: 5 levels using `drink_me`, `eat_me` and `flamingo`.**

---

## 2. Tech Stack

| Layer | Choice |
|---|---|
| Language | TypeScript (strict) |
| Build | Vite |
| Rendering | three |
| Post FX | postprocessing (pmndrs): bloom + mild color grading |
| Physics | @dimforge/rapier3d-compat (KinematicCharacterController) |
| ECS | miniplex |
| UI | preact + @preact/preset-vite (HTML overlay on the canvas) |
| Audio | howler + three PositionalAudio |
| Debug | lil-gui, stats.js, Rapier debug renderer |
| Backend | @supabase/supabase-js, Supabase Edge Functions (Deno) |
| Tests | vitest |
| Lint/format | eslint + prettier |
| Asset tooling | @gltf-transform/cli (Phase 11) |

Do not add other major dependencies without asking.

---

## 3. Architecture

### 3.1 Game loop
- **Fixed simulation timestep: 120 Hz** (`DT = 1/120`). Rendering uses `requestAnimationFrame` and interpolates between the previous and current sim state.
- Accumulator pattern with a max of 8 sim steps per frame (to avoid a spiral of death).
- **The run timer counts simulation ticks.** Display time = `ticks / 120`. Never use wall-clock time for scoring.
- `tea_time` scales the `dt` passed to non-player systems only. The tick counter is unaffected.

### 3.2 Player movement state machine
States: `Grounded`, `Airborne`, `Sliding`, `WallRunning`.
Power-ups apply modifiers on top of state behavior through a `MovementModifiers` object (speed multiplier, jump multiplier, extra air jumps, collider height, and so on).

### 3.3 Collision groups (Rapier)
`WORLD`, `PLAYER`, `SENSOR`, `VENT`, `BREAKABLE`, `PHASEABLE`, `HAZARD`. Toggle player-vs-`VENT` and player-vs-`PHASEABLE` interaction filters while the relevant power-ups are active.

### 3.4 Input
- Pointer Lock with `{ unadjustedMovement: true }` when supported, falling back silently otherwise.
- Controls: WASD move, Mouse look, Space jump, Shift or Ctrl slide, R restart, Esc pause.
- Jump buffer and coyote time (see config).
- Gamepad support is a stretch goal (Phase 10).

### 3.5 Folder structure
```
/src
  main.ts
  /core        loop.ts, time.ts, gameState.ts, events.ts
  /player      controller.ts, states/*.ts, camera.ts, input.ts, modifiers.ts
  /physics     world.ts, groups.ts, debug.ts
  /level       loader.ts, jsonLevel.ts, gltfLevel.ts, spawn.ts, types.ts
  /entities    smallLeak.ts, bigLeak.ts, ring.ts, rabbit.ts, soldier.ts, smogZone.ts, rabbitHole.ts, glove.ts
  /powerups    index.ts, drinkMe.ts, eatMe.ts, flamingo.ts, hatterHop.ts, teaTime.ts, cheshire.ts
  /replay      recorder.ts, player.ts, codec.ts
  /ui          App.tsx, Hud.tsx, Results.tsx, Menu.tsx, LevelSelect.tsx, Pause.tsx, Settings.tsx, Tips.tsx
  /audio       audio.ts
  /net         supabase.ts, leaderboard.ts, submitRun.ts, commentary.ts
  /save        localSave.ts
  /config      movement.config.ts, leaks.json, medals.json, levels.json
/public
  /levels      *.level.json (gray-box) and later *.glb
  /audio /models /textures
/supabase
  /migrations
  /functions/submit_run
  /functions/cheshire_commentary
/tests
```

### 3.6 Power-up interface
```ts
interface PowerUp {
  id: PowerUpId;
  duration: number;            // seconds; 0 = instant
  onStart(ctx: GameContext): void;
  onTick(ctx: GameContext, dt: number): void;
  onEnd(ctx: GameContext): void;
}
```

---

## 4. Config (starting values; all live-tunable through lil-gui in dev)

### 4.1 `movement.config.ts`
```ts
export const MOVEMENT = {
  maxGroundSpeed: 11,      // m/s
  groundAccel: 90,
  groundFriction: 8,
  airAccel: 35,
  maxAirSpeed: 11,         // carried momentum may exceed this; air accel only adds up to it
  gravity: 28,
  jumpVelocity: 8.5,
  coyoteTime: 0.10,        // s
  jumpBuffer: 0.12,        // s
  slideBoost: 4,           // m/s added on slide start
  slideDuration: 0.6,
  slideFriction: 1.5,
  slideCooldown: 0.4,
  wallRunMaxTime: 1.2,
  wallRunGravityScale: 0.15,
  wallRunMinSpeed: 6,
  wallJumpUp: 7.5,
  wallJumpOut: 7,
  playerHeight: 1.8,
  playerRadius: 0.35,
  eyeHeight: 1.6,
  fov: 100,
  mouseSensitivity: 0.0022,
};
```

### 4.2 `leaks.json`
`impactKgPerYear` and `tip` are **left null on purpose**. A human will fill them in from a sourced reference (for example the EPA household carbon calculator). **Never invent carbon figures.** If a value is null, the UI shows "Impact data coming soon".
```json
{
  "small": {
    "light":    { "timeCutSeconds": 0.1, "impactKgPerYear": null, "tip": null },
    "charger":  { "timeCutSeconds": 0.1, "impactKgPerYear": null, "tip": null },
    "drip":     { "timeCutSeconds": 0.1, "impactKgPerYear": null, "tip": null },
    "standby":  { "timeCutSeconds": 0.2, "impactKgPerYear": null, "tip": null }
  },
  "big": {
    "water_heater": { "powerup": "drink_me",   "timeCutSeconds": 1.5, "impactKgPerYear": null, "tip": null },
    "thermostat":   { "powerup": "eat_me",     "timeCutSeconds": 2.0, "impactKgPerYear": null, "tip": null },
    "dryer":        { "powerup": "flamingo",   "timeCutSeconds": 1.0, "impactKgPerYear": null, "tip": null },
    "car_keys":     { "powerup": "hatter_hop", "timeCutSeconds": 2.0, "impactKgPerYear": null, "tip": null },
    "fridge":       { "powerup": "tea_time",   "timeCutSeconds": 0.8, "impactKgPerYear": null, "tip": null },
    "oven":         { "powerup": "cheshire",   "timeCutSeconds": 0.8, "impactKgPerYear": null, "tip": null }
  },
  "ringSeconds": 3.0,
  "ringRadius": 2.0
}
```

---

## 5. Level Format

### 5.1 Gray-box JSON (Phases 2–10)
Levels are authored as JSON so they can be built without Blender. File: `/public/levels/c1_l1.level.json`.
```json
{
  "id": "c1_l1",
  "name": "Lights Out",
  "chapter": 1,
  "spawn": { "pos": [0, 1, 0], "yaw": 0 },
  "geometry": [
    { "shape": "box", "pos": [0, -0.5, 0], "size": [40, 1, 40], "tags": ["floor"] },
    { "shape": "box", "pos": [10, 2, 0], "size": [0.5, 4, 12], "tags": ["wallrun"] },
    { "shape": "box", "pos": [5, 1, 8], "size": [2, 2, 0.3], "tags": ["breakable"] },
    { "shape": "box", "pos": [-6, 0.4, 3], "size": [1.2, 0.8, 0.3], "tags": ["vent"] },
    { "shape": "box", "pos": [0, 2, -10], "size": [6, 4, 0.5], "tags": ["phaseable"] }
  ],
  "leaks": [
    { "kind": "small", "type": "light", "pos": [3, 1.5, 4], "required": true },
    { "kind": "big", "type": "water_heater", "pos": [-8, 0, -5], "required": true },
    { "kind": "big", "type": "dryer", "pos": [12, 0, 6], "required": false }
  ],
  "rabbitPath": [[0, 0, 2], [6, 0, 6], [12, 0, 12]],
  "rabbitHole": { "pos": [12, 0, 12] },
  "soldiers": [{ "path": [[2, 0, -2], [2, 0, 6]], "speed": 2.5 }],
  "smogZones": [{ "pos": [-4, 1, 0], "size": [4, 3, 4], "linkedLeak": 1 }],
  "glove": { "pos": [-15, 3, 14] }
}
```
`linkedLeak` is an index into `leaks`.

### 5.2 Blender glTF (Phase 11)
Same tags, set as Blender custom properties (exported as glTF `extras`): `type` (`spawn`, `leak_small`, `leak_big`, `rabbit_hole`, `glove`, `soldier_path`, `rabbit_path`, `smog_zone`), `leakType`, `required`, `tags` (comma-separated: `wallrun,breakable,vent,phaseable`). `gltfLevel.ts` must produce the **same internal `LevelData` type** as `jsonLevel.ts`.

---

## 6. Replays and Ghosts
- Record player position (3 floats) and yaw/pitch (2 floats) at **30 Hz** of sim time.
- Encode as Float32Array deltas, then base64 for storage.
- Ghost playback renders a translucent Alice silhouette that interpolates between samples.
- Store your local best ghost per level in localStorage. Online ghosts go in Supabase Storage (Phase 8).

---

## 7. Backend (Supabase)

### 7.1 Tables (SQL migration in `/supabase/migrations`)
- `players (id uuid pk references auth.users, display_name text, created_at timestamptz)`
- `runs (id uuid pk, player_id uuid, level_id text, time_ticks int, final_time_ms int, leaks_cleared int, optional_cleared int, medal text, ghost_path text, created_at timestamptz)`
- Index on `runs (level_id, final_time_ms)`.
- Row Level Security: anyone can read `runs`; inserts happen **only** through the `submit_run` edge function (service role).

### 7.2 Auth
Supabase **anonymous sign-in**. The player picks a display name on first launch.

### 7.3 Edge function `submit_run`
Validates: level id exists, `time_ticks >= levels.json[level].minTicks`, rate limit (max 1 submission per 5 s per player), then inserts and uploads the ghost.

### 7.4 Edge function `cheshire_commentary`
Input: a run summary JSON (level, final time, medal, leaks cleared/skipped, power-ups used, splits). Calls the LLM API using a key stored as a **Supabase secret**. Returns a ≤ 2 sentence playful Cheshire Cat line plus one tip. Response target is under 3 s; if it fails, show a canned line. **Never put an API key in client code.**

### 7.5 Env vars
Client (`.env.local`, never committed):
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```
Server-side secrets (set using the Supabase CLI, never in the repo): `LLM_API_KEY`.
Commit a `.env.example` with empty values.

---

## 8. Visual and Audio Direction
- Bright, saturated, slightly surreal. Flat or cel-shaded materials, strong bloom on leaks and rings.
- Leaks: glowing smoggy wisps (small = gray, big = deep purple). Cleared leaks burst into sparkles and turn green.
- Rabbit hole: dark swirl, sealed with a glowing card-suit lock until it opens.
- Gray-box phase: solid colors per tag (floor = light gray, wallrun = cyan, breakable = orange, vent = yellow, phaseable = magenta, translucent).
- Audio: punchy SFX for jumps, slides, ring tick (each second), leak clear, power-up start/end, hole unseal, level complete. Looping music per chapter. Use placeholder generated SFX until real assets are added.

---

## 9. Build Phases

Complete each phase fully, run `npm run build`, `npm run test` and `npm run lint` until clean, then **stop and report** before moving on.

### Phase 0: Scaffold
- Vite + TS strict + Preact preset, ESLint, Prettier, Vitest, folder structure, `.env.example`, `.gitignore`, `.gitattributes` (LFS patterns for `*.blend *.glb *.png *.jpg *.wav *.ogg *.mp3`).
- Three.js canvas with Preact overlay mounted.
- **Done when:** `npm run dev` shows a canvas with a "Click to play" overlay.

### Phase 1: Movement test room
- Rapier world, fixed 120 Hz loop with interpolation, pointer lock, full movement state machine (ground, air, jump buffer, coyote time, slide, wall-run, wall-jump).
- Hard-coded test room with ramps, walls tagged `wallrun`, gaps.
- lil-gui panel bound to `MOVEMENT`, stats.js, physics debug toggle (F3).
- On-screen speedometer.
- Unit tests for state transitions and the fixed-timestep accumulator.
- **Done when:** a human can sprint, slide, wall-run and wall-jump smoothly at a stable sim rate.

### Phase 2: Level system, leaks, rings, exit, timer
- JSON level loader → `LevelData` → spawned entities and colliders.
- Small leaks (touch to clear), big leaks with the 3 s ring (pause-on-exit), required/optional logic, sealed/unsealed Rabbit hole, tick-based timer, R restart (under 100 ms, no reload).
- Build `c1_l1` as a test level.
- **Done when:** a level can be completed start to finish and restarted instantly.

### Phase 3: Power-ups
- Implement `drink_me`, `eat_me`, `flamingo` (MVP), plus `hatter_hop`, `tea_time`, `cheshire`, each behind the `PowerUp` interface.
- Vents, breakables and phaseable walls respond correctly.
- HUD shows the active power-up icon and remaining duration.
- Tests: power-up lifecycle, the `tea_time` timer invariant, and `drink_me` headroom safety.
- **Done when:** every power-up works in a dedicated test level.

### Phase 4: Rabbit and hazards
- Rabbit spline movement plus idle at the hole (placeholder capsule with ears is fine).
- Card soldiers (patrol, relight leaks, ring knockback), smog zones.
- **Done when:** hazards behave as specified and runs stay deterministic.

### Phase 5: UI, medals, saves
- Main menu, level select (shows best times and medals), pause, settings (sensitivity, FOV, volume, invert Y), results screen (time, time cuts, medal, impact receipt, restart/next buttons), Tips menu.
- `medals.json`, localStorage saves (best time, medal, glove found per level).
- **Done when:** the full menu → level → results → next loop works and progress persists.

### Phase 6: Ghosts
- Recorder, codec and playback. Local best ghost per level, toggle in settings.
- **Done when:** you can race your own best ghost.

### Phase 7: Chapter 1 levels
- Build 5 gray-box levels (`c1_l1`–`c1_l5`) with a difficulty curve: L1 small leaks only, L2 introduces `drink_me`, L3 `eat_me`, L4 `flamingo`, L5 chains all three. Each has a glove and at least one optional leak with a risky shortcut.
- Set `medals.json` thresholds and `minTicks` per level (leave dev times as TODOs for the human to set after playtesting).
- **Done when:** all 5 levels are completable and the human has playtested them.

### Phase 8: Backend
- Supabase client, anonymous auth, display name prompt, migration SQL, `submit_run` edge function, leaderboard view (top 20 plus your rank) on the results screen and in level select, online ghost download for #1.
- Game must work fully offline if Supabase is unreachable.
- **Done when:** runs submit and leaderboards display in a deployed preview.

### Phase 9: Cheshire Cat commentary
- `cheshire_commentary` edge function plus results screen integration with a loading state and fallback lines.
- **Done when:** a quip appears on the results screen within about 3 s, or a fallback appears.

### Phase 10: Polish and deploy
- Post-processing (bloom, grading), particles, audio integration, screen shake (with a setting to disable), gamepad support, loading screen.
- Performance target: 60+ fps on a mid-range laptop's integrated GPU at 1080p.
- GitHub Actions: lint + test + build on PR. Deploy to Vercel or Cloudflare Pages on push to `main`.
- **Done when:** the production URL is playable end to end.

### Phase 11: Blender pipeline (optional)
- `gltfLevel.ts` loader that reads extras → `LevelData`, plus a `npm run assets` script using gltf-transform (meshopt + KTX2).
- Document the Blender tagging workflow in `/docs/LEVEL_DESIGN.md`.

---

## 10. Rules for Codex
- Work on **one phase at a time**. Stop and report at the end of each phase.
- Keep all gameplay numbers in `/src/config`. No magic numbers in systems.
- Keep the simulation deterministic: no `Math.random()` in sim code without a seeded RNG, and no wall-clock time in scoring.
- **Never invent carbon impact figures.** Leave them `null` for the human to source.
- No cards, no inventory, no activation keys for power-ups.
- Never commit secrets. Never put the LLM key or Supabase service role key in client code.
- Prefer small, readable modules. Add brief JSDoc on public functions.
- If something in this spec is ambiguous or seems wrong, ask instead of guessing.
- Mark anything that needs a human (assets, accounts, playtesting values) with `// HUMAN TODO:` and list them in your phase report.
