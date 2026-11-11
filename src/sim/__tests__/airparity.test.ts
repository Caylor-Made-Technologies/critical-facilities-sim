/**
 * Phase 4c part 1 parity: rack-inlet trips from the v2 air side vs. v1 thermal.
 *
 * Scoring contract: every drill (the content where cooling failures and trips happen) must score the
 * same when v2 owns the trip. MOPs and the IST need real operator actions; e2e:v2 plays them on v2.
 * Canonical cases: trip / no-trip must agree, except the divergences recorded in docs/ENGINE.md
 * (asserted here so a change in either model shows up).
 */
import { DRILLS } from '../../content/procedures';
import { choose, confirmStep, evaluate, procedureSim, startRun, type ProcRun } from '../procedure';
import { Simulation } from '../engine';
import { buildPlant } from '../plant/builder';
import { EngineV2 } from '../v2/engine';

type P = (typeof DRILLS)[number];
const INLET_TRIP = 'thermal shutdown (inlet';

/** Same harness as v2engine.test.ts: answer right, 45 s per step while reading, up to 8 × 300 s for a check. */
function score(p: P, mode: 'v1' | 'v2trips') {
  const eng = mode === 'v1' ? null : new EngineV2(p.topology);
  const sim = eng ? eng.sim : procedureSim(p);
  if (eng) {
    if (p.weather) {
      eng.apply({ a: 'weather', w: p.weather });
      eng.run(600);
    }
    p.setup?.(sim);
  }
  const pass = (s: number) => (eng ? eng.run(s) : sim.advance(s));
  let run: ProcRun = startRun(p, sim);
  for (let guard = 0; !run.done && guard < 60; guard++) {
    const i = run.step;
    const st = p.steps[i]!;
    pass(45);
    run = evaluate(p, run, sim);
    if (run.step !== i) continue;
    if (st.confirm) run = confirmStep(p, run, sim);
    else if (st.choices) run = choose(p, run, sim, st.choices.findIndex((c) => c.correct));
    else {
      if (p.id === 'drill-towers' && i === 3) (sim.restore('CH-01'), sim.restore('CH-02'));
      for (let k = 0; k < 8 && run.step === i; k++) (pass(300), (run = evaluate(p, run, sim)));
    }
  }
  const tripped = sim.events.some((e) => e.message.includes(INLET_TRIP));
  return { done: run.done, score: run.score, down: sim.itDownRacks().length, tripped };
}

describe('air-side parity: every drill scores the same with v2 rack-inlet trips', () => {
  for (const p of DRILLS.filter((x) => !x.scenario)) {
    it(`${p.id}: ${p.title}`, { timeout: 120_000 }, () => {
      const v1 = score(p, 'v1');
      const v2 = score(p, 'v2trips');
      expect(v1.done).toBe(true);
      expect(v2).toEqual(v1);
    });
  }
});

/** The same failure on the bare v1 plant and on engine v2: first inlet trip time on each. */
function canonical(ids: string[], seconds: number) {
  const v1 = new Simulation(buildPlant('2N'));
  v1.advance(300);
  for (const id of ids) v1.fail(id);
  v1.advance(seconds);
  const v1Trip = v1.events.find((x) => x.message.includes(INLET_TRIP));
  const e = new EngineV2('2N');
  e.run(300);
  const t0 = e.t;
  for (const id of ids) e.apply({ a: 'fail', id });
  e.run(seconds);
  return { v1: v1Trip ? v1Trip.t - 300 : null, v2: e.air.state.tripAt === null ? null : e.air.state.tripAt - t0, e };
}

describe('air-side parity: canonical trip cases (bare v1 plant vs engine v2)', () => {
  it('N+2: two of eight CRAHs lost → neither trips', () => {
    const r = canonical(['CRAH-101', 'CRAH-102'], 3600);
    expect(r).toMatchObject({ v1: null, v2: null });
  });
  it('all chilled water pumps lost → both trip; v2 sooner (supply air jumps to return temperature)', () => {
    const r = canonical(['CHWP-01', 'CHWP-02', 'CHWP-03'], 1800);
    expect(r.v1).not.toBeNull();
    expect(r.v2).not.toBeNull();
    expect(r.v2!).toBeLessThanOrEqual(r.v1!);
    expect(r.v2!).toBeGreaterThan(0.4 * r.v1!);
  });
  it('every CRAH lost → both trip; v2 sooner', () => {
    const r = canonical([1, 2, 3, 4, 5, 6, 7, 8].map((i) => `CRAH-10${i}`), 1800);
    expect(r.v1).not.toBeNull();
    expect(r.v2).not.toBeNull();
    expect(r.v2!).toBeLessThanOrEqual(r.v1!);
    expect(r.v2!).toBeGreaterThan(0.4 * r.v1!);
  });
  it('one chiller lost (others pick up) → neither trips', () => {
    const r = canonical(['CH-01'], 3600);
    expect(r).toMatchObject({ v1: null, v2: null });
  });
  it('recorded divergence: three of eight CRAHs lost → v1 runs away and trips; v2 settles above recommended, below the trip', () => {
    const r = canonical(['CRAH-101', 'CRAH-102', 'CRAH-103'], 4200);
    expect(r.v1).not.toBeNull();
    expect(r.v2).toBeNull();
    const inlet = r.e.air.state.temps.rackIn;
    expect(inlet).toBeGreaterThan(24.5);
    expect(inlet).toBeLessThan(32);
  });
  it('engine v2 owns hall trips (switched 2026-11-08; v1 shadow mode retired 2026-11-09)', () => {
    expect(new EngineV2('2N').sim.thermal.hallTripExternal).toBe(true);
  });
});
