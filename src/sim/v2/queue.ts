/**
 * Timed event queue for engine v2 (Phase 4a): operator actions, failures, weather and
 * utility events, each at a sim time. Events at the same time run in the order they
 * were added (a sequence number breaks ties), so runs are deterministic.
 *
 * Plain data only (no functions), so the queue is part of a snapshot and can be saved.
 */
export interface Scheduled<E> {
  /** Sim time in seconds. */
  at: number;
  /** Insertion order, for stable ties. */
  seq: number;
  event: E;
}

export class EventQueue<E> {
  private items: Scheduled<E>[] = [];
  private seq = 0;

  /** Schedule an event. Non-finite or negative times are rejected (returns false). */
  push(at: number, event: E): boolean {
    if (!Number.isFinite(at) || at < 0) return false;
    const item = { at, seq: this.seq++, event };
    // Insert keeping (at, seq) order. Queues are small (tens of items), so a linear scan is fine.
    let i = this.items.length;
    while (i > 0 && this.items[i - 1]!.at > at) i--;
    this.items.splice(i, 0, item);
    return true;
  }

  /** Remove and return every event due at or before time t, in order. */
  popDue(t: number): Scheduled<E>[] {
    let n = 0;
    while (n < this.items.length && this.items[n]!.at <= t) n++;
    return this.items.splice(0, n);
  }

  /** Time of the next event, or Infinity. */
  peekTime(): number {
    return this.items[0]?.at ?? Infinity;
  }

  get size(): number {
    return this.items.length;
  }

  /** Drop events matching a test (e.g. cancel a pending retransfer). Returns how many. */
  cancel(match: (e: E) => boolean): number {
    const before = this.items.length;
    this.items = this.items.filter((s) => !match(s.event));
    return before - this.items.length;
  }

  snapshot(): { items: Scheduled<E>[]; seq: number } {
    return { items: this.items.map((s) => ({ ...s })), seq: this.seq };
  }

  restore(s: { items: Scheduled<E>[]; seq: number }): void {
    this.items = s.items.map((x) => ({ ...x })).sort((a, b) => a.at - b.at || a.seq - b.seq);
    this.seq = s.seq;
  }
}
