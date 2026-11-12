/** Phase 9 MOPs: each plays to 100 on the app's path (EngineV2.forProcedure), with the taps a person makes. */
import { describe, expect, it } from 'vitest';
import { MOPS } from '../../content/procedures';
import type { Action } from '../actions';
import { choose, confirmStep, evaluate, startRun, type ProcRun } from '../procedure';
import { EngineV2 } from '../v2/engine';

const TAPS: Record<string, Record<number, Action[]>> = {
  'mop-chwp-rotate': { 2: [{ a: 'maint', id: 'CHWP-01' }], 5: [{ a: 'restore', id: 'CHWP-01' }] },
  'mop-tower-pm': { 2: [{ a: 'maint', id: 'CT-01' }], 4: [{ a: 'restore', id: 'CT-01' }] },
  'mop-doas-pm': { 1: [{ a: 'maint', id: 'DOAS-01' }], 4: [{ a: 'restore', id: 'DOAS-01' }] },
  'mop-gen-heater': { 1: [{ a: 'maint', id: 'GEN-B1' }], 3: [{ a: 'restore', id: 'GEN-B1' }] },
  'mop-ir-scan': {},
};

describe('Phase 9 MOPs play to 100 on engine v2', () => {
  for (const [id, taps] of Object.entries(TAPS)) {
    const p = MOPS.find((x) => x.id === id)!;
    for (const readS of [0, 30])
      it(`${p?.title ?? id} (${readS} s per step)`, { timeout: 60_000 }, () => {
        expect(p, id).toBeTruthy();
        const e = EngineV2.forProcedure(p);
        let run: ProcRun = startRun(p, e.sim);
        for (let guard = 0; !run.done && guard < 60; guard++) {
          const i = run.step;
          const st = p.steps[i]!;
          e.run(readS);
          run = evaluate(p, run, e.sim);
          if (run.step !== i) continue;
          if (st.confirm) run = confirmStep(p, run, e.sim);
          else if (st.choices) run = choose(p, run, e.sim, st.choices.findIndex((c) => c.correct));
          else {
            for (const a of taps[i] ?? []) expect(e.apply(a).ok, `${id} step ${i}: ${JSON.stringify(a)}`).toBe(true);
            for (let k = 0; k < 40 && run.step === i; k++) (e.run(15), (run = evaluate(p, run, e.sim)));
          }
        }
        expect(run.done, `${id} stuck at step ${run.step}: ${p.steps[run.step]?.title}`).toBe(true);
        expect(run.mistakes).toEqual([]);
        expect(run.score).toBe(100);
        expect(e.sim.droppedRacks()).toEqual([]);
      });
  }
});
