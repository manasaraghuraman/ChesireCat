/**
 * File: game3d/world.ts
 * Purpose: Owns the three.js renderer, camera, pointer lock, input listeners, the fixed-step loop,
 *          size-driven body scaling, interaction focus, zone switching (with fades) and full
 *          teardown. Load only from the client via dynamic import(). It never decides game
 *          outcomes: it reads size via setSize() and emits intents on the bridge.
 *          Wiring adapted from carbon-footprint game src/core/training.ts and src/core/scene.ts.
 * Date: 2026-11-21
 */
import RAPIER from "@dimforge/rapier3d-compat";
import * as THREE from "three";
import { emit, on } from "../game/bridge";
import { BODY, INTERACT, SIZE_FEEDBACK, SIZE_SCALING } from "./config";
import { CAPTURED_KEYS, Input } from "./input";
import { focusKey, pickFocus, type Focus } from "./interact";
import { loadLevel, type LevelData, type LevelInteractable, type Vec3 } from "./level";
import { FixedLoop } from "./loop";
import { PhysicsWorld } from "./physics";
import { buildLabels, buildLevelMeshes, disposeObject } from "./scenery";
import { DEFAULT_SETTINGS, type Settings } from "./settings";
import { bodyForSize, type BodyDims } from "./sizing";
import { Tween } from "./tween";
import { createZone } from "./zones";
import type { Zone, ZoneContext } from "./zones/types";

/** "ready": loaded, waiting for the first click. "paused": controls released. "dialogue": typing to an NPC. */
export type WorldMode = "ready" | "running" | "paused" | "dialogue";

export interface WorldOptions {
  readonly startZone: string;
  readonly initialSize: number;
  readonly reducedMotion: boolean;
  readonly settings?: Settings;
  readonly onMode?: (mode: WorldMode) => void;
}

export interface WorldHandle {
  /** Requests pointer lock; falls back to drag-to-look if the browser refuses. */
  readonly capture: () => Promise<void>;
  /** Feed the store's size in; the body eases to it. */
  readonly setSize: (size: number) => void;
  readonly setSettings: (settings: Settings) => void;
  readonly dispose: () => void;
}

const FADE_SECONDS = 0.35;
const LOOK_SECONDS = 0.5;
/** Eye sits at the same fraction of the body at every size. */
const EYE_FRACTION = SIZE_SCALING.baseEyeHeight / SIZE_SCALING.baseColliderHeight;

function isTypingTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
}

/** Resolves true if pointer lock was granted. */
async function requestLock(canvas: HTMLCanvasElement): Promise<boolean> {
  try {
    await canvas.requestPointerLock({ unadjustedMovement: true });
    return true;
  } catch {
    try {
      await canvas.requestPointerLock(); // unadjustedMovement unsupported: silent fallback
      return true;
    } catch (error) {
      // Refused (embedded/unfocused page, or re-lock within ~1 s of Esc): fall back to drag-to-look.
      console.warn("[world] pointer lock refused; using drag-to-look", error);
      return false;
    }
  }
}

/** Shortest signed angle from `from` to `to`. */
function angleDelta(from: number, to: number): number {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

interface ActiveZone {
  readonly zone: Zone;
  readonly root: THREE.Group;
  readonly level: LevelData | null;
  readonly physics: PhysicsWorld | null;
  interactables: readonly LevelInteractable[];
  labels: THREE.Group;
  cinematic: ((camera: THREE.PerspectiveCamera, dt: number) => void) | null;
  elapsed: number;
}

/** Boots Rapier and renders `startZone` into `canvas`. Throws if WebGL 2 or Rapier fail. */
export async function createWorld(canvas: HTMLCanvasElement, options: WorldOptions): Promise<WorldHandle> {
  await RAPIER.init();

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  if (!renderer.capabilities.isWebGL2) {
    renderer.dispose();
    throw new Error("WebGL 2 is not available");
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, BODY.maxPixelRatio));
  renderer.autoClear = false;

  let settings: Settings = options.settings ?? DEFAULT_SETTINGS;
  const reducedMotion = (): boolean => options.reducedMotion || settings.reducedMotion;
  let body: BodyDims = bodyForSize(options.initialSize);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(settings.fov, 1, BODY.near, BODY.far);
  // Full-screen fade quad, drawn after the scene.
  const overlayScene = new THREE.Scene();
  const overlayCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const fadeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 1, depthTest: false });
  overlayScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), fadeMaterial));
  const fade = new Tween(1);

  const input = new Input();
  const loop = new FixedLoop();
  // Interpolate the feet, not the capsule centre, so resizing never makes the camera pop.
  const feetPrev = new THREE.Vector3();
  const feetCurr = new THREE.Vector3();
  const eye = new Tween(body.eyeHeight);
  const fovPulse = new Tween(0);
  const yawTween = new Tween(0);
  const pitchTween = new Tween(0);
  let isLookEasing = false;
  const viewDir = new THREE.Vector3();
  const euler = new THREE.Euler(0, 0, 0, "YXZ");
  let mode: WorldMode = "ready";
  let lastMs: number | undefined;
  let lastRenderMs: number | undefined;
  let focus: Focus | null = null;
  let active: ActiveZone | null = null;
  let isSwitching = false;
  let isDisposed = false;

  function setMode(next: WorldMode): void {
    if (mode === next) return;
    mode = next;
    input.clear();
    loop.reset();
    lastMs = undefined;
    emit("pointer-lock", mode === "running");
    options.onMode?.(mode);
  }

  function setFocus(next: Focus | null): void {
    if (focusKey(next) === focusKey(focus)) return;
    focus = next;
    emit("focus-changed", focus);
  }

  function eyeVec(): Vec3 {
    return [feetCurr.x, feetCurr.y + eye.value, feetCurr.z];
  }

  function updateFocus(): void {
    if (!active || mode !== "running" || active.cinematic) {
      setFocus(null);
      return;
    }
    euler.set(input.pitch, input.yaw, 0);
    viewDir.set(0, 0, -1).applyEuler(euler);
    setFocus(
      pickFocus(
        active.interactables,
        {
          eye: eyeVec(),
          dir: [viewDir.x, viewDir.y, viewDir.z],
          feetY: feetCurr.y,
          reach: body.reach,
          reachHeight: body.reachHeight,
        },
        INTERACT.coneDegrees,
      ),
    );
  }

  function syncFeet(): void {
    if (!active?.physics) return;
    const f = active.physics.feet;
    feetCurr.set(f.x, f.y, f.z);
  }

  function lookAt(target: Vec3, seconds = LOOK_SECONDS): void {
    const [ex, ey, ez] = eyeVec();
    const dx = target[0] - ex;
    const dy = target[1] - ey;
    const dz = target[2] - ez;
    const yaw = input.yaw + angleDelta(input.yaw, Math.atan2(-dx, -dz));
    const pitch = Math.atan2(dy, Math.hypot(dx, dz));
    const duration = reducedMotion() ? 0 : seconds;
    yawTween.value = input.yaw;
    pitchTween.value = input.pitch;
    yawTween.to(yaw, duration);
    pitchTween.to(pitch, duration);
    isLookEasing = true;
  }

  function setInteractables(items: readonly LevelInteractable[]): void {
    if (!active) return;
    active.interactables = items;
    active.root.remove(active.labels);
    disposeObject(active.labels);
    active.labels = buildLabels(items);
    active.root.add(active.labels);
    updateFocus();
  }

  function exitActive(): void {
    if (!active) return;
    active.zone.exit();
    scene.remove(active.root);
    disposeObject(active.root);
    active.physics?.dispose();
    active = null;
    setFocus(null);
  }

  function makeContext(zone: Zone, root: THREE.Group, level: LevelData | null): ZoneContext {
    return {
      root,
      camera,
      scene,
      level,
      get reducedMotion() {
        return reducedMotion();
      },
      goTo: (id) => void goTo(id),
      setInteractables,
      setCinematic: (drive) => {
        if (active?.zone === zone) active.cinematic = drive;
      },
      lookAt,
      openDialogue: (levelId, faceAt) => {
        if (document.pointerLockElement === canvas) document.exitPointerLock();
        setMode("dialogue");
        setFocus(null);
        lookAt(faceAt);
        emit("dialogue-open", { levelId });
      },
      eyePosition: eyeVec,
    };
  }

  async function goTo(zoneId: string): Promise<void> {
    if (isSwitching || isDisposed) return;
    const zone = createZone(zoneId);
    if (!zone) {
      console.error(`[world] unknown zone "${zoneId}"`);
      return;
    }
    isSwitching = true;
    const fadeSeconds = reducedMotion() ? 0 : FADE_SECONDS;
    try {
      if (active) {
        fade.to(1, fadeSeconds);
        await new Promise((resolve) => setTimeout(resolve, fadeSeconds * 1000));
      }
      const level = zone.levelId ? await loadLevel(zone.levelId) : null;
      if (isDisposed) return;
      exitActive();
      if (mode === "dialogue") setMode("paused");

      const root = new THREE.Group();
      let physics: PhysicsWorld | null = null;
      if (level) {
        root.add(buildLevelMeshes(level.boxes));
        physics = new PhysicsWorld(level.boxes, level.spawn);
        physics.setSize(body.colliderHeight, body.colliderRadius);
        physics.applyPendingSize();
        input.yaw = level.yaw;
        input.pitch = 0;
      }
      scene.add(root);
      active = {
        zone,
        root,
        level,
        physics,
        interactables: [],
        labels: new THREE.Group(),
        cinematic: null,
        elapsed: 0,
      };
      if (physics) {
        syncFeet();
        feetPrev.copy(feetCurr);
        eye.to(physics.colliderHeight * EYE_FRACTION, 0);
      }
      loop.reset();
      lastMs = undefined;
      zone.enter(makeContext(zone, root, level));
      if (level && active.interactables.length === 0 && level.interactables.length) setInteractables(level.interactables);
      emit("scene-changed", zone.id);
      fade.to(0, fadeSeconds);
    } finally {
      isSwitching = false;
    }
  }

  function resize(): void {
    const width = canvas.clientWidth || 1;
    const height = canvas.clientHeight || 1;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  const onPointerLockChange = () => {
    if (document.pointerLockElement === canvas) {
      if (mode !== "dialogue") setMode("running");
    } else if (mode === "running") setMode("paused");
  };
  const pause = () => {
    if (mode !== "running") return;
    if (document.pointerLockElement === canvas) document.exitPointerLock();
    setMode("paused");
  };
  const onVisibility = () => {
    if (document.hidden) pause();
  };
  const onMouseMove = (event: MouseEvent) => {
    const locked = document.pointerLockElement === canvas;
    const dragging = !locked && (event.buttons & 1) === 1 && event.target === canvas;
    if (mode === "running" && (locked || dragging)) {
      isLookEasing = false;
      input.look(event.movementX, event.movementY, settings.mouseSensitivity, settings.invertY);
    }
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (mode !== "running" || isTypingTarget(event.target)) return;
    if (event.code === "Escape") {
      pause(); // only reached without pointer lock; with it, the browser consumes Esc
      return;
    }
    if (CAPTURED_KEYS.has(event.code)) event.preventDefault();
    input.key(event.code, true);
  };
  const onKeyUp = (event: KeyboardEvent) => input.key(event.code, false);

  async function capture(): Promise<void> {
    if (mode === "dialogue" || document.pointerLockElement === canvas) return;
    if (!(await requestLock(canvas))) setMode("running");
  }

  document.addEventListener("pointerlockchange", onPointerLockChange);
  document.addEventListener("visibilitychange", onVisibility);
  document.addEventListener("mousemove", onMouseMove);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", pause);
  const offs = [
    on("capture-request", () => void capture()),
    on("dialogue-close", () => {
      if (mode === "dialogue") setMode("paused");
    }),
  ];
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  renderer.setAnimationLoop((ms: number) => {
    const dt = lastRenderMs === undefined ? 0 : Math.min(0.1, (ms - lastRenderMs) / 1000);
    lastRenderMs = ms;

    let alpha = 1;
    const zone = active;
    if (mode === "running" && zone && !isSwitching) {
      alpha = loop.advance(lastMs === undefined ? 0 : (ms - lastMs) / 1000, () => {
        feetPrev.copy(feetCurr);
        const command = input.read();
        if (zone.physics && !zone.cinematic) {
          zone.physics.tick(command, body.speedScale);
          syncFeet();
        }
        updateFocus();
        if (command.interact && focus?.enabled && !focus.reason) emit("interact", { id: focus.id });
      });
      lastMs = ms;
    }

    if (isLookEasing) {
      input.yaw = yawTween.update(dt);
      input.pitch = pitchTween.update(dt);
      if (input.yaw === yawTween.target && input.pitch === pitchTween.target) isLookEasing = false;
    }

    if (zone) {
      zone.elapsed += dt;
      zone.zone.update?.(dt, zone.elapsed);
    }

    if (zone?.cinematic) {
      zone.cinematic(camera, dt);
    } else {
      // Follow the collider in use, so a blocked grow (low ceiling) doesn't lift the eye into it.
      const colliderHeight = zone?.physics?.colliderHeight;
      if (colliderHeight !== undefined) {
        const eyeTarget = colliderHeight * EYE_FRACTION;
        if (eyeTarget !== eye.target) eye.to(eyeTarget, reducedMotion() ? 0 : SIZE_SCALING.tweenSeconds);
      }
      camera.position.lerpVectors(feetPrev, feetCurr, alpha);
      camera.position.y += eye.update(dt);
    }
    camera.rotation.set(input.pitch, input.yaw, 0, "YXZ");
    const fov = settings.fov + fovPulse.update(dt);
    if (camera.fov !== fov) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }

    renderer.clear();
    renderer.render(scene, camera);
    fadeMaterial.opacity = fade.update(dt);
    if (fadeMaterial.opacity > 0.001) {
      renderer.clearDepth();
      renderer.render(overlayScene, overlayCamera);
    }
  });

  await goTo(options.startZone);

  return {
    capture,
    setSize: (size) => {
      const next = bodyForSize(size);
      if (next.ratio === body.ratio) return;
      const shrinking = next.ratio < body.ratio;
      body = next;
      active?.physics?.setSize(next.colliderHeight, next.colliderRadius); // the eye follows once applied
      if (!reducedMotion()) {
        // Kick the FOV out, then ease it back to normal.
        fovPulse.value = shrinking ? SIZE_FEEDBACK.fovShrinkDegrees : SIZE_FEEDBACK.fovGrowDegrees;
        fovPulse.to(0, SIZE_FEEDBACK.pulseSeconds);
      }
      updateFocus();
    },
    setSettings: (next) => {
      settings = next;
    },
    dispose: () => {
      isDisposed = true;
      renderer.setAnimationLoop(null);
      offs.forEach((off) => off());
      document.removeEventListener("pointerlockchange", onPointerLockChange);
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", pause);
      observer.disconnect();
      if (document.pointerLockElement === canvas) document.exitPointerLock();
      exitActive();
      emit("pointer-lock", false);
      disposeObject(scene);
      disposeObject(overlayScene);
      renderer.dispose();
    },
  };
}
