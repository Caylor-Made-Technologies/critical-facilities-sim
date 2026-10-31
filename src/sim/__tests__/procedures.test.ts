import { DRILLS, MOPS, PROCEDURES } from '../../content/procedures';
import { loadFraction } from '../power';
import { choose, confirmStep, evaluate, procedureSim, SCORE, startRun, takeHint, type Procedure, type ProcRun } from '../procedure';
import type { Simulation } from '../engine';

const byId = (id: string) => PROCEDURES.find((p) => p.id === id)!;

/** Walk a procedure: confirm hold points, pick the right answers, run the operator actions given per step. */
function play(p: Procedure, actions: Record<number, (s: Simulation) => void> = {}) {
  const sim = procedureSim(p);
  let run: ProcRun = startRun(p, sim);
  let guard = 0;
  while (!run.done && guard++ < 50) {
    const i = run.step;
    const s = p.steps[i]!;
    if (s.confirm) run = confirmStep(p, run, sim);
    else if (s.choices) run = choose(p, run, sim, s.choices.findIndex((c) => c.correct));
    else {
      actions[i]?.(sim);
      if (p.run) sim.advance(10);
      run = evaluate(p, run, sim);
      if (run.step === i && p.run) {
        sim.advance(400);
        run = evaluate(p, run, sim);
      }
    }
    expect(run.step > i || run.done, `${p.id} stuck at step ${i + 1}`).toBe(true);
  }
  return { sim, run };
}

describe('procedures content', () => {
  it('every step finishes in exactly one way and has a reason', () => {
    for (const p of PROCEDURES) {
      for (const s of p.steps) {
        const ways = [s.check, s.confirm, s.choices].filter(Boolean).length;
        expect(ways, `${p.id}: ${s.title}`).toBe(1);
        expect(s.why.length).toBeGreaterThan(10);
        if (s.choices) expect(s.choices.filter((c) => c.correct)).toHaveLength(1);
      }
    }
    expect(new Set(PROCEDURES.map((p) => p.id)).size).toBe(PROCEDURES.length);
  });
});

describe('MOP practice', () => {
  it('UPS maintenance bypass, done right: full score, no racks down', () => {
    const { sim, run } = play(byId('mop-ups-bypass'), {
      2: (s) => s.setUpsSystemMode('A', 'static-bypass'),
      3: (s) => s.removeKey('L-SKRU-A'),
      4: (s) => s.insertKey('K-MBP-A', 'L-MBB-A'),
      5: (s) => s.closeBreaker('MBB-A'),
      6: (s) => s.openBreaker('UOB-A'),
      7: (s) => (s.openBreaker('UIB-A'), s.openBreaker('SBB-A')),
    });
    expect(run.done).toBe(true);
    expect(run.score).toBe(SCORE.start);
    expect(sim.droppedRacks()).toEqual([]);
  });

  it('opening the UPS output before closing the bypass drops the load and costs points', () => {
    const p = byId('mop-ups-bypass');
    const sim = procedureSim(p);
    let run = startRun(p, sim);
    sim.openBreaker('UOB-A');
    run = evaluate(p, run, sim);
    expect(run.score).toBe(SCORE.start - SCORE.dropped);
    expect(run.mistakes[0]).toMatch(/Dropped load/);
  });

  it('a blocked action and a hint each cost points', () => {
    const p = byId('mop-ups-bypass');
    const sim = procedureSim(p);
    let run = startRun(p, sim);
    sim.closeBreaker('MBB-A'); // locked open: no key
    run = takeHint(evaluate(p, run, sim));
    run = takeHint(run); // second look at the same hint is free
    expect(run.score).toBe(SCORE.start - SCORE.blocked - SCORE.hint);
  });

  it('return from maintenance bypass, done right', () => {
    const { sim, run } = play(byId('mop-ups-return'), {
      1: (s) => (s.closeBreaker('UIB-A'), s.closeBreaker('SBB-A')),
      3: (s) => s.closeBreaker('UOB-A'),
      4: (s) => s.openBreaker('MBB-A'),
      5: (s) => (s.removeKey('L-MBB-A'), s.insertKey('K-MBP-A', 'L-SKRU-A')),
      6: (s) => s.setUpsSystemMode('A', 'auto'),
    });
    expect(run.done).toBe(true);
    expect(run.score).toBe(SCORE.start);
    expect(sim.droppedRacks()).toEqual([]);
  });

  it('main-tie-main transfer, done right, and side B carries both boards', () => {
    const { sim, run } = play(byId('mop-mtm'), {
      2: (s) => s.openBreaker('MB-A'),
      3: (s) => (s.removeKey('L-MB-A'), s.insertKey('K-MTM-1', 'L-TIE-AB')),
      4: (s) => s.closeBreaker('TIE-AB'),
    });
    expect(run.done).toBe(true);
    expect(run.score).toBe(SCORE.start);
    expect(sim.droppedRacks()).toEqual([]);
    expect(loadFraction(sim.graph, sim.solution, 'MB-B')).toBeLessThan(1);
  });
});

describe('drills', () => {
  for (const p of DRILLS) {
    it(`${p.title}: right calls finish with full score and no racks down`, () => {
      const { sim, run } = play(p);
      expect(run.done).toBe(true);
      expect(run.score).toBe(SCORE.start);
      expect(sim.droppedRacks()).toEqual([]);
    });
  }

  it('a wrong answer costs points once and keeps you on the step', () => {
    const p = DRILLS[0]!;
    const sim = procedureSim(p);
    let run = startRun(p, sim);
    const wrong = p.steps[0]!.choices!.findIndex((c) => !c.correct);
    run = choose(p, run, sim, wrong);
    run = choose(p, run, sim, wrong);
    expect(run.step).toBe(0);
    expect(run.score).toBe(SCORE.start - SCORE.wrongChoice);
  });
  it('MOPs exist', () => expect(MOPS.length).toBeGreaterThanOrEqual(3));
});
