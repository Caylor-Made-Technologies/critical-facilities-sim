import { PROCEDURES } from '../../content/procedures';
import { choose, confirmStep, evaluate, previewConsequence, procedureSim, startRun, type ProcRun } from '../procedure';

/** Walk to each step that has a choice with a consequence and preview it there. */
describe('wrong-choice consequences', () => {
  for (const p of PROCEDURES) {
    p.steps.forEach((step, i) => {
      step.choices?.forEach((c) => {
        if (!c.consequence) return;
        it(`${p.id} step ${i + 1}: "${c.text}" shows a real outcome`, () => {
          const sim = procedureSim(p);
          let run: ProcRun = startRun(p, sim);
          let guard = 0;
          while (run.step < i && guard++ < 30) {
            const s = p.steps[run.step]!;
            if (s.confirm) run = confirmStep(p, run, sim);
            else if (s.choices) run = choose(p, run, sim, s.choices.findIndex((x) => x.correct));
            else {
              sim.advance(300);
              run = evaluate(p, run, sim);
            }
          }
          expect(run.step).toBe(i);
          const before = { events: sim.events.length, t: sim.t };
          const out = previewConsequence(sim, c)!;
          // The live plant is untouched.
          expect(sim.events.length).toBe(before.events);
          expect(sim.t).toBe(before.t);
          const bad = !!out.refused || out.racksDown > 0 || out.gpuRowsTripped.length > 0 || out.lines.length > 0;
          expect(bad).toBe(true);

        });
      });
    });
  }
});
