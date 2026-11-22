import process from "node:process";
import { URL } from "node:url";
import { spawnSync } from "node:child_process";
import {
  readFileSync,
  mkdirSync,
  mkdtempSync,
  renameSync,
  rmSync,
  copyFileSync,
} from "node:fs";
import { basename, dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const [input, output] = process.argv.slice(2);
if (
  !input ||
  !output ||
  !output.endsWith(".glb") ||
  resolve(input) === resolve(output)
)
  throw Error("Usage: npm run assets -- source.glb public/levels/course.glb");
const bytes = readFileSync(input);
if (bytes.toString("ascii", 0, 4) !== "glTF")
  throw Error("Export a binary GLB from Blender.");
const data = JSON.parse(
  bytes.toString("utf8", 20, 20 + bytes.readUInt32LE(12)),
);
mkdirSync(dirname(output), { recursive: true });
const scratch = mkdtempSync(join(dirname(output), ".asset-"));
try {
  const target = join(scratch, basename(output));
  const cli = join(root, "node_modules/@gltf-transform/cli/bin/cli.js");
  const result = spawnSync(
    process.execPath,
    [
      cli,
      "optimize",
      input,
      target,
      "--compress",
      "meshopt",
      "--texture-compress",
      data.textures?.length ? "ktx2" : "false",
      "--flatten",
      "false",
      "--join",
      "false",
      "--instance",
      "false",
      "--prune",
      "false",
      "--palette",
      "false",
      "--simplify",
      "false",
    ],
    { stdio: "inherit" },
  );
  if (result.status !== 0)
    throw Error(
      "Asset conversion failed. Textured exports require KTX-Software on PATH.",
    );
  if (data.textures?.length) {
    const dest = join(root, "public/basis");
    mkdirSync(dest, { recursive: true });
    for (const file of [
      "basis_transcoder.js",
      "basis_transcoder.wasm",
      "README.md",
    ])
      copyFileSync(
        join(root, "node_modules/three/examples/jsm/libs/basis", file),
        join(dest, file),
      );
  }
  renameSync(target, output);
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
