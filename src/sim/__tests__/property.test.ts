/**
 * Property tests (Phase 4e): seeded random switching on engine v2. For many random sequences of failures,
 * restores, breaker operations, mode changes and weather, check every 5 s of sim time that nothing is NaN or
 * out of range and no illegal state appears; then put the plant back and check the energy balance settles.
 */
import { Rng } from '../v2/rng';
import { EngineV2 } from '../v2/engine';
import type { Action } from '../actions';
import { AIR_NODES } from '../v2/airside';

const FAILABLE = ['UTIL-A', 'UTIL-B', 'CH-01', 'CH-02', 'CH-03', 'ACH-04', 'CHWP-01', 'CHWP-02', 'CHWP-03', 'CWP-01', 'CT-01', 'CT-02', 'CRAH-101', 'CRAH-102', 'CRAH-103', 'CDU-1', 'DOAS-01', 'CRAC-201', 'BESS-A', 'GEN-A1'];
const BREAKERS = ['MB-A', 'MB-B', 'TIE-AB', 'UIB-A', 'UOB-A', 'SBB-A', 'FDR-MCC-A'];
const WEATHERS = ['mild', 'winter', 'hot-dry', 'hot-humid'] as const;

function randomAction(r: Rng): Action {
  const pick = <T,>(xs: readonly T[]) => xs[Math.floor(r.next() * xs.length)]!;
  const x = r.next();
  if (x < 0.35) return { a: 'fail', id: pick(FAILABLE) };
  if (x < 0.65) return { a: 'restore', id: pick(FAILABLE) };
  if (x < 0.75) return { a: r.next() < 0.5 ? 'open' : 'close', id: pick(BREAKERS) };
  if (x < 0.8) return { a: 'weather', w: pick(WEATHERS) };
  if (x < 0.85) return { a: 'containment', mode: pick(['full', 'door-open', 'none'] as const) };
  if (x < 0.9) return { a: 'upsMode', system: pick(['A', 'B']), mode: pick(['auto', 'static-bypass'] as const) };
  if (x < 0.95) return { a: 'eco', system: pick(['A', 'B']), on: r.next() < 0.5 };
  return { a: 'ackAll' };
}

const finite = (label: string, v: number) => {
  if (!Number.isFinite(v)) throw new Error(`${label} is ${v}`);
};
const within = (label: string, v: number, lo: number, hi: number) => {
  finite(label, v);
  if (v < lo - 1e-9 || v > hi + 1e-9) throw new Error(`${label} = ${v} outside ${lo}–${hi}`);
};

/** Everything that must hold after every tick, whatever was done. */
function checkInvariants(e: EngineV2): void {
  const s = e.sim;
  for (const k of AIR_NODES) within(`air ${k}`, e.air.state.temps[k], -20, 200);
  const a = e.air.reading;
  for (const [k, v] of Object.entries({ fanKw: a.fanKw, coilKw: a.coilKw, itHeatKw: a.itHeatKw })) within(`air ${k}`, v, 0, 1e5);
  within('fan speed', a.fanSpeed, 0, 1);
  within('recirc', a.recirc, 0, 1);
  within('bypass', a.bypass, 0, 1);
  const h = e.hyd.reading;
  within('chws', h.chwsC, -5, 120);
  within('chwr', h.chwrC, -5, 120);
  within('cw', h.cwC, -5, 120);
  within('tes soc', h.tesSoc, 0, 1);
  within('flow frac', h.flowFrac, 0, 1);
  within('pump speed', h.pumpSpeed, 0, 1);
  for (const c of Object.values(h.chillers)) (within('chiller kw', c.kw, 0, 5000), within('chiller kwt', c.kwt, 0, 5000));
  for (const u of s.graph.byKind('ups')) within(`${u.id} soc`, u.state.soc ?? 0, 0, 1);
  for (const b of s.graph.byKind('bess')) within(`${b.id} soc`, b.state.soc ?? 0, 0, 1);
  for (const g of s.graph.byKind('generator')) within(`${g.id} fuel`, g.state.fuelL ?? 0, 0, 1e6);
  // Power: nothing energized without a live source; IT powered never exceeds demand.
  within('IT powered', s.solution.itPoweredKw, 0, s.solution.itDemandKw + 1e-6);
  if (s.solution.energized.size > 0 && ![...s.solution.energized].some((id) => ['utility', 'generator', 'bess', 'ups'].includes(s.graph.get(id).kind)))
    throw new Error('energized equipment with no live source');
  // Kirk keys: each key is in exactly one lock or carried, never two places.
  const seen = new Map<string, number>();
  for (const l of s.graph.nodes.keys()) for (const lock of s.interlocks.locksOn(l)) {
    const k = s.interlocks.keyIn(lock.id);
    if (k) seen.set(k.id, (seen.get(k.id) ?? 0) + 1);
  }
  for (const [k, n] of seen) if (n > 1) throw new Error(`key ${k} in ${n} locks`);
  // Alarms: valid states, list sorted by priority.
  const sum = e.alarmSummary;
  const rank = { critical: 0, high: 1, medium: 2, low: 3 };
  for (let i = 1; i < sum.list.length; i++) if (rank[sum.list[i]!.priority] < rank[sum.list[i - 1]!.priority]) throw new Error('alarm list out of order');
  const eff = e.efficiency;
  if (eff.itKw > 0) within('PUE', eff.pue, 1, 5);
}

describe('property tests: random switching (seeded)', () => {
  for (const seed of [1, 7, 42, 1234, 99999, 2026]) {
    it(`seed ${seed}: 40 random actions over 2 h, invariants hold (checked every 5 s); plant put back → balance settles ±1%`, { timeout: 180_000 }, async () => {
      const r = new Rng(seed);
      const e = new EngineV2('2N', seed);
      e.run(300);
      for (let i = 0; i < 40; i++) {
        e.apply(randomAction(r));
        // Yield to the test runner between actions (long synchronous runs starve its progress messages).
        await new Promise((res) => setTimeout(res, 0));
        const wait = 30 + Math.floor(r.next() * 150);
        for (let k = 0; k < wait; k++) {
          e.tick();
          if (k % 5 === 0 || k === wait - 1) checkInvariants(e);
        }
      }
      // Put everything back: restore, close the normal line-up, normal modes, mild day.
      for (const id of FAILABLE) e.apply({ a: 'restore', id });
      for (const id of ['UIB-A', 'SBB-A', 'UOB-A', 'MB-A', 'MB-B', 'FDR-MCC-A']) e.apply({ a: 'close', id });
      e.apply({ a: 'open', id: 'TIE-AB' });
      for (const sys of ['A', 'B']) (e.apply({ a: 'upsMode', system: sys, mode: 'auto' }), e.apply({ a: 'eco', system: sys, on: false }));
      e.apply({ a: 'containment', mode: 'full' });
      e.apply({ a: 'weather', w: 'mild' });
      e.run(2 * 3600);
      checkInvariants(e);
      // Energy balance at steady state (air side and chilled water side).
      const a = e.air.reading;
      if (a.itHeatKw > 0) expect(Math.abs(a.coilKw - (a.itHeatKw + a.fanKw)) / (a.itHeatKw + a.fanKw)).toBeLessThan(0.01);
      const h = e.hyd.reading;
      if (h.loadKwt > 0) expect(Math.abs(h.econKwt + h.chillerKwt + Math.max(0, h.tesKwt) - h.loadKwt * h.flowFrac) / h.loadKwt).toBeLessThan(0.01);
      // Same seed + same log replays to the same plant.
      const rep = EngineV2.replay('2N', seed, e.log);
      rep.run(e.t - rep.t);
      expect(rep.air.snapshot()).toEqual(e.air.snapshot());
      expect(rep.hyd.snapshot()).toEqual(e.hyd.snapshot());
    });
  }
});
