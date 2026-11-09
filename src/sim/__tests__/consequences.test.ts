import { PROCEDURES } from '../../content/procedures';
import { choose, confirmStep, evaluate, previewConsequence, procedureSim, startRun, type ProcRun } from '../procedure';
import { EngineV2 } from '../v2/engine';

/**
 * Walk to each step that has a choice with a consequence and preview it there, on the bare plant and on the
 * path the app uses (the plant wrapped in engine v2, preview on an engine v2 copy).
 */
describe('wrong-choice consequences', () => {
  for (const mode of ['bare', 'v2'] as const) {
    for (const p of PROCEDURES) {
      p.steps.forEach((step, i) => {
        step.choices?.forEach((c) => {
          if (!c.consequence) return;
          it(`${mode}: ${p.id} step ${i + 1}: "${c.text}" shows a real outcome`, () => {
            const sim = procedureSim(p);
            const eng = mode === 'v2' ? EngineV2.wrap(sim) : null;
            let run: ProcRun = startRun(p, sim);
            let guard = 0;
            while (run.step < i && guard++ < 30) {
              const s = p.steps[run.step]!;
              if (s.confirm) run = confirmStep(p, run, sim);
              else if (s.choices) run = choose(p, run, sim, s.choices.findIndex((x) => x.correct));
              else {
                if (eng) eng.run(300);
                else sim.advance(300);
                run = evaluate(p, run, sim);
              }
            }
            expect(run.step).toBe(i);
            const before = { events: sim.events.length, t: sim.t, log: eng?.log.length ?? 0 };
            const out = previewConsequence(
              sim,
              c,
              eng
                ? () => {
                    const cp = eng.copy();
                    return { sim: cp.sim, advance: (s: number) => cp.apply({ a: 'skip', s }) };
                  }
                : undefined,
            )!;
            // The live plant (and engine) is untouched.
            expect(sim.events.length).toBe(before.events);
            expect(sim.t).toBe(before.t);
            if (eng) expect(eng.log.length).toBe(before.log);
            const bad = !!out.refused || out.racksDown > 0 || out.gpuRowsTripped.length > 0 || out.lines.length > 0;
            expect(bad).toBe(true);
          });
        });
      });
    }
  }
});
