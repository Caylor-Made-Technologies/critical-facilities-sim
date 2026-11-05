import { describe, expect, it } from 'vitest';
import { ANCHORS, IST_L5, LIFE_STAGES, SCENE_STATES } from '../../content/lifecycle';
import { choose, confirmStep, evaluate, procedureSim, SCORE, startRun, type ProcRun } from '../procedure';
import type { Simulation } from '../engine';

describe('Life of a Data Center content', () => {
  it('has 10 stages in order with unique ids', () => {
    expect(LIFE_STAGES.map((s) => s.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(new Set(LIFE_STAGES.map((s) => s.id)).size).toBe(10);
  });
  it('every stage has a lesson, tour, task, details, mistakes and a 5–10 question quiz', () => {
    for (const s of LIFE_STAGES) {
      expect(s.lesson.length, s.id).toBeGreaterThanOrEqual(2);
      expect(s.tour.length, s.id).toBeGreaterThanOrEqual(4);
      expect(s.details.length, s.id).toBeGreaterThanOrEqual(4);
      expect(s.mistakes.length, s.id).toBeGreaterThanOrEqual(3);
      expect(s.quiz.length, s.id).toBeGreaterThanOrEqual(5);
      expect(s.quiz.length, s.id).toBeLessThanOrEqual(10);
      expect(SCENE_STATES).toContain(s.scene);
      for (const t of s.tour) expect(ANCHORS, `${s.id} tour`).toContain(t.anchor);
    }
  });
  it('every quiz question has exactly one valid answer and a reason, ids unique', () => {
    const ids = LIFE_STAGES.flatMap((s) => s.quiz.map((q) => q.id));
    expect(new Set(ids).size).toBe(ids.length);
    for (const q of LIFE_STAGES.flatMap((s) => s.quiz)) {
      expect(q.answer, q.id).toBeGreaterThanOrEqual(0);
      expect(q.answer, q.id).toBeLessThan(q.choices.length);
      expect(new Set(q.choices).size, q.id).toBe(q.choices.length);
      expect(q.why.length, q.id).toBeGreaterThan(10);
      expect(q.id).toMatch(/^lq-/);
    }
  });
  it('hands-on tasks are well formed', () => {
    for (const s of LIFE_STAGES) {
      const t = s.task;
      expect(t.explain.length).toBeGreaterThan(20);
      if (t.kind === 'order') {
        expect(t.items.length).toBeGreaterThanOrEqual(4);
        expect(new Set(t.items).size).toBe(t.items.length);
      }
      if (t.kind === 'sort') {
        const buckets = t.buckets.map((b) => b.id);
        for (const it of t.items) expect(buckets, `${s.id}: ${it.text}`).toContain(it.bucket);
        // Every bucket is used, so no bucket is a trick.
        for (const b of buckets) expect(t.items.some((it) => it.bucket === b), `${s.id}: ${b}`).toBe(true);
      }
    }
    expect(LIFE_STAGES.filter((s) => s.task.kind === 'sim')).toHaveLength(1);
  });
  it('stages with numbers, code or safety content flag them for verification', () => {
    const flagged = LIFE_STAGES.flatMap((s) => s.details.filter((d) => d.verify));
    expect(flagged.length).toBeGreaterThanOrEqual(12);
    for (const id of ['life-site', 'life-pm', 'life-decom']) expect(LIFE_STAGES.find((s) => s.id === id)!.details.some((d) => d.verify)).toBe(true);
  });
  it('generic only: no real company or vendor names', () => {
    const text = JSON.stringify(LIFE_STAGES).toLowerCase();
    for (const bad of ['amazon', 'google', 'microsoft', 'meta ', 'equinix', 'digital realty', 'caterpillar', 'cummins', 'schneider', 'eaton', 'vertiv', 'trane', 'uptime institute']) expect(text).not.toContain(bad);
  });
});

describe('mini Level 5 IST', () => {
  const acts: Record<number, (s: Simulation) => void> = {
    2: (s) => (s.fail('UTIL-A'), s.fail('UTIL-B')),
    5: (s) => (s.restore('UTIL-A'), s.restore('UTIL-B')),
  };
  it('done right: full score, nothing dropped, back on utility', () => {
    const p = IST_L5;
    const sim = procedureSim(p);
    let run: ProcRun = startRun(p, sim);
    let guard = 0;
    while (!run.done && guard++ < 50) {
      const i = run.step;
      const st = p.steps[i]!;
      if (st.confirm) run = confirmStep(p, run, sim);
      else if (st.choices) run = choose(p, run, sim, st.choices.findIndex((c) => c.correct));
      else {
        acts[i]?.(sim);
        sim.advance(10);
        run = evaluate(p, run, sim);
        for (let k = 0; k < 10 && run.step === i; k++) {
          sim.advance(60);
          run = evaluate(p, run, sim);
        }
      }
      expect(run.step > i || run.done, `stuck at step ${i + 1}: ${st.title}`).toBe(true);
    }
    expect(run.done).toBe(true);
    expect(run.score).toBe(SCORE.start);
    expect(sim.droppedRacks()).toEqual([]);
    expect(sim.graph.get('ATS-A').state.selected).toBe('normal');
  });
  it('every step finishes one way and explains why', () => {
    for (const s of IST_L5.steps) {
      expect([s.check, s.confirm, s.choices].filter(Boolean)).toHaveLength(1);
      expect(s.why.length).toBeGreaterThan(10);
      if (s.choices) expect(s.choices.filter((c) => c.correct)).toHaveLength(1);
    }
  });
});

describe('Life of a Data Center progress', async () => {
  const { sanitize, lifeStageDone, xpOf, XP } = await import('../../ui/progress');
  it('backups keep only valid stage progress', () => {
    const p = sanitize({ life: { 'life-why': { quiz: 83, task: true, tour: 'yes' }, 'life-bad!': { quiz: 100 }, 'life-site': { quiz: 500, task: 1 }, hack: 3 } });
    expect(p.life).toEqual({ 'life-why': { quiz: 83, task: true, tour: false }, 'life-site': { quiz: 0, task: false, tour: false } });
    expect(sanitize({ life: 'nope' }).life).toEqual({});
  });
  it('a stage is done with a passing quiz and its task; the IST counts for commissioning', () => {
    const base = sanitize({});
    expect(lifeStageDone({ ...base, life: { 'life-why': { quiz: 80, task: true, tour: false } } }, 'life-why')).toBe(true);
    expect(lifeStageDone({ ...base, life: { 'life-why': { quiz: 79, task: true, tour: true } } }, 'life-why')).toBe(false);
    expect(lifeStageDone({ ...base, procs: { 'life-ist': 90 }, life: { 'life-cx': { quiz: 100, task: false, tour: false } } }, 'life-cx')).toBe(true);
    expect(xpOf({ ...base, life: { 'life-why': { quiz: 100, task: true, tour: true } } })).toBe(XP.lifeStage);
  });
});
