import * as T from "three";
import { box, surface } from "./cottageMaterials";

const oak = surface(0x67462e);
const enamel = surface(0xd7d5c8, 0.42);
const iron = surface(0x393e40, 0.58, 0.26);
const steel = surface(0x8e989a, 0.35, 0.55);
const brass = surface(0xc3934e, 0.32, 0.46);
const dial = surface(0x344038, 0.32);
const cloth = [surface(0x8b5151), surface(0x627d8b), surface(0xc0ab7d)];

function cylinder(
  group: T.Group,
  material: T.Material,
  radius: number,
  height: number,
  position: [number, number, number],
  horizontal = false,
) {
  const mesh = new T.Mesh(
    new T.CylinderGeometry(radius, radius, height, 28),
    material,
  );
  mesh.position.set(...position);
  if (horizontal) mesh.rotation.x = Math.PI / 2;
  group.add(mesh);
  return mesh;
}

/** How a small fixture sits against its wall: model yaw and distance from the task point to the wall face. */
export type Mount = { facing: number; gap: number };
/** Approximate depth of each small fixture so it sits flush against the wall. */
const depth: Record<string, number> = {
  charger: 0.43,
  standby: 0.43,
  car_keys: 0.43,
  drip: 0.43,
  laundry: 0.5,
  stove: 0.62,
  tv: 0.42,
  faucet: 0.52,
  computer: 0.58,
  fan: 0.4,
  space_heater: 0.28,
};
const glowing = (color: number, intensity: number) =>
  new T.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: intensity,
    roughness: 0.4,
  });

export function fixture(type: string, big: boolean, mount?: Mount) {
  const model = new T.Group();
  let animate: ((seconds: number) => void) | undefined;
  const indicator = new T.MeshStandardMaterial({
    color: 0xffd092,
    emissive: 0xffad52,
    emissiveIntensity: 0.8,
    roughness: 0.32,
  });
  const floor = new T.Group();
  if (mount && !big) {
    model.rotation.y = mount.facing;
    floor.position.set(
      0,
      -1,
      type === "light" ? -mount.gap : -mount.gap + (depth[type] ?? 0.45) / 2,
    );
  } else floor.position.set(big ? 1.55 : 0.5, big ? 0 : -1, 0);
  model.add(floor);
  let update: ((done: boolean) => void) | undefined;
  let complete: boolean | undefined;
  const led = (x: number, y: number, z: number) =>
    box(floor, indicator, [0.045, 0.035, 0.02], [x, y, z]);
  const cabinet = (w: number, h: number, d: number, material = enamel) =>
    box(floor, material, [w, h, d], [0, h / 2, 0]);
  const tabletop = () => {
    box(floor, oak, [0.57, 0.055, 0.43], [0, 0.84, 0]);
    for (const x of [-0.23, 0.23])
      for (const z of [-0.16, 0.16])
        box(floor, oak, [0.065, 0.82, 0.065], [x, 0.41, z]);
  };

  if (type === "light") {
    // A wall switch beside the doorway controls a pendant lamp out in the room.
    box(floor, enamel, [0.1, 0.15, 0.014], [0, 1.25, 0.007]);
    const toggle = box(floor, brass, [0.026, 0.05, 0.03], [0, 1.25, 0.022]);
    const lamp = new T.Group();
    lamp.position.set(0, 0, 1.7);
    floor.add(lamp);
    cylinder(lamp, iron, 0.008, 3.1, [0, 4.85, 0]);
    const shade = new T.Mesh(
      new T.CylinderGeometry(0.09, 0.34, 0.26, 28, 1, true),
      brass,
    );
    shade.position.y = 3.2;
    lamp.add(shade);
    const bulb = new T.Mesh(new T.SphereGeometry(0.085, 16, 12), indicator);
    bulb.position.y = 3.06;
    lamp.add(bulb);
    const glow = new T.PointLight(0xffc28a, 9, 7);
    glow.position.y = 2.95;
    lamp.add(glow);
    update = (done) => {
      glow.intensity = done ? 0 : 9;
      toggle.rotation.x = done ? 0.5 : -0.5;
    };
  } else if (type === "charger" || type === "standby" || type === "car_keys") {
    tabletop();
    if (type === "charger") {
      box(floor, enamel, [0.24, 0.23, 0.13], [0, 0.98, -0.14]);
      const plug = new T.Group();
      floor.add(plug);
      box(plug, iron, [0.12, 0.09, 0.15], [0, 0.96, -0.04]);
      box(plug, indicator, [0.045, 0.035, 0.02], [0, 0.96, 0.04]);
      const cord = new T.CatmullRomCurve3([
        new T.Vector3(0, 0.95, 0.03),
        new T.Vector3(0.05, 0.9, 0.12),
        new T.Vector3(0.13, 0.88, 0.15),
        new T.Vector3(0.17, 0.88, 0.075),
      ]);
      plug.add(new T.Mesh(new T.TubeGeometry(cord, 12, 0.009, 6), iron));
      update = (done) => {
        plug.position.set(done ? 0.14 : 0, done ? -0.035 : 0, done ? 0.07 : 0);
      };
    } else if (type === "standby") {
      box(floor, oak, [0.46, 0.3, 0.2], [0, 1.02, 0]);
      box(floor, iron, [0.26, 0.19, 0.025], [-0.055, 1.035, 0.107]);
      cylinder(floor, steel, 0.034, 0.025, [0.15, 1.035, 0.113], true);
      led(0.15, 0.96, 0.109);
    } else {
      box(floor, iron, [0.13, 0.05, 0.21], [0, 0.89, 0]);
      box(floor, brass, [0.037, 0.018, 0.15], [0.045, 0.885, 0.145]);
      box(floor, brass, [0.067, 0.018, 0.027], [0.06, 0.885, 0.2]);
      led(0, 0.904, 0.107);
    }
  } else if (type === "laundry") {
    for (const x of [-0.22, 0.22]) {
      box(floor, oak, [0.055, 1.26, 0.06], [x, 0.63, 0]);
      box(floor, oak, [0.07, 0.07, 0.45], [x, 0.04, 0]);
    }
    box(floor, oak, [0.52, 0.035, 0.035], [0, 1.18, 0]);
    const hanging = new T.Group();
    floor.add(hanging);
    cloth.forEach((material, i) => {
      box(
        hanging,
        material,
        [0.12, 0.42 - i * 0.045, 0.025],
        [i * 0.15 - 0.15, 0.99, 0.014],
      );
      box(floor, oak, [0.025, 0.065, 0.037], [i * 0.15 - 0.15, 1.18, 0.024]);
    });
    for (let j = 0; j < 5; j++)
      box(floor, brass, [0.37, 0.035, 0.25], [0, 0.045 + j * 0.035, 0.24]);
    const folded = box(floor, cloth[1], [0.32, 0.07, 0.21], [0, 0.239, 0.24]);
    update = (done) => {
      hanging.visible = done;
      folded.visible = !done;
    };
  } else if (type === "water_heater") {
    cylinder(floor, iron, 0.43, 0.16, [0, 0.08, 0]);
    cylinder(floor, enamel, 0.41, 1.35, [0, 0.83, 0]);
    cylinder(floor, steel, 0.41, 0.09, [0, 1.51, 0]);
    for (const x of [-0.16, 0.16]) {
      cylinder(floor, brass, 0.043, 0.38, [x, 1.73, 0]);
      box(
        floor,
        brass,
        [0.24, 0.076, 0.076],
        [x + Math.sign(x) * 0.1, 1.88, 0],
      );
    }
    box(floor, iron, [0.24, 0.2, 0.08], [0, 0.5, 0.4]);
    led(0, 0.53, 0.45);
  } else if (type === "thermostat") {
    cabinet(0.74, 1.05, 0.38, iron);
    for (const x of [-0.21, 0, 0.21])
      box(floor, steel, [0.09, 0.74, 0.13], [x, 0.53, 0.2]);
    box(floor, oak, [0.18, 0.51, 0.12], [0, 1.23, 0]);
    box(floor, enamel, [0.4, 0.26, 0.15], [0, 1.52, 0.02]);
    box(floor, dial, [0.21, 0.095, 0.025], [-0.036, 1.55, 0.106]);
    led(0.12, 1.55, 0.116);
  } else if (type === "drip") {
    tabletop();
    box(floor, steel, [0.51, 0.075, 0.35], [0, 0.9, 0]);
    box(floor, dial, [0.35, 0.013, 0.22], [0, 0.943, 0.025]);
    cylinder(floor, steel, 0.028, 0.26, [0, 1.06, -0.12]);
    box(floor, steel, [0.053, 0.053, 0.16], [0, 1.19, -0.06]);
    cylinder(floor, brass, 0.06, 0.045, [0.13, 0.96, -0.13]);
    const drip = new T.Mesh(new T.SphereGeometry(0.025, 12, 8), indicator);
    drip.scale.y = 1.5;
    drip.position.set(0, 1.04, 0.001);
    floor.add(drip);
    update = (done) => {
      drip.visible = !done;
    };
  } else if (type === "fridge") {
    cabinet(0.85, 1.83, 0.71);
    box(floor, steel, [0.81, 0.51, 0.1], [0, 1.55, 0.36]);
    box(floor, enamel, [0.81, 1.22, 0.1], [0, 0.65, 0.36]);
    for (const y of [1.43, 1.03])
      box(floor, iron, [0.055, 0.19, 0.075], [-0.29, y, 0.43]);
    led(0.26, 1.58, 0.419);
  } else if (type === "dryer" || type === "oven") {
    cabinet(0.92, 1.08, 0.69);
    box(floor, steel, [0.91, 0.19, 0.055], [0, 0.965, 0.35]);
    cylinder(floor, iron, 0.05, 0.032, [-0.28, 0.965, 0.389], true);
    led(0.31, 0.965, 0.387);
    if (type === "dryer") {
      cylinder(floor, steel, 0.32, 0.1, [0, 0.52, 0.365], true);
      cylinder(floor, dial, 0.252, 0.035, [0, 0.52, 0.416], true);
      box(floor, enamel, [0.065, 0.11, 0.045], [0.25, 0.57, 0.431]);
    } else {
      box(floor, iron, [0.82, 0.65, 0.08], [0, 0.48, 0.36]);
      box(floor, dial, [0.65, 0.43, 0.04], [0, 0.46, 0.408]);
      box(floor, steel, [0.59, 0.052, 0.06], [0, 0.76, 0.43]);
      for (const x of [-0.23, 0.23])
        for (const z of [-0.14, 0.14])
          cylinder(floor, iron, 0.11, 0.025, [x, 1.09, z]);
    }
  } else if (type === "stove") {
    cabinet(0.76, 0.88, 0.62);
    box(floor, iron, [0.78, 0.05, 0.64], [0, 0.905, 0]);
    box(floor, steel, [0.76, 0.12, 0.04], [0, 0.8, 0.32]);
    const coil = glowing(0xff5a1f, 2.6);
    for (const [x, z, on] of [
      [-0.18, -0.15, true],
      [0.18, -0.15, false],
      [-0.18, 0.15, false],
      [0.18, 0.15, true],
    ] as const) {
      const ring = new T.Mesh(
        new T.TorusGeometry(0.1, 0.018, 8, 28),
        on ? coil : iron,
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.set(x, 0.935, z);
      floor.add(ring);
      cylinder(floor, iron, 0.022, 0.03, [x, 0.8, 0.345], true);
    }
    cylinder(floor, steel, 0.13, 0.17, [0.18, 1.02, 0.15]);
    const steam = new T.Group();
    floor.add(steam);
    const vapour = new T.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
    for (let i = 0; i < 4; i++) {
      const puff = new T.Mesh(new T.SphereGeometry(0.07, 10, 8), vapour);
      puff.userData.phase = i / 4;
      steam.add(puff);
    }
    let on = true;
    update = (done) => {
      on = !done;
      coil.emissiveIntensity = done ? 0 : 2.6;
      coil.color.setHex(done ? 0x3a3a3a : 0xff5a1f);
      steam.visible = !done;
    };
    animate = (t) => {
      if (!on) return;
      coil.emissiveIntensity = 2.3 + 0.4 * Math.sin(t * 5);
      for (const puff of steam.children) {
        const k = (t * 0.6 + (puff.userData.phase as number)) % 1;
        puff.position.set(0.18 + 0.04 * Math.sin(k * 9), 1.12 + k * 0.6, 0.15);
        puff.scale.setScalar(0.6 + k * 1.4);
      }
    };
  } else if (type === "tv") {
    box(floor, oak, [1.05, 0.5, 0.42], [0, 0.25, 0]);
    box(floor, iron, [0.3, 0.05, 0.2], [0, 0.525, -0.05]);
    box(floor, iron, [0.06, 0.16, 0.05], [0, 0.6, -0.05]);
    box(floor, iron, [0.98, 0.6, 0.06], [0, 0.98, -0.05]);
    const screen = glowing(0x6fb7ff, 1.6);
    box(floor, screen, [0.9, 0.52, 0.01], [0, 0.98, -0.017]);
    let on = true;
    update = (done) => {
      on = !done;
      screen.emissiveIntensity = done ? 0 : 1.6;
      screen.color.setHex(done ? 0x141a1f : 0x6fb7ff);
    };
    animate = (t) => {
      if (!on) return;
      const hue = 0.55 + 0.08 * Math.sin(t * 1.7) + 0.04 * Math.sin(t * 7.3);
      screen.emissive.setHSL(hue % 1, 0.7, 0.55);
      screen.emissiveIntensity = 1.3 + 0.35 * Math.abs(Math.sin(t * 3.1));
    };
  } else if (type === "faucet") {
    cabinet(0.72, 0.86, 0.52, oak);
    box(floor, enamel, [0.76, 0.06, 0.56], [0, 0.89, 0]);
    box(floor, steel, [0.46, 0.02, 0.32], [0, 0.915, 0.03]);
    cylinder(floor, steel, 0.025, 0.3, [0, 1.06, -0.19]);
    box(floor, steel, [0.04, 0.04, 0.18], [0, 1.2, -0.11]);
    for (const x of [-0.11, 0.11])
      cylinder(floor, brass, 0.035, 0.05, [x, 0.95, -0.2]);
    const water = new T.Mesh(
      new T.CylinderGeometry(0.014, 0.02, 0.27, 10),
      new T.MeshStandardMaterial({
        color: 0x9fd4ff,
        emissive: 0x3c84c4,
        emissiveIntensity: 0.6,
        transparent: true,
        opacity: 0.75,
      }),
    );
    water.position.set(0, 1.05, -0.03);
    floor.add(water);
    update = (done) => {
      water.visible = !done;
    };
    animate = (t) => {
      water.scale.x = water.scale.z = 1 + 0.15 * Math.sin(t * 23);
    };
  } else if (type === "computer") {
    box(floor, oak, [1.0, 0.05, 0.56], [0, 0.75, 0]);
    for (const x of [-0.45, 0.45])
      box(floor, oak, [0.06, 0.73, 0.5], [x, 0.365, 0]);
    box(floor, iron, [0.22, 0.03, 0.16], [0, 0.79, -0.12]);
    box(floor, iron, [0.05, 0.2, 0.04], [0, 0.9, -0.14]);
    box(floor, iron, [0.62, 0.4, 0.04], [0, 1.18, -0.12]);
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 80;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#1d3b5c";
    ctx.fillRect(0, 0, 128, 80);
    for (let i = 0; i < 9; i++) {
      ctx.fillStyle = ["#8fd3ff", "#ffd38f", "#a8f0b0"][i % 3];
      ctx.fillRect(8 + (i % 2) * 10, 6 + i * 8, 40 + ((i * 37) % 60), 3);
    }
    const map = new T.CanvasTexture(canvas);
    map.colorSpace = T.SRGBColorSpace;
    const screen = new T.MeshStandardMaterial({
      map,
      emissive: 0xffffff,
      emissiveMap: map,
      emissiveIntensity: 1.2,
    });
    box(floor, screen, [0.56, 0.34, 0.01], [0, 1.18, -0.097]);
    box(floor, iron, [0.42, 0.02, 0.14], [0, 0.785, 0.1]);
    led(0.25, 1.0, -0.1);
    update = (done) => {
      screen.emissiveIntensity = done ? 0 : 1.2;
      screen.color.setHex(done ? 0x111111 : 0xffffff);
    };
  } else if (type === "fan") {
    cylinder(floor, iron, 0.17, 0.04, [0, 0.02, 0]);
    cylinder(floor, steel, 0.02, 1.05, [0, 0.55, 0]);
    box(floor, iron, [0.12, 0.12, 0.16], [0, 1.1, -0.02]);
    const head = new T.Group();
    head.position.set(0, 1.1, 0.1);
    floor.add(head);
    const cage = new T.Mesh(new T.TorusGeometry(0.24, 0.008, 6, 36), steel);
    head.add(cage);
    const blades = new T.Group();
    head.add(blades);
    for (let i = 0; i < 3; i++) {
      const blade = box(blades, enamel, [0.07, 0.2, 0.01], [0, 0.11, 0]);
      const arm = new T.Group();
      arm.rotation.z = (i * 2 * Math.PI) / 3;
      blades.remove(blade);
      arm.add(blade);
      blades.add(arm);
    }
    let on = true;
    update = (done) => {
      on = !done;
    };
    animate = (t) => {
      if (on) blades.rotation.z = t * 18;
    };
  } else if (type === "space_heater") {
    box(floor, iron, [0.5, 0.6, 0.26], [0, 0.33, 0]);
    box(floor, iron, [0.56, 0.04, 0.32], [0, 0.02, 0]);
    const coil = glowing(0xff6a2b, 2.4);
    for (let i = 0; i < 4; i++)
      box(floor, coil, [0.38, 0.03, 0.02], [0, 0.18 + i * 0.1, 0.13]);
    for (let i = 0; i < 5; i++)
      box(floor, steel, [0.012, 0.42, 0.02], [-0.18 + i * 0.09, 0.33, 0.145]);
    led(0.19, 0.58, 0.131);
    let on = true;
    update = (done) => {
      on = !done;
      coil.emissiveIntensity = done ? 0 : 2.4;
      coil.color.setHex(done ? 0x3a3a3a : 0xff6a2b);
    };
    animate = (t) => {
      if (on) coil.emissiveIntensity = 2.1 + 0.4 * Math.sin(t * 2.2);
    };
  }
  return {
    model,
    animate,
    setComplete(done: boolean) {
      if (complete === done) return;
      complete = done;
      indicator.emissiveIntensity = done ? 0 : 0.8;
      indicator.color.setHex(done ? 0xa49b88 : 0xffd092);
      update?.(done);
    },
  };
}
