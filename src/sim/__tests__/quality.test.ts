/** Phase 8a: utility power quality events (sag, swell, single-phasing, imbalance) and the plant's response. */
import { describe, expect, it } from 'vitest';
import { PQ, pqInvalid, pqResponse } from '../physics';
import { EngineV2, type EngineSnapshot } from '../v2/engine';
import type { Action } from '../actions';

const ready = () => {
  const e = new EngineV2('2N');
  e.run(600);
  return e;
};
const upsModes = (e: EngineV2, sys: 'A' | 'B') => e.sim.graph.byKind('ups').filter((u) => u.id.startsWith(`UPS-${sys}`)).map((u) => e.sim.solution.upsMode.get(u.id));
const gens = (e: EngineV2, sys: 'A' | 'B') => e.sim.graph.byKind('generator').filter((g) => g.id.startsWith(`GEN-${sys}`)).map((g) => g.state.genState);
const ats = (e: EngineV2, id: string) => e.sim.graph.get(id).state.selected;
const ev = (kind: 'sag' | 'swell' | 'single-phase' | 'imbalance', pct: number, s: number, id = 'UTIL-A'): Action => ({ a: 'utilityEvent', id, kind, pct, s });

describe('pqResponse (hand-worked)', () => {
  it('sag 88%: inside every window, nothing responds', () => expect(pqResponse('sag', 88)).toEqual({ upsBattery: false, atsReject: false, motorsDrop: false, imbalance: false }));
  it('sag 80%: below the UPS and ATS windows (85%), motors ride through (70%)', () => expect(pqResponse('sag', 80)).toEqual({ upsBattery: true, atsReject: true, motorsDrop: false, imbalance: false }));
  it('sag 50%: everything responds, motors drop', () => expect(pqResponse('sag', 50)).toMatchObject({ upsBattery: true, atsReject: true, motorsDrop: true }));
  it('swell 115%: over the 110% windows', () => expect(pqResponse('swell', 115)).toMatchObject({ upsBattery: true, atsReject: true, motorsDrop: false }));
  it('swell 108%: inside', () => expect(pqResponse('swell', 108)).toMatchObject({ upsBattery: false, atsReject: false }));
  it('single-phasing: outside every window', () => expect(pqResponse('single-phase', 0)).toEqual({ upsBattery: true, atsReject: true, motorsDrop: true, imbalance: true }));
  it('imbalance 3% alarms (over 2%), 1.5% does not; neither moves the UPS or ATS', () => {
    expect(pqResponse('imbalance', 3)).toEqual({ upsBattery: false, atsReject: false, motorsDrop: false, imbalance: true });
    expect(pqResponse('imbalance', 1.5).imbalance).toBe(false);
  });
  it('rejects events outside the accepted ranges', () => {
    expect(pqInvalid('sag', 95, 1)).toMatch(/sag/);
    expect(pqInvalid('swell', 100, 1)).toMatch(/swell/);
    expect(pqInvalid('sag', 80, 0.01)).toMatch(/Duration/);
    expect(pqInvalid('sag', 80, PQ.durationS[1] + 1)).toMatch(/Duration/);
    expect(pqInvalid('single-phase', 0, 30)).toBeNull();
  });
});

describe('plant response', () => {
  it('a shallow sag (88%) rides through: UPS stays on double conversion, no generator start', () => {
    const e = ready();
    expect(e.apply(ev('sag', 88, 3)).ok).toBe(true);
    for (let i = 0; i < 5; i++) {
      e.tick();
      expect(upsModes(e, 'A').every((m) => m === 'normal')).toBe(true);
    }
    expect(gens(e, 'A').every((g) => g === 'off')).toBe(true);
    expect(e.alarmSummary.list.some((a) => a.id === 'UTIL-A.PQ')).toBe(true);
  });

  it('a 1 s sag to 80%: UPS A on battery for the event only, ATS start delay rides through, B side untouched', () => {
    const e = ready();
    e.apply(ev('sag', 80, 1));
    expect(upsModes(e, 'A').every((m) => m === 'battery')).toBe(true);
    expect(upsModes(e, 'B').every((m) => m === 'normal')).toBe(true);
    e.run(5);
    expect(upsModes(e, 'A').every((m) => m === 'normal')).toBe(true);
    expect(gens(e, 'A').every((g) => g === 'off')).toBe(true);
    expect(ats(e, 'ATS-A')).toBe('normal');
  });

  it('a 5 s sag to 80%: generators start (past the 2 s start delay), no transfer, then cool down 5 min and stop', () => {
    const e = ready();
    e.apply(ev('sag', 80, 5));
    e.run(4);
    expect(gens(e, 'A').every((g) => g === 'cranking')).toBe(true);
    e.run(20);
    expect(ats(e, 'ATS-A')).toBe('normal');
    expect(gens(e, 'A').every((g) => g === 'running')).toBe(true);
    expect(e.sim.events.some((x) => /cool-down/.test(x.message))).toBe(true);
    e.run(PQ.genCooldownS);
    expect(gens(e, 'A').every((g) => g === 'off')).toBe(true);
  });

  it('a deep 200 ms sag (50%): chillers on that service drop and restart on their timer; no generator start', () => {
    const e = ready();
    const running = Object.entries(e.hyd.state.chillers).filter(([, c]) => c.mode === 'running').map(([id]) => id);
    expect(running.length).toBeGreaterThan(0);
    e.apply(ev('sag', 50, 0.2));
    const dropped = Object.entries(e.hyd.state.chillers).filter(([id, c]) => running.includes(id) && c.mode !== 'running').map(([id]) => id);
    expect(dropped.length).toBeGreaterThan(0);
    e.run(5);
    expect(upsModes(e, 'A').every((m) => m === 'normal')).toBe(true);
    expect(gens(e, 'A').every((g) => g === 'off')).toBe(true);
    e.run(240);
    for (const id of dropped) expect(e.hyd.state.chillers[id]!.mode).toBe('running');
    // Not a latched trip: no chiller is failed.
    for (const id of dropped) expect(e.sim.graph.get(id).status).not.toBe('failed');
  });

  it('single-phasing for 60 s: ATS transfers to generator; retransfers after the utility is stable', () => {
    const e = ready();
    e.apply(ev('single-phase', 0, 60));
    e.run(15);
    expect(ats(e, 'ATS-A')).toBe('emergency');
    expect(upsModes(e, 'A').every((m) => m === 'normal')).toBe(true); // now fed from the generators
    e.run(60);
    expect(ats(e, 'ATS-A')).toBe('emergency'); // retransfer timer still running
    e.run(320);
    expect(ats(e, 'ATS-A')).toBe('normal');
  });

  it('a bus already on generator rides through a sag on its utility', () => {
    const e = ready();
    e.apply(ev('single-phase', 0, 600));
    e.run(20);
    expect(ats(e, 'ATS-A')).toBe('emergency');
    e.apply(ev('sag', 50, 1));
    expect(upsModes(e, 'A').every((m) => m === 'normal')).toBe(true);
  });

  it('a 1 s swell to 115%: UPS on battery for the event', () => {
    const e = ready();
    e.apply(ev('swell', 115, 1));
    expect(upsModes(e, 'A').every((m) => m === 'battery')).toBe(true);
    e.run(3);
    expect(upsModes(e, 'A').every((m) => m === 'normal')).toBe(true);
  });

  it('imbalance 3%: alarm after its delay, no UPS or ATS change', () => {
    const e = ready();
    e.apply(ev('imbalance', 3, 60));
    e.run(8);
    expect(e.alarmSummary.list.some((a) => a.id === 'UTIL-A.IMB')).toBe(true);
    expect(upsModes(e, 'A').every((m) => m === 'normal')).toBe(true);
    expect(ats(e, 'ATS-A')).toBe('normal');
  });

  it('refuses a bad event without touching the plant', () => {
    const e = ready();
    expect(e.apply(ev('sag', 95, 1)).ok).toBe(false);
    expect(e.apply(ev('sag', 80, 1, 'UPS-A1')).ok).toBe(false);
    expect(e.pq.active.length).toBe(0);
  });
});

describe('determinism', () => {
  it('replay of a run with events gives the same plant', () => {
    const e = ready();
    e.apply(ev('sag', 80, 5));
    e.run(30);
    e.apply(ev('single-phase', 0, 40, 'UTIL-B'));
    e.run(100);
    const r = EngineV2.replay('2N', e.seed, e.log);
    while (r.t < e.t) r.tick();
    expect(JSON.stringify(r.sim.snapshot().nodes)).toBe(JSON.stringify(e.sim.snapshot().nodes));
  });
  it('a snapshot taken mid-event continues the same way', () => {
    const e = ready();
    e.apply(ev('sag', 80, 30));
    e.run(5);
    const c = EngineV2.fromSnapshot(JSON.parse(JSON.stringify(e.snapshot())) as EngineSnapshot);
    expect(upsModes(c, 'A')).toEqual(upsModes(e, 'A'));
    e.run(60);
    c.run(60);
    expect(JSON.stringify(c.sim.snapshot().nodes)).toBe(JSON.stringify(e.sim.snapshot().nodes));
  });
});
