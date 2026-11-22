# Authoring a Blender course

Use metres, apply mesh transforms, and export a binary glTF with **Custom Properties** enabled. The loader reads world transforms after Blender’s Z-up to glTF’s Y-up conversion. Untagged meshes supply decorative scenery. Use separate tagged boxes for collision and keep their sides aligned with the world axes.

| Object          | Custom properties                                                                                                                              |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Spawn empty     | `type=spawn`. Point local −Z down the first lane in exported glTF.                                                                             |
| Leak empty      | `type=leak_small` or `leak_big`, `leakType` matching the leak catalog, Boolean `required`. Place large leaks at floor height.                  |
| Exit and pickup | One empty each with `type=rabbit_hole` and `type=glove`.                                                                                       |
| Patrol or guide | Parent empty with `type=soldier_path` and numeric `speed`, or `type=rabbit_path`. Give each child waypoint a numeric `order` starting at zero. |
| Smog box        | `type=smog_zone` and integer `linkedLeak`, the zero-based leak index in scene traversal order.                                                 |
| Collision proxy | String `tags`, e.g. `floor`, `wallrun`, `vent`, `breakable` or `phaseable`. Separate multiple tags with commas.                                |

Run `npm run assets -- source.glb public/levels/cottage.glb`. The command preserves the marker hierarchy, compresses geometry with Meshopt, and converts textures to KTX2 when present. Textured exports require Khronos KTX-Software on PATH. It also stages the Three.js Basis transcoder in `public/basis`. Keep those files with the exported level.

Set the course’s `asset` in `src/config/levels.json` to `cottage.glb` and restart the game. Courses without this field load their JSON file. Update the scoring manifest and medal times when changing objectives. Playtest vent clearance, the landing after a launch, the optional route and the glove before publishing.

## Editing the built-in cottage plan

The JSON courses use a `partitions` array for walls across the cottage. Give each partition a `z` position and one or more `doors`, each with an `x` centre, a `width` of at least 1.4 metres, and a `room` name. Each doorway has 2.65 metres of headroom. The game generates matching wall colliders and adds frames and signs. For a perpendicular divider, add a floor-to-ceiling box tagged `partition` to `geometry`.

Keep floor under the main walking route through each door. Leave space to approach optional jump routes and land after power-up launches. Update `rabbitPath` through the openings and test the course with each required interaction before shipping.
