/** Phase 7 deep dives: every link, tip and quiz answer must resolve. */
import { describe, expect, it } from 'vitest';
import { DEEP_DIVES, deepDiveFor } from '../../content/deepdive';
import { EQUIPMENT } from '../../content/equipment';
import { LESSONS } from '../../content/lessons';
import { PROCEDURES } from '../../content/procedures';
import { TIPS } from '../../content/tips';
import { QUIZ } from '../../content/quiz';
import { LIFE_STAGES } from '../../content/lifecycle';
import { migrate, sanitize, xpOf, XP } from '../../ui/progress';

const DONE_GROUPS = ['Electrical'] as const;

describe('deep dives', () => {
  it('every guide in a finished group has a deep dive', () => {
    for (const g of EQUIPMENT.filter((x) => (DONE_GROUPS as readonly string[]).includes(x.group))) expect(deepDiveFor(g.id), g.id).toBeTruthy();
  });
  it('every deep dive belongs to a guide, once', () => {
    const ids = DEEP_DIVES.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(EQUIPMENT.some((g) => g.id === id), id).toBe(true);
  });
  for (const d of DEEP_DIVES) {
    describe(d.id, () => {
      it('has topics, readings, failures, tips, practice and a quiz', () => {
        expect(d.topics.length).toBeGreaterThanOrEqual(2);
        expect(d.readings.length).toBeGreaterThanOrEqual(3);
        expect(d.failures.length).toBeGreaterThanOrEqual(2);
        expect(d.tips.length).toBeGreaterThanOrEqual(2);
        expect(d.practice.length).toBeGreaterThanOrEqual(1);
        expect(d.quiz.length).toBeGreaterThanOrEqual(2);
      });
      it('tips and practice links resolve', () => {
        for (const t of d.tips) expect(TIPS.some((x) => x.id === t), t).toBe(true);
        for (const x of d.practice) {
          const ok = x.kind === 'lesson' ? LESSONS.some((l) => l.id === x.id) : PROCEDURES.some((p) => p.id === x.id);
          expect(ok, `${x.kind} ${x.id}`).toBe(true);
        }
      });
      it('quiz answers are valid choices with an explanation', () => {
        for (const q of d.quiz) {
          expect(q.choices[q.answer], q.id).toBeTruthy();
          expect(new Set(q.choices).size, q.id).toBe(q.choices.length);
          expect(q.why.length, q.id).toBeGreaterThan(20);
        }
      });
      it('every reading has a normal and an action', () => {
        for (const r of d.readings) {
          expect(r.normal.length, r.what).toBeGreaterThan(5);
          expect(r.act.length, r.what).toBeGreaterThan(10);
        }
      });
    });
  }
  it('quiz ids are unique across the whole app (they share the answered-questions record)', () => {
    const all = [...QUIZ.map((q) => q.id), ...LIFE_STAGES.flatMap((s) => s.quiz.map((q) => q.id)), ...DEEP_DIVES.flatMap((d) => d.quiz.map((q) => q.id))];
    expect(new Set(all).size).toBe(all.length);
  });
});

describe('deep dive progress', () => {
  it('keeps valid best scores and drops junk', () => {
    const p = sanitize({ deep: { transformer: 75, ups: 100, 'Bad Key': 50, generator: 140, ats: 'x' } });
    expect(p.deep).toEqual({ transformer: 75, ups: 100 });
  });
  it('old saves without deep dives load with none', () => {
    expect(migrate({ schema: 2, lessons: [] }).deep).toEqual({});
  });
  it('a passed deep dive quiz (80%+) earns XP once', () => {
    const base = xpOf(sanitize({}));
    expect(xpOf(sanitize({ deep: { ups: 100, transformer: 50 } })) - base).toBe(XP.deepDive);
  });
});
