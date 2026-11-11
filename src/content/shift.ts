/**
 * Shift mode (Phase 8d): an 8-hour shift in about 15 minutes. A seeded plan picks a few events from a pool
 * and spreads them across the shift; the operator acknowledges, gets fixes done and returns equipment to
 * service; at the end they write a hand-off. Generic training content, not a site's shift procedure.
 *
 * Pure: planning and scoring are plain functions (tested); the Simulator's ShiftCoach drives them.
 */
import type { Action } from '../sim/actions';

export const SHIFT = {
  /** Shift length (sim seconds) and how fast it runs (8 h at 32× ≈ 15 min). */
  lengthS: 8 * 3600,
  speed: 32,
  /** Clock shown at the start of the shift (hours, 24 h). */
  startHour: 7,
  events: 5,
  /** Acknowledge within this long after the alarm comes in for full marks (sim seconds). */
  ackWithinS: 15 * 60,
  /** Fix within this long after the fix is ready (or after the event, for operator fixes). */
  fixWithinS: 30 * 60,
  points: { ack: 5, fix: 5, noRacksDown: 20, handoff: 30 },
} as const;

export type ShiftFix =
  /** A technician repairs it; once ready, the operator returns it to service (Restore). */
  | { kind: 'restore'; id: string; readyAfterS: number }
  /** The operator fixes it themselves (e.g. closes the containment door). */
  | { kind: 'operator'; check: 'containment-shut' | 'blanking-in'; how: string }
  /** Nothing to fix on site: log it and hand it off. */
  | { kind: 'log' };

export interface ShiftEventDef {
  id: string;
  /** Hand-off checklist wording. */
  title: string;
  action: Action;
  /** Alarm id that announces it (none for events found on rounds). */
  alarm?: string;
  /** How it shows up when there is no alarm (written to the event log). */
  cue?: string;
  fix: ShiftFix;
}

/** The pool a shift draws from. Tags are generic. */
export const SHIFT_POOL: ShiftEventDef[] = [
  { id: 'crah', title: 'CRAH-103 failed (fan motor)', action: { a: 'fail', id: 'CRAH-103' }, alarm: 'CRAH-103.FAIL', fix: { kind: 'restore', id: 'CRAH-103', readyAfterS: 45 * 60 } },
  { id: 'pump', title: 'Chilled water pump CHWP-01 failed', action: { a: 'fail', id: 'CHWP-01' }, alarm: 'CHWP-01.FAIL', fix: { kind: 'restore', id: 'CHWP-01', readyAfterS: 60 * 60 } },
  { id: 'chiller', title: 'Chiller CH-02 tripped', action: { a: 'fail', id: 'CH-02' }, alarm: 'CH-02.TRIP', fix: { kind: 'restore', id: 'CH-02', readyAfterS: 30 * 60 } },
  { id: 'sag', title: 'Voltage sag on utility A (2 s to 80%)', action: { a: 'utilityEvent', id: 'UTIL-A', kind: 'sag', pct: 80, s: 2 }, alarm: 'UTIL-A.PQ', fix: { kind: 'log' } },
  { id: 'imbalance', title: 'Voltage imbalance on utility B (3%)', action: { a: 'utilityEvent', id: 'UTIL-B', kind: 'imbalance', pct: 3, s: 600 }, alarm: 'UTIL-B.IMB', fix: { kind: 'log' } },
  { id: 'door', title: 'Containment door propped open', action: { a: 'containment', mode: 'door-open' }, alarm: 'HALL.DOOR', fix: { kind: 'operator', check: 'containment-shut', how: 'Close it: Simulator → Air path → Containment → Full.' } },
  {
    id: 'blanking',
    title: 'Blanking panels missing after an install',
    action: { a: 'blanking', missing: 0.25 },
    cue: 'Rounds: blanking panels missing in several racks after last night’s install (hot spots likely).',
    fix: { kind: 'operator', check: 'blanking-in', how: 'Put them back: Simulator → Air path → Blanking panels → All in.' },
  },
  { id: 'tower', title: 'Cooling tower CT-02 fan tripped', action: { a: 'fail', id: 'CT-02' }, alarm: 'CT-02.FAIL', fix: { kind: 'restore', id: 'CT-02', readyAfterS: 40 * 60 } },
];

export interface PlannedEvent {
  def: ShiftEventDef;
  at: number;
}

/** Small seeded generator (mulberry32), so a shift can be replayed from its seed. */
function rng(seed: number) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Pick `SHIFT.events` different events and spread them over the shift: one in each equal window, at a
 * random point in the middle 70% of it (none in the first 20 min, none in the last hour, so there is
 * time to respond before hand-off).
 */
export function planShift(seed: number, pool: ShiftEventDef[] = SHIFT_POOL): PlannedEvent[] {
  const r = rng(seed);
  const left = [...pool];
  const n = Math.min(SHIFT.events, left.length);
  const usable = SHIFT.lengthS - 3600 - 1200;
  const win = usable / n;
  const out: PlannedEvent[] = [];
  for (let i = 0; i < n; i++) {
    const def = left.splice(Math.floor(r() * left.length), 1)[0]!;
    const at = Math.round(1200 + i * win + win * (0.15 + 0.7 * r()));
    out.push({ def, at });
  }
  return out;
}

/** Clock text for a time into the shift (07:00 start). */
export function shiftClock(t: number): string {
  const m = Math.floor(t / 60) + SHIFT.startHour * 60;
  return `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/** What the coach recorded during the shift, per event. Times are sim seconds; null = didn't happen. */
export interface EventRecord {
  /** The event fired (at or before hand-off). */
  happened: boolean;
  alarmAt: number | null;
  ackAt: number | null;
  /** When the fix became possible (tech ready, or the event itself for operator fixes). */
  fixReadyAt: number | null;
  fixedAt: number | null;
}

export interface Handoff {
  /** Pool ids the operator ticked as "happened this shift". */
  happened: string[];
  /** Pool ids the operator ticked as "still open at hand-off". */
  open: string[];
}

export interface ShiftScore {
  score: number;
  lines: { text: string; pts: number; max: number }[];
}

/**
 * Score a finished shift (0–100).
 * Per event that happened: acknowledged within 15 min (5) and fixed within 30 min of the fix being ready (5);
 * log-only events earn their fix points by being in the hand-off. No racks down (20). Hand-off (30): every pool
 * item ticked correctly in both lists ("happened", "still open") counts equally.
 * Hand-worked: 5 events all acked and fixed in time = 50, no racks down = 20, a perfect hand-off = 30 → 100.
 */
export function scoreShift(plan: PlannedEvent[], rec: Record<string, EventRecord>, stillOpen: string[], racksDown: number, h: Handoff, pool: ShiftEventDef[] = SHIFT_POOL): ShiftScore {
  const P = SHIFT.points;
  const lines: ShiftScore['lines'] = [];
  const happened = plan.filter((p) => rec[p.def.id]?.happened);
  for (const { def } of happened) {
    const r = rec[def.id]!;
    if (def.alarm) {
      const ok = r.alarmAt !== null && r.ackAt !== null && r.ackAt - r.alarmAt <= SHIFT.ackWithinS;
      lines.push({ text: `${def.title}: alarm acknowledged within 15 min`, pts: ok ? P.ack : 0, max: P.ack });
    } else lines.push({ text: `${def.title}: found on rounds`, pts: P.ack, max: P.ack });
    if (def.fix.kind === 'log') {
      const ok = h.happened.includes(def.id);
      lines.push({ text: `${def.title}: logged in the hand-off`, pts: ok ? P.fix : 0, max: P.fix });
    } else {
      const ok = r.fixReadyAt !== null && r.fixedAt !== null && r.fixedAt - r.fixReadyAt <= SHIFT.fixWithinS;
      lines.push({ text: `${def.title}: ${def.fix.kind === 'restore' ? 'returned to service' : 'fixed'} within 30 min`, pts: ok ? P.fix : 0, max: P.fix });
    }
  }
  lines.push({ text: racksDown ? `${racksDown} rack${racksDown > 1 ? 's' : ''} went down` : 'No racks went down', pts: racksDown ? 0 : P.noRacksDown, max: P.noRacksDown });
  const truth = new Set(happened.map((p) => p.def.id));
  const open = new Set(stillOpen);
  let right = 0;
  for (const d of pool) {
    if (h.happened.includes(d.id) === truth.has(d.id)) right++;
    if (h.open.includes(d.id) === open.has(d.id)) right++;
  }
  const hand = Math.round((P.handoff * right) / (pool.length * 2));
  lines.push({ text: `Hand-off: ${right} of ${pool.length * 2} items right`, pts: hand, max: P.handoff });
  // Scale the event part so a shift ended early (fewer events) is still out of 100.
  const evMax = lines.slice(0, -2).reduce((s, l) => s + l.max, 0);
  const evPts = lines.slice(0, -2).reduce((s, l) => s + l.pts, 0);
  const evScaled = evMax ? (evPts / evMax) * (P.ack + P.fix) * SHIFT.events : (P.ack + P.fix) * SHIFT.events;
  const score = Math.round(evScaled + lines.at(-2)!.pts + hand);
  return { score: Math.max(0, Math.min(100, score)), lines };
}
