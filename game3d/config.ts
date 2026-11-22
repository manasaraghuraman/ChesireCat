/**
 * File: game3d/config.ts
 * Purpose: Tunable constants for the first-person world (movement, size scaling, interaction).
 *          Presentation only: no game rules live here.
 * Date: 2026-11-21
 */

/** Calm exploration movement, adapted from the carbon repo's speedrun tuning. */
export const EXPLORE_MOVEMENT = {
  walkSpeed: 4.5, // m/s at size ratio 1
  hurrySpeed: 7,
  // Spec said 60, but terminal ground speed is groundAccel / groundFriction (60 / 10 = 6 m/s),
  // which would cap hurrySpeed below 7. 80 allows up to 8 m/s.
  groundAccel: 80,
  groundFriction: 10,
  airAccel: 15,
  gravity: 24,
  jumpVelocity: 6.5,
  coyoteTime: 0.1,
  jumpBuffer: 0.12,
  fov: 80,
  mouseSensitivity: 0.0022,
  wallRun: false, // the borrowed controller supported these; this game keeps them off
  slide: false,
} as const;

/** Body dimensions at ratio 1 (size 60). Phase 2 scales these with size via sizing.ts. */
export const SIZE_SCALING = {
  minRatio: 0.35,
  maxRatio: 1.5,
  baseEyeHeight: 1.6,
  baseColliderHeight: 1.8,
  baseColliderRadius: 0.35,
  baseReach: 2.2, // horizontal interact distance at ratio 1
  baseReachHeight: 2.1, // how high above her feet Alice can reach at ratio 1
  speedExponent: 0.5,
  tweenSeconds: 0.4,
} as const;

/** `reach` here is the ratio-1 value; the live reach comes from sizing.ts. */
export const INTERACT = { reach: 2.2, coneDegrees: 12 } as const;

/** Size-change feedback: a brief FOV pulse (wider when shrinking). Skipped under reduced motion. */
export const SIZE_FEEDBACK = {
  fovShrinkDegrees: 10,
  fovGrowDegrees: -6,
  pulseSeconds: 0.45,
} as const;

/** Character-controller and camera details that are not gameplay tuning. */
export const BODY = {
  skin: 0.015, // Rapier character-controller offset
  snapToGround: 0.18,
  autostepHeight: 0.3, // walk up stairs; taller ledges need a jump
  autostepMinWidth: 0.2,
  fallLimit: -20, // respawn if the player falls out of the level
  pitchLimit: Math.PI / 2 - 0.01,
  near: 0.04,
  far: 200,
  maxPixelRatio: 2,
} as const;

export const LEVELS_PATH = "/levels/";
