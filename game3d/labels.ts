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

const PANEL_CANVAS_WIDTH = 1024;
const PANEL_FONT_PX = 62;
const PANEL_LINE_HEIGHT = 78;
const PANEL_PADDING = 44;

export interface PanelStyle extends LabelStyle {
  /** Width of the panel in the world, in metres. Height follows the amount of text. */
  readonly widthMeters?: number;
}

/** Splits text on newlines, then wraps each line to `maxWidth` using `measure`. Pure, so it is testable. */
export function wrapLines(text: string, maxWidth: number, measure: (line: string) => number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let current = "";
    for (const word of paragraph.split(" ")) {
      const candidate = current ? `${current} ${word}` : word;
      if (current && measure(candidate) > maxWidth) {
        lines.push(current);
        current = word;
      } else current = candidate;
    }
    lines.push(current);
  }
  return lines;
}

/** A big, high-contrast, word-wrapped text board (camera-facing). Use for signs the player must read. */
export function panel(text: string, style: PanelStyle = {}): THREE.Sprite {
  const measureCanvas = document.createElement("canvas");
  const measureCtx = measureCanvas.getContext("2d");
  const font = `bold ${PANEL_FONT_PX}px system-ui, sans-serif`;
  if (measureCtx) measureCtx.font = font;
  const maxWidth = PANEL_CANVAS_WIDTH - PANEL_PADDING * 2;
  const lines = wrapLines(text, maxWidth, (line) => measureCtx?.measureText(line).width ?? line.length * PANEL_FONT_PX * 0.55);
  const height = lines.length * PANEL_LINE_HEIGHT + PANEL_PADDING * 2;
  const canvas = document.createElement("canvas");
  canvas.width = PANEL_CANVAS_WIDTH;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = style.background ?? "#f2ead8";
    ctx.fillRect(0, 0, PANEL_CANVAS_WIDTH, height);
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, PANEL_CANVAS_WIDTH - 10, height - 10);
    ctx.fillStyle = style.color ?? "#161616";
    ctx.font = font;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    lines.forEach((line, index) => ctx.fillText(line, PANEL_CANVAS_WIDTH / 2, PANEL_PADDING + PANEL_LINE_HEIGHT * (index + 0.5), maxWidth));
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: true }));
  const width = style.widthMeters ?? 3;
  sprite.scale.set(width, (width * height) / PANEL_CANVAS_WIDTH, 1);
  return sprite;
}
