import * as T from "three";
import { fixture } from "../art/fixtures";
import { box, surface } from "../art/cottageMaterials";
import rules from "../config/leaks.json";
import type { LevelRun } from "../level/run";
import { ringTicks } from "../config/ring";
export function label(text: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 96;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#262019";
  ctx.roundRect(5, 5, 630, 86, 12);
  ctx.fill();
  ctx.strokeStyle = "#bd9a62";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = "#fff1d1";
  ctx.font = "bold 36px system-ui";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 320, 48, 580);
  const sprite = new T.Sprite(
    new T.SpriteMaterial({ map: new T.CanvasTexture(canvas) }),
  );
  sprite.scale.set(3.2, 0.48, 1);
  return sprite;
}
function band(radius: number, width: number, color: number) {
  const mesh = new T.Mesh(
    new T.RingGeometry(radius - width, radius, 96),
    new T.MeshBasicMaterial({ color, side: T.DoubleSide }),
  );
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}
/** Bind the gray-box pickups, charge arcs and exit seal to the current attempt. */
export function spawnLeaks(scene: T.Scene, run: LevelRun) {
  const views = run.level.leaks.map((l, i) => {
    const group = new T.Group();
    group.position.set(...l.pos);
    scene.add(group);
    const big = l.kind === "big";
    const prop = fixture(l.type, big);
    group.add(prop.model);
    const stars = new Float32Array(24 * 3);
    for (let i = 0; i < 24; i++) {
      const a = i * 2.39996,
        h = 1 - (i + 0.5) / 12,
        r = Math.sqrt(1 - h * h);
      stars.set([r * Math.cos(a), h, r * Math.sin(a)], i * 3);
    }
    const motes = new T.BufferGeometry();
    motes.setAttribute("position", new T.BufferAttribute(stars, 3));
    const burst = new T.Points(
      motes,
      new T.PointsMaterial({
        color: 0xaaffca,
        size: 0.08,
        transparent: true,
        depthWrite: false,
      }),
    );
    group.add(burst);

    const name = l.type.replaceAll("_", " ");
    const action = run.actionAt(i);
    const sign = label(
      action
        ? action.label + " · −" + action.points
        : l.required || run.hunt
          ? name
          : "Optional · " + name,
    );
    sign.position.set(big ? 1.55 : 0.5, big ? 2.23 : 0.97, 0);
    sign.scale.set(2.25, 0.34, 1);
    group.add(sign);
    const arc = band(rules.ringRadius, 0.13, 0xc897ff);
    if (big) {
      const outline = band(rules.ringRadius, 0.13, 0x524064);
      outline.position.y = 0.015;
      arc.position.y = 0.025;
      group.add(outline, arc);
    }
    return {
      prop,
      burst,
      burstAt: -1000,
      cleared: false,
      sign,
      arc,
    };
  });
  const hole = new T.Group();
  hole.position.set(...run.level.exit);
  scene.add(hole);
  const pit = new T.Mesh(
    new T.CircleGeometry(rules.exitRadius, 64),
    new T.MeshBasicMaterial({ color: 0x24152f }),
  );
  pit.rotation.x = -Math.PI / 2;
  pit.position.y = 0.015;
  hole.add(pit);
  const hatch = new T.Group();
  hole.add(hatch);
  const wood = surface(0x67442c);
  const hinge = surface(0x4b4743, 0.55, 0.4);
  for (let x = -0.9; x <= 0.93; x += 0.23) {
    const chord = 2 * Math.sqrt(rules.exitRadius ** 2 - x ** 2) - 0.08;
    box(hatch, wood, [0.22, 0.08, chord], [x, 0.065, 0]);
  }
  for (const z of [-0.57, 0.57])
    box(hatch, hinge, [1.56, 0.025, 0.095], [0, 0.115, z]);
  const handle = new T.Mesh(new T.TorusGeometry(0.105, 0.02, 10, 22), hinge);
  handle.rotation.x = Math.PI / 2;
  handle.position.set(0, 0.135, 0.68);
  hatch.add(handle);
  const spirals = new T.Group();
  hole.add(spirals);
  for (let arm = 0; arm < 3; arm++) {
    const verts = [];
    for (let i = 0; i < 48; i++) {
      const r = 0.04 + i / 50,
        a = i / 12 + (arm * 2 * Math.PI) / 3;
      verts.push(new T.Vector3(r * Math.cos(a), 0.023, r * Math.sin(a)));
    }
    spirals.add(
      new T.Line(
        new T.BufferGeometry().setFromPoints(verts),
        new T.LineBasicMaterial({ color: 0x8c75bd }),
      ),
    );
  }
  const rim = band(rules.exitRadius + 0.16, 0.18, 0xa06b9f);
  rim.position.y = 0.025;
  hole.add(rim);
  const seal = label("♦  Sealed");
  const open = label("Rabbit hole · Enter");
  for (const sign of [seal, open]) {
    sign.position.y = 1.4;
    hole.add(sign);
  }
  return () => {
    views.forEach((v, i) => {
      const done = run.progress[i] === ringTicks;
      if (done && !v.cleared) v.burstAt = run.worldTicks;
      v.cleared = done;
      const age = (run.worldTicks - v.burstAt) / 60;
      v.burst.visible = done && age >= 0 && age < 1;
      if (v.burst.visible) {
        v.burst.scale.setScalar(0.2 + age * 1.6);
        v.burst.position.y = age * 0.35;
        v.burst.material.opacity = 1 - age;
      }
      v.prop.setComplete(done);
      v.sign.visible = !done;
      v.arc.geometry.setDrawRange(
        0,
        6 * Math.floor((96 * run.progress[i]) / ringTicks),
      );
    });
    spirals.rotation.y = run.worldTicks * 0.016;
    const locked = !run.exitOpen;
    hatch.visible = locked;
    seal.visible = locked;
    open.visible = !locked;
    rim.material.color.setHex(locked ? 0xa06b9f : 0x51d792);
  };
}
