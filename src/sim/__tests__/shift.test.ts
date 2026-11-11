/** Phase 8d: shift mode planning and scoring. */
import { describe, expect, it } from 'vitest';
import { planShift, scoreShift, shiftClock, SHIFT, SHIFT_POOL, type EventRecord } from '../../content/shift';
import { EngineV2 } from '../v2/engine';

const done = (at: number): EventRecord => ({ happened: true, alarmAt: at, ackAt: at + 60, fixReadyAt: at + 100, fixedAt: at + 200 });

describe('shift plan', () => {
  it('same seed, same shift; different seeds differ', () => {
    expect(planShift(42)).toEqual(planShift(42));
    expect(planShift(42).map((p) => p.def.id)).not.toEqual(planShift(43).map((p) => p.def.id));
  });
  it('5 different events, in order, after the first 20 min and before the last hour', () => {
    for (let seed = 1; seed < 50; seed++) {
      const p = planShift(seed);
      expect(p).toHaveLength(SHIFT.events);
      expect(new Set(p.map((x) => x.def.id)).size).toBe(SHIFT.events);
      p.forEach((x, i) => {
        expect(x.at).toBeGreaterThanOrEqual(1200);
        expect(x.at).toBeLessThanOrEqual(SHIFT.lengthS - 3600);
        if (i) expect(x.at).toBeGreaterThan(p[i - 1]!.at);
      });
    }
  });
  it('clock: 07:00 start, 15:00 at the end', () => {
    expect(shiftClock(0)).toBe('07:00');
    expect(shiftClock(5400)).toBe('08:30');
    expect(shiftClock(SHIFT.lengthS)).toBe('15:00');
  });
  it('every pool event applies on the 2N plant and its alarm exists', () => {
    const ids = new Set(new EngineV2('2N').alarms.defs.map((d) => d.id));
    for (const d of SHIFT_POOL) {
      const e = new EngineV2('2N');
      expect(e.apply(d.action).ok, d.id).toBe(true);
      if (d.alarm) expect(ids.has(d.alarm), d.alarm).toBe(true);
      if (d.fix.kind === 'restore') expect(e.sim.graph.nodes.has(d.fix.id), d.fix.id).toBe(true);
    }
  });
  it('each alarm-announced event really raises its alarm within 3 minutes', { timeout: 60_000 }, () => {
    for (const d of SHIFT_POOL.filter((x) => x.alarm)) {
      const e = new EngineV2('2N');
      e.run(600);
      e.apply(d.action);
      let seen = false;
      for (let s = 0; s < 180 && !seen; s++) {
        e.tick();
        seen = e.alarmSummary.list.some((a) => a.id === d.alarm);
      }
      expect(seen, d.id).toBe(true);
    }
  });
});

describe('shift score (hand-worked)', () => {
  const plan = planShift(7);
  const all = Object.fromEntries(plan.map((p) => [p.def.id, done(p.at)]));
  const perfect = { happened: plan.map((p) => p.def.id), open: [] as string[] };
  it('everything right = 100', () => expect(scoreShift(plan, all, [], 0, perfect).score).toBe(100));
  it('racks down cost the 20 points', () => expect(scoreShift(plan, all, [], 2, perfect).score).toBe(80));
  it('a late acknowledge costs 5 (if the event has an alarm)', () => {
    const withAlarm = plan.find((p) => p.def.alarm)!;
    const late = { ...all, [withAlarm.def.id]: { ...done(withAlarm.at), ackAt: withAlarm.at + SHIFT.ackWithinS + 61 } };
    expect(scoreShift(plan, late, [], 0, perfect).score).toBe(95);
  });
  it('an empty hand-off loses its share of the 30 hand-off points', () => {
    const s = scoreShift(plan, all, [], 0, { happened: [], open: [] });
    // 8 pool items × 2 lists = 16; "happened" is wrong for the 5 that did happen → 11 of 16 right → 21 of 30.
    expect(s.lines.at(-1)!.pts).toBe(Math.round((30 * 11) / 16));
  });
  it('a shift ended early still scores out of 100', () => {
    const rec = Object.fromEntries(plan.map((p, i) => [p.def.id, i < 2 ? done(p.at) : { happened: false, alarmAt: null, ackAt: null, fixReadyAt: null, fixedAt: null }]));
    const h = { happened: plan.slice(0, 2).map((p) => p.def.id), open: [] };
    expect(scoreShift(plan, rec, [], 0, h).score).toBe(100);
  });
});

describe('a whole shift on the engine', () => {
  for (const seed of [11, 2026])
    it(`seed ${seed}: an operator who acks, fixes and returns equipment to service ends the shift with no racks down`, { timeout: 120_000 }, () => {
      const plan = planShift(seed);
      const e = new EngineV2('2N');
      e.applyScenario(plan.map((x) => ({ at: x.at, action: x.def.action })));
      for (let t = 0; t < SHIFT.lengthS; t += 60) {
        e.run(60);
        e.apply({ a: 'ackAll' });
        for (const { def, at } of plan) {
          if (e.t < at) continue;
          if (def.fix.kind === 'restore' && e.t >= at + def.fix.readyAfterS && e.sim.graph.get(def.fix.id).status === 'failed') e.apply({ a: 'restore', id: def.fix.id });
          if (def.fix.kind === 'operator' && e.t >= at + 300) e.apply(def.fix.check === 'containment-shut' ? { a: 'containment', mode: 'full' } : { a: 'blanking', missing: 0 });
        }
      }
      expect(e.sim.droppedRacks()).toEqual([]);
      for (const { def } of plan) if (def.fix.kind === 'restore') expect(e.sim.graph.get(def.fix.id).status, def.id).not.toBe('failed');
    });
});
