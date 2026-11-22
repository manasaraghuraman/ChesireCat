import * as T from "three";
import type { LevelRun } from "../level/run";
/** The cuff and five fingers share a floating, slowly rotating pickup. */
export function spawnGlove(scene: T.Scene, run: LevelRun) {
  const glove = new T.Group(),
    linen = new T.MeshStandardMaterial({ color: 0xfff3cd, emissive: 0x342918 });
  function ellipsoid(x: number, y: number, width: number, height: number) {
    const m = new T.Mesh(new T.SphereGeometry(1, 12, 10), linen);
    m.position.set(x, y, 0);
    m.scale.set(width, height, 0.08);
    glove.add(m);
    return m;
  }
  ellipsoid(0, 0, 0.19, 0.21);
  ellipsoid(-0.2, 0.025, 0.075, 0.14).rotation.z = 0.6;
  for (let i = 0; i < 4; i++)
    ellipsoid((i - 1.5) * 0.089, 0.19, 0.055, 0.14 + 0.035 * Math.sin(i));
  const cuff = new T.Mesh(
    new T.BoxGeometry(0.28, 0.11, 0.15),
    new T.MeshStandardMaterial({ color: 0xe7b953 }),
  );
  cuff.position.y = -0.18;
  glove.add(cuff);
  if (run.level.glove) {
    scene.add(glove);
    glove.position.set(...run.level.glove);
  }
  return () => {
    glove.visible = !run.gloveFound;
    glove.rotation.y = run.worldTicks * 0.012;
    if (run.level.glove)
      glove.position.y =
        run.level.glove[1] + 0.07 * Math.sin(run.worldTicks * 0.025);
  };
}
