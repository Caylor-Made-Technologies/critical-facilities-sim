/**
 * Phase 4c part 2 parity: v2 hydronics vs. v1 thermal on the scoring-relevant outputs
 * (chiller modes, TES discharge), then scoring with v2 owning chilled water.
 */
import { DRILLS } from '../../content/procedures';
import { choose, confirmStep, evaluate, procedureSim, startRun, type ProcRun } from '../procedure';
import { EngineV2 } from '../v2/engine';

type P = (typeof DRILLS)[number];

interface Agreement {
  ticks: number;
  modeMiss: number;
  dischargeMiss: number;
  maxSocDiff: number;
}

/** Drill harness (same as v2engine/airparity); `watch` runs after every tick when given. */
function play(p: P, mode: 'v1' | 'v2', watch?: (e: EngineV2) => void, chw: 'v1' | 'v2' = 'v2') {
  const eng = mode === 'v1' ? null : new EngineV2(p.topology);
  eng?.hyd.setChwSource(chw);
  const sim = eng ? eng.sim : procedureSim(p);
  if (eng) {
    if (p.weather) {
      eng.apply({ a: 'weather', w: p.weather });
      eng.run(600);
    }
    p.setup?.(sim);
  }
  const pass = (s: number) => {
    if (!eng) return sim.advance(s);
    for (let i = 0; i < s; i++) {
      eng.tick();
      watch?.(eng);
    }
  };
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
      // Restore the way the UI does (straight on the plant, not through EngineV2.apply).
      if (p.id === 'drill-towers' && i === 3) (sim.restore('CH-01'), sim.restore('CH-02'));
      for (let k = 0; k < 8 && run.step === i; k++) (pass(300), (run = evaluate(p, run, sim)));
    }
  }
  return { eng, result: { done: run.done, score: run.score, down: sim.itDownRacks().length } };
}

/** Shadow run: v1 owns chilled water; count ticks where v2 disagrees. */
function shadow(p: P): Agreement {
  const a: Agreement = { ticks: 0, modeMiss: 0, dischargeMiss: 0, maxSocDiff: 0 };
  play(p, 'v2', (e) => {
    const v1 = e.sim.thermal.readout;
    const h = e.hyd.reading;
    a.ticks++;
    const mismatch = Object.entries(h.chillers).some(([id, c]) => (c.mode === 'tripped' ? 'off' : c.mode) !== v1.chillers[id]);
    if (mismatch) a.modeMiss++;
    if (v1.tesDischargeKwt > 1 !== h.tesKwt > 1) a.dischargeMiss++;
    a.maxSocDiff = Math.max(a.maxSocDiff, Math.abs(v1.tesSoc - h.tesSoc));
  }, 'v1');
  return a;
}

const TOLERANCE: Record<string, { mode: number; discharge: number }> = { 'drill-towers': { mode: 0.4, discharge: 0.1 } };

describe('hydronic parity (shadow): chiller modes and TES discharge match v1 through every drill', () => {
  for (const p of DRILLS) {
    it(`${p.id}`, { timeout: 120_000 }, () => {
      const a = shadow(p);
      // Allowed: a few ticks around a change. drill-towers is a recorded difference (ENGINE.md): v1's
      // condenser jumps to its new temperature and trips at once, v2's condenser loop lags; and v2 keeps a
      // chiller on for its 10-minute minimum run time where v1 stages it straight off. Scoring is identical.
      const tol = TOLERANCE[p.id] ?? { mode: 0.01, discharge: 0.01 };
      expect(a.modeMiss / a.ticks, JSON.stringify(a)).toBeLessThan(tol.mode);
      expect(a.dischargeMiss / a.ticks, JSON.stringify(a)).toBeLessThan(tol.discharge);
      expect(a.maxSocDiff, JSON.stringify(a)).toBeLessThan(0.05);
    });
  }
});

describe('hydronic parity: every drill scores the same with v2 owning chilled water (default)', () => {
  for (const p of DRILLS) {
    it(`${p.id}`, { timeout: 120_000 }, () => {
      const v1 = play(p, 'v1').result;
      const { eng, result } = play(p, 'v2');
      expect(eng!.hyd.state.chwSource).toBe('v2');
      expect(v1.done).toBe(true);
      expect(result).toEqual(v1);
    });
  }
});

/** The browser path: the procedure prepares a v1 plant (weather, settle, setup), then v2 wraps it. */
function playWrapped(p: P) {
  const sim = procedureSim(p);
  const eng = EngineV2.wrap(sim);
  let run: ProcRun = startRun(p, sim);
  for (let guard = 0; !run.done && guard < 60; guard++) {
    const i = run.step;
    const st = p.steps[i]!;
    eng.run(45);
    run = evaluate(p, run, sim);
    if (run.step !== i) continue;
    if (st.confirm) run = confirmStep(p, run, sim);
    else if (st.choices) run = choose(p, run, sim, st.choices.findIndex((c) => c.correct));
    else {
      if (p.id === 'drill-towers' && i === 3) (sim.restore('CH-01'), sim.restore('CH-02'));
      for (let k = 0; k < 8 && run.step === i; k++) (eng.run(300), (run = evaluate(p, run, sim)));
    }
  }
  return { done: run.done, score: run.score, down: sim.itDownRacks().length };
}

describe('engine v2 parity on the browser path (prepared plant, then EngineV2.wrap)', () => {
  for (const p of DRILLS) {
    it(`${p.id}`, { timeout: 120_000 }, () => {
      expect(playWrapped(p)).toEqual(play(p, 'v1').result);
    });
  }
});
