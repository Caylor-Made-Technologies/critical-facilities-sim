/**
 * Live rounds (Phase 9d): walk the plant in the simulator, read each station's gauge, write the value down and
 * flag what is out of range. The plant has one or two hidden problems from a seeded plan. Ranges are typical
 * examples for this simulator's plant; your site's round sheets set the real limits.
 *
 * Pure apart from reading a live engine: planning and scoring are tested.
 */
import type { Action } from '../sim/actions';
import type { EngineV2 } from '../sim/v2/engine';

const F = (c: number) => (c * 9) / 5 + 32;

export interface Station {
  id: string;
  /** Equipment the round walks to (selected and flown to in the simulator). */
  at: string;
  view: 'electrical' | 'mechanical';
  label: string;
  unit: string;
  /** Gauge scale and minor tick. */
  min: number;
  max: number;
  tick: number;
  /** Typical normal range on the round sheet. */
  normal: [number, number];
  read: (e: EngineV2) => number;
  /** What an out-of-range reading means here. */
  why: string;
}

/** UPS system load: all modules of that system (UPS-A1, A2, …) against their combined rating. */
const upsLoadPct = (e: EngineV2, sys: 'A' | 'B') => {
  const mods = e.sim.graph.byKind('ups').filter((u) => new RegExp(`^UPS-${sys}\\d`).test(u.id));
  const rated = mods.reduce((a, u) => a + (u.ratedKw ?? 0), 0);
  const load = mods.reduce((a, u) => a + (e.sim.solution.loadKw.get(u.id) ?? 0), 0);
  return rated ? (100 * load) / rated : 0;
};

export const STATIONS: Station[] = [
  { id: 'chws', at: 'CH-01', view: 'mechanical', label: 'Chilled water supply temperature', unit: '°F', min: 40, max: 80, tick: 1, normal: [60, 68], read: (e) => F(e.hyd.reading.chwsC), why: 'Supply above its band means the chillers and tank are not keeping up.' },
  { id: 'cw', at: 'CT-01', view: 'mechanical', label: 'Condenser water from the towers', unit: '°F', min: 50, max: 110, tick: 1, normal: [60, 88], read: (e) => F(e.hyd.reading.cwC), why: 'Hot condenser water raises head pressure; the chillers trip if it keeps climbing.' },
  { id: 'fan', at: 'CRAH-101', view: 'mechanical', label: 'CRAH fan speed', unit: '%', min: 0, max: 100, tick: 2, normal: [35, 90], read: (e) => 100 * e.air.reading.fanSpeed, why: 'Fans pinned at 100% mean the air handlers have no margin left (units down, doors open, dirty filters).' },
  { id: 'inlet', at: 'CRAH-101', view: 'mechanical', label: 'Hottest rack top inlet (hall view)', unit: '°F', min: 60, max: 100, tick: 1, normal: [64, 80], read: (e) => F(e.air.rackHeat.hottest?.topC ?? e.air.state.temps.rackIn), why: 'Above about 80.6 °F (27 °C) is outside the ASHRAE recommended range: find the hot spot.' },
  { id: 'upsroom', at: 'CRAC-201', view: 'mechanical', label: 'UPS room temperature', unit: '°F', min: 50, max: 110, tick: 1, normal: [68, 80], read: (e) => F(e.sim.thermal.readout.upsRoomC), why: 'A hot UPS room cooks the batteries; check the room cooling.' },
  { id: 'upsa', at: 'UPS-A1', view: 'electrical', label: 'UPS A system load', unit: '%', min: 0, max: 100, tick: 2, normal: [5, 55], read: (e) => upsLoadPct(e, 'A'), why: 'On 2N each side carries about half the IT load (this plant runs each side right around 50%). Well above that, side A is carrying load it shouldn’t: is side B lost?' },
  { id: 'upsb', at: 'UPS-B1', view: 'electrical', label: 'UPS B system load', unit: '%', min: 0, max: 100, tick: 2, normal: [5, 55], read: (e) => upsLoadPct(e, 'B'), why: 'A UPS at 0% on a live site means its side is not carrying load: find out why.' },
];

export interface RoundIssue {
  id: string;
  title: string;
  actions: Action[];
  /** Stations this issue should push out of range (checked by tests). */
  shows: string[];
  /** Too big to combine with another problem (the plant would cascade): always on its own. */
  alone?: boolean;
}

export const ROUND_ISSUES: RoundIssue[] = [
  { id: 'crac', title: 'UPS room cooling unit failed', actions: [{ a: 'fail', id: 'CRAC-201' }], shows: ['upsroom'] },
  { id: 'crahs', title: 'Two air handlers down', actions: [{ a: 'fail', id: 'CRAH-103' }, { a: 'fail', id: 'CRAH-105' }], shows: ['fan'] },
  { id: 'sideb', title: 'Switchboard B lost (side B dark)', actions: [{ a: 'fail', id: 'MSB-B' }], shows: ['upsa', 'upsb'], alone: true },
];

/** Warm-up before the walk, so slow problems (a hot UPS room) have developed. */
export const ROUND_WARMUP_S = 1800;

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

/** One or two different issues for this round. */
export function planRound(seed: number): RoundIssue[] {
  const r = rng(seed);
  const left = [...ROUND_ISSUES];
  const n = r() < 0.5 ? 1 : 2;
  const out: RoundIssue[] = [];
  for (let i = 0; i < n; i++) {
    const pick = left.splice(Math.floor(r() * left.length), 1)[0]!;
    if (out.length && pick.alone) continue;
    out.push(pick);
    if (pick.alone) break;
  }
  return out;
}

/** Nearest gauge mark to a value (what a careful reader writes down). */
export const toTick = (v: number, s: Pick<Station, 'tick' | 'min' | 'max'>) => Math.min(s.max, Math.max(s.min, Math.round(v / s.tick) * s.tick));

export const outOfRange = (v: number, s: Pick<Station, 'normal'>) => v < s.normal[0] || v > s.normal[1];

export interface RoundEntry {
  value: number | null;
  flagged: boolean;
}

/**
 * Score a round (0–100): per station, the value read within one gauge mark (60%) and the right flag (40%).
 * Hand-worked: 7 stations all read right and flagged right = 100; every value right but every flag wrong = 60.
 */
export function scoreRound(stations: Station[], truth: number[], entries: RoundEntry[]): { score: number; read: number; flags: number } {
  let read = 0;
  let flags = 0;
  stations.forEach((s, i) => {
    const t = truth[i]!;
    const e = entries[i];
    // Compared with what the gauge can show (a needle at full scale reads full scale).
    const shown = Math.min(s.max, Math.max(s.min, t));
    if (e?.value !== null && e?.value !== undefined && Math.abs(e.value - shown) <= s.tick + 1e-9) read++;
    if ((e?.flagged ?? false) === outOfRange(t, s)) flags++;
  });
  const n = stations.length || 1;
  return { score: Math.round(100 * (0.6 * (read / n) + 0.4 * (flags / n))), read, flags };
}
