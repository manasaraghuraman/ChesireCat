import { powers as p, type PowerId } from "../config/powers";
import { DT } from "../core/loop";
export interface PowerContext {
  shrink: () => void;
  launch: () => void;
}
export interface PowerUp {
  id: PowerId;
  duration: number;
  onStart(ctx: PowerContext): void;
  onTick(ctx: PowerContext, dt: number): void;
  onEnd(ctx: PowerContext): void;
}
/** Exactly one timed effect owns the movement modifiers. Instant impulses stack with it. */
export class PowerUps {
  active: PowerUp | null = null;
  ticks = 0;
  airJumps = 0;
  readonly effects: Record<PowerId, PowerUp>;
  constructor(private ctx: PowerContext) {
    const effect = (
      id: PowerId,
      onStart: PowerUp["onStart"] = () => {},
      onEnd: PowerUp["onEnd"] = () => {},
    ): PowerUp => ({
      id,
      duration: p[id].duration,
      onStart,
      onEnd,
      onTick: () => {},
    });
    this.effects = {
      drink_me: effect("drink_me", (c) => c.shrink()),
      eat_me: effect("eat_me"),
      flamingo: effect("flamingo", (c) => c.launch()),
      hatter_hop: effect(
        "hatter_hop",
        () => {
          this.airJumps = p.hatter_hop.jumps;
        },
        () => {
          this.airJumps = 0;
        },
      ),
      tea_time: effect("tea_time"),
      cheshire: effect("cheshire"),
    };
  }
  activate(id: PowerId) {
    const next = this.effects[id];
    if (next.duration) {
      this.end();
      this.active = next;
      this.ticks = Math.round(next.duration / DT);
    }
    next.onStart(this.ctx);
    if (!next.duration) next.onEnd(this.ctx);
  }
  end() {
    this.active?.onEnd(this.ctx);
    this.active = null;
    this.ticks = 0;
  }
  tick() {
    if (!this.active) return;
    this.active.onTick(this.ctx, DT);
    if (--this.ticks === 0) this.end();
  }
  get id() {
    return this.active?.id;
  }
  get worldScale() {
    return this.id === "tea_time" ? p.tea_time.scale : 1;
  }
  get speed() {
    return this.id === "eat_me"
      ? p.eat_me.speed
      : this.id === "drink_me"
        ? p.drink_me.speed
        : 1;
  }
  get jump() {
    return this.id === "eat_me" ? p.eat_me.jump : 1;
  }
}
