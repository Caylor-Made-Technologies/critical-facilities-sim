import { DRILLS, MOPS, PROCEDURES } from '../../content/procedures';
import { loadFraction } from '../power';
import { choose, confirmStep, evaluate, procedureSim, SCORE, startRun, takeHint, type Procedure, type ProcRun } from '../procedure';
import type { Simulation } from '../engine';

const byId = (id: string) => PROCEDURES.find((p) => p.id === id)!;

/** Walk a procedure: confirm hold points, pick the right answers, run the operator actions given per step. */
function play(p: Procedure, actions: Record<number, (s: Simulation) => void> = {}, readS = 0) {
  const sim = procedureSim(p);
  let run: ProcRun = startRun(p, sim);
  let guard = 0;
  while (!run.done && guard++ < 50) {
    const i = run.step;
    const s = p.steps[i]!;
    // Drills keep the clock running while a person reads the step.
    if (p.run && readS > 0) {
      sim.advance(readS);
      run = evaluate(p, run, sim);
      if (run.step !== i) continue;
    }
    if (s.confirm) run = confirmStep(p, run, sim);
    else if (s.choices) run = choose(p, run, sim, s.choices.findIndex((c) => c.correct));
    else {
      actions[i]?.(sim);
      if (p.run) sim.advance(10);
      run = evaluate(p, run, sim);
      for (let k = 0; k < 6 && run.step === i && p.run; k++) {
        sim.advance(300);
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

describe('new MOPs', () => {
  const cases: Record<string, Record<number, (s: Simulation) => void>> = {
    'mop-gen-test': { 2: (s) => s.testGenerator('GEN-A1', true), 4: (s) => s.testGenerator('GEN-A1', false) },
    'mop-tie-return': {
      2: (s) => s.openBreaker('TIE-AB'),
      3: (s) => (s.removeKey('L-TIE-AB'), s.insertKey('K-MTM-1', 'L-MB-A')),
      4: (s) => s.closeBreaker('MB-A'),
    },
    'mop-chiller-pm': { 2: (s) => s.setMaintenance('CH-01') },
    'mop-crah-filters': { 1: (s) => s.setMaintenance('CRAH-101'), 3: (s) => s.restore('CRAH-101') },
  };
  for (const [id, acts] of Object.entries(cases)) {
    it(`${id}: done right, full score, no racks down`, () => {
      const { sim, run } = play(byId(id), acts);
      expect(run.done).toBe(true);
      expect(run.score).toBe(SCORE.start);
      expect(sim.droppedRacks()).toEqual([]);
    });
  }
  it('tie return ends in the normal line-up', () => {
    const { sim } = play(byId('mop-tie-return'), cases['mop-tie-return']);
    expect(sim.graph.get('MB-A').state.closed && sim.graph.get('MB-B').state.closed && !sim.graph.get('TIE-AB').state.closed).toBe(true);
  });
  it('closing Main A before opening the tie is blocked and costs points', () => {
    const p = byId('mop-tie-return');
    const sim = procedureSim(p);
    let run = startRun(p, sim);
    sim.closeBreaker('MB-A');
    run = evaluate(p, run, sim);
    expect(run.score).toBe(SCORE.start - SCORE.blocked);
  });
});

describe('operator actions for practice', () => {
  it('generator test run starts unloaded and stops back to standby', () => {
    const p = byId('mop-gen-test');
    const sim = procedureSim(p);
    expect(sim.testGenerator('GEN-A1', true).ok).toBe(true);
    sim.advance(30);
    expect(sim.graph.get('GEN-A1').state.genState).toBe('running');
    expect(sim.solution.sourceKw.get('GEN-A1') ?? 0).toBe(0);
    expect(sim.testGenerator('GEN-A1', false).ok).toBe(true);
    expect(sim.graph.get('GEN-A1').status).toBe('standby');
  });
  it('a running generator cannot be locked out', () => {
    const sim = procedureSim(byId('mop-gen-test'));
    sim.testGenerator('GEN-A1', true);
    sim.advance(30);
    expect(sim.setMaintenance('GEN-A1').ok).toBe(false);
  });
  it('an energized breaker cannot be declared out of service', () => {
    const sim = procedureSim(byId('mop-gen-test'));
    expect(sim.setMaintenance('UOB-A').ok).toBe(false);
  });
});

describe('drills', () => {
  // Operator actions a drill needs (most drills are calls only).
  const DRILL_ACTIONS: Record<string, Record<number, (s: Simulation) => void>> = {
    'drill-towers': { 3: (s) => (s.restore('CH-01'), s.restore('CH-02')) },
  };
  for (const p of DRILLS.filter((x) => !x.scenario)) {
    // 0 s = instant answers; 45 s = a person reading each step while the clock runs.
    // (Slower than that is meant to cost points in some drills, e.g. the CDU drill gives you seconds.)
    for (const readS of [0, 45]) {
      it(`${p.title}: right calls finish with full score and no racks down (reading ${readS} s per step)`, () => {
        const { sim, run } = play(p, DRILL_ACTIONS[p.id], readS);
        expect(run.done).toBe(true);
        expect(run.score).toBe(SCORE.start);
        expect(sim.droppedRacks()).toEqual([]);
      });
    }
  }

  it('towers drill (B-005): the backup step waits for the trip, then finishes even though the tank keeps topping up', () => {
    const p = byId('drill-towers');
    const sim = procedureSim(p);
    let run = startRun(p, sim);
    run = choose(p, run, sim, p.steps[0]!.choices!.findIndex((c) => c.correct));
    // Answered at once: nothing has tripped yet, so the step must not tick off.
    expect(run.step).toBe(1);
    for (let t = 0; t < 3600 && run.step === 1; t += 60) {
      sim.advance(60);
      run = evaluate(p, run, sim);
    }
    expect(run.step).toBe(2);
    expect(sim.graph.get('CH-01').status).toBe('failed');
  });

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

import { SURPRISE_COUNT, surpriseDrill } from '../../content/procedures';
describe('surprise drill', () => {
  it('every possible failure has one right answer, can be repaired, and finishes clean', () => {
    for (let i = 0; i < SURPRISE_COUNT; i++) {
      const p = surpriseDrill(i);
      const c = p.steps[0]!.choices!;
      expect(c.filter((x) => x.correct)).toHaveLength(1);
      expect(new Set(c.map((x) => x.text)).size).toBe(4);
      const target = p.steps[1]!.focus!;
      const { sim, run } = play(p, { 1: (s) => s.restore(target) });
      expect(run.done, target).toBe(true);
      expect(run.score).toBe(SCORE.start);
      expect(sim.graph.get(target).status).not.toBe('failed');
    }
  });
});

import { ROUNDS } from '../../content/rounds';
describe('rounds practice', () => {
  it('every sheet mixes good and bad readings, each with a range and a reason', () => {
    for (const r of ROUNDS) {
      expect(r.readings.some((x) => x.bad), r.id).toBe(true);
      expect(r.readings.some((x) => !x.bad), r.id).toBe(true);
      for (const x of r.readings) expect(x.normal.length > 0 && x.why.length > 3).toBe(true);
    }
    const ids = [...ROUNDS.map((r) => r.id), ...PROCEDURES.map((p) => p.id), 'drill-surprise'];
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('think deeper', () => {
  it('every procedure and the surprise drill has at least two questions with model answers', () => {
    for (const p of [...PROCEDURES, surpriseDrill(0)]) {
      expect(p.deeper?.length ?? 0, p.id).toBeGreaterThanOrEqual(2);
      for (const d of p.deeper!) expect(d.a.length).toBeGreaterThan(60);
    }
  });
});

import { CASES } from '../../content/cases';
describe('case studies', () => {
  it('each case has a timeline, five whys, fixes, questions and a valid practice link', () => {
    const ids = new Set([...PROCEDURES.map((p) => p.id), ...ROUNDS.map((r) => r.id)]);
    for (const c of CASES) {
      expect(c.whys, c.id).toHaveLength(5);
      expect(c.timeline.length).toBeGreaterThanOrEqual(4);
      expect(c.fixes.length).toBeGreaterThanOrEqual(3);
      expect(c.questions.length).toBeGreaterThanOrEqual(2);
      if (c.practice) expect(ids.has(c.practice), c.practice).toBe(true);
    }
  });
});

describe('MOP sheets (Phase 9)', () => {
  it('every MOP has a risk level, prerequisites, stop-work points and a rollback', () => {
    for (const p of MOPS) {
      expect(p.plan, p.id).toBeTruthy();
      expect(['Low', 'Medium', 'High']).toContain(p.plan!.risk);
      expect(p.plan!.prereqs.length, p.id).toBeGreaterThanOrEqual(1);
      expect(p.plan!.stopWork.length, p.id).toBeGreaterThanOrEqual(1);
      expect(p.plan!.rollback.length, p.id).toBeGreaterThanOrEqual(1);
    }
  });
  it('there are at least 12 MOPs', () => expect(MOPS.length).toBeGreaterThanOrEqual(12));
});
