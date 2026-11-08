import { FAULTS } from '../../content/faults';
import { ALARM } from '../physics';
import type { AlarmCtx, AlarmDef } from '../v2/alarms';
import { EngineV2, type EngineSnapshot } from '../v2/engine';

/** A plant with one hand-driven test alarm, so delays and deadbands can be checked tick by tick. */
function rig(def: Partial<AlarmDef>) {
  const e = new EngineV2('2N');
  const box = { v: 0, on: false };
  const d: AlarmDef = {
    id: 'T.X',
    source: 'Test',
    text: 'Test alarm',
    priority: 'high',
    group: 'cooling',
    onDelayS: 0,
    offDelayS: 0,
    ...(def.analog === undefined && def.active === undefined ? { active: () => box.on } : {}),
    ...def,
  };
  if (d.analog) d.analog = { ...d.analog, value: () => box.v };
  e.alarms.init(e.sim, [d]);
  return { e, box, state: () => e.alarms.state.rec['T.X']!, list: () => e.alarmSummary.list };
}

describe('alarm engine (ISA-18.2 names, simplified)', () => {
  it('normal operation has no standing alarms (2N, N, block designs, mild and winter)', () => {
    for (const topo of ['2N', 'N', 'BLOCK'] as const) {
      const e = new EngineV2(topo);
      e.run(900);
      expect(e.alarmSummary.list, topo).toEqual([]);
      e.apply({ a: 'weather', w: 'winter' });
      e.run(1200);
      expect(e.alarmSummary.list.map((a) => a.id), `${topo} winter`).toEqual([]);
    }
  });

  it('on-delay: must stay true 10 s; off-delay: must stay clear 5 s', () => {
    const { e, box, state } = rig({ onDelayS: 10, offDelayS: 5 });
    box.on = true;
    e.run(9);
    expect(state().state).toBe('normal');
    e.run(2);
    expect(state().state).toBe('unack');
    box.on = false;
    e.run(4);
    expect(state().activeSince).not.toBeNull();
    e.run(2);
    expect(state().state).toBe('rtn-unack');
  });

  it('analog deadband: in above 27, out only below 26.5', () => {
    const { e, box, state } = rig({ analog: { value: () => 0, setpoint: 27, deadband: 0.5, unit: '°C' } });
    box.v = 27.2;
    e.run(1);
    expect(state().state).toBe('unack');
    box.v = 26.8; // inside the deadband: stays in
    e.run(3);
    expect(state().activeSince).not.toBeNull();
    box.v = 26.4;
    e.run(1);
    expect(state().activeSince).toBeNull();
  });

  it('states: unack → ack → normal when it clears; active → RTN unack → normal when acknowledged', () => {
    const { e, box, state } = rig({});
    box.on = true;
    e.run(1);
    expect(e.apply({ a: 'ack', alarm: 'T.X' }).ok).toBe(true);
    expect(state().state).toBe('ack');
    box.on = false;
    e.run(1);
    expect(state().state).toBe('normal');
    box.on = true;
    e.run(1);
    box.on = false;
    e.run(1);
    expect(state().state).toBe('rtn-unack');
    e.apply({ a: 'ackAll' });
    expect(state().state).toBe('normal');
    expect(e.apply({ a: 'ack', alarm: 'NOPE' }).ok).toBe(false);
  });

  it('shelving hides an alarm for a set time only, then it comes back; no shelving past 8 h', () => {
    const { e, box, list } = rig({});
    box.on = true;
    e.run(1);
    expect(e.apply({ a: 'shelve', alarm: 'T.X', s: 60 }).ok).toBe(true);
    expect(list()).toEqual([]);
    expect(e.alarmSummary.shelved).toEqual(['T.X']);
    e.run(61);
    expect(list().map((a) => a.id)).toEqual(['T.X']);
    expect(e.apply({ a: 'shelve', alarm: 'T.X', s: ALARM.maxShelveS + 1 }).ok).toBe(false);
    expect(e.apply({ a: 'shelve', alarm: 'T.X', s: 0 }).ok).toBe(false);
  });

  it('chattering: 3 activations inside 60 s are flagged as a nuisance alarm', () => {
    const { e, box, list } = rig({});
    for (let i = 0; i < 3; i++) {
      box.on = true;
      e.run(2);
      box.on = false;
      e.run(2);
    }
    box.on = true;
    e.run(1);
    expect(list()[0]!.chattering).toBe(true);
  });

  it('flood: more than 10 new alarms in 10 minutes', () => {
    const e = new EngineV2('2N');
    const box = { on: false };
    const defs: AlarmDef[] = Array.from({ length: 11 }, (_, i) => ({ id: `F.${i}`, source: 'Test', text: 'x', priority: 'low' as const, group: 'hall' as const, onDelayS: i * 30, offDelayS: 0, active: (_c: AlarmCtx) => box.on }));
    e.alarms.init(e.sim, defs);
    box.on = true;
    e.run(200);
    expect(e.alarmSummary.flood).toBe(false);
    e.run(200);
    expect(e.alarmSummary.rate10min).toBe(11);
    expect(e.alarmSummary.flood).toBe(true);
  });

  it('first-out: the pump failure is marked first; the low-flow alarm that follows is not', () => {
    const e = new EngineV2('2N');
    e.run(60);
    for (const id of ['CHWP-01', 'CHWP-02', 'CHWP-03']) e.apply({ a: 'fail', id });
    e.run(15);
    const s = e.alarmSummary;
    expect(s.list.find((a) => a.id === 'CHWP-01.FAIL')?.firstOut).toBe(true);
    expect(s.list.find((a) => a.id === 'CHW.FLOW-LO')?.firstOut).toBe(false);
  });

  it('suppressed by design: equipment in maintenance does not alarm', () => {
    const e = new EngineV2('2N');
    e.run(60);
    expect(e.apply({ a: 'maint', id: 'CRAH-101' }).ok).toBe(true);
    e.run(5);
    expect(e.alarmSummary.suppressed).toContain('CRAH-101.FAIL');
    expect(e.alarmSummary.list.map((a) => a.id)).not.toContain('CRAH-101.FAIL');
  });

  it('priorities sort critical first; snapshot → restore → replay give identical alarm state', () => {
    const e = new EngineV2('2N');
    e.run(60);
    for (const id of ['CHWP-01', 'CHWP-02', 'CHWP-03']) e.apply({ a: 'fail', id });
    e.run(120);
    e.apply({ a: 'ack', alarm: 'CHW.FLOW-LO' });
    e.apply({ a: 'shelve', alarm: 'CHWP-01.FAIL', s: 600 });
    e.run(60);
    const order = e.alarmSummary.list.map((a) => a.priority);
    const rank = { critical: 0, high: 1, medium: 2, low: 3 };
    expect([...order].sort((a, b) => rank[a] - rank[b])).toEqual(order);
    const r = EngineV2.fromSnapshot(JSON.parse(JSON.stringify(e.snapshot())) as EngineSnapshot);
    e.run(300);
    r.run(300);
    expect(r.alarms.snapshot()).toEqual(e.alarms.snapshot());
    const rep = EngineV2.replay('2N', e.seed, e.log);
    rep.run(e.t - rep.t);
    expect(rep.alarms.snapshot()).toEqual(e.alarms.snapshot());
  });
});

describe('fault-symptom library', () => {
  const ids = new EngineV2('2N').alarms.defs.map((d) => d.id);
  const matches = (pattern: string, list: string[]) => {
    const re = new RegExp(`^${pattern.replace(/[.]/g, '\\.').replace(/\*/g, '.*')}$`);
    return list.filter((x) => re.test(x));
  };

  it('every fault has causes, alarms that exist, a trend signature and a response; ids unique', () => {
    expect(FAULTS.length).toBeGreaterThanOrEqual(12);
    expect(new Set(FAULTS.map((f) => f.id)).size).toBe(FAULTS.length);
    for (const f of FAULTS) {
      expect(f.causes.length, f.id).toBeGreaterThan(0);
      expect(f.response.length, f.id).toBeGreaterThan(0);
      expect(f.trend.length, f.id).toBeGreaterThan(40);
      for (const a of f.alarms) expect(matches(a, ids).length, `${f.id}: ${a}`).toBeGreaterThan(0);
    }
  });

  it('every alarm that points to a fault points to one that exists', () => {
    const faultIds = new Set(FAULTS.map((f) => f.id));
    for (const d of new EngineV2('2N').alarms.defs) if (d.fault) expect(faultIds.has(d.fault), d.id).toBe(true);
  });

  for (const f of FAULTS.filter((x) => x.inject)) {
    it(`${f.id}: injecting it brings in its alarms within ${f.inject!.within} s`, { timeout: 60_000 }, () => {
      const e = new EngineV2('2N');
      if (f.inject!.weather) e.apply({ a: 'weather', w: f.inject!.weather });
      e.run(600);
      for (const a of f.inject!.actions) expect(e.apply(a).ok, JSON.stringify(a)).toBe(true);
      const seen = new Set<string>();
      for (let s = 0; s < f.inject!.within; s++) {
        e.tick();
        for (const a of e.alarmSummary.list) seen.add(a.id);
      }
      for (const a of f.alarms) expect(matches(a, [...seen]).length, `${f.id} → ${a} (saw ${[...seen].join(', ')})`).toBeGreaterThan(0);
    });
  }
});
