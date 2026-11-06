/**
 * Seeded random numbers for engine v2 (Phase 4a). Every random choice in the engine goes
 * through one Rng, so the same seed + the same event log gives the same result (replay).
 *
 * Algorithm: mulberry32 (32-bit state, public-domain, standard small PRNG). Not for security.
 * The state is a plain number, so it is saved in snapshots and restored exactly.
 */
export class Rng {
  private s: number;

  constructor(seed: number) {
    this.s = Rng.normalize(seed);
  }

  /** Any finite number → a 32-bit unsigned seed (NaN/Infinity → a fixed default). */
  static normalize(seed: number): number {
    return Number.isFinite(seed) ? Math.floor(seed) >>> 0 : 0x9e3779b9;
  }

  /** Next float in [0, 1). */
  next(): number {
    let t = (this.s = (this.s + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Integer in [0, n). n ≤ 0 → 0. */
  int(n: number): number {
    return n > 0 ? Math.floor(this.next() * Math.floor(n)) : 0;
  }

  /** True with probability p (clamped 0–1). */
  chance(p: number): boolean {
    return this.next() < Math.min(1, Math.max(0, p));
  }

  /** Pick one item; undefined for an empty list. */
  pick<T>(items: readonly T[]): T | undefined {
    return items.length ? items[this.int(items.length)] : undefined;
  }

  /** Current state, for snapshots. */
  get state(): number {
    return this.s;
  }

  set state(v: number) {
    this.s = Rng.normalize(v);
  }
}
