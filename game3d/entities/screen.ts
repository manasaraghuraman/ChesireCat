/**
 * File: game3d/entities/screen.ts
 * Purpose: A floating in-world screen showing a web page: a mock drawn from WonderWeb display data,
 *          or a real Solari screenshot (base64 PNG) once one arrives. The address bar is always
 *          drawn large so the fake address is readable. The previous texture is disposed on update.
 * Date: 2026-11-21
 */
import * as THREE from "three";
import { displayPageFor } from "../../lib/wonderweb/display";

const CANVAS_W = 1024;
const CANVAS_H = 704;
const BAR_H = 84;

export interface PageView {
  readonly url: string;
  readonly pngBase64?: string;
}

export interface Screen {
  readonly group: THREE.Group;
  show(page: PageView | null): void;
}

function drawFrame(ctx: CanvasRenderingContext2D, url: string): void {
  ctx.fillStyle = "#1f1b24";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.fillStyle = "#e9e4ef";
  ctx.fillRect(0, 0, CANVAS_W, BAR_H);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(20, 16, CANVAS_W - 40, BAR_H - 32);
  ctx.fillStyle = "#b3261e";
  ctx.font = "bold 34px system-ui, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText(url.replace(/^https?:\/\//, ""), 40, BAR_H / 2, CANVAS_W - 80);
}

function drawMock(ctx: CanvasRenderingContext2D, url: string): void {
  const page = displayPageFor(url);
  ctx.fillStyle = "#fff6dc";
  ctx.fillRect(0, BAR_H, CANVAS_W, CANVAS_H - BAR_H);
  ctx.textAlign = "center";
  ctx.fillStyle = "#7a1f1f";
  ctx.font = "bold 64px Georgia, serif";
  ctx.fillText(page.title, CANVAS_W / 2, BAR_H + 90, CANVAS_W - 60);
  ctx.fillStyle = "#3b2a12";
  ctx.font = "40px Georgia, serif";
  page.lines.forEach((line, i) => ctx.fillText(line, CANVAS_W / 2, BAR_H + 190 + i * 60, CANVAS_W - 60));
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#7a1f1f";
  ctx.lineWidth = 4;
  ctx.fillRect(212, BAR_H + 340, 600, 70);
  ctx.strokeRect(212, BAR_H + 340, 600, 70);
  ctx.fillStyle = "#8a7a6a";
  ctx.font = "32px system-ui, sans-serif";
  ctx.fillText(page.field, CANVAS_W / 2, BAR_H + 376);
  ctx.fillStyle = "#c8102e";
  ctx.fillRect(312, BAR_H + 450, 400, 80);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 36px system-ui, sans-serif";
  ctx.fillText(page.cta, CANVAS_W / 2, BAR_H + 491);
  ctx.textAlign = "left";
}

export function createScreen(width = 1.8): Screen {
  const group = new THREE.Group();
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext("2d");
  let texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, toneMapped: false });
  const height = (width * CANVAS_H) / CANVAS_W;
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  group.add(panel);
  const bezel = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.08, height + 0.08, 0.04),
    new THREE.MeshStandardMaterial({ color: 0x1a1420, emissive: 0x3a2050 }),
  );
  bezel.position.z = -0.03;
  group.add(bezel);
  group.visible = false;
  let token = 0;

  const refresh = () => {
    texture.dispose(); // dispose the previous texture each time (spec §2.6)
    texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    material.map = texture;
    material.needsUpdate = true;
  };

  return {
    group,
    show(page) {
      const current = ++token;
      group.visible = Boolean(page);
      if (!page || !ctx) return;
      drawFrame(ctx, page.url);
      if (!page.pngBase64) {
        drawMock(ctx, page.url);
        refresh();
        return;
      }
      const image = new Image();
      image.onload = () => {
        if (current !== token) return; // a newer page arrived meanwhile
        drawFrame(ctx, page.url);
        ctx.drawImage(image, 0, BAR_H, CANVAS_W, CANVAS_H - BAR_H);
        refresh();
      };
      image.src = `data:image/png;base64,${page.pngBase64}`;
    },
  };
}
