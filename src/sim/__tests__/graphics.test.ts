/** Phase 5 (graphics v2): display math, the trend recorder and the alarm → equipment link. Hand-worked values. */
import { describe, expect, it } from 'vitest';
import { flowDashS, shareOfTotal, sparkPath, TREND } from '../physics';
import { EngineV2 } from '../v2/engine';
import { TrendRecorder } from '../v2/trends';

describe('flowDashS', () => {
  it('full flow 0.6 s, half flow 1.2 s, trickle held at 3 s, none = no animation', () => {
    expect(flowDashS(1)).toBeCloseTo(0.6, 9);
    expect(flowDashS(1.4)).toBeCloseTo(0.6, 9); // over 100% still full speed
    expect(flowDashS(0.5)).toBeCloseTo(1.2, 9);
    expect(flowDashS(0.1)).toBe(3);
    expect(flowDashS(0)).toBe(0);
    expect(flowDashS(NaN)).toBe(0);
  });
});

describe('shareOfTotal', () => {
  it('IT 2,000 + chillers 300 + fans 100 = 2,400 → 0.833 / 0.125 / 0.042', () => {
    const s = shareOfTotal([2000, 300, 100]);
    expect(s[0]).toBeCloseTo(0.8333, 4);
    expect(s[1]).toBeCloseTo(0.125, 9);
    expect(s[2]).toBeCloseTo(0.04167, 4);
    expect(s.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
  });
  it('negative and NaN parts count as 0; all zero → all 0', () => {
    expect(shareOfTotal([1, -5, NaN, 1])).toEqual([0.5, 0, 0, 0.5]);
    expect(shareOfTotal([0, 0])).toEqual([0, 0]);
  });
});

describe('sparkPath', () => {
  it('[20, 22, 24] on 100 × 20 → M0,20 L50,10 L100,0', () => {
    expect(sparkPath([20, 22, 24], 100, 20)).toEqual({ d: 'M0,20 L50,10 L100,0', lo: 20, hi: 24 });
  });
  it('a flat line sits mid-box (range widened to minSpan)', () => {
    const p = sparkPath([18, 18, 18], 100, 20, 2);
    expect(p).toEqual({ d: 'M0,10 L50,10 L100,10', lo: 17, hi: 19 });
  });
  it('NaN breaks the line; empty input draws nothing', () => {
    expect(sparkPath([1, NaN, 3], 10, 10, 1).d).toBe('M0,10 M10,0');
    expect(sparkPath([], 10, 10).d).toBe('');
    expect(sparkPath([NaN], 10, 10).d).toBe('');
  });
});

describe('TrendRecorder', () => {
  const read = () => ({ inletC: 24, chwsC: 18, cwC: 29, pue: 1.24, tesSoc: 1, fanSpeed: 0.79, itKw: 2000 });
  it('samples every 10 s of sim time and keeps 1 h (360 samples)', () => {
    const r = new TrendRecorder();
    for (let t = 0; t <= 7200; t++) r.maybeRecord(t, read);
    expect(TREND.sampleS).toBe(10);
    expect(r.samples).toHaveLength(TREND.keep);
    expect(r.samples[0]!.t).toBe(7200 - (TREND.keep - 1) * 10);
    expect(r.samples.at(-1)!.t).toBe(7200);
  });
  it('a skipped stretch records once when it resumes, then back on the 10 s grid', () => {
    const r = new TrendRecorder();
    r.maybeRecord(0, read);
    expect(r.maybeRecord(5, read)).toBe(false);
    expect(r.maybeRecord(37, read)).toBe(true);
    expect(r.maybeRecord(39, read)).toBe(false);
    expect(r.maybeRecord(40, read)).toBe(true);
    expect(r.samples.map((s) => s.t)).toEqual([0, 37, 40]);
  });
});

describe('engine v2 trends', () => {
  it('a 10-minute run gives 61 samples (t = 0 … 600) with the live readings', () => {
    const e = new EngineV2('2N');
    e.run(600);
    const s = e.trends.samples;
    expect(s).toHaveLength(61);
    expect(s[0]!.t).toBe(0);
    expect(s.at(-1)!.t).toBe(600);
    const last = s.at(-1)!;
    expect(last.inletC).toBeCloseTo(e.air.reading.temps.rackIn, 6);
    expect(last.chwsC).toBeCloseTo(e.hyd.reading.chwsC, 6);
    expect(last.pue).toBeCloseTo(e.efficiency.pue, 6);
  });
  it('is deterministic: two engines with the same actions record the same trend', () => {
    const run = () => {
      const e = new EngineV2('2N');
      e.run(120);
      e.apply({ a: 'fail', id: 'CHWP-01' });
      e.run(300);
      return JSON.stringify(e.trends.samples);
    };
    expect(run()).toBe(run());
  });
});

describe('alarms carry their equipment for overlays', () => {
  it('a failed CRAH alarm names CRAH-101 as its equipment', () => {
    const e = new EngineV2('2N');
    e.apply({ a: 'fail', id: 'CRAH-101' });
    e.tick();
    const a = e.alarmSummary.list.find((x) => x.id === 'CRAH-101.FAIL');
    expect(a?.equipment).toBe('CRAH-101');
  });
});

describe('alarm overlays (graphics v2 view layer)', async () => {
  const { alarmsByEquipment, alarmClass, alarmWords } = await import('../../ui/sim/v2view');
  const { plantModel } = await import('../../ui/three/plantModel');
  it('groups alarms by equipment: highest priority wins, count and unacked roll up', () => {
    const e = new EngineV2('2N');
    e.apply({ a: 'fail', id: 'CRAH-101' });
    e.apply({ a: 'fail', id: 'CHWP-01' });
    e.tick();
    const m = alarmsByEquipment(e.alarmSummary, (id) => e.sim.graph.nodes.has(id));
    expect(m.get('CRAH-101')).toMatchObject({ priority: 'medium', unacked: true, count: 1, text: 'Equipment failed' });
    expect(m.get('CHWP-01')?.unacked).toBe(true);
    expect(alarmClass(m.get('CRAH-101'))).toBe('alm alm-medium alm-unack');
    expect(alarmWords(m.get('CRAH-101'))).toBe(' In alarm: Medium, Equipment failed, not acknowledged.');
    e.apply({ a: 'ack', alarm: 'CRAH-101.FAIL' });
    const m2 = alarmsByEquipment(e.alarmSummary, (id) => e.sim.graph.nodes.has(id));
    expect(m2.get('CRAH-101')?.unacked).toBe(false);
    expect(alarmClass(m2.get('CRAH-101'))).toBe('alm alm-medium');
  });
  it('a healthy plant draws no overlays; shelved alarms do not draw', () => {
    const e = new EngineV2('2N');
    e.run(30);
    expect(alarmsByEquipment(e.alarmSummary, () => true).size).toBe(0);
    e.apply({ a: 'fail', id: 'CRAH-101' });
    e.tick();
    e.apply({ a: 'shelve', alarm: 'CRAH-101.FAIL', s: 1800 });
    expect(alarmsByEquipment(e.alarmSummary, () => true).has('CRAH-101')).toBe(false);
    expect(alarmsByEquipment(null, () => true).size).toBe(0);
  });
  it('an alarm without an equipment link maps to its source when that is a component (TES-01)', () => {
    const fake = { list: [{ id: 'TES.DISCH', source: 'TES-01', text: 'Storage tank discharging', priority: 'low' as const, group: 'cooling' as const, state: 'unack' as const, since: 0, firstOut: false, chattering: false }], unacked: 1, shelved: [], suppressed: [], flood: false, rate10min: 1 };
    expect(alarmsByEquipment(fake, (id) => id === 'TES-01').get('TES-01')?.priority).toBe('low');
    expect(alarmsByEquipment(fake, () => false).size).toBe(0);
  });
  it('the 3D plant model carries the alarm for its beacon', () => {
    const e = new EngineV2('2N');
    e.apply({ a: 'fail', id: 'CRAH-101' });
    e.tick();
    const m = alarmsByEquipment(e.alarmSummary, (id) => e.sim.graph.nodes.has(id));
    const mech = plantModel(e.sim, 'mechanical', m);
    expect(mech.nodes.find((n) => n.id === 'CRAH-101')?.alarm).toEqual({ priority: 'medium', unacked: true });
    expect(mech.nodes.filter((n) => n.alarm)).toHaveLength(1);
    expect(plantModel(e.sim, 'mechanical').nodes.some((n) => n.alarm)).toBe(false);
  });
});
