import { INTERVIEW } from '../../content/career';
import { BADGES, earnedBadges } from '../../ui/badges';
import { dailyChallenge } from '../../ui/daily';
import { streakOf, today } from '../../ui/dates';
import { nextCard } from '../../ui/Flashcards';
import { sanitize } from '../../ui/progress';
import { search } from '../../ui/search';
import { Simulation } from '../engine';
import {
  BATTERY_AGES,
  airflowCfm,
  batteryLifeYears,
  chwGpm,
  kva,
  singlePhaseAmps,
  threePhaseAmps,
  upsRuntimeMinFor,
  upsRuntimeS,
} from '../physics';
import { buildPlant } from '../plant/builder';

describe('field calculators', () => {
  it('three-phase amps: 100 kW at 480 V, PF 1 ≈ 120 A', () => {
    expect(threePhaseAmps(100, 480, 1)).toBeCloseTo(120.3, 0);
    expect(singlePhaseAmps(10, 240, 1)).toBeCloseTo(41.7, 0);
    expect(kva(90, 0.9)).toBeCloseTo(100);
    expect(threePhaseAmps(100, 0, 1)).toBe(0);
  });
  it('cooling: 100 tons at 10 °F ΔT is 240 gpm; 10 kW at 20 °F is ~1,580 CFM', () => {
    expect(chwGpm(100, 10)).toBe(240);
    expect(airflowCfm(10, 20)).toBeCloseTo(1580, -1);
  });
  it('battery life halves about every 8.3 °C above 25 °C, and never grows below it', () => {
    expect(batteryLifeYears(10, 25)).toBe(10);
    expect(batteryLifeYears(10, 15)).toBe(10);
    expect(batteryLifeYears(10, 33.3)).toBeCloseTo(5, 1);
  });
  it('UPS runtime for any battery follows the same curve and scales with health', () => {
    expect(upsRuntimeMinFor(1, 5)).toBeCloseTo(5);
    expect(upsRuntimeMinFor(0.5, 5)).toBeGreaterThan(10);
    expect(upsRuntimeMinFor(1, 5, 0.8)).toBeCloseTo(4);
    expect(upsRuntimeMinFor(1, 5) * 60).toBeCloseTo(upsRuntimeS(1));
  });
});

describe('battery aging in the engine', () => {
  it('an old battery string gives less runtime on a utility outage', () => {
    const fresh = new Simulation(buildPlant('N+1'));
    const old = new Simulation(buildPlant('N+1'));
    expect(old.setBatteryAge('eol').ok).toBe(true);
    for (const s of [fresh, old]) {
      for (const g of ['GEN-01', 'GEN-02', 'GEN-03', 'GEN-04', 'BESS-A']) s.fail(g);
      s.fail('UTIL-A');
      s.advance(5);
    }
    const ups = fresh.graph.byKind('ups')[0]!.id;
    expect(old.upsRuntimeS(ups) / fresh.upsRuntimeS(ups)).toBeCloseTo(BATTERY_AGES.eol.health, 1);
    expect(old.clone().batteryAge).toBe('eol');
  });
});

describe('daily challenge & streaks', () => {
  it('is the same for everyone on a date, with 3 different questions', () => {
    const a = dailyChallenge('2026-11-01');
    expect(dailyChallenge('2026-11-01')).toEqual(a);
    expect(new Set(a.questions.map((q) => q.id)).size).toBe(3);
    expect(dailyChallenge('2026-11-02').questions.map((q) => q.id)).not.toEqual(a.questions.map((q) => q.id));
  });
  it('counts consecutive days and survives until tonight', () => {
    const now = new Date(2026, 10, 10, 12);
    const d = (n: number) => today(new Date(2026, 10, 10 - n));
    expect(streakOf({}, now)).toBe(0);
    expect(streakOf({ [d(0)]: 100, [d(1)]: 66, [d(2)]: 33 }, now)).toBe(3);
    expect(streakOf({ [d(1)]: 100, [d(2)]: 100 }, now)).toBe(2);
    expect(streakOf({ [d(0)]: 100, [d(2)]: 100 }, now)).toBe(1);
  });
});

describe('progress, badges, flashcards', () => {
  it('sanitize drops junk from saved or imported data', () => {
    const p = sanitize({ lessons: ['a', 3], procs: { x: 120, y: 90 }, daily: { '2026-11-01': 100, bad: 50 }, cards: { c: 9, d: 2 }, exam: 'x' });
    expect(p.lessons).toEqual(['a']);
    expect(p.procs).toEqual({ y: 90 });
    expect(p.daily).toEqual({ '2026-11-01': 100 });
    expect(p.cards).toEqual({ d: 2 });
    expect(p.exam).toBe(-1);
    expect(sanitize(null).lessons).toEqual([]);
  });
  it('badges have unique ids and none are earned at the start', () => {
    expect(new Set(BADGES.map((b) => b.id)).size).toBe(BADGES.length);
    expect(earnedBadges(sanitize({}))).toEqual([]);
    expect(earnedBadges(sanitize({ exam: 85 })).map((b) => b.id)).toContain('exam');
  });
  it('flashcards serve missed cards first and never repeat back to back', () => {
    const cards = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    expect(cards[nextCard(cards, { a: 3, b: 0, c: 2 }, null, 0)]!.id).toBe('b');
    expect(cards[nextCard(cards, { a: 0, b: 0, c: 4 }, 'a', 0)]!.id).toBe('b');
  });
});

describe('career content', () => {
  it('every interview question has strong-answer points and a tip; ', () => {
    for (const q of INTERVIEW) {
      expect(q.points.length, q.id).toBeGreaterThanOrEqual(2);
      expect(q.tip.length, q.id).toBeGreaterThan(10);
    }
    expect(new Set(INTERVIEW.map((q) => q.id)).size).toBe(INTERVIEW.length);
  });
  it('quick search finds the new tabs', () => {
    expect(search('field tools')[0]!.title).toBe('Field Tools');
    expect(search('career')[0]!.title).toBe('Career');
  });
});
