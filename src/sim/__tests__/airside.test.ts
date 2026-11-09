import {
  affinity,
  AIR,
  airPaths,
  airVolumeM3s,
  coilEffectiveness,
  coilMaxKw,
  heatFlowKw,
  inletClassBand,
  massFlowForKw,
  mixC,
  nodeTauS,
  PHYSICS,
  relaxExact,
} from '../physics';
import { AIR_NODES } from '../v2/airside';
import { EngineV2, type EngineSnapshot } from '../v2/engine';

describe('air-side formulas (hand-worked)', () => {
  it('constants: water cp 4.186, air cp 1.006 kJ/kg·K, air density 1.2 kg/m³', () => {
    expect(AIR.waterCpKj).toBe(4.186);
    expect(AIR.waterCpKj).toBe(PHYSICS.waterCpKj);
    expect(AIR.cpKj).toBe(1.006);
    expect(AIR.densityKgM3).toBe(1.2);
  });
  it('Q = ṁ·cp·ΔT: 10 kg/s of air warmed 12 K → 120.72 kW; 5 kg/s of water over 8 K → 167.44 kW', () => {
    expect(heatFlowKw(10, AIR.cpKj, 12)).toBeCloseTo(120.72, 2);
    expect(heatFlowKw(5, AIR.waterCpKj, 8)).toBeCloseTo(167.44, 2);
    expect(massFlowForKw(120.72, AIR.cpKj, 12)).toBeCloseTo(10, 6);
    expect(massFlowForKw(100, AIR.cpKj, 0)).toBe(0);
    expect(massFlowForKw(-5, AIR.cpKj, 12)).toBe(0);
  });
  it('air volume: 12 kg/s ÷ 1.2 = 10 m³/s', () => {
    expect(airVolumeM3s(12)).toBeCloseTo(10);
  });
  it('affinity laws: 80% speed → 80% flow, 64% head, 51.2% power', () => {
    const a = affinity(0.8);
    expect(a.flow).toBeCloseTo(0.8);
    expect(a.head).toBeCloseTo(0.64);
    expect(a.power).toBeCloseTo(0.512);
    expect(affinity(NaN)).toEqual({ flow: 0, head: 0, power: 0 });
    expect(affinity(-1).power).toBe(0);
  });
  it('exact step: 20 → Tss 30 with dt = τ = 10 s → 26.32; never overshoots even for dt ≫ τ', () => {
    expect(relaxExact(20, 30, 10, 10)).toBeCloseTo(20 + 10 * (1 - Math.exp(-1)), 6);
    expect(relaxExact(20, 30, 1e6, 1)).toBeLessThanOrEqual(30);
    expect(relaxExact(20, 30, 1e6, 1)).toBeCloseTo(30, 9);
    expect(relaxExact(20, 30, 5, Infinity)).toBe(20); // no flow: nothing moves
    expect(relaxExact(20, 30, 5, 0)).toBe(30);
    expect(relaxExact(20, 30, 0, 10)).toBe(20);
  });
  it('node τ = C/(ṁ·cp): 3000 kJ/K with 75 kg/s → 39.76 s; no flow → ∞', () => {
    expect(nodeTauS(3000, 75)).toBeCloseTo(39.761, 3);
    expect(nodeTauS(3000, 0)).toBe(Infinity);
  });
  it('coil effectiveness: 0.8 at full speed; 0.880 at half speed (NTU 1.609 × 0.5^−0.4 = 2.123)', () => {
    expect(coilEffectiveness(1, 0.8)).toBeCloseTo(0.8, 6);
    expect(coilEffectiveness(1)).toBeCloseTo(0.75, 6);
    expect(coilEffectiveness(0.5, 0.8)).toBeCloseTo(0.8803, 3);
    expect(coilEffectiveness(0.3)).toBeGreaterThan(coilEffectiveness(0.5));
  });
  it('coil max: ε 0.8, 12.4 kg/s, air 36 °C, water 18 °C → 179.6 kW; warmer water than air → 0', () => {
    expect(coilMaxKw(0.8, 12.4, 36, 18)).toBeCloseTo(0.8 * 12.4 * 1.006 * 18, 6);
    expect(coilMaxKw(0.8, 12.4, 36, 18)).toBeCloseTo(179.64, 1);
    expect(coilMaxKw(0.8, 12.4, 20, 25)).toBe(0);
  });
  it('mixing: 3% of 36 °C air into 24 °C → 24.36 °C', () => {
    expect(mixC(24, 36, 0.03)).toBeCloseTo(24.36);
    expect(mixC(24, 36, 2)).toBe(36);
  });
  it('ASHRAE TC 9.9 bands: 30 °C is allowable on A1; 33 °C is over on A1, allowable on A2; 12 °C is below A1', () => {
    expect(inletClassBand(24)).toBe('recommended');
    expect(inletClassBand(27)).toBe('recommended');
    expect(inletClassBand(30, 'A1')).toBe('allowable');
    expect(inletClassBand(33, 'A1')).toBe('over');
    expect(inletClassBand(33, 'A2')).toBe('allowable');
    expect(inletClassBand(42, 'A4')).toBe('allowable');
    expect(inletClassBand(12, 'A1')).toBe('below');
    expect(inletClassBand(NaN)).toBe('over');
    expect(AIR.recommendedC).toEqual(PHYSICS.ashraeRecommendedC);
  });
  it('air paths: full containment 3%/5%; half the blanking missing +5% recirc; tiles 1.5× → +10% bypass', () => {
    expect(airPaths('full', 0, 1)).toEqual({ recirc: 0.03, bypass: 0.05 });
    const p = airPaths('full', 0.5, 1.5);
    expect(p.recirc).toBeCloseTo(0.08);
    expect(p.bypass).toBeCloseTo(0.15);
    expect(airPaths('none', 0, 10).bypass).toBe(AIR.maxBypass);
  });
});

/** Settled plant: weather and controls steady. */
function steady(): EngineV2 {
  const e = new EngineV2('2N');
  e.run(600);
  return e;
}
const balance = (e: EngineV2) => {
  const r = e.air.reading;
  return { heatIn: r.itHeatKw + r.fanKw, rejected: r.coilKw };
};

describe('air-side model (engine v2)', () => {
  it('normal operation: rack inlet holds 24 °C, recommended band, return ~35 °C, fans ~80%, coils not maxed', () => {
    const e = steady();
    const r = e.air.reading;
    expect(r.temps.rackIn).toBeCloseTo(24, 1);
    expect(r.inletBand).toBe('recommended');
    expect(r.temps.room).toBeGreaterThan(32);
    expect(r.temps.room).toBeLessThan(38);
    expect(r.temps.rackOut - r.temps.rackIn).toBeCloseTo(AIR.itDeltaTK, 1);
    expect(r.fanSpeed).toBeGreaterThan(0.6);
    expect(r.fanSpeed).toBeLessThan(0.95);
    expect(r.coilKw).toBeLessThan(r.coilMaxKw * 0.9);
    expect(r.crahsRunning).toBe(8);
  });

  it('steady state: heat in (IT air + fan heat) = coil heat rejected, ±1%, in every air-path setting', () => {
    const cases: [string, (e: EngineV2) => void][] = [
      ['normal', () => {}],
      ['door open', (e) => e.apply({ a: 'containment', mode: 'door-open' })],
      ['no containment', (e) => e.apply({ a: 'containment', mode: 'none' })],
      ['blanking missing', (e) => e.apply({ a: 'blanking', missing: 1 })],
      ['too few tiles', (e) => e.apply({ a: 'tiles', ratio: 0.7 })],
      ['too many tiles', (e) => e.apply({ a: 'tiles', ratio: 1.8 })],
      ['two CRAHs down', (e) => (e.apply({ a: 'fail', id: 'CRAH-101' }), e.apply({ a: 'fail', id: 'CRAH-102' }))],
    ];
    for (const [name, set] of cases) {
      const e = steady();
      set(e);
      e.run(3600);
      const { heatIn, rejected } = balance(e);
      expect(Math.abs(rejected - heatIn) / heatIn, name).toBeLessThan(0.01);
    }
  });

  it('every node update keeps dt/τ ≤ 1 (sub-steps when a node is fast)', () => {
    const e = steady();
    const check = () => expect(e.air.lastMaxDtOverTau).toBeLessThanOrEqual(1 + 1e-12);
    for (let i = 0; i < 60; i++) (e.tick(), check());
    e.apply({ a: 'tiles', ratio: 3 });
    e.apply({ a: 'containment', mode: 'none' });
    for (let i = 0; i < 60; i++) (e.tick(), check());
    for (const id of ['CHWP-01', 'CHWP-02', 'CHWP-03']) e.apply({ a: 'fail', id });
    for (let i = 0; i < 600; i++) (e.tick(), check());
    expect(AIR_NODES.every((k) => Number.isFinite(e.air.state.temps[k]))).toBe(true);
  });

  it('losing two of eight CRAHs (N+2): fans speed up, inlet stays in the recommended range', () => {
    const e = steady();
    const before = e.air.reading.fanKw;
    e.apply({ a: 'fail', id: 'CRAH-101' });
    e.apply({ a: 'fail', id: 'CRAH-102' });
    e.run(1800);
    expect(e.air.reading.fanSpeed).toBeGreaterThan(0.95);
    expect(e.air.reading.fanKw).toBeGreaterThan(before);
    expect(e.air.reading.inletBand).toBe('recommended');
    expect(e.air.state.tripped).toBe(false);
  });

  it('containment door left open: fans work harder, return air gets colder, inlet still held while coils have margin', () => {
    const e = steady();
    const r0 = { ...e.air.reading };
    e.apply({ a: 'containment', mode: 'door-open' });
    e.run(1800);
    const r = e.air.reading;
    expect(r.fanKw).toBeGreaterThan(r0.fanKw * 1.2);
    expect(r.temps.room).toBeLessThan(r0.temps.room - 2);
    expect(r.supplyC).toBeLessThan(r0.supplyC);
    expect(r.recirc).toBeCloseTo(0.15, 2);
    expect(r.temps.rackIn).toBeCloseTo(24, 0);
  });

  it('total chilled water loss: supply air jumps toward return within a minute; shadow trip predicted in 3–10 min', () => {
    const e = steady();
    const t0 = e.t;
    for (const id of ['CHWP-01', 'CHWP-02', 'CHWP-03']) e.apply({ a: 'fail', id });
    e.run(60);
    expect(e.air.reading.coilKw).toBe(0);
    expect(e.air.state.temps.cold).toBeGreaterThan(30);
    e.run(900);
    expect(e.air.state.tripAt).not.toBeNull();
    const after = e.air.state.tripAt! - t0;
    expect(after).toBeGreaterThan(180);
    expect(after).toBeLessThan(600);
  });

  it('v2 owns rack-inlet trips, and the screens read the v2 inlet', () => {
    const a = steady();
    expect(a.sim.thermal.hallTripExternal).toBe(true);
    a.apply({ a: 'containment', mode: 'none' });
    a.run(1800);
    expect(a.sim.thermal.readout.hallInletC).toBeCloseTo(a.air.state.temps.rackIn, 6);
  });

  it('the air model trips and clears racks; the v1 hall trip stays out of it', () => {
    const e = steady();
    for (const id of ['CHWP-01', 'CHWP-02', 'CHWP-03']) e.apply({ a: 'fail', id });
    e.run(900);
    expect(e.air.state.tripped).toBe(true);
    expect(e.sim.events.some((x) => /^R-\d+ thermal shutdown \(inlet/.test(x.message))).toBe(true);
    const ownTrip = e.sim.events.find((x) => x.message.includes('thermal shutdown (inlet'))!.t;
    expect(ownTrip).toBe(e.air.state.tripAt);
    for (const id of ['CHWP-01', 'CHWP-02', 'CHWP-03']) e.apply({ a: 'restore', id });
    e.run(1800);
    expect(e.air.state.tripped).toBe(false);
    expect(e.sim.events.some((x) => x.message.startsWith('Hall inlet temperatures back in range'))).toBe(true);
  });

  it('snapshot → JSON → restore → replay give identical air state', () => {
    const e = steady();
    e.apply({ a: 'containment', mode: 'door-open' });
    e.apply({ a: 'fail', id: 'CRAH-103' });
    e.run(300);
    const snap = JSON.parse(JSON.stringify(e.snapshot())) as EngineSnapshot;
    const r = EngineV2.fromSnapshot(snap);
    e.run(400);
    r.run(400);
    expect(r.air.snapshot()).toEqual(e.air.snapshot());
    const rep = EngineV2.replay('2N', e.seed, e.log);
    rep.run(e.t - rep.t);
    expect(rep.air.snapshot()).toEqual(e.air.snapshot());
  });

  it('scenario switches are validated and logged', () => {
    const e = steady();
    expect(e.apply({ a: 'blanking', missing: 2 }).ok).toBe(false);
    expect(e.apply({ a: 'tiles', ratio: 0 }).ok).toBe(false);
    expect(e.apply({ a: 'containment', mode: 'nope' as never }).ok).toBe(false);
    expect(e.apply({ a: 'tiles', ratio: 1.2 }).ok).toBe(true);
    expect(e.log.slice(-4).map((x) => x.ok)).toEqual([false, false, false, true]);
  });

  it('EPO: no IT, no fans: nothing goes NaN', () => {
    const e = steady();
    e.apply({ a: 'epo' });
    e.run(600);
    for (const k of AIR_NODES) expect(Number.isFinite(e.air.state.temps[k])).toBe(true);
    expect(Number.isFinite(e.air.reading.coilKw)).toBe(true);
  });

  it('tick budget: a full v2 tick (electrical + sources + air) stays under 4 ms', () => {
    const e = steady();
    const t0 = performance.now();
    for (let i = 0; i < 500; i++) e.tick();
    expect((performance.now() - t0) / 500).toBeLessThan(4);
  });
});
