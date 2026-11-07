import { approach, breakerTripTimeS, ELEC, kvaOf, kvarOf, lineAmps, phaseImbalancePct, transformerRiseC } from '../physics';
import { EngineV2 } from '../v2/engine';
import { ElectricalModel, type ElecReading } from '../v2/electrical';

describe('electrical formulas (hand-worked)', () => {
  it('kVA and kvar from kW and PF', () => {
    expect(kvaOf(900, 0.9)).toBeCloseTo(1000); // 900 ÷ 0.9
    expect(kvarOf(100, 0.8)).toBeCloseTo(75); // 100 × tan(acos 0.8) = 100 × 0.75
    expect(kvaOf(100, 0)).toBeCloseTo(2000); // PF clamped to 0.05: never Infinity
    expect(kvaOf(NaN, 0.9)).toBe(0);
  });
  it('line current', () => {
    expect(lineAmps(1000, 480)).toBeCloseTo(1202.8, 1); // 1,000,000 ÷ (1.7320508 × 480)
    expect(lineAmps(1000, 12_470)).toBeCloseTo(46.3, 1); // 1,000,000 ÷ 21,598.7
    expect(lineAmps(1000, 0)).toBe(0);
  });
  it('phase imbalance', () => {
    expect(phaseImbalancePct(100, 104, 96)).toBeCloseTo(4); // avg 100, worst deviation 4
    expect(phaseImbalancePct(100, 100, 100)).toBe(0);
    expect(phaseImbalancePct(0, 0, 0)).toBe(0);
  });
  it('transformer rise and the first-order lag', () => {
    expect(transformerRiseC(0.5)).toBeCloseTo(26.4, 1); // 80 × 0.5^1.6 = 80 × 0.3299
    expect(transformerRiseC(1)).toBe(80);
    expect(transformerRiseC(5)).toBeCloseTo(80 * 2 ** 1.6); // loading clamped to 2
    // One time constant reaches 63.2% of the step: 0 → 100 over τ gives 63.2
    expect(approach(0, 100, 3600, 3600)).toBeCloseTo(63.2, 1);
    expect(approach(5, 100, 10, 0)).toBe(100);
  });
  it('inverse-time trip curve (LSI concept)', () => {
    expect(breakerTripTimeS(0.9)).toBe(Infinity);
    expect(breakerTripTimeS(1)).toBe(Infinity); // at pickup: no trip
    expect(breakerTripTimeS(1.5)).toBeCloseTo(160); // 10 × (6/1.5)² = 10 × 16
    expect(breakerTripTimeS(3)).toBeCloseTo(40); // 10 × (6/3)²
    expect(breakerTripTimeS(2)).toBeGreaterThan(breakerTripTimeS(3)); // more current, faster trip
    expect(breakerTripTimeS(6)).toBe(ELEC.stDelayS);
    expect(breakerTripTimeS(12)).toBe(ELEC.instClearS);
    expect(breakerTripTimeS(NaN)).toBe(Infinity);
  });
});

describe('electrical model on the 2N plant (simplified load flow)', () => {
  const e = new EngineV2('2N', 1);
  e.run(5);
  const r = (id: string) => e.elec.read(e.sim, id);

  it('normal line-up: each side about 40% loaded, no breaker above 60%', () => {
    expect(r('TX-A').loading).toBeGreaterThan(0.3);
    expect(r('TX-A').loading).toBeLessThan(0.5);
    for (const b of e.sim.graph.byKind('breaker')) expect(r(b.id).loading).toBeLessThan(0.6);
  });
  it('kVA ≥ kW, PF in range, and current follows S = √3·V·I', () => {
    for (const id of ['TX-A', 'MB-A', 'UIB-A', 'UOB-A', 'R-01']) {
      const x = r(id);
      expect(x.kva).toBeGreaterThanOrEqual(x.kw);
      expect(x.pf).toBeGreaterThan(0.9);
      expect(x.pf).toBeLessThanOrEqual(1);
      expect(x.amps).toBeCloseTo(lineAmps(x.kva, x.volts), 6);
      // The three phase currents average to the line current.
      expect((x.phaseAmps[0] + x.phaseAmps[1] + x.phaseAmps[2]) / 3).toBeCloseTo(x.amps, 6);
    }
  });
  it('a double-conversion UPS shows its own input PF upstream', () => {
    expect(r('UIB-A').pf).toBeCloseTo(ELEC.pfUpsInput, 2);
    expect(r('UOB-A').pf).toBeCloseTo(ELEC.pfIt, 2);
  });
  it('MV current = LV current × (480 ÷ 12,470) for the same kVA (losses aside)', () => {
    const mv = r('UTIL-A'), lv = r('TX-A');
    expect(mv.amps / lineAmps(mv.kva, ELEC.lvVolts)).toBeCloseTo(480 / 12_470, 4);
    expect(lv.volts).toBe(480);
    expect(mv.volts).toBe(12_470);
  });
  it('racks have a small seeded imbalance; it averages out upstream', () => {
    expect(r('R-01').imbalancePct).toBeGreaterThan(0);
    expect(r('R-01').imbalancePct).toBeLessThanOrEqual(ELEC.rackPhaseSkew * 100 + 0.01);
    expect(r('TX-A').imbalancePct).toBeLessThan(r('R-01').imbalancePct);
    // Same seed → same splits; another seed → different.
    expect(new EngineV2('2N', 1).elec.state.split['R-01']).toEqual(e.elec.state.split['R-01']);
    expect(new EngineV2('2N', 2).elec.state.split['R-01']).not.toEqual(e.elec.state.split['R-01']);
  });
  it('a de-energized component reads zero, never NaN', () => {
    const c = e.copy();
    c.apply({ a: 'epo' });
    c.run(2);
    const x = c.elec.read(c.sim, 'R-01');
    expect(x.kw).toBe(0);
    expect(x.amps).toBe(0);
    expect(Number.isNaN(x.imbalancePct)).toBe(false);
  });
  it('transformer temperature follows load with a lag (side B lost → side A heats up)', () => {
    const c = e.copy();
    const t0 = c.elec.txTempC('TX-A');
    c.apply({ a: 'fail', id: 'UTIL-B' });
    c.apply({ a: 'fail', id: 'GEN-B1' });
    c.apply({ a: 'fail', id: 'GEN-B2' });
    c.apply({ a: 'fail', id: 'GEN-B3' });
    // Side B rides on its BESS (~42 min) and UPS batteries first; then side A takes the whole load.
    c.run(3400);
    expect(c.elec.read(c.sim, 'TX-A').loading).toBeGreaterThan(0.7);
    c.run(600);
    const t10 = c.elec.txTempC('TX-A');
    c.run(6 * 3600);
    const tSteady = c.elec.txTempC('TX-A');
    expect(t10).toBeGreaterThan(t0); // warming
    expect(tSteady).toBeGreaterThan(t10 + 5); // still rising 10 min in (τ = 1 h)
    expect(tSteady).toBeGreaterThan(ELEC.txAmbientC + transformerRiseC(0.7) - 5); // near the 70%+ load rise
  });

  it('transformer lag, hand-worked: fixed 90% load, one time constant later the rise is 63.2% of the way', () => {
    const c = new EngineV2('2N', 1);
    const model = c.elec;
    const real = model.read.bind(model);
    model.read = (sim, id) => (id === 'TX-A' ? { ...real(sim, id), loading: 0.9 } : real(sim, id));
    const r0 = model.state.txRise['TX-A']!;
    const target = transformerRiseC(0.9); // 80 × 0.9^1.6 = 80 × 0.8448 = 67.6 °C
    expect(target).toBeCloseTo(67.6, 1);
    c.run(ELEC.txTauS);
    expect(model.state.txRise['TX-A']!).toBeCloseTo(r0 + (target - r0) * (1 - Math.exp(-1)), 1);
  });
});

describe('breaker protection (thermal memory)', () => {
  /** Engine whose electrical reading for one breaker is forced to a multiple of its rating. */
  function forced(id: string, multiple: () => number) {
    const e = new EngineV2('2N', 1);
    const model = e.elec as ElectricalModel & { read: ElectricalModel['read'] };
    const real = model.read.bind(model);
    model.read = (sim, nid): ElecReading => {
      const x = real(sim, nid);
      if (nid !== id || !sim.graph.get(id).state.closed) return x;
      const amps = lineAmps(sim.graph.get(id).ratedKw, x.volts) * multiple();
      return { ...x, amps, phaseAmps: [amps, amps, amps] };
    };
    return e;
  }

  it('150% overload trips after 10 × (6/1.5)² = 160 s, not before', () => {
    const e = forced('MB-A', () => 1.5);
    e.run(158);
    expect(e.sim.graph.get('MB-A').state.closed).toBe(true);
    expect(e.elec.secondsToTrip(e.sim, 'MB-A')).toBeCloseTo(2, 0);
    e.run(3);
    expect(e.sim.graph.get('MB-A').state.closed).toBe(false);
    const ev = e.sim.events.find((x) => /MB-A TRIPPED: long time overload at 150%/.test(x.message));
    expect(ev?.severity).toBe('alarm');
    expect(ev?.t).toBeGreaterThanOrEqual(159);
    expect(ev?.t).toBeLessThanOrEqual(161);
  });
  it('a short-circuit level current trips within one tick (instantaneous)', () => {
    const e = forced('UOB-A', () => 15);
    e.run(1);
    expect(e.sim.graph.get('UOB-A').state.closed).toBe(false);
    expect(e.sim.events.some((x) => /UOB-A TRIPPED: instantaneous/.test(x.message))).toBe(true);
  });
  it('thermal memory: a short overload that ends cools off instead of tripping later', () => {
    let m = 1.5;
    const e = forced('MB-A', () => m);
    e.run(100); // 100 of 160 s used
    m = 0.5;
    e.run(1200); // two cool-down time constants
    m = 1.5;
    e.run(100); // would trip at ~60 s if memory had not cooled
    expect(e.sim.graph.get('MB-A').state.closed).toBe(true);
    expect(e.elec.state.heat['MB-A']).toBeGreaterThan(0.6);
  });
  it('right at pickup never trips', () => {
    const e = forced('MB-A', () => 1.0);
    e.run(3600);
    expect(e.sim.graph.get('MB-A').state.closed).toBe(true);
  });
  it('electrical state survives snapshot → JSON → restore', () => {
    const e = new EngineV2('2N', 4);
    e.run(30);
    const b = EngineV2.fromSnapshot(JSON.parse(JSON.stringify(e.snapshot())));
    expect(b.elec.state).toEqual(e.elec.state);
    expect(b.elec.read(b.sim, 'TX-A')).toEqual(e.elec.read(e.sim, 'TX-A'));
  });
});

describe('tick budget', () => {
  it('a v2 tick (plant + electrical model) stays under 4 ms on the largest designs', () => {
    for (const top of ['2N', 'BLOCK', '2N+1'] as const) {
      const e = new EngineV2(top, 1);
      e.run(10); // warm caches
      const t0 = performance.now();
      e.run(300);
      const msPerTick = (performance.now() - t0) / 300;
      expect(msPerTick, `${top}: ${msPerTick.toFixed(2)} ms/tick`).toBeLessThan(4);
    }
  });
});
