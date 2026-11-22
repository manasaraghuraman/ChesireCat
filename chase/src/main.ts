import { opponents, submit } from "./net/online";
import { LocalSave, type Settings } from "./save/localSave";
import { MOVEMENT } from "./config/movement.config";
import { courses } from "./config/courses";
import { enableAudio, chime } from "./audio/cues";
import { h, render } from "preact";
import { App } from "./ui/App";
import { mountScene } from "./core/scene";
import type { createTraining, Mode, Course } from "./core/training";
import type { LevelRun } from "./level/run";
import "./style.css";
const save = new LocalSave(() => window.localStorage);
const settings = save.settings();
function apply() {
  MOVEMENT.mouseSensitivity = settings.sensitivity;
  MOVEMENT.fov = settings.fov;
}
apply();
const collected = new Set(
  courses.filter((c) => save.record(c.id).glove).map((c) => c.id),
);
let run: LevelRun | null = null;
const canvas = document.querySelector<HTMLCanvasElement>("#scene")!;
const ui = document.querySelector("#ui")!;
ui.replaceChildren();
let room: Awaited<ReturnType<typeof createTraining>> | undefined;
let mode: Mode = "title",
  speed = 0,
  state = "Airborne",
  error = "";
function draw() {
  render(
    h(App, {
      key: mode,
      save,
      settings,
      change: (v: Partial<Settings>) => {
        Object.assign(settings, save.setSettings(v));
        apply();
        draw();
      },
      mode,
      speed,
      state,
      error,
      run,
      ready: !!room,
      start: async (course?: Course) => {
        enableAudio();
        error = "";
        try {
          await room?.start(course);
        } catch {
          error =
            "Mouse capture failed. Click to try again in a desktop browser.";
        }
        draw();
      },
      title: () => room?.title(),
    }),
    ui,
  );
}
async function init() {
  try {
    const renderer = mountScene(
      canvas,
      (renderer, ms) => room?.render(renderer, ms) ?? false,
    );
    draw();
    const { createTraining } = await import("./core/training");
    room = await createTraining(
      canvas,
      renderer,
      (next) => {
        if (next === "finished" && run) {
          const course = courses.find((c) => c.id === run?.level.id);
          if (course) {
            const track = room?.recorded();
            save.finish(course.id, run.finalTime, track);
            if (track) submit(run, track);
            chime(settings.volume);
          }
        }
        mode = next;
        canvas.setAttribute(
          "aria-label",
          next === "title"
            ? "The White Rabbit’s ticking pocket watch"
            : (run?.level.name ?? "First-person movement test room"),
        );
        draw();
      },
      settings,
      (id) => {
        const leader = opponents.get(id);
        opponents.delete(id);
        return leader ?? save.ghost(id);
      },
      (v, s, active) => {
        if (active) {
          const c = courses.find((c) => c.id === active.level.id);
          if (c && collected.has(c.id)) active.gloveFound = true;
          else if (c && active.gloveFound) {
            collected.add(c.id);
            save.collect(c.id);
            chime(settings.volume);
          }
        }
        run = active;
        speed = v;
        state = s;
        draw();
      },
    );
  } catch (e) {
    console.error(e);
    error = "The 3D room could not load. Check WebGL 2 support and reload.";
  }
  draw();
}
void init();
