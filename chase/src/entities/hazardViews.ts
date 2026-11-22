import * as T from "three";
import type { LevelRun } from "../level/run";
import { DT } from "../core/loop";
import { HAZARDS } from "../config/hazards";
import { ringTicks } from "../config/ring";
import { label } from "./leaks";
function part(
  parent: T.Group,
  geometry: T.BufferGeometry,
  color: number,
  x: number,
  y: number,
  z: number,
) {
  const mesh = new T.Mesh(geometry, new T.MeshStandardMaterial({ color }));
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}
function oval(
  parent: T.Group,
  color: number,
  x: number,
  y: number,
  z: number,
  a: number,
  b: number,
  c: number,
) {
  const mesh = part(parent, new T.SphereGeometry(1, 16, 12), color, x, y, z);
  mesh.scale.set(a, b, c);
  return mesh;
}
function makeRabbit() {
  const root = new T.Group(),
    body = new T.Group();
  root.add(body);
  const fur = 0xfff4dd;
  oval(body, 0xb14849, 0, 0.55, 0, 0.27, 0.36, 0.27);
  oval(body, fur, 0, 0.97, 0.1, 0.3, 0.29, 0.28);
  oval(body, fur, 0, 0.48, -0.28, 0.14, 0.14, 0.14);
  for (const side of [-1, 1]) {
    oval(body, fur, side * 0.14, 1.34, 0.06, 0.085, 0.3, 0.08).rotation.z =
      -side * 0.14;
    oval(
      body,
      0xf3b6aa,
      side * 0.15,
      1.36,
      0.13,
      0.043,
      0.19,
      0.028,
    ).rotation.z = -side * 0.14;
    oval(body, 0x25242a, side * 0.19, 1.02, 0.3, 0.037, 0.046, 0.03);
    oval(body, fur, side * 0.16, 0.13, 0.05, 0.13, 0.13, 0.21);
  }
  const paw = oval(body, fur, 0.25, 0.66, 0.23, 0.09, 0.15, 0.09);
  const watch = part(
    body,
    new T.CylinderGeometry(0.12, 0.12, 0.04, 20),
    0xe0b059,
    0.16,
    0.52,
    0.27,
  );
  watch.rotation.x = Math.PI / 2;
  const call = label("I’m late!", 0.42);
  call.position.y = 2;
  root.add(call);
  const prank = label("Hee hee! Left it on!", 0.38);
  prank.position.y = 2;
  root.add(prank);
  return { root, body, paw, call, prank };
}
const suits = ["♥", "♠", "♦", "♣"];
const cardFaces = new Map<string, T.MeshStandardMaterial>();

function cardFace(suit: string) {
  const cached = cardFaces.get(suit);
  if (cached) return cached;
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 384;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#f6e9ca";
  ctx.fillRect(0, 0, 256, 384);
  ctx.strokeStyle = "#b69557";
  ctx.lineWidth = 3;
  ctx.roundRect(12, 12, 232, 360, 15);
  ctx.stroke();
  ctx.fillStyle = suit === "♥" || suit === "♦" ? "#a1293b" : "#2f3532";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "150px Georgia, serif";
  ctx.fillText(suit, 128, 202);
  ctx.font = "bold 38px Georgia, serif";
  for (const corner of [0, 1]) {
    ctx.save();
    if (corner) {
      ctx.translate(256, 384);
      ctx.rotate(Math.PI);
    }
    ctx.fillText("A", 38, 46);
    ctx.fillText(suit, 38, 79);
    ctx.restore();
  }
  const map = new T.CanvasTexture(canvas);
  map.colorSpace = T.SRGBColorSpace;
  const material = new T.MeshStandardMaterial({ map, roughness: 0.82 });
  cardFaces.set(suit, material);
  return material;
}

function makePatrolCard(index: number) {
  const root = new T.Group();
  const face = cardFace(suits[index % suits.length]);
  const edge = new T.MeshStandardMaterial({ color: 0xc7ac77 });
  const card = new T.Mesh(new T.BoxGeometry(0.93, 1.4, 0.045), [
    edge,
    edge,
    edge,
    edge,
    face,
    face,
  ]);
  root.add(card);
  return {
    root,
    glide(phase: number) {
      card.position.y = 0.94 + 0.075 * Math.sin(phase);
      card.rotation.z = 0.12 * Math.sin(phase * 0.75);
      card.rotation.x = 0.09 * Math.cos(phase);
    },
  };
}
/** Render interpolated actors and disable smog as soon as its source clears. */
export function spawnHazards(scene: T.Scene, run: LevelRun) {
  const actors = run.hazards,
    rabbit = makeRabbit();
  if (run.level.rabbitPath.length) scene.add(rabbit.root);
  const cards = actors.soldiers.map((_, index) => {
    const card = makePatrolCard(index);
    scene.add(card.root);
    return card;
  });
  const fog = run.level.smogZones.map((zone) => {
    const group = new T.Group();
    group.position.set(...zone.pos);
    scene.add(group);
    const mat = new T.MeshBasicMaterial({
      color: 0x705981,
      transparent: true,
      opacity: 0.13,
      depthWrite: false,
      side: T.DoubleSide,
    });
    const volume = new T.Mesh(new T.BoxGeometry(...zone.size), mat);
    group.add(volume);
    const wisps = new T.Group();
    group.add(wisps);
    for (let i = 0; i < 6; i++) {
      const w = new T.Mesh(new T.IcosahedronGeometry(1, 1), mat);
      w.scale.set(zone.size[0] * 0.2, zone.size[1] * 0.14, zone.size[2] * 0.19);
      w.position.set(
        Math.sin(i * 2) * zone.size[0] * 0.26,
        Math.cos(i * 4) * zone.size[1] * 0.23,
        Math.sin(i * 5) * zone.size[2] * 0.26,
      );
      wisps.add(w);
    }
    return { group, wisps, source: zone.linkedLeak };
  });
  return (alpha: number) => {
    const sec = run.worldTicks * DT;
    rabbit.root.position.lerpVectors(
      actors.rabbit.previous,
      actors.rabbit.pos,
      alpha,
    );
    rabbit.root.rotation.y = actors.arrived ? Math.PI / 6 : actors.rabbit.yaw;
    rabbit.body.position.y = actors.arrived
      ? 0
      : Math.abs(Math.sin(sec * 13)) * 0.15;
    rabbit.paw.position.y = actors.arrived
      ? 0.62 + 0.06 * Math.cos(sec * 8)
      : 0.66;
    rabbit.call.visible = sec < HAZARDS.callSeconds;
    const prank = actors.prank;
    rabbit.prank.visible = !!prank;
    // Pop in and out of a prank like a Wonderland conjuring trick.
    const age = prank ? sec - prank.start : 1;
    const left = prank ? HAZARDS.mischiefVisit - age : 1;
    rabbit.root.scale.setScalar(
      Math.min(1, Math.max(0.05, Math.min(age, left) / 0.2)),
    );
    cards.forEach((card, i) => {
      const s = actors.soldiers[i];
      card.root.position.lerpVectors(s.previous, s.pos, alpha);
      card.root.rotation.y = s.yaw;
      card.glide(sec * s.speed * 4.5);
    });
    for (const f of fog) {
      f.group.visible = run.progress[f.source] < ringTicks;
      f.wisps.position.y = 0.08 * Math.sin(sec * 2);
    }
  };
}
