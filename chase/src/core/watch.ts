/** Clockwise rotation measured from twelve o'clock. */
export function handAngle(seconds: number, period: number) {
  return (-(seconds % period) * Math.PI * 2) / period;
}
