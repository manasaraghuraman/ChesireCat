import { DT } from "../core/loop";
export const stride = 5,
  sampleTicks = Math.round(1 / (30 * DT));
export interface Track {
  ticks: number;
  poses: Float32Array;
}
export interface StoredTrack {
  version: 1;
  ticks: number;
  data: string;
}
/** Store the first pose absolutely and subsequent poses as five float deltas. */
export function encode(track: Track): StoredTrack {
  const bytes = new Uint8Array(track.poses.length * 4),
    view = new DataView(bytes.buffer);
  for (let i = 0; i < track.poses.length; i++)
    view.setFloat32(
      i * 4,
      track.poses[i] - (i < stride ? 0 : track.poses[i - stride]),
      true,
    );
  const chunks: string[] = [];
  for (let i = 0; i < bytes.length; i += 16384)
    chunks.push(String.fromCharCode(...bytes.subarray(i, i + 16384)));
  return { version: 1, ticks: track.ticks, data: btoa(chunks.join("")) };
}
/** Ignore unreadable replays while preserving the level's score. */
export function decode(value: unknown): Track | null {
  if (!value || typeof value !== "object") return null;
  const { version, ticks, data } = value as StoredTrack;
  if (
    version !== 1 ||
    !Number.isSafeInteger(ticks) ||
    ticks < 1 ||
    typeof data !== "string"
  )
    return null;
  const count = (1 + Math.ceil(ticks / sampleTicks)) * stride,
    byteLength = count * 4;
  if (data.length !== 4 * Math.ceil(byteLength / 3)) return null;
  try {
    const binary = atob(data);
    if (binary.length !== byteLength) return null;
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0)),
      view = new DataView(bytes.buffer),
      poses = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      poses[i] =
        view.getFloat32(i * 4, true) + (i < stride ? 0 : poses[i - stride]);
      if (!Number.isFinite(poses[i])) return null;
    }
    return { ticks, poses };
  } catch {
    return null;
  }
}
