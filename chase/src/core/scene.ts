import * as T from "three";
import { handAngle } from "./watch";

/** Draw the title scene and keep the framing readable on narrow displays. */
export function mountScene(
  canvas: HTMLCanvasElement,
  renderRoom: (renderer: T.WebGLRenderer, ms: number) => boolean,
) {
  const renderer = new T.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.z = 10;
  const watch = new T.Group();
  scene.add(watch);
  const metal = new T.MeshStandardMaterial({
    color: 0xd6a854,
    metalness: 0.55,
    roughness: 0.32,
  });
  const ink = new T.MeshBasicMaterial({ color: 0x21443d });
  function piece(
    geo: T.BufferGeometry,
    material: T.Material,
    x: number,
    y: number,
    z: number,
  ) {
    const mesh = new T.Mesh(geo, material);
    mesh.position.set(x, y, z);
    watch.add(mesh);
    return mesh;
  }
  const rim = (r: number, t: number, y: number, z: number) =>
    piece(new T.TorusGeometry(r, t, 18, 128), metal, 0, y, z);
  const body = piece(
    new T.CylinderGeometry(1.54, 1.48, 0.32, 96),
    metal,
    0,
    0,
    0,
  );
  body.rotation.x = Math.PI / 2;
  piece(
    new T.CircleGeometry(1.46, 96),
    new T.MeshStandardMaterial({ color: 0xffe9ba, roughness: 0.9 }),
    0,
    0,
    0.168,
  );
  rim(1.48, 0.075, 0, 0.17);
  rim(1.22, 0.012, 0, 0.18);
  rim(0.28, 0.055, 1.91, 0);
  piece(new T.CylinderGeometry(0.14, 0.13, 0.25, 16), metal, 0, 1.57, 0);
  for (let i = 0; i < 60; i++) {
    const a = (i * Math.PI) / 30;
    piece(
      new T.BoxGeometry(
        i % 5 === 0 ? 0.042 : 0.016,
        i % 5 === 0 ? 0.15 : 0.055,
        0.012,
      ),
      ink,
      1.36 * Math.sin(a),
      1.36 * Math.cos(a),
      0.19,
    ).rotation.z = -a;
  }
  const labels = ["XII", "III", "VI", "IX"];
  labels.forEach((s, i) => {
    const c = document.createElement("canvas");
    c.width = 192;
    c.height = 96;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#21443d";
    ctx.font = "bold 76px Georgia";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(s, 96, 50);
    const a = (i * Math.PI) / 2;
    piece(
      new T.PlaneGeometry(0.55, 0.275),
      new T.MeshBasicMaterial({
        map: new T.CanvasTexture(c),
        transparent: true,
      }),
      1.01 * Math.sin(a),
      1.01 * Math.cos(a),
      0.2,
    );
  });
  function hand(
    length: number,
    width: number,
    material: T.Material,
    z: number,
  ) {
    return piece(
      new T.BoxGeometry(width, length, 0.025).translate(0, length * 0.4, 0),
      material,
      0,
      0,
      z,
    );
  }
  hand(0.84, 0.08, ink, 0.24).rotation.z = 1.02;
  hand(1.13, 0.052, ink, 0.27).rotation.z = -0.99;
  const second = hand(
    1.33,
    0.019,
    new T.MeshBasicMaterial({ color: 0xb74439 }),
    0.3,
  );
  piece(new T.SphereGeometry(0.076), metal, 0, 0, 0.33);
  scene.add(new T.HemisphereLight(0xfff2cc, 0x386867, 2.2));
  const light = new T.DirectionalLight(0xffecc2, 3);
  light.position.set(-3, 5, 6);
  scene.add(light);
  watch.rotation.set(-0.24, -0.42, -0.24);
  function resize() {
    const w = canvas.clientWidth,
      h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const height =
      2 * camera.position.z * Math.tan(T.MathUtils.degToRad(camera.fov / 2));
    const narrow = w < 740;
    watch.position.set(
      narrow ? 0 : height * camera.aspect * 0.21,
      narrow ? height * 0.19 : 0,
      0,
    );
    watch.scale.setScalar(
      narrow
        ? Math.min(0.67, height * camera.aspect * 0.21)
        : Math.min(1.34, height * camera.aspect * 0.126),
    );
  }
  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  renderer.setAnimationLoop((ms) => {
    if (renderRoom(renderer, ms)) return;
    second.rotation.z = handAngle(Math.floor(ms / 1000), 60);
    renderer.render(scene, camera);
  });
  return renderer;
}
