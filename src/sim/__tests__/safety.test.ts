import { SAFETY } from '../../content/safety';
import {
  EMERGENCY_CARDS,
  EMPTY_BRIEF,
  GOLDEN_RULES,
  HAZARD_HUNTS,
  LABEL_EXAMPLES,
  LOTO_DRILLS,
  boundaryVerdict,
  briefGaps,
  lotoScore,
  scoreHunt,
  shuffledOrder,
} from '../../content/safetyTools';
import { SEARCH_INDEX, search } from '../../ui/search';

const med = LABEL_EXAMPLES.find((l) => l.id === 'med')!;
const extreme = LABEL_EXAMPLES.find((l) => l.id === 'extreme')!;

describe('approach boundaries', () => {
  it('nobody unqualified crosses the restricted boundary, even escorted', () => {
    expect(boundaryVerdict(0.5, 'escorted', true, med).ok).toBe(false);
    expect(boundaryVerdict(0.5, 'unqualified', true, med).ok).toBe(false);
    expect(boundaryVerdict(0.5, 'qualified', true, med).ok).toBe(true);
  });
  it('unqualified people need an escort inside the limited boundary', () => {
    expect(boundaryVerdict(2, 'unqualified', true, med).ok).toBe(false);
    expect(boundaryVerdict(2, 'escorted', true, med).ok).toBe(true);
  });
  it('arc-rated PPE is required inside the arc flash boundary, not outside', () => {
    expect(boundaryVerdict(6, 'qualified', false, med).ok).toBe(false);
    expect(boundaryVerdict(6, 'qualified', true, med).ok).toBe(true);
    expect(boundaryVerdict(med.afbFt + 1, 'unqualified', false, med)).toMatchObject({ ok: true, zone: 'outside' });
  });
  it('above 40 cal/cm² the answer is always de-energize', () => {
    const v = boundaryVerdict(5, 'qualified', true, extreme);
    expect(v.ok).toBe(false);
    expect(v.headline).toMatch(/de-energize/i);
  });
});

describe('LOTO drills', () => {
  it('shuffles every step exactly once and never starts solved', () => {
    for (const d of LOTO_DRILLS) {
      for (let seed = 1; seed < 50; seed++) {
        const o = shuffledOrder(d.steps.length, seed);
        expect([...o].sort((a, b) => a - b)).toEqual(d.steps.map((_, i) => i));
        expect(o.every((v, i) => v === i)).toBe(false);
      }
    }
  });
  it('every step explains why it comes where it does', () => {
    for (const d of LOTO_DRILLS) for (const s of d.steps) expect(s.why.length, s.text).toBeGreaterThan(20);
  });
  it('scores from 100 and never goes negative', () => {
    expect(lotoScore(0)).toBe(100);
    expect(lotoScore(3)).toBe(70);
    expect(lotoScore(50)).toBe(0);
  });
});

describe('hazard hunts', () => {
  it('each hunt mixes real hazards with safe items', () => {
    for (const h of HAZARD_HUNTS) {
      expect(h.items.some((i) => i.hazard), h.id).toBe(true);
      expect(h.items.some((i) => !i.hazard), h.id).toBe(true);
    }
  });
  it('flagging exactly the hazards scores 100; misses and false alarms cost points', () => {
    const h = HAZARD_HUNTS[0]!;
    const perfect = new Set(h.items.flatMap((it, i) => (it.hazard ? [i] : [])));
    expect(scoreHunt(h, perfect).score).toBe(100);
    expect(scoreHunt(h, new Set()).missed).toBe(perfect.size);
    const all = new Set(h.items.map((_, i) => i));
    expect(scoreHunt(h, all).falseAlarms).toBe(h.items.length - perfect.size);
  });
});

describe('pre-task brief', () => {
  it('an empty brief lists what is missing', () => {
    expect(briefGaps(EMPTY_BRIEF).length).toBeGreaterThan(3);
  });
  it('energy without LOTO or a permit is a gap', () => {
    const b = { ...EMPTY_BRIEF, task: 'Belt', worst: 'Starts', emergency: '911', stopIf: 'Mismatch', energy: ['Rotating parts'] };
    expect(briefGaps(b).some((g) => /LOTO/.test(g))).toBe(true);
    expect(briefGaps({ ...b, permits: ['LOTO'] })).toEqual([]);
  });
});

describe('safety content', () => {
  it('has golden rules, emergency cards and a life-safety section', () => {
    expect(GOLDEN_RULES.length).toBe(10);
    expect(EMERGENCY_CARDS.length).toBeGreaterThanOrEqual(8);
    for (const c of EMERGENCY_CARDS) {
      expect(c.doFirst.length, c.id).toBeGreaterThan(1);
      expect(c.dont.length, c.id).toBeGreaterThan(0);
    }
    expect(SAFETY.map((a) => a.group)).toContain('Life safety');
  });
});

describe('quick search', () => {
  it('indexes tabs, lessons, procedures, guides, safety and terms', () => {
    const types = new Set(SEARCH_INDEX.map((i) => i.type));
    for (const t of ['Tab', 'Walkthrough', 'MOP', 'Drill', 'Equipment', 'Safety', 'Term', 'Case study']) expect(types.has(t), t).toBe(true);
  });
  it('ranks title matches first', () => {
    expect(search('lockout')[0]!.title.toLowerCase()).toContain('lockout');
    expect(search('kirk')[0]!.title).toMatch(/kirk/i);
    expect(search('zzzqqq')).toEqual([]);
  });
});
