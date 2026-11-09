import {
  chillerLiftFactor,
  HYD,
  kwPerTon,
  partLoadPowerFrac,
  PHYSICS,
  pumpHeadKpa,
  pumpKw,
  pumpOperatingPoint,
  systemHeadKpa,
  tesDeliverable,
} from '../physics';
import { EngineV2, type EngineSnapshot } from '../v2/engine';

describe('hydronic formulas (hand-worked)', () => {
  it('constants match the v1 plant: CHW 18 °C supply, 8 K ΔT, water cp 4.186', () => {
    expect(HYD.chwSetpointC).toBe(PHYSICS.chwSupplyC);
    expect(HYD.chwDeltaTK).toBe(PHYSICS.chwDeltaTC);
    expect(HYD.chwSupplyMassKjPerK + HYD.chwReturnMassKjPerK).toBe(PHYSICS.chwLoopMassKjPerC);
    expect(PHYSICS.waterCpKj).toBe(4.186);
    // One pump's design flow carries 1,400 kWt at 8 K: Q = ṁ·cp·ΔT = 41.8 × 4.186 × 8 = 1,399.8 kW.
    expect(HYD.pumpDesignKgS * 4.186 * 8).toBeCloseTo(1400, -1);
  });
  it('pump curve: 250 kPa at design; at 80% speed and 20 kg/s → 200 − 14.31 = 185.69 kPa (affinity H ∝ N²)', () => {
    expect(pumpHeadKpa(41.8, 1)).toBeCloseTo(250, 6);
    expect(pumpHeadKpa(20, 0.8)).toBeCloseTo(185.69, 2);
    expect(pumpHeadKpa(0, 1)).toBeCloseTo(312.5, 6);
  });
  it('system curve: DP setpoint 100 kPa + k·Q², k = 150/83.6²; 50 kg/s → 153.66 kPa', () => {
    expect(systemHeadKpa(0)).toBe(100);
    expect(systemHeadKpa(50)).toBeCloseTo(153.66, 2);
    expect(systemHeadKpa(83.6)).toBeCloseTo(250, 6);
  });
  it('operating point: 2 pumps for 50 kg/s run at 75.05%; too much demand → full speed, the flow they can make', () => {
    const op = pumpOperatingPoint(50, 2);
    expect(op.speed).toBeCloseTo(0.7505, 4);
    expect(op.flowKgS).toBe(50);
    expect(op.headKpa).toBeCloseTo(systemHeadKpa(50), 6); // pump and system curves meet
    const max = pumpOperatingPoint(1e6, 1);
    expect(max.speed).toBe(1);
    // 312.5 − 0.03577 q² = 100 + 0.02146 q² → q = √(212.5 / 0.05723) = 60.93 kg/s
    expect(max.flowKgS).toBeCloseTo(60.93, 1);
    // Holding the DP setpoint sets a speed floor even at almost no flow: √(100/312.5) = 0.566.
    expect(pumpOperatingPoint(1, 2).speed).toBeCloseTo(0.566, 3);
    expect(pumpOperatingPoint(10, 0)).toEqual({ speed: 0, flowKgS: 0, headKpa: 0 });
  });
  it('pump power: 41.8 kg/s at 250 kPa, η 0.75 → 13.96 kW', () => {
    expect(pumpKw(41.8, 250)).toBeCloseTo(13.96, 2);
  });
  it('chiller capacity vs lift: 22 K → 0.94; clamped 0.7–1.1', () => {
    expect(chillerLiftFactor(17)).toBe(1);
    expect(chillerLiftFactor(22)).toBeCloseTo(0.94, 6);
    expect(chillerLiftFactor(100)).toBe(0.7);
    expect(chillerLiftFactor(-50)).toBe(1.1);
  });
  it('part-load kW: PLR 0.5 → 0.4575 of full-load kW; 1 at full load', () => {
    expect(partLoadPowerFrac(0.5)).toBeCloseTo(0.4575, 6);
    expect(partLoadPowerFrac(1)).toBeCloseTo(1, 6);
    expect(partLoadPowerFrac(NaN)).toBeCloseTo(0.17, 6);
  });
  it('kW/ton: 250 kW making 1,400 kWt → 0.628', () => {
    expect(kwPerTon(250, 1400)).toBeCloseTo(0.628, 3);
    expect(kwPerTon(10, 0)).toBe(0);
  });
  it('stratified tank: full rate above 10% charge, then falls to zero as the warm layer reaches the outlet', () => {
    expect(tesDeliverable(0.5)).toBe(1);
    expect(tesDeliverable(0.05)).toBeCloseTo(0.5);
    expect(tesDeliverable(0)).toBe(0);
  });
});

function steady(w: 'mild' | 'hot-dry' | 'winter' = 'mild'): EngineV2 {
  const e = new EngineV2('2N');
  if (w !== 'mild') e.apply({ a: 'weather', w });
  e.run(1800);
  return e;
}

describe('hydronic model (engine v2)', () => {
  it('normal day: 18 °C supply, 26 °C return, 2 pumps part speed, partial economizer, one chiller near 0.3 kW/ton', () => {
    const r = steady().hyd.reading;
    expect(r.chwsC).toBeCloseTo(18, 1);
    expect(r.chwrC).toBeCloseTo(26, 1);
    expect(r.pumpsRunning).toBe(2);
    expect(r.pumpSpeed).toBeGreaterThan(0.6);
    expect(r.pumpSpeed).toBeLessThan(0.95);
    expect(r.pumpHeadKpa).toBeGreaterThan(HYD.dpSetpointKpa);
    expect(r.econKwt).toBeGreaterThan(0);
    const on = Object.values(r.chillers).filter((c) => c.mode === 'running');
    expect(on).toHaveLength(1);
    expect(on[0]!.kwPerTon).toBeGreaterThan(0.25);
    expect(on[0]!.kwPerTon).toBeLessThan(0.4);
  });

  it('105 °F day: no economizer, two chillers, kW/ton 0.4–0.6; winter: full economizer, chillers off, condenser water held ≥ 5 °C', () => {
    const hot = steady('hot-dry').hyd.reading;
    expect(hot.econKwt).toBe(0);
    const on = Object.values(hot.chillers).filter((c) => c.mode === 'running');
    expect(on).toHaveLength(2);
    for (const c of on) (expect(c.kwPerTon).toBeGreaterThan(0.4), expect(c.kwPerTon).toBeLessThan(0.6));
    const cold = steady('winter').hyd.reading;
    expect(cold.chillerKwt).toBe(0);
    expect(cold.econKwt).toBeCloseTo(cold.loadKwt, 0);
    expect(cold.cwC).toBeGreaterThanOrEqual(HYD.towerMinLeavingC);
  });

  it('steady state: heat in (coil duty) = heat removed (economizer + chillers), ±1%, in three weathers', () => {
    for (const w of ['mild', 'hot-dry', 'winter'] as const) {
      const r = steady(w).hyd.reading;
      const removed = r.econKwt + r.chillerKwt + Math.max(0, r.tesKwt);
      expect(Math.abs(removed - r.loadKwt) / r.loadKwt, w).toBeLessThan(0.01);
    }
  });

  it('every node update keeps dt/τ ≤ 1', () => {
    const e = steady();
    for (let i = 0; i < 120; i++) (e.tick(), expect(e.hyd.lastMaxDtOverTau).toBeLessThanOrEqual(1 + 1e-12));
  });

  it('losing one of three CHW pumps changes nothing (standby picks up)', () => {
    const e = steady();
    e.apply({ a: 'fail', id: 'CHWP-01' });
    e.run(600);
    expect(e.hyd.reading.flowFrac).toBe(1);
    expect(e.hyd.reading.chwsC).toBeCloseTo(18, 1);
  });

  it('all chillers lost: the tank carries the load, then the warm layer reaches the outlet and supply warms before it is empty', () => {
    const e = steady();
    for (const id of ['CH-01', 'CH-02', 'CH-03', 'ACH-04']) e.apply({ a: 'fail', id });
    e.run(120);
    expect(e.hyd.reading.tesKwt).toBeGreaterThan(1000);
    expect(e.hyd.reading.chwsC).toBeCloseTo(18, 0);
    let sawTail = false;
    for (let i = 0; i < 3600 && e.hyd.reading.tesSoc > 0.001; i++) {
      e.tick();
      const r = e.hyd.reading;
      if (r.tesSoc < 0.08 && r.tesSoc > 0.01 && r.deficitKwt > 1) sawTail = true;
    }
    expect(sawTail).toBe(true);
    // Ride-through ≈ tank kJ / net load: 2.68 GJ / ~1.27 MW ≈ 35 min.
    expect(e.t).toBeLessThan(1800 + 120 + 45 * 60);
    expect(e.t).toBeGreaterThan(1800 + 120 + 25 * 60);
  });

  it('anti-short-cycle: a chiller started 100 s ago and stopped is skipped; the next in line starts', () => {
    const e = steady('hot-dry');
    const C = e.hyd.state.chillers;
    // CH-03 just ran briefly and stopped (normal stop, not a restart).
    Object.assign(C['CH-03']!, { mode: 'off', lastStart: e.t - 100, restart: false });
    e.apply({ a: 'fail', id: 'CH-01' });
    e.run(5);
    expect(C['CH-03']!.mode).toBe('off');
    expect(C['ACH-04']!.mode).toBe('starting');
  });

  it('low evaporator flow: four chillers on one pump trip after the delay; Restore resets the latch', () => {
    const e = steady('hot-dry');
    const C = e.hyd.state.chillers;
    for (const id of ['CH-01', 'CH-02', 'CH-03', 'ACH-04']) Object.assign(C[id]!, { mode: 'running', runningSince: e.t, lastStart: e.t });
    e.apply({ a: 'fail', id: 'CHWP-01' });
    e.apply({ a: 'fail', id: 'CHWP-02' });
    e.run(HYD.minFlowDelayS + 3);
    const tripped = Object.entries(C).filter(([, c]) => c.mode === 'tripped');
    expect(tripped.length).toBeGreaterThan(0);
    expect(tripped[0]![1].tripWhy).toBe('low evaporator flow');
    expect(e.apply({ a: 'chillerReset', id: tripped[0]![0] }).ok).toBe(true);
    expect(C[tripped[0]![0]]!.mode).toBe('off');
  });

  it('v2 owns chilled water: v1 readout and the air side see the v2 loop', () => {
    const e = steady();
    for (const id of ['CH-01', 'CH-02', 'CH-03', 'ACH-04']) e.apply({ a: 'fail', id });
    e.run(2700);
    expect(e.sim.thermal.readout.chwSupplyC).toBeCloseTo(e.hyd.reading.chwsC, 6);
    expect(e.sim.thermal.readout.tesSoc).toBeCloseTo(e.hyd.reading.tesSoc, 6);
    expect(e.air.chw?.supplyC).toBeCloseTo(e.hyd.reading.chwsC, 6);
  });

  it('snapshot → JSON → restore → replay give identical hydronic state', () => {
    const e = steady();
    e.apply({ a: 'fail', id: 'CH-01' });
    e.run(400);
    const r = EngineV2.fromSnapshot(JSON.parse(JSON.stringify(e.snapshot())) as EngineSnapshot);
    e.run(500);
    r.run(500);
    expect(r.hyd.snapshot()).toEqual(e.hyd.snapshot());
    const rep = EngineV2.replay('2N', e.seed, e.log);
    rep.run(e.t - rep.t);
    expect(rep.hyd.snapshot()).toEqual(e.hyd.snapshot());
  });

  it('tick budget: a full v2 tick stays under 4 ms', () => {
    const e = steady();
    const t0 = performance.now();
    for (let i = 0; i < 500; i++) e.tick();
    expect((performance.now() - t0) / 500).toBeLessThan(4);
  });
});
