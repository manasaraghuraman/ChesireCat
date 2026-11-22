import { furnishCottage } from "../art/cottage";
import { floorboards, surface } from "../art/cottageMaterials";
import { Pad } from "../player/gamepad";
import { roomEffects } from "./effects";
import { sound } from "../audio/cues";
import { Recorder } from "../replay/recorder";
import { GhostPlayer } from "../replay/player";
import type { Track } from "../replay/codec";
import { courses, type LevelId } from "../config/courses";
import * as T from "three";
import R from "@dimforge/rapier3d-compat";
import GUI from "lil-gui";
import Stats from "stats.js";
import { spawnGlove } from "../entities/glove";
import type { Settings } from "../save/localSave";
import { spawnHazards } from "../entities/hazardViews";
import { spawnLeaks } from "../entities/leaks";
import { LevelRun } from "../level/run";
import { loadCourse } from "../level/loader";
import { boxes, type Box } from "../level/testRoom";
import { TrainingWorld } from "../physics/world";
import { MOVEMENT as m, ROOM } from "../config/movement.config";
import { powers } from "../config/powers";
import { Input } from "../player/input";
import { DT, FixedLoop } from "./loop";

export type Course = LevelId | "training";
export type Mode = "title" | "running" | "paused" | "finished";
/** Mount the room once so resuming and restarting preserve frame responsiveness. */
export async function createTraining(
  canvas: HTMLCanvasElement,
  webgl: T.WebGLRenderer,
  onMode: (mode: Mode) => void,
  settings: Settings,
  loadGhost: (id: LevelId) => Track | null,
  onSpeed: (speed: number, state: string, run: LevelRun | null) => void,
) {
  const [, levels] = await Promise.all([
    R.init(),
    Promise.all(courses.map((c) => loadCourse(c.id, webgl))),
  ]);
  const trainingPhysics = new TrainingWorld();
  let physics = trainingPhysics,
    run: LevelRun | null = null;
  const scene = new T.Scene(),
    camera = new T.PerspectiveCamera(m.fov, 1, 0.04, 140);
  const ghost = new GhostPlayer(scene),
    recorder = new Recorder();
  let track: Track | null = null;
  scene.background = new T.Color(0xa4c8bf);
  scene.fog = new T.FogExp2(0xa4c8bf, 0.019);
  scene.add(new T.HemisphereLight(0xfff6d8, 0x668080, 2));
  const sun = new T.DirectionalLight(0xffe8c4, 2);
  sun.position.set(-5, 14, 8);
  scene.add(sun);
  const pixels = new Uint8Array([
    236, 226, 201, 255, 189, 207, 194, 255, 189, 207, 194, 255, 236, 226, 201,
    255,
  ]);
  const tiles = new T.DataTexture(pixels, 2, 2);
  tiles.colorSpace = T.SRGBColorSpace;
  tiles.wrapS = tiles.wrapT = T.RepeatWrapping;
  tiles.needsUpdate = true;
  const cottageFloor = floorboards();
  const beams = surface(0x69503a);
  const partitionPlaster = surface(0xc5b493);
  const barriers = {
    breakable: surface(0x895332),
    vent: surface(0x566064, 0.54, 0.45),
    phaseable: surface(0x775a71, 0.5),
  };
  function geometry(boxes: Box[], cottage = false) {
    const group = new T.Group();
    scene.add(group);
    for (const b of boxes) {
      if (b.shell) continue;
      const geo = new T.BoxGeometry(...b.size),
        mesh = new T.Mesh(
          geo,
          new T.MeshStandardMaterial({
            color: b.color,
            transparent: b.obstacle === "phaseable",
            opacity: b.obstacle === "phaseable" ? 0.55 : 1,
          }),
        );
      if (cottage) {
        mesh.material.dispose();
        mesh.material = b.obstacle
          ? barriers[b.obstacle]
          : b.partition
            ? partitionPlaster
            : b.center[1] < 0
              ? cottageFloor
              : beams;
      }
      if (!b.obstacle && !b.wallrun && b.size[1] < b.size[0]) {
        if (!cottage) mesh.material.map = tiles;
        const uv = geo.attributes.uv,
          positions = geo.attributes.position;
        for (let i = 0; i < uv.count; i++)
          uv.setXY(
            i,
            (positions.getX(i) + b.center[0]) / (cottage ? 1.35 : 4),
            (positions.getZ(i) + b.center[2]) / (cottage ? 2.8 : 4),
          );
      }
      mesh.position.set(...b.center);
      mesh.rotation.x = b.tilt ?? 0;
      if (!cottage) {
        mesh.add(
          new T.LineSegments(
            new T.EdgesGeometry(geo),
            new T.LineBasicMaterial({ color: 0x466a65 }),
          ),
        );
      } else if (b.obstacle === "breakable" || b.obstacle === "vent") {
        const spacing = b.obstacle === "vent" ? 0.09 : 0.37;
        const slat = new T.BoxGeometry(b.size[0], spacing * 0.45, 0.045);
        for (let y = spacing / 2; y < b.size[1]; y += spacing) {
          const board = new T.Mesh(slat, beams);
          board.position.set(0, y - b.size[1] / 2, b.size[2] / 2 + 0.017);
          mesh.add(board);
        }
      }
      mesh.userData.box = b;
      group.add(mesh);
    }
    return group;
  }
  const trainingGroup = geometry(boxes);
  const rooms = levels.map((level, i) => {
    const physics = new TrainingWorld(level.boxes, level.spawn),
      run = new LevelRun(level, physics),
      group = geometry(level.boxes, !level.art),
      entities = new T.Scene();
    group.add(entities);
    if (level.art) group.add(level.art);
    else furnishCottage(group, level);
    group.visible = false;
    const actors = spawnHazards(entities, run),
      glove = spawnGlove(entities, run),
      leaks = spawnLeaks(entities, run);
    return {
      id: courses[i].id,
      physics,
      run,
      group,
      update(alpha: number) {
        actors(alpha);
        glove();
        leaks();
      },
    };
  });
  let current: (typeof rooms)[number] | undefined;
  // Lane markings establish distance and make speed visible on the flat floor.
  const mark = new T.MeshBasicMaterial({ color: 0x477c72 });
  for (let z = -29; z < 17; z += 2) {
    if (z > -8 && z < -3) continue;
    for (const x of [-6, 4.7]) {
      const stripe = new T.Mesh(new T.PlaneGeometry(0.09, 1), mark);
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(x, 0.007, z);
      trainingGroup.add(stripe);
    }
  }
  const debug = new T.LineSegments(
    new T.BufferGeometry(),
    new T.LineBasicMaterial({ vertexColors: true, depthTest: false }),
  );
  debug.renderOrder = 5;
  debug.frustumCulled = false;
  scene.add(debug);
  debug.visible = false;
  const stats = import.meta.env.DEV ? new Stats() : null;
  if (stats) {
    document.body.append(stats.dom);
    stats.dom.style.display = "none";
  }
  const gui = import.meta.env.DEV
    ? new GUI({ title: "Movement settings" })
    : null;
  gui?.hide();
  gui?.close();
  for (const key of Object.keys(m) as (keyof typeof m)[]) {
    const max = m[key] * 3;
    gui?.add(m, key, m[key] / 4, max).onChange(() => {
      if (key === "playerHeight" || key === "playerRadius") {
        m.playerRadius = Math.min(m.playerRadius, m.playerHeight / 2);
        for (const physics of [
          trainingPhysics,
          ...rooms.map((r) => r.physics),
        ]) {
          physics.refreshSize();
        }
      }
    });
  }
  const pad = new Pad();
  let compose: (() => void) | undefined,
    shake = 0;
  const input = new Input(),
    loop = new FixedLoop(),
    prev = new T.Vector3(),
    curr = new T.Vector3();
  let mode: Mode = "title",
    last: number | undefined,
    hud = "",
    edgeLook = 0,
    lastMouse: { x: number; y: number } | undefined,
    capturePending = false;
  function setMode(next: Mode) {
    mode = next;
    canvas.classList.toggle("playing", next === "running");
    edgeLook = 0;
    lastMouse = undefined;
    onMode(mode);
    pad.clear();
    input.clear();
    loop.reset();
    last = undefined;
    if (stats)
      stats.dom.style.display =
        mode === "running" && debug.visible ? "block" : "none";
    if (mode === "paused") gui?.show();
    else gui?.hide();
  }
  function reset() {
    shake = 0;
    edgeLook = 0;
    physics.reset();
    run?.reset();
    hud = "";
    input.yaw = run?.level.yaw ?? 0;
    input.pitch = 0;
    pad.clear();
    input.clear();
    curr.copy(physics.body.translation());
    prev.copy(curr);
    recorder.reset();
    track = current ? loadGhost(current.id) : null;
    if (run) recorder.capture(0, curr, input.yaw, input.pitch);
    loop.reset();
    last = undefined;
  }
  async function captureMouse() {
    if (
      capturePending ||
      !canvas.requestPointerLock ||
      document.pointerLockElement === canvas
    )
      return;
    capturePending = true;
    try {
      await canvas.requestPointerLock();
    } catch {
      // Some embedded browsers allow movement over the canvas but block capture.
    } finally {
      capturePending = false;
    }
  }
  function start(course?: Course) {
    if (mode === "title" || course !== undefined) {
      // A title launch defaults to Lights Out; resuming or retrying keeps the current course.
      const selected = course ?? "c1_l1";
      current = rooms.find((r) => r.id === selected);
      physics = current?.physics ?? trainingPhysics;
      run = current?.run ?? null;
      trainingGroup.visible = !current;
      for (const room of rooms) room.group.visible = room === current;
    }
    if (mode === "title" || mode === "finished" || course !== undefined)
      reset();
    onSpeed(0, physics.movement.state, run);
    setMode("running");
    void captureMouse();
  }
  function title() {
    setMode("title");
    if (document.pointerLockElement === canvas) document.exitPointerLock();
  }
  function pause() {
    if (mode === "running") {
      setMode("paused");
      if (document.pointerLockElement === canvas) document.exitPointerLock();
    }
  }
  document.addEventListener("pointerlockchange", () => {
    if (document.pointerLockElement === canvas) {
      if (mode !== "running") document.exitPointerLock();
      edgeLook = 0;
      lastMouse = undefined;
    } else pause();
  });
  canvas.addEventListener("click", () => {
    if (mode === "running") void captureMouse();
  });
  window.addEventListener("blur", pause);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) pause();
  });
  document.addEventListener("mousemove", (e) => {
    if (mode !== "running") return;
    const locked = document.pointerLockElement === canvas;
    if (!locked && e.target !== canvas) return;
    const dx = locked ? e.movementX : lastMouse ? e.clientX - lastMouse.x : 0;
    const dy = locked ? e.movementY : lastMouse ? e.clientY - lastMouse.y : 0;
    input.look(dx, settings.invertY ? -dy : dy);

    // An uncaptured cursor stops reporting motion when it reaches the edge.
    // Continue turning there so embedded players can look all the way around.
    if (!locked) {
      if (!lastMouse) {
        lastMouse = { x: e.clientX, y: e.clientY };
        return;
      }
      lastMouse.x = e.clientX;
      lastMouse.y = e.clientY;
      const bounds = canvas.getBoundingClientRect();
      const edge = 24;
      const left = Math.max(0, 1 - (e.clientX - bounds.left) / edge);
      const right = Math.max(0, 1 - (bounds.right - e.clientX) / edge);
      edgeLook = right - left;
    }
  });
  canvas.addEventListener("mouseleave", () => {
    edgeLook = 0;
    lastMouse = undefined;
  });
  window.addEventListener("keydown", (e) => {
    if (
      e.code === "KeyR" &&
      !e.repeat &&
      (mode === "paused" || mode === "finished")
    ) {
      e.preventDefault();
      reset();
      void start();
      return;
    }
    if (mode !== "running") return;
    if (["Space", "Tab", "F3"].includes(e.code) || e.ctrlKey)
      e.preventDefault();
    if (e.code === "Escape") pause();
    else if (e.code === "KeyR" && !e.repeat) reset();
    else if (e.code === "F3" && !e.repeat) {
      debug.visible = !debug.visible;
      if (stats) stats.dom.style.display = debug.visible ? "block" : "none";
    } else input.key(e.code, true);
  });
  window.addEventListener("keyup", (e) => input.key(e.code, false));
  function render(renderer: T.WebGLRenderer, ms: number) {
    pad.poll();
    if (mode !== "running") {
      const buttons = Array.from(
        document.querySelectorAll<HTMLButtonElement>(
          "#ui button:not(:disabled)",
        ),
      );
      const direction = Number(pad.take(13)) - Number(pad.take(12));
      if (direction && buttons.length) {
        const n = buttons.indexOf(document.activeElement as HTMLButtonElement);
        buttons[(n + direction + buttons.length) % buttons.length].focus();
      }
      if (pad.take(0)) {
        (
          buttons.find((b) => b === document.activeElement) ?? buttons[0]
        )?.click();
      }
      if (pad.take(9) && mode === "paused") void start();
      pad.clear();
    } else if (pad.take(9)) pause();
    else if (pad.take(3)) reset();
    if (mode === "title") return false;
    stats?.begin();
    const alpha =
      mode === "running"
        ? loop.advance(last === undefined ? 0 : (ms - last) / 1000, () => {
            if (run?.finished) return;
            prev.copy(curr);
            if (edgeLook && document.pointerLockElement !== canvas)
              input.look(edgeLook * 900 * DT, 0);
            const cmd = input.read(pad, settings.invertY);
            const oldState = physics.movement.state,
              oldVertical = physics.movement.vy,
              oldPower = physics.power.id;
            physics.look = {
              x: -Math.sin(input.yaw) * Math.cos(input.pitch),
              y: Math.sin(input.pitch),
              z: -Math.cos(input.yaw) * Math.cos(input.pitch),
            };
            physics.tick(cmd);
            if (physics.movement.state === "Sliding" && oldState !== "Sliding")
              sound("slide", settings.volume);
            if (physics.movement.vy > 0 && oldVertical <= 0)
              sound("jump", settings.volume);
            curr.copy(physics.body.translation());
            if (curr.y < ROOM.fallLimit) reset();
            else if (run) {
              const near = run.activeRing,
                before = near >= 0 ? run.progress[near] : 0,
                locked = !run.exitOpen;
              run.tick(cmd);
              if (run.splits.includes(run.ticks)) {
                sound("clear", settings.volume);
                shake = 0.045;
              } else if (
                near >= 0 &&
                Math.floor(run.progress[near] / 120) > Math.floor(before / 120)
              )
                sound("tick", settings.volume);
              if (locked && run.exitOpen) sound("open", settings.volume);
              if (run.ticks % 72 === 1) {
                const melody = [1, 1.25, 1.5, 2, 1.875, 1.5, 1.25, 1.125];
                sound(
                  "beat",
                  settings.volume,
                  melody[Math.floor(run.ticks / 72) % melody.length],
                );
              }

              curr.copy(physics.body.translation());
              if (oldPower !== physics.power.id)
                sound(physics.power.id ? "power" : "end", settings.volume);
              shake *= 0.92;
              recorder.capture(
                run.ticks,
                curr,
                input.yaw,
                input.pitch,
                run.finished,
              );
            }
          })
        : 1;
    last = ms;
    if (run && current) {
      const group = current.group;
      for (const child of group.children) {
        if (child.userData.box?.obstacle === "breakable")
          child.visible = !physics.broken.has(child.userData.box);
      }
      current.update(alpha);
      if (run.finished && mode === "running") {
        setMode("finished");
        if (document.pointerLockElement === canvas) document.exitPointerLock();
      }
    }
    camera.position.lerpVectors(prev, curr, alpha);
    camera.position.y +=
      m.eyeHeight *
        (physics.height / m.playerHeight) *
        (physics.power.id === "eat_me" ? powers.eat_me.eyes : 1) -
      physics.height / 2 -
      (physics.movement.state === "Sliding" ? ROOM.slideEyeDrop : 0);
    camera.rotation.set(
      input.pitch,
      input.yaw,
      settings.shake ? shake * Math.sin((run?.ticks ?? 0) * 0.9) : 0,
      "YXZ",
    );
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.fov =
      m.fov + (physics.power.id === "eat_me" ? powers.eat_me.fov : 0);
    camera.updateProjectionMatrix();
    if (debug.visible) {
      const { vertices, colors } = physics.world.debugRender();
      debug.geometry.dispose();
      debug.geometry = new T.BufferGeometry();
      debug.geometry.setAttribute(
        "position",
        new T.BufferAttribute(vertices, 3),
      );
      debug.geometry.setAttribute("color", new T.BufferAttribute(colors, 4));
    }
    const speed = Number(physics.horizontalSpeed.toFixed(1)),
      state = physics.movement.state;
    const signature = speed + state + (run?.ticks ?? "");
    if (hud !== signature) {
      hud = signature;
      onSpeed(speed, state, run);
    }
    ghost.render(
      track,
      Math.max(0, (run?.ticks ?? 0) - 1 + alpha),
      settings.showGhost,
      camera.position,
    );
    compose ??= roomEffects(renderer, scene, camera);
    compose();
    stats?.end();
    return true;
  }
  return {
    start,
    title,
    render,
    recorded: () => (run?.finished ? recorder.finish(run.ticks) : undefined),
  };
}
