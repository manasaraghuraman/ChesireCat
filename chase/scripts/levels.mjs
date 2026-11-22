// Generates the Chapter 1 cottage levels in public/levels from compact room plans.
// Run with `npm run levels`. Every task, the glove and the exit are checked for
// reachability on a walking grid, and the Rabbit's route is planned through doorways.
import { writeFileSync } from "node:fs";
import { URL } from "node:url";
import console from "node:console";

const WALL = 0.28;
const HEIGHT = 6.4;
const DOOR_TOP = 2.65;
/** Distance from the wall face to the task point. Floor fixtures sit between the two. */
const GAP = {
  light: 0.35,
  charger: 0.73,
  standby: 0.73,
  drip: 0.73,
  laundry: 0.8,
  stove: 0.92,
  tv: 0.72,
  faucet: 0.82,
  computer: 0.88,
  fan: 0.7,
  space_heater: 0.58,
};

function plan({ id, name, width, front, back, spawn, exit }) {
  const half = width / 2;
  const level = {
    id,
    name,
    chapter: 1,
    spawn: { pos: [0, 1, spawn], yaw: 0 },
    partitions: [],
    geometry: [
      {
        shape: "box",
        pos: [0, -0.5, (front + back) / 2],
        size: [width, 1, front - back],
        tags: ["floor"],
      },
    ],
    leaks: [],
    rabbitPath: [],
    rabbitHole: { pos: [0, 0, exit] },
    soldiers: [],
    smogZones: [],
  };
  const api = {
    level,
    half,
    /** A full-width wall at z with labelled doorways. */
    wall(z, ...list) {
      level.partitions.push({
        z,
        doors: list.map(([x, w, room]) => ({ x, width: w, room })),
      });
      return api;
    },
    /** An interior wall along z at x, from z1 to z2, with optional door gaps [from, to]. */
    split(x, z1, z2, ...gaps) {
      const top = Math.max(z1, z2),
        bottom = Math.min(z1, z2);
      let edges = [top];
      for (const [a, b] of gaps) edges.push(Math.max(a, b), Math.min(a, b));
      edges.push(bottom);
      for (let i = 0; i < edges.length; i += 2) {
        const [hi, lo] = [edges[i], edges[i + 1]];
        if (hi - lo < 0.05) continue;
        level.geometry.push({
          shape: "box",
          pos: [x, HEIGHT / 2, round((hi + lo) / 2)],
          size: [WALL, HEIGHT, round(hi - lo)],
          tags: ["partition"],
        });
      }
      return api;
    },
    /** Put a task against a full-width wall at z, on the given side (+1 front, -1 back). */
    onWall(type, z, side, x, extra = {}) {
      const pos = [x, 1, round(z + side * (WALL / 2 + GAP[type]))];
      level.leaks.push({ kind: "small", type, pos, required: true, ...extra });
      return api;
    },
    /** Put a task against an interior wall at x, on the given side (+1 east, -1 west). */
    onSplit(type, x, side, z, extra = {}) {
      const pos = [round(x + side * (WALL / 2 + GAP[type])), 1, z];
      level.leaks.push({ kind: "small", type, pos, required: true, ...extra });
      return api;
    },
    big(type, x, z) {
      level.leaks.push({ kind: "big", type, pos: [x, 0, z], required: true });
      return api;
    },
    /** Light switch beside a doorway, on the room side, away from the given door. */
    switchBy(z, side, doorX, doorW, toward) {
      return api.onWall(
        "light",
        z,
        side,
        round(doorX + toward * (doorW / 2 + 0.45)),
      );
    },
    soldier(path, speed) {
      level.soldiers.push({ path, speed });
      return api;
    },
    smog(pos, size, linkedLeak) {
      level.smogZones.push({ pos, size, linkedLeak });
      return api;
    },
    /** Fill a doorway with a power-up obstacle so it becomes an optional shortcut. */
    shortcut(z, x, w, kind, room) {
      const p = level.partitions.find((p) => p.z === z);
      if (!p) throw Error("Declare the wall before its shortcut");
      p.doors.push({ x, width: w, room });
      if (kind === "breakable")
        level.geometry.push({
          shape: "box",
          pos: [x, DOOR_TOP / 2, z],
          size: [w, DOOR_TOP, 0.45],
          tags: ["breakable"],
        });
      else {
        level.geometry.push({
          shape: "box",
          pos: [x, 0.35, z],
          size: [w, 0.7, 0.3],
          tags: ["vent"],
        });
        level.geometry.push({
          shape: "box",
          pos: [x, (0.7 + DOOR_TOP) / 2, z],
          size: [w, DOOR_TOP - 0.7, 0.45],
          tags: ["floor"],
        });
      }
      return api;
    },
    done(extra) {
      Object.assign(level, extra);
      for (const p of level.partitions) p.doors.sort((a, b) => a.x - b.x);
      level.rabbitPath = route(level, [0, level.spawn.pos[2] - 1], [0, exit]);
      validate(level);
      return level;
    },
  };
  return api;
}

const round = (v) => Math.round(v * 100) / 100;

/** Walls and obstacles a walking player cannot pass, as XZ rectangles. */
function blockers(level, half, front, back) {
  const rects = [];
  const add = (x, z, w, d) =>
    rects.push([x - w / 2, x + w / 2, z - d / 2, z + d / 2]);
  for (const g of level.geometry) {
    const [x, y, z] = g.pos,
      [w, h, d] = g.size;
    if (y + h / 2 <= 0.05 || y - h / 2 >= 1.7) continue;
    add(x, z, w, d);
  }
  for (const p of level.partitions) {
    let left = -half;
    for (const door of p.doors) {
      add(
        (left + door.x - door.width / 2) / 2,
        p.z,
        door.x - door.width / 2 - left,
        WALL,
      );
      left = door.x + door.width / 2;
    }
    add((left + half) / 2, p.z, half - left, WALL);
  }
  add(-half - 0.18, (front + back) / 2, 0.32, front - back + 2);
  add(half + 0.18, (front + back) / 2, 0.32, front - back + 2);
  add(0, front + 0.8, 2 * half, 0.28);
  add(0, back - 0.3, 2 * half, 0.28);
  return rects;
}

const CELL = 0.25,
  CLEAR = 0.45;
function grid(level) {
  const floor = level.geometry[0];
  const half = floor.size[0] / 2,
    front = floor.pos[2] + floor.size[2] / 2,
    back = floor.pos[2] - floor.size[2] / 2;
  const rects = blockers(level, half, front, back);
  const nx = Math.ceil((2 * half) / CELL),
    nz = Math.ceil((front - back) / CELL);
  const open = new Uint8Array(nx * nz);
  const toWorld = (i, k) => [
    -half + (i + 0.5) * CELL,
    front - (k + 0.5) * CELL,
  ];
  for (let i = 0; i < nx; i++)
    for (let k = 0; k < nz; k++) {
      const [x, z] = toWorld(i, k);
      open[i + k * nx] = rects.every(
        ([x0, x1, z0, z1]) =>
          x < x0 - CLEAR || x > x1 + CLEAR || z < z0 - CLEAR || z > z1 + CLEAR,
      )
        ? 1
        : 0;
    }
  const toCell = ([x, z]) => [
    Math.min(nx - 1, Math.max(0, Math.floor((x + half) / CELL))),
    Math.min(nz - 1, Math.max(0, Math.floor((front - z) / CELL))),
  ];
  return { nx, nz, open, toWorld, toCell };
}

function bfs(g, from) {
  const dist = new Int32Array(g.nx * g.nz).fill(-1);
  const prev = new Int32Array(g.nx * g.nz).fill(-1);
  const [si, sk] = g.toCell(from);
  const start = si + sk * g.nx;
  dist[start] = 0;
  const queue = [start];
  for (let q = 0; q < queue.length; q++) {
    const c = queue[q],
      i = c % g.nx,
      k = (c - i) / g.nx;
    for (const [di, dk] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const a = i + di,
        b = k + dk;
      if (a < 0 || b < 0 || a >= g.nx || b >= g.nz) continue;
      const n = a + b * g.nx;
      if (!g.open[n] || dist[n] >= 0) continue;
      dist[n] = dist[c] + 1;
      prev[n] = c;
      queue.push(n);
    }
  }
  return { dist, prev };
}

/** Shortest doorway route for the Rabbit, simplified to its corners. */
function route(level, from, to) {
  const g = grid(level);
  const { prev, dist } = bfs(g, from);
  const [ti, tk] = g.toCell(to);
  let c = ti + tk * g.nx;
  if (dist[c] < 0) throw Error(level.id + ": Rabbit cannot reach the hole");
  const cells = [];
  for (; c >= 0; c = prev[c]) cells.push(c);
  cells.reverse();
  const pts = cells.map((c) => g.toWorld(c % g.nx, Math.floor(c / g.nx)));
  const keep = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const [a, b, n] = [pts[i - 1], pts[i], pts[i + 1]];
    if ((b[0] - a[0]) * (n[1] - b[1]) !== (b[1] - a[1]) * (n[0] - b[0]))
      keep.push(b);
  }
  keep.push(to);
  // Drop near-duplicate corners from the staircase around doorway jambs.
  const out = [keep[0]];
  for (const p of keep.slice(1))
    if (Math.hypot(p[0] - out.at(-1)[0], p[1] - out.at(-1)[1]) > 0.9)
      out.push(p);
  out[out.length - 1] = to;
  return out.map(([x, z]) => [round(x), 0, round(z)]);
}

function validate(level) {
  const g = grid(level);
  const { dist } = bfs(g, [level.spawn.pos[0], level.spawn.pos[2]]);
  const reach = ([x, , z], radius) => {
    for (let i = 0; i < g.nx; i++)
      for (let k = 0; k < g.nz; k++) {
        const [cx, cz] = g.toWorld(i, k);
        if (dist[i + k * g.nx] >= 0 && Math.hypot(cx - x, cz - z) <= radius)
          return true;
      }
    return false;
  };
  level.leaks.forEach((l, i) => {
    if (!reach(l.pos, l.kind === "big" ? 1.2 : 0.6))
      throw Error(`${level.id}: task ${i} (${l.type}) is unreachable`);
    level.leaks.forEach((o, j) => {
      if (j > i && Math.hypot(o.pos[0] - l.pos[0], o.pos[2] - l.pos[2]) < 1.1)
        throw Error(`${level.id}: tasks ${i} and ${j} overlap`);
    });
  });
  if (!reach(level.rabbitHole.pos, 0.5))
    throw Error(level.id + ": exit unreachable");
  if (level.glove && !reach(level.glove.pos, 0.5))
    throw Error(level.id + ": glove unreachable");
}

// ---------------------------------------------------------------- Lights Out
// A compact first cottage: entry hall, two side-by-side room pairs, back hall.
const l1 = plan({
  id: "c1_l1",
  name: "Lights Out",
  width: 14,
  front: 13,
  back: -15,
  spawn: 11,
  exit: -13,
})
  .wall(8, [-3.5, 2.5, "Sitting Room"], [4, 2.5, "Writing Nook"])
  .split(1, 8, 0, [5.5, 3])
  .wall(0, [-4.5, 2.4, "Laundry"], [3, 2.6, "Kitchen"])
  .split(-2, 0, -8, [-2.5, -5])
  .wall(-8, [-4.5, 2.5, "Back Hall"], [4.5, 2.5, "Coat Nook"])
  .switchBy(8, -1, -3.5, 2.5, 1)
  .switchBy(8, -1, 4, 2.5, 1)
  .switchBy(0, -1, -4.5, 2.4, 1)
  .switchBy(0, -1, 3, 2.6, 1)
  .switchBy(-8, -1, 4.5, 2.5, -1)
  .onSplit("charger", 1, 1, 1.5)
  .onWall("computer", 0, 1, 5.6)
  .onWall("tv", 0, 1, -1)
  .onSplit("fan", 1, -1, 6.5)
  .onSplit("laundry", -2, -1, -6.5)
  .onSplit("faucet", -2, 1, -1.5)
  .onWall("stove", -8, 1, 1)
  .onWall("standby", -8, -1, -1.5);
l1.soldier(
  [
    [0.5, 0, -3.5],
    [5.5, 0, -3.5],
  ],
  1.2,
).smog([-4.5, 1, -4], [3, 2.5, 3], 9);
const c1_l1 = l1.done({
  footprintChallenge: true,
  footprintTarget: 4,
  rabbitMischief: 2,
  glove: { pos: [6, 1, -14] },
});

// ------------------------------------------------------------ Under the Sink
// A wide kitchen wing. The water heater's Drink Me opens a crawl vent shortcut.
const l2 = plan({
  id: "c1_l2",
  name: "Under the Sink",
  width: 16,
  front: 14,
  back: -22,
  spawn: 12,
  exit: -20,
})
  .wall(9, [-4, 2.6, "Kitchen"], [4.5, 2.4, "Pantry"])
  .split(-1, 9, 0, [5, 2.6])
  .wall(0, [-5, 2.5, "Washroom"], [2, 2.4, "Utility"])
  .shortcut(0, 6.2, 1.8, "vent", "Crawl Vent")
  .split(0, 0, -11, [-4, -6.5])
  .wall(-11, [-3, 2.6, "Back Kitchen"], [5, 2.4, "Store"])
  .split(3, -11, -17)
  .big("water_heater", 3.5, 4.5)
  .switchBy(9, -1, -4, 2.6, 1)
  .switchBy(9, -1, 4.5, 2.4, 1)
  .switchBy(0, -1, -5, 2.5, 1)
  .switchBy(0, -1, 2, 2.4, 1)
  .switchBy(-11, -1, -3, 2.6, 1)
  .onWall("stove", 0, 1, -2.5)
  .onSplit("stove", 3, -1, -14)
  .onSplit("faucet", -1, -1, 7)
  .onSplit("faucet", 0, -1, -8.5)
  .onWall("drip", 0, -1, -6.8)
  .onSplit("charger", 0, 1, -2)
  .onWall("standby", -11, 1, 2)
  .onWall("computer", 0, 1, 4.25)
  .onSplit("tv", 3, 1, -13)
  .onWall("fan", 9, 1, 0.5);
l2.soldier(
  [
    [-6, 0, 6],
    [-6, 0, 2],
  ],
  1.3,
).smog([-5, 1, -4], [3, 2.5, 3], 10);
const c1_l2 = l2.done({ rabbitMischief: 3, glove: { pos: [7, 1, -21] } });

// ----------------------------------------------------------- The Boiler Room
// A long, narrow zigzag. The thermostat's Eat Me can smash a cracked wall.
const l3 = plan({
  id: "c1_l3",
  name: "The Boiler Room",
  width: 12,
  front: 14,
  back: -34,
  spawn: 12,
  exit: -32,
})
  .wall(8, [-3.5, 2.6, "Boiler Room"])
  .wall(0, [3.6, 2.4, "Washroom"])
  .shortcut(0, -3, 2.4, "breakable", "Cracked Wall")
  .wall(-9, [-3.8, 2.4, "Pipe Alcove"], [2.5, 2.4, "Drying Room"])
  .split(0, -9, -18, [-12.5, -15])
  .wall(-18, [-4, 2.4, "Radio Room"], [4, 2.4, "Radio Room"])
  .wall(-26, [0, 2.6, "Cellar Landing"])
  .big("thermostat", -1.5, 4)
  .switchBy(8, -1, -3.5, 2.6, 1)
  .switchBy(0, -1, 3.6, 2.4, -1)
  .switchBy(-9, -1, -3.8, 2.4, 1)
  .switchBy(-9, -1, 2.5, 2.4, 1)
  .switchBy(-26, -1, 0, 2.6, 1)
  .onWall("space_heater", 0, 1, 1)
  .onWall("space_heater", -18, -1, 0)
  .onWall("drip", -9, 1, -0.5)
  .onSplit("faucet", 0, -1, -11)
  .onSplit("tv", 0, 1, -10.8)
  .onWall("fan", -18, 1, 1.8)
  .onWall("standby", -26, 1, -3)
  .onWall("computer", -18, -1, -1.6)
  .onWall("charger", -26, -1, -3);
l3.soldier(
  [
    [-4, 0, -22],
    [4, 0, -22],
  ],
  1.4,
).smog([-3, 1, -13.5], [3, 2.5, 3], 9);
const c1_l3 = l3.done({ rabbitMischief: 3, glove: { pos: [-5, 1, -33] } });

// ------------------------------------------------------------- Laundry Leap
// A broad three-by-three grid of rooms around a central laundry with the dryer.
const l4 = plan({
  id: "c1_l4",
  name: "Laundry Leap",
  width: 20,
  front: 12,
  back: -24,
  spawn: 10,
  exit: -22,
})
  .wall(
    6,
    [-7, 2.4, "Linen Room"],
    [0, 2.6, "Laundry"],
    [7, 2.4, "Mending Room"],
  )
  .split(-3.5, 6, -6, [1.2, -1.2])
  .split(3.5, 6, -6, [1.2, -1.2])
  .wall(
    -6,
    [-7, 2.4, "Ironing Room"],
    [0, 2.6, "Drying Loft"],
    [7, 2.4, "Boot Room"],
  )
  .split(-3.5, -6, -18, [-10.8, -13.2])
  .split(3.5, -6, -18, [-10.8, -13.2])
  .wall(-18, [-5, 2.6, "Back Porch"], [5, 2.6, "Garden Door"])
  .big("dryer", -1, -1)
  .switchBy(6, -1, -7, 2.4, 1)
  .switchBy(6, -1, 0, 2.6, 1)
  .switchBy(6, -1, 7, 2.4, -1)
  .switchBy(-6, -1, -7, 2.4, 1)
  .switchBy(-6, -1, 0, 2.6, -1)
  .switchBy(-6, -1, 7, 2.4, -1)
  .onSplit("laundry", -3.5, -1, 3.5)
  .onSplit("laundry", 3.5, -1, -15)
  .onSplit("fan", 3.5, 1, -3.5)
  .onSplit("fan", -3.5, -1, -9)
  .onSplit("charger", 3.5, 1, 3.5)
  .onWall("charger", -18, 1, 8)
  .onWall("tv", -18, 1, -8.2)
  .onSplit("computer", 3.5, 1, -9)
  .onWall("space_heater", -18, 1, -1.5)
  .onWall("faucet", -6, 1, 2.2);
l4.soldier(
  [
    [-2, 0, -9],
    [-2, 0, -14],
  ],
  1.3,
)
  .soldier(
    [
      [-6, 0, 9],
      [6, 0, 9],
    ],
    1.5,
  )
  .smog([-7, 1, -12], [3, 2.5, 3], 10);
const c1_l4 = l4.done({ rabbitMischief: 3, glove: { pos: [-9, 1, -23] } });

// ------------------------------------------------- Last Call at the Cottage
// The full house: three power-ups, two shortcuts and the busiest Rabbit.
const l5 = plan({
  id: "c1_l5",
  name: "Last Call at the Cottage",
  width: 18,
  front: 14,
  back: -40,
  spawn: 12,
  exit: -38,
})
  .wall(8, [-5, 2.6, "Scullery"], [5, 2.6, "Kitchen"])
  .split(0, 8, -2, [4, 1.6])
  .wall(-2, [-6, 2.4, "Boiler Room"], [1, 2.4, "Hall"])
  .shortcut(-2, 6, 1.8, "vent", "Crawl Vent")
  .split(-2.5, -2, -14, [-6.8, -9.2])
  .wall(-14, [-6, 2.4, "Laundry"], [4, 2.6, "Study"])
  .shortcut(-14, 0, 2.2, "breakable", "Cracked Wall")
  .split(-1, -14, -27, [-19.3, -21.7])
  .wall(-27, [-4, 2.6, "Back Kitchen"], [5, 2.4, "Mud Room"])
  .split(2, -27, -33)
  .big("water_heater", -5, 3)
  .big("thermostat", -6.5, -10)
  .big("dryer", -5.5, -20)
  .switchBy(8, -1, -5, 2.6, 1)
  .switchBy(8, -1, 5, 2.6, -1)
  .switchBy(-2, -1, -6, 2.4, 1)
  .switchBy(-2, -1, 1, 2.4, 1)
  .switchBy(-14, -1, -6, 2.4, 1)
  .switchBy(-14, -1, 4, 2.6, 1)
  .switchBy(-27, -1, -4, 2.6, 1)
  .onSplit("stove", 0, 1, 6.5)
  .onWall("faucet", -2, 1, 3.6)
  .onSplit("tv", -2.5, 1, -4.5)
  .onSplit("computer", -1, 1, -17)
  .onWall("space_heater", -27, 1, 1.8)
  .onSplit("laundry", -1, -1, -25)
  .onWall("drip", -2, 1, -3)
  .onWall("charger", -14, 1, 7)
  .onSplit("standby", -2.5, 1, -12)
  .onSplit("fan", 2, -1, -30)
  .onWall("stove", -27, -1, -6.5)
  .onSplit("tv", 2, 1, -31);
l5.soldier(
  [
    [5.5, 0, -4],
    [5.5, 0, -11],
  ],
  1.4,
)
  .soldier(
    [
      [-6, 0, -33],
      [-1, 0, -33],
    ],
    1.5,
  )
  .smog([-6.5, 1, 0], [3, 2.5, 2.5], 16);
const c1_l5 = l5.done({ rabbitMischief: 4, glove: { pos: [8, 1, -39] } });

for (const level of [c1_l1, c1_l2, c1_l3, c1_l4, c1_l5]) {
  writeFileSync(
    new URL(`../public/levels/${level.id}.level.json`, import.meta.url),
    JSON.stringify(level, null, 2) + "\n",
  );
  console.log(
    `${level.id}: ${level.leaks.length} tasks, ${level.partitions.length} walls, ` +
      `rabbit route ${level.rabbitPath.length} points`,
  );
}
