/**
 * Golden scenarios (Phase 4e) on engine v2. Each one is hand-checked where the math is simple
 * (times from the stated delays, tank ride-through from Q = m·cp·ΔT) and pinned with an approved
 * snapshot of rounded key readings otherwise. A changed snapshot means the plant behaves differently:
 * review it like a code change before updating (`npx vitest -u`).
 */
import { EFF, PHYSICS } from '../physics';
import { EngineV2 } from '../v2/engine';

const TES_FULL_KJ = PHYSICS.tesLitres * PHYSICS.waterCpKj * PHYSICS.chwDeltaTC; // 80,000 × 4.186 × 8 = 2,679,040 kJ

/** Rounded readings for approved snapshots. */
function readings(e: EngineV2) {
  const h = e.hyd.reading;
  const a = e.air.reading;
  const r = (x: number, d = 1) => Math.round(x * 10 ** d) / 10 ** d;
  return {
    t: e.t,
    inletC: r(a.temps.rackIn),
    supplyAirC: r(a.supplyC),
    returnAirC: r(a.temps.room),
    crahFanKw: r(a.fanKw, 0),
    chwsC: r(h.chwsC),
    chwrC: r(h.chwrC),
    tesSoc: r(h.tesSoc, 3),
    chillers: Object.fromEntries(Object.entries(h.chillers).map(([k, c]) => [k, c.mode])),
    econ: h.econMode,
    pue: r(e.efficiency.pue, 3),
    racksDown: e.sim.itDownRacks().length,
    /** priority:id:state, * = first-out (state rtn-unack = cleared but not acknowledged yet). */
    alarms: e.alarmSummary.list.map((x) => `${x.priority}:${x.id}:${x.state}${x.firstOut ? '*' : ''}`),
  };
}

const firstEvent = (e: EngineV2, re: RegExp) => e.sim.events.find((x) => re.test(x.message))?.t ?? null;

function plant(w?: 'hot-dry' | 'winter') {
  const e = new EngineV2('2N');
  if (w) e.apply({ a: 'weather', w });
  e.run(1800);
  return e;
}

describe('golden scenarios (engine v2)', () => {
  it('1. utility loss → generators start → transfer → utility back → retransfer after 5 min', () => {
    const e = plant();
    const t0 = e.t;
    e.apply({ a: 'fail', id: 'UTIL-A' });
    e.run(60);
    // Hand check: ATS waits 2 s, generators need 10 s to accept load, transfer takes 1 s → ~13 s.
    const xfer = firstEvent(e, /ATS-A transferred to generator/)!;
    expect(xfer - t0).toBeGreaterThanOrEqual(PHYSICS.atsStartDelayS + PHYSICS.genStartDelayS);
    expect(xfer - t0).toBeLessThanOrEqual(PHYSICS.atsStartDelayS + PHYSICS.genStartDelayS + PHYSICS.atsTransferDelayS + 2);
    expect(e.sim.itDownRacks()).toEqual([]);
    e.run(540);
    const back = e.t;
    e.apply({ a: 'restore', id: 'UTIL-A' });
    e.run(PHYSICS.atsRetransferDelayS + 30);
    const re = e.sim.events.find((x) => x.t >= back && /ATS-A.*(retransferred|back to normal)/i.test(x.message))?.t ?? null;
    expect(re).not.toBeNull();
    // Hand check: retransfer once the utility has been stable 300 s.
    expect(re! - back).toBeGreaterThanOrEqual(PHYSICS.atsRetransferDelayS);
    expect(re! - back).toBeLessThanOrEqual(PHYSICS.atsRetransferDelayS + 3);
    expect(e.sim.graph.get('ATS-A').state.selected).toBe('normal');
    expect(readings(e)).toMatchSnapshot();
  });

  it('2. utility loss with generators that will not start: overcrank alarms, the BESS carries side A, IT stays up', () => {
    const e = plant();
    e.apply({ a: 'failToStart', p: 1 });
    e.apply({ a: 'fail', id: 'UTIL-A' });
    e.run(120);
    const s = e.alarmSummary.list.map((a) => a.id);
    expect(s).toContain('UTIL-A.LOSS');
    expect(s.some((x) => /^GEN-A\d\.FAIL$/.test(x))).toBe(true);
    expect(e.sim.itDownRacks()).toEqual([]);
    expect(readings(e)).toMatchSnapshot();
  });

  it('3. UPS on battery to end of discharge (no BESS, no generators): runtime matches the estimate at the start; 2N keeps IT up on side B', () => {
    const e = plant();
    e.apply({ a: 'fail', id: 'BESS-A' });
    e.apply({ a: 'failToStart', p: 1 });
    e.apply({ a: 'fail', id: 'UTIL-A' });
    e.run(3);
    const ups = e.sim.graph.byKind('ups').find((u) => e.sim.solution.upsMode.get(u.id) === 'battery')!;
    expect(ups).toBeDefined();
    const est = e.sim.upsRuntimeS(ups.id);
    const t0 = e.t;
    let eod: number | null = null;
    let low: number | null = null;
    for (let i = 0; i < est * 1.3 + 60 && eod === null; i++) {
      e.tick();
      if (low === null && e.alarmSummary.list.some((a) => a.id === 'UPS-A.LOWBATT')) low = e.t;
      if (e.sim.solution.upsMode.get(ups.id) !== 'battery') eod = e.t;
    }
    expect(eod).not.toBeNull();
    // Hand check: battery lasts what the runtime estimate said at the start (±5%), low-battery alarm comes first.
    expect(Math.abs(eod! - t0 - est) / est).toBeLessThan(0.05);
    expect(low).not.toBeNull();
    expect(low!).toBeLessThan(eod!);
    expect(e.sim.itDownRacks()).toEqual([]);
  });

  it('4. chiller trip, tank bridges the restart: tank drops by Q·t / 2,679,040 kJ while the next chiller loads', () => {
    const e = plant();
    const soc0 = e.hyd.reading.tesSoc;
    e.apply({ a: 'fail', id: 'CH-01' });
    e.tick();
    const q = e.hyd.reading.tesKwt;
    expect(q).toBeGreaterThan(1000);
    e.run(59);
    // Hand check: 60 s at the discharge rate.
    expect(soc0 - e.hyd.reading.tesSoc).toBeCloseTo((q * 60) / TES_FULL_KJ, 3);
    e.run(PHYSICS.chillerStartS);
    expect(e.hyd.reading.chillers['CH-02']!.mode).toBe('running');
    expect(e.hyd.reading.tesKwt).toBeLessThan(0); // recharging
    expect(e.alarmSummary.list.find((a) => a.id === 'CH-01.TRIP')?.firstOut).toBe(true);
    expect(readings(e)).toMatchSnapshot();
  });

  it('5. every chiller lost: supply holds until the warm layer reaches the outlet, ≈ 90–100% of 2,679,040 kJ ÷ shortfall', () => {
    const e = plant();
    for (const id of ['CH-01', 'CH-02', 'CH-03', 'ACH-04']) e.apply({ a: 'fail', id });
    e.tick();
    const deficit = e.hyd.reading.tesKwt;
    const t0 = e.t;
    // Ride-through as a tech sees it: until CHW supply starts to climb (0.5 K over setpoint).
    while (e.hyd.reading.chwsC < PHYSICS.chwSupplyC + 0.5 && e.t < t0 + 4 * 3600) e.tick();
    const full = TES_FULL_KJ / deficit;
    // Hand check: full rate for the first 90% of the tank, then the thermocline tail adds a little.
    expect((e.t - t0) / full).toBeGreaterThan(0.9);
    expect((e.t - t0) / full).toBeLessThan(1.0);
    e.run(1200);
    expect(e.hyd.reading.chwsC).toBeGreaterThan(PHYSICS.chwSupplyC + 2);
    expect(e.alarmSummary.list.map((a) => a.id)).toContain('CHW.SUPPLY-HI');
    expect(readings(e)).toMatchSnapshot();
  });

  it('6. chilled water pump failover: standby picks up, flow and supply temperature hold', () => {
    const e = plant();
    e.apply({ a: 'fail', id: 'CHWP-01' });
    e.run(300);
    expect(e.hyd.reading.pumpsRunning).toBe(2);
    expect(e.hyd.reading.flowFrac).toBe(1);
    expect(e.hyd.reading.chwsC).toBeCloseTo(18, 1);
    expect(e.alarmSummary.list.map((a) => a.id)).toEqual(['CHWP-01.FAIL']);
  });

  it('7. all chilled water pumps lost: coils stop, supply air reaches return temperature, racks trip within minutes', () => {
    const e = plant();
    const t0 = e.t;
    for (const id of ['CHWP-01', 'CHWP-02', 'CHWP-03']) e.apply({ a: 'fail', id });
    e.run(900);
    const trip = firstEvent(e, /thermal shutdown \(inlet/)!;
    expect(trip - t0).toBeGreaterThan(120);
    expect(trip - t0).toBeLessThan(600);
    expect(readings(e)).toMatchSnapshot();
  });

  it('8. containment door left open: fans work harder, return air colder, PUE up, low-priority door alarm after 2 min', () => {
    const e = plant();
    const before = readings(e);
    e.apply({ a: 'containment', mode: 'door-open' });
    e.run(110);
    expect(e.alarmSummary.list.map((a) => a.id)).not.toContain('HALL.DOOR');
    e.run(1800);
    const after = readings(e);
    expect(after.crahFanKw).toBeGreaterThan(before.crahFanKw);
    expect(after.returnAirC).toBeLessThan(before.returnAirC);
    expect(after.pue).toBeGreaterThan(before.pue);
    expect(after.alarms).toEqual(['low:HALL.DOOR:unack*']);
    expect(after).toMatchSnapshot();
  });

  it('9. economizer switchover: winter → 105 °F goes full → partial at once, off after the 15-minute dwell', () => {
    const e = plant('winter');
    expect(e.hyd.reading.econMode).toBe('full');
    const t0 = e.t;
    e.apply({ a: 'weather', w: 'hot-dry' });
    e.run(2);
    expect(e.hyd.reading.econMode).toBe('partial');
    while (e.hyd.reading.econMode === 'partial' && e.t < t0 + 3600) e.tick();
    // Hand check: leaves partial one dwell after entering it.
    expect(e.t - t0).toBeGreaterThanOrEqual(EFF.econMinDwellS);
    expect(e.t - t0).toBeLessThanOrEqual(EFF.econMinDwellS + 3);
    e.run(1800);
    expect(readings(e)).toMatchSnapshot();
  });

  it('10. N+2 air handlers: losing two keeps the inlet at 24 °C (fans speed up)', () => {
    const e = plant();
    e.apply({ a: 'fail', id: 'CRAH-101' });
    e.apply({ a: 'fail', id: 'CRAH-102' });
    e.run(1800);
    expect(e.air.reading.temps.rackIn).toBeCloseTo(24, 0);
    expect(e.air.reading.fanSpeed).toBeGreaterThan(0.95);
  });

  it('11. towers lost on a 105 °F day: water-cooled chillers trip on head pressure, CH-03 + air-cooled carry, IT stays up', () => {
    const e = plant('hot-dry');
    e.apply({ a: 'fail', id: 'CT-01' });
    e.apply({ a: 'fail', id: 'CT-02' });
    e.run(1200);
    expect(e.sim.graph.get('CH-01').status).toBe('failed');
    expect(e.hyd.reading.chillers['ACH-04']!.mode).toBe('running');
    expect(e.sim.itDownRacks()).toEqual([]);
    expect(readings(e)).toMatchSnapshot();
  });

  it('12. UPS eco mode: UPS losses drop by load × (1/0.96 − 1/0.99) on that system', () => {
    const e = plant();
    const before = e.efficiency;
    const upsA = e.sim.graph.byKind('ups').filter((u) => /A/.test(u.id));
    const loadA = upsA.reduce((s, u) => s + (e.sim.solution.loadKw.get(u.id) ?? 0), 0);
    e.apply({ a: 'eco', system: 'A', on: true });
    e.run(2);
    const drop = before.parts.upsLoss - e.efficiency.parts.upsLoss;
    expect(drop).toBeCloseTo(loadA * (1 / 0.96 - 1 / 0.99), 0);
  });

  it('13. emergency power off: every rack down, critical IT-down alarm', () => {
    const e = plant();
    e.apply({ a: 'epo' });
    e.run(10);
    expect(e.sim.itDownRacks().length).toBe(e.sim.graph.byKind('rack').length);
    expect(e.alarmSummary.list[0]!.priority).toBe('critical');
    expect(e.alarmSummary.list.map((a) => a.id)).toContain('HALL.IT-DOWN');
  });
});
