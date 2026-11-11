/**
 * Phase 8c: drills that turn on engine v2 scenario switches (fail-to-start, block heater off, eco mode,
 * timed power quality events). Played on the browser path: EngineV2.forProcedure (prepared plant + scenario).
 */
import { describe, expect, it } from 'vitest';
import { DRILLS } from '../../content/procedures';
import { choose, confirmStep, evaluate, startRun, type Procedure, type ProcRun } from '../procedure';
import { EngineV2 } from '../v2/engine';

/** Wait-step actions a person does on the plant (indexed by step). */
const ACTIONS: Record<string, Record<number, (e: EngineV2) => void>> = {
  'drill-gen-overcrank': { 5: (e) => ['GEN-A1', 'GEN-A2', 'GEN-A3'].forEach((id) => e.apply({ a: 'restore', id })) },
};

function play(p: Procedure, readS: number) {
  const e = EngineV2.forProcedure(p);
  const sim = e.sim;
  let run: ProcRun = startRun(p, sim);
  for (let guard = 0; !run.done && guard < 80; guard++) {
    const i = run.step;
    const st = p.steps[i]!;
    e.run(readS);
    run = evaluate(p, run, sim);
    if (run.step !== i) continue;
    if (st.confirm) run = confirmStep(p, run, sim);
    else if (st.choices) run = choose(p, run, sim, st.choices.findIndex((c) => c.correct));
    else {
      ACTIONS[p.id]?.[i]?.(e);
      for (let k = 0; k < 40 && run.step === i; k++) (e.run(15), (run = evaluate(p, run, sim)));
    }
  }
  return { e, run };
}

const SCENARIO_DRILLS = DRILLS.filter((p) => p.scenario?.length);

describe('scenario drills (engine v2 switches)', () => {
  it('there are scenario drills using fail-to-start, block heater, eco mode and a power quality event', () => {
    const used = new Set(SCENARIO_DRILLS.flatMap((p) => p.scenario!.map((x) => x.action.a)));
    for (const a of ['failToStart', 'blockHeater', 'eco', 'utilityEvent']) expect(used.has(a as never), a).toBe(true);
  });
  for (const p of SCENARIO_DRILLS)
    for (const readS of [0, 45])
      it(`${p.title}: right calls finish with full score and no racks down (reading ${readS} s per step)`, { timeout: 60_000 }, () => {
        const { e, run } = play(p, readS);
        expect(run.done, `stuck at step ${run.step}: ${p.steps[run.step]?.title}`).toBe(true);
        expect(run.mistakes).toEqual([]);
        expect(run.score).toBe(100);
        expect(e.sim.droppedRacks()).toEqual([]);
      });

  it('overcrank drill: every A generator really fails to start (the switch is on)', () => {
    const p = SCENARIO_DRILLS.find((x) => x.id === 'drill-gen-overcrank')!;
    const e = EngineV2.forProcedure(p);
    e.run(60);
    for (const id of ['GEN-A1', 'GEN-A2', 'GEN-A3']) expect(e.sim.graph.get(id).status).toBe('failed');
    expect(e.sim.events.some((x) => /FAILED TO START \(overcrank\)/.test(x.message))).toBe(true);
  });
  it('cold-start drill: the transfer takes about 15 s longer than a warm start', () => {
    const p = SCENARIO_DRILLS.find((x) => x.id === 'drill-cold-start')!;
    const transferAt = (e: EngineV2) => {
      for (let s = 0; s < 120; s++) {
        if (e.sim.graph.get('ATS-A').state.selected === 'emergency') return e.t;
        e.tick();
      }
      return Infinity;
    };
    const cold = transferAt(EngineV2.forProcedure(p));
    const warm = transferAt(EngineV2.forProcedure({ ...p, scenario: [] }));
    expect(cold - warm).toBeGreaterThanOrEqual(14);
    expect(cold - warm).toBeLessThanOrEqual(16);
  });
  it('sag drill: the event is scheduled, UPS A rides it, a chiller drops and comes back, generators never start', () => {
    const p = SCENARIO_DRILLS.find((x) => x.id === 'drill-sag')!;
    const e = EngineV2.forProcedure(p);
    expect(e.pending).toBe(1);
    e.run(10);
    expect(e.sim.events.some((x) => /voltage sag to 60%/.test(x.message))).toBe(true);
    expect(e.sim.events.some((x) => /dropped offline on the voltage dip/.test(x.message))).toBe(true);
    e.run(300);
    expect(e.sim.graph.byKind('generator').every((g) => g.state.genState === 'off')).toBe(true);
    expect(Object.values(e.hyd.state.chillers).every((c) => c.mode !== 'starting')).toBe(true);
  });
});
