/** Snap small stick drift to zero while preserving the analogue range. */
export function axis(v = 0) {
  const dead = 0.15;
  return Math.abs(v) <= dead
    ? 0
    : (Math.sign(v) * (Math.abs(v) - dead)) / (1 - dead);
}
export class Pad {
  private buttons: boolean[] = [];
  private edges = new Set<number>();
  current: Gamepad | null = null;
  poll() {
    try {
      this.current =
        Array.from(navigator.getGamepads?.() ?? []).find(
          (p) => p?.mapping === "standard",
        ) ?? null;
    } catch {
      this.current = null;
    }
    const next = this.current?.buttons.map((b) => b.pressed) ?? [];
    next.forEach((v, i) => {
      if (v && !this.buttons[i]) this.edges.add(i);
    });
    this.buttons = next;
  }
  held(i: number) {
    return !!this.buttons[i];
  }
  take(i: number) {
    return this.edges.delete(i);
  }
  clear() {
    this.edges.clear();
  }
}
