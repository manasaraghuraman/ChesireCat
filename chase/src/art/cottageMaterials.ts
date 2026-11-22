import * as T from "three";

export const surface = (color: number, roughness = 0.78, metalness = 0) =>
  new T.MeshStandardMaterial({ color, roughness, metalness });

function timber() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  let seed = 46;
  function random() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  }
  const boards = ["#9a714c", "#af845b", "#a47950", "#98704d"];
  boards.forEach((color, i) => {
    const x = i * 128;
    ctx.fillStyle = color;
    ctx.fillRect(x, 0, 128, 512);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, 0, 128, 512);
    ctx.clip();
    for (let j = 0; j < 160; j++) {
      const grain = x + random() * 128;
      const bend = (random() - 0.5) * 8;
      ctx.strokeStyle = random() > 0.55 ? "#f3c88a" : "#542d18";
      ctx.globalAlpha = 0.045 + random() * 0.12;
      ctx.beginPath();
      ctx.moveTo(grain, 0);
      ctx.bezierCurveTo(grain + bend, 145, grain - bend, 360, grain, 512);
      ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = "#432d21";
    ctx.fillRect(x, 0, 2, 512);
    ctx.fillRect(x, 85 + 86 * i, 128, 2);
    ctx.fillStyle = "#d5a77b";
    ctx.fillRect(x + 2, 0, 1, 512);
  });
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  texture.wrapS = texture.wrapT = T.RepeatWrapping;
  texture.anisotropy = 8;
  return texture;
}

let boards: T.MeshStandardMaterial | undefined;
export function floorboards() {
  return (boards ??= new T.MeshStandardMaterial({
    map: timber(),
    roughness: 0.86,
  }));
}

export function box(
  group: T.Object3D,
  material: T.Material,
  size: [number, number, number],
  position: [number, number, number],
) {
  const mesh = new T.Mesh(new T.BoxGeometry(...size), material);
  mesh.position.set(...position);
  group.add(mesh);
  return mesh;
}
