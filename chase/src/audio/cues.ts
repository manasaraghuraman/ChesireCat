/** A short local chime for glove pickups, finishes and the volume preview. */
let context: AudioContext | undefined;
export function enableAudio() {
  try {
    context ??= new AudioContext();
    if (context.state === "suspended") void context.resume().catch(() => {});
  } catch {
    /* Audio may be unavailable. */
  }
}
export function chime(volume: number) {
  if (!context || context.state !== "running" || !volume) return;
  const tone = context.createOscillator(),
    gain = context.createGain(),
    now = context.currentTime;
  tone.frequency.setValueAtTime(660, now);
  tone.frequency.setValueAtTime(880, now + 0.09);
  gain.gain.setValueAtTime(0.08 * volume, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
  tone.connect(gain).connect(context.destination);
  tone.start();
  tone.stop(now + 0.26);
}
const notes = {
  jump: [330, 540],
  slide: [190, 85],
  tick: [450, 450],
  clear: [660, 990],
  power: [480, 920],
  end: [510, 250],
  open: [392, 784],
  beat: [220, 220],
} as const;
export function sound(kind: keyof typeof notes, volume: number, pitch = 1) {
  if (!context || context.state !== "running" || !volume) return;
  const osc = context.createOscillator(),
    gain = context.createGain(),
    now = context.currentTime;
  const [a, b] = notes[kind];
  osc.type = kind === "slide" ? "triangle" : "sine";
  osc.frequency.setValueAtTime(a * pitch, now);
  osc.frequency.exponentialRampToValueAtTime(b * pitch, now + 0.12);
  gain.gain.setValueAtTime(volume * (kind === "beat" ? 0.025 : 0.07), now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
  osc.connect(gain).connect(context.destination);
  osc.start();
  osc.stop(now + 0.23);
}
