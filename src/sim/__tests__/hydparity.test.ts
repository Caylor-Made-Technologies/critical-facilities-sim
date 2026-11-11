/**
 * Phase 4c part 2 parity: every drill scores the same on the bare v1 plant and on engine v2 (which owns
 * chilled water), both when v2 builds the plant and on the browser path. The tick-by-tick shadow
 * comparison that gated the switch (modes/TES agreed > 99% on 7 of 8 drills) was retired with the v1
 * shadow mode on 2026-11-09; its results are in docs/ENGINE.md.
 */
import { DRILLS } from '../../content/procedures';
import { choose, confirmStep, evaluate, procedureSim, startRun, type ProcRun } from '../procedure';
import { EngineV2 } from '../v2/engine';

type P = (typeof DRILLS)[number];

/** Drill harness (same as v2engine/airparity); `watch` runs after every tick when given. */
function play(p: P, mode: 'v1' | 'v2', watch?: (e: EngineV2) => void) {
  const eng = mode === 'v1' ? null : new EngineV2(p.topology);
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

describe('hydronic parity: every drill scores the same with v2 owning chilled water (default)', () => {
  for (const p of DRILLS.filter((x) => !x.scenario)) {
    it(`${p.id}`, { timeout: 120_000 }, () => {
      const v1 = play(p, 'v1').result;
      const { eng, result } = play(p, 'v2');
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
  for (const p of DRILLS.filter((x) => !x.scenario)) {
    it(`${p.id}`, { timeout: 120_000 }, () => {
      expect(playWrapped(p)).toEqual(play(p, 'v1').result);
    });
  }
});
