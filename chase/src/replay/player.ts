import * as T from "three";
import { sampleTicks, stride, type Track } from "./codec";
/** Interpolate in elapsed simulation time, including a partial final sample interval. */
export function sample(track: Track, tick: number, out: Float32Array) {
  const t = Math.max(0, Math.min(track.ticks, tick)),
    a = Math.floor(t / sampleTicks),
    b = Math.min(a + 1, track.poses.length / stride - 1);
  const blend =
    a === b
      ? 0
      : (t - a * sampleTicks) /
        (Math.min(track.ticks, b * sampleTicks) - a * sampleTicks);
  for (let i = 0; i < stride; i++) {
    const start = track.poses[a * stride + i],
      delta = track.poses[b * stride + i] - start;
    out[i] =
      start +
      blend * (i === 3 ? Math.atan2(Math.sin(delta), Math.cos(delta)) : delta);
  }
  return out;
}
/** A purely visual Alice with a dress, apron, hair bow and pivoting head. */
export class GhostPlayer {
  readonly root = new T.Group();
  private head = new T.Group();
  private pose = new Float32Array(stride);
  constructor(scene: T.Scene) {
    const fabric = new T.MeshBasicMaterial({
        color: 0x82e4ed,
        transparent: true,
        opacity: 0.38,
        depthWrite: false,
      }),
      trim = new T.MeshBasicMaterial({
        color: 0xfff0bb,
        transparent: true,
        opacity: 0.48,
        depthWrite: false,
      });
    const piece = (
      parent: T.Group,
      shape: T.BufferGeometry,
      x: number,
      y: number,
      z: number,
      pale = false,
    ) => {
      const mesh = new T.Mesh(shape, pale ? trim : fabric);
      mesh.position.set(x, y, z);
      parent.add(mesh);
      return mesh;
    };
    piece(this.root, new T.ConeGeometry(0.34, 0.55, 16), 0, -0.15, 0);
    piece(this.root, new T.CapsuleGeometry(0.15, 0.19), 0, 0.14, 0);
    piece(
      this.root,
      new T.SphereGeometry(0.15),
      0,
      -0.13,
      -0.19,
      true,
    ).scale.set(1, 0.95, 0.2);
    this.head.position.y = 0.52;
    this.root.add(this.head);
    piece(this.head, new T.SphereGeometry(0.19), 0, 0, 0, true);
    for (const side of [-1, 1]) {
      piece(
        this.head,
        new T.SphereGeometry(0.08),
        side * 0.07,
        0.19,
        0.03,
      ).scale.set(1, 0.55, 0.5);
      piece(
        this.root,
        new T.CapsuleGeometry(0.06, 0.25),
        side * 0.22,
        0.08,
        0,
      ).rotation.z = side * 0.15;
      piece(
        this.root,
        new T.CapsuleGeometry(0.07, 0.31),
        side * 0.12,
        -0.64,
        0,
      );
    }
    scene.add(this.root);
    this.root.visible = false;
  }
  render(
    track: Track | null,
    tick: number,
    enabled: boolean,
    camera: T.Vector3,
  ) {
    this.root.visible = false;
    if (!enabled || !track || tick > track.ticks) return;
    const [x, y, z, yaw, pitch] = sample(track, tick, this.pose);
    this.root.position.set(x, y, z);
    this.root.rotation.y = yaw;
    this.head.rotation.x = pitch;
    this.root.visible =
      this.root.position.distanceToSquared(camera) > 0.85 ** 2;
  }
}
