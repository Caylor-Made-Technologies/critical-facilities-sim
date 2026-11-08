import { DRILLS } from '../../content/procedures';
import { Simulation } from '../engine';
import { buildPlant } from '../plant/builder';
import { choose, confirmStep, evaluate, procedureSim, startRun, type ProcRun } from '../procedure';
import { EngineV2, MAX_TICKS_PER_CALL, type EngineSnapshot } from '../v2/engine';

/** A utility-loss story: A side fails at 30 s, comes back at 400 s, gens retransfer after the timer. */
function story(e: EngineV2) {
  e.schedule(30, { a: 'fail', id: 'UTIL-A' });
  e.schedule(400, { a: 'restore', id: 'UTIL-A' });
  e.run(120);
  e.apply({ a: 'open', id: 'TIE-AB' }); // blocked or not, it's logged
  e.run(900);
}
const plain = (s: EngineSnapshot) => JSON.parse(JSON.stringify(s.sim));

describe('engine v2 core', () => {
  it('parity: v2 ticks give the same plant as v1 advance() for the same actions', () => {
    const v1 = new Simulation(buildPlant('2N'));
    v1.advance(30);
    v1.fail('UTIL-A');
    v1.advance(370);
    v1.restore('UTIL-A');
    v1.advance(620);
    const v2 = new EngineV2('2N');
    // Clock/queue check against pure v1 physics: v1 keeps the hall inlet (v2 air side in shadow).
    v2.air.setTripSource(v2.sim, 'v1');
    v2.schedule(30, { a: 'fail', id: 'UTIL-A' });
    v2.schedule(400, { a: 'restore', id: 'UTIL-A' });
    v2.run(1020);
    expect(v2.t).toBe(1020);
    expect(plain(v2.snapshot())).toEqual(JSON.parse(JSON.stringify(v1.snapshot())));
    // The story actually happened: generators carried A, then ATS went back to normal.
    expect(v2.sim.events.some((e) => /transferred to generator/.test(e.message))).toBe(true);
    expect(v2.sim.graph.get('ATS-A').state.selected).toBe('normal');
  });

  it('replay: same topology + seed + action log → identical plant', () => {
    const a = new EngineV2('2N', 7);
    story(a);
    const b = EngineV2.replay('2N', 7, a.log);
    b.run(a.t - b.t);
    expect(b.t).toBe(a.t);
    expect(plain(b.snapshot())).toEqual(plain(a.snapshot()));
  });

  it('snapshot → JSON → restore mid-run, then continue, matches the uninterrupted run', () => {
    const a = new EngineV2('2N+1', 3);
    a.schedule(50, { a: 'fail', id: 'UTIL-B' });
    a.run(200);
    const saved = JSON.parse(JSON.stringify(a.snapshot())) as EngineSnapshot;
    a.schedule(600, { a: 'restore', id: 'UTIL-B' });
    a.run(900);
    const b = EngineV2.fromSnapshot(saved);
    b.schedule(600, { a: 'restore', id: 'UTIL-B' });
    b.run(900);
    expect(plain(b.snapshot())).toEqual(plain(a.snapshot()));
    expect(b.rng.state).toBe(a.rng.state);
  });

  it('a copy is independent (wrong answers on a copy never touch the real plant)', () => {
    const a = new EngineV2('2N');
    a.run(10);
    const before = plain(a.snapshot());
    const c = a.copy();
    c.apply({ a: 'epo' });
    c.run(60);
    expect(c.sim.itDownRacks().length).toBeGreaterThan(0);
    expect(plain(a.snapshot())).toEqual(before);
  });

  it('fixed timestep from real time: 0.12 s frames at 60× → 7.2 s each, whole ticks only, leftover carried', () => {
    const e = new EngineV2('N');
    let alpha = 0;
    for (let i = 0; i < 10; i++) alpha = e.advanceReal(0.12, 60);
    // 10 × 7.2 = 72 s exactly; ticks run = 72, leftover 0 (floating error well under a tick)
    expect(e.t).toBe(72);
    expect(alpha).toBeGreaterThanOrEqual(0);
    expect(alpha).toBeLessThan(1e-6);
    e.advanceReal(0.5, 1); // half a tick: no tick yet
    expect(e.t).toBe(72);
    expect(e.advanceReal(0.25, 1)).toBeCloseTo(0.75);
    e.advanceReal(0.25, 1); // now a whole tick
    expect(e.t).toBe(73);
  });

  it('frame timing does not change the result (the v1 UI loop did)', () => {
    const a = new EngineV2('2N'), b = new EngineV2('2N');
    for (const e of [a, b]) e.schedule(5, { a: 'fail', id: 'UTIL-A' });
    for (let i = 0; i < 300; i++) a.advanceReal(0.1, 10); // 300 s in 0.1 s frames
    for (let i = 0; i < 37; i++) b.advanceReal(0.81, 10); // 299.7 s in uneven frames
    b.advanceReal(0.03, 10);
    expect(b.t).toBe(a.t);
    expect(plain(b.snapshot())).toEqual(plain(a.snapshot()));
  });

  it('bad input never breaks the clock: NaN, negative, huge backlog', () => {
    const e = new EngineV2('N');
    e.advanceReal(NaN);
    e.advanceReal(-5);
    e.run(NaN);
    expect(e.t).toBe(0);
    e.advanceReal(1e9, 1);
    expect(e.t).toBe(MAX_TICKS_PER_CALL); // capped, backlog dropped
    expect(e.schedule(-1, { a: 'epo' })).toBe(false);
    expect(e.apply({ a: 'skip', s: NaN }).ok).toBe(false);
    expect(e.apply({ a: 'fail', id: 'NOPE' }).ok).toBe(false); // unknown id: refused, not a crash
  });

  it('blocked actions are logged with ok: false', () => {
    const e = new EngineV2('2N');
    const r = e.apply({ a: 'close', id: 'TIE-AB' }); // Kirk-key interlock: key not in its lock
    expect(r.ok).toBe(false);
    expect(e.log.at(-1)).toMatchObject({ ok: false, action: { a: 'close', id: 'TIE-AB' } });
  });
});

describe('engine v2 parity: every drill scores the same on v1 and v2', () => {
  // Same harness as procedures.test.ts: answer right, let 45 s pass per step while reading.
  function score(p: (typeof DRILLS)[number], useV2: boolean) {
    const eng = useV2 ? new EngineV2(p.topology) : null;
    const sim = useV2 ? eng!.sim : procedureSim(p);
    if (useV2) {
      if (p.weather) {
        eng!.apply({ a: 'weather', w: p.weather });
        eng!.run(600);
      }
      p.setup?.(sim);
    }
    const pass = (s: number) => (useV2 ? eng!.run(s) : sim.advance(s));
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
    return { done: run.done, score: run.score, t: sim.t, down: sim.itDownRacks().length };
  }
  for (const p of DRILLS) {
    it(p.title, () => {
      const v1 = score(p, false);
      const v2 = score(p, true);
      expect(v1.done).toBe(true);
      expect(v2).toEqual(v1);
    });
  }
});
