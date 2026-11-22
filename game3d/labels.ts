/**
 * File: game3d/labels.ts
 * Purpose: Canvas-text sprites for in-world labels (door names, signs).
 *          Adapted from carbon-footprint game src/entities/leaks.ts label().
 * Date: 2026-11-21
 */
import * as THREE from "three";

const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 96;
const FONT = "bold 36px system-ui, sans-serif";
const WORLD_WIDTH = 3.2;

export interface LabelStyle {
  readonly background?: string;
  readonly color?: string;
}

/** A camera-facing sprite with `text` drawn on it. Dispose its material and texture when done. */
export function label(text: string, style: LabelStyle = {}): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = style.background ?? "rgba(20, 12, 32, 0.85)";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = style.color ?? "#fde68a";
    ctx.font = FONT;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH - 24);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture }));
  sprite.scale.set(WORLD_WIDTH, (WORLD_WIDTH * CANVAS_HEIGHT) / CANVAS_WIDTH, 1);
  return sprite;
}
