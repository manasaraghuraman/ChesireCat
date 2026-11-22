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

export function fixture(type: string, big: boolean) {
  const model = new T.Group();
  const indicator = new T.MeshStandardMaterial({
    color: 0xffd092,
    emissive: 0xffad52,
    emissiveIntensity: 0.8,
    roughness: 0.32,
  });
  const floor = new T.Group();
  floor.position.set(big ? 1.55 : 0.5, big ? 0 : -1, 0);
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
    cylinder(floor, brass, 0.23, 0.06, [0, 0.03, 0]);
    cylinder(floor, brass, 0.025, 1.28, [0, 0.68, 0]);
    cylinder(floor, iron, 0.045, 0.12, [0, 1.32, 0]);
    // Turned glass envelope, neck and threaded base form a recognizable bulb.
    const bulb = new T.Mesh(
      new T.LatheGeometry(
        [
          [0, 0],
          [0.041, 0],
          [0.048, 0.053],
          [0.077, 0.088],
          [0.105, 0.126],
          [0.108, 0.178],
          [0.091, 0.225],
          [0.058, 0.253],
          [0, 0.267],
        ].map(([r, y]) => new T.Vector2(r, y)),
        32,
      ),
      indicator,
    );
    bulb.position.y = 1.36;
    floor.add(bulb);
    const glow = new T.PointLight(0xffc28a, 6, 4);
    glow.position.y = 1.54;
    floor.add(glow);
    update = (done) => {
      glow.intensity = done ? 0 : 6;
    };
    for (const y of [1.29, 1.31, 1.33, 1.35])
      cylinder(floor, brass, 0.048, 0.009, [0, y, 0]);
    box(floor, iron, [0.14, 0.21, 0.08], [0, 1.03, 0.04]);
    box(floor, enamel, [0.053, 0.072, 0.036], [0, 1.04, 0.09]);
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
  }
  return {
    model,
    setComplete(done: boolean) {
      if (complete === done) return;
      complete = done;
      indicator.emissiveIntensity = done ? 0 : 0.8;
      indicator.color.setHex(done ? 0xa49b88 : 0xffd092);
      update?.(done);
    },
  };
}
