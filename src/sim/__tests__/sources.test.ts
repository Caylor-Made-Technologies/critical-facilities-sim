import { batteryTempFactor, genStage, slipAngleDeg, SOURCES, stepFrequencyHz } from '../physics';
import { EngineV2 } from '../v2/engine';

describe('sources formulas (hand-worked)', () => {
  it('start stages inside the 10 s start: crank 0–3, build V/F 3–8, ready 8+', () => {
    expect(genStage(0)).toBe('crank');
    expect(genStage(2.9)).toBe('crank');
    expect(genStage(3)).toBe('build-vf');
    expect(genStage(7.9)).toBe('build-vf');
    expect(genStage(8)).toBe('ready');
    expect(genStage(NaN)).toBe('crank');
  });
  it('load-step dip: 50% step → 5% → 57 Hz, then 60 − 3·e^(−1) = 58.90 Hz after 2 s', () => {
    expect(stepFrequencyHz(0.5, 0)).toBeCloseTo(57);
    expect(stepFrequencyHz(0.5, 2)).toBeCloseTo(58.896, 2);
    expect(stepFrequencyHz(0.5, 60)).toBeCloseTo(60, 3);
    expect(stepFrequencyHz(5, 0)).toBeCloseTo(54); // step clamped to 100% → 10% dip
    expect(stepFrequencyHz(0.5, NaN)).toBe(60);
  });
  it('battery temperature factor: 15 °C → 0.90; heat adds nothing; floor 0.5', () => {
    expect(batteryTempFactor(15)).toBeCloseTo(0.9);
    expect(batteryTempFactor(25)).toBe(1);
    expect(batteryTempFactor(40)).toBe(1);
    expect(batteryTempFactor(-60)).toBe(0.5);
    expect(batteryTempFactor(NaN)).toBe(1);
  });
  it('slip angle: 0.1 Hz turns 36° per second, wraps to ±180°', () => {
    expect(slipAngleDeg(1)).toBeCloseTo(36);
    expect(slipAngleDeg(5)).toBeCloseTo(180);
    expect(slipAngleDeg(6)).toBeCloseTo(-144);
    expect(slipAngleDeg(10)).toBeCloseTo(0);
    expect(slipAngleDeg(NaN)).toBe(0);
  });
});

/** 2N plant, utility A lost at t = 10 s. */
function utilityLoss(seed = 1, setup?: (e: EngineV2) => void) {
  const e = new EngineV2('2N', seed);
  setup?.(e);
  e.schedule(10, { a: 'fail', id: 'UTIL-A' });
  return e;
}
const stageAt = (e: EngineV2, t: number, id = 'GEN-A1') => (e.run(t - e.t), e.sources.genStage(e.sim, id));

describe('generator start sequence', () => {
  it('signal during the tick ending at 12 s (2 s ATS delay): crank → build V/F → ready → online at 22 s', () => {
    const e = utilityLoss();
    expect(stageAt(e, 11)).toBe('off');
    expect(stageAt(e, 13)).toBe('crank');
    expect(stageAt(e, 17)).toBe('build-vf');
    expect(stageAt(e, 21)).toBe('ready');
    expect(stageAt(e, 23)).toBe('online');
    expect(e.sim.graph.get('ATS-A').state.selected).toBe('emergency');
  });
  it('block heater off: the same start takes 15 s longer, then works', () => {
    const e = utilityLoss(1, (x) => ['GEN-A1', 'GEN-A2', 'GEN-A3'].forEach((id) => x.apply({ a: 'blockHeater', id, on: false })));
    expect(stageAt(e, 30)).not.toBe('online');
    expect(e.sim.graph.get('ATS-A').state.selected).not.toBe('emergency');
    expect(stageAt(e, 40)).toBe('online');
    expect(e.sim.events.some((x) => /cold start/.test(x.message))).toBe(true);
  });
  it('fail to start (chance 1): cranks, never fires, declared failed at 45 s; the load rides on stored energy', () => {
    const e = utilityLoss(1, (x) => x.apply({ a: 'failToStart', p: 1 }));
    expect(stageAt(e, 40)).toBe('crank');
    e.run(60 - e.t);
    expect(e.sim.graph.get('GEN-A1').status).toBe('failed');
    expect(e.sim.events.some((x) => /GEN-A1 FAILED TO START \(overcrank\)/.test(x.message))).toBe(true);
    expect(e.sim.graph.get('ATS-A').state.selected).toBe('normal'); // nothing to transfer to
    expect(e.sim.itDownRacks()).toEqual([]); // dual-corded racks carried by side B
  });
  it('fail-to-start rolls are seeded: same seed → same generators fail', () => {
    const run = (seed: number) => {
      const e = utilityLoss(seed, (x) => x.apply({ a: 'failToStart', p: 0.5 }));
      e.run(80);
      return ['GEN-A1', 'GEN-A2', 'GEN-A3'].map((id) => e.sim.graph.get(id).status);
    };
    expect(run(11)).toEqual(run(11));
    const seeds = [1, 2, 3, 4, 5, 6, 7, 8].map(run).map((x) => x.join());
    expect(new Set(seeds).size).toBeGreaterThan(1); // different seeds, different outcomes
  });
  it('default (heater on, chance 0) leaves the plant exactly as v1 runs it', () => {
    const e = utilityLoss();
    e.run(400);
    expect(e.sim.events.some((x) => /cold start|not firing|FAILED TO START/.test(x.message))).toBe(false);
  });
});

describe('load-step frequency dip', () => {
  it('the bus dips when the ATS puts load on the generators, then recovers', () => {
    const e = utilityLoss();
    e.run(22);
    let min = 60;
    for (let i = 0; i < 4; i++) (e.run(1), (min = Math.min(min, e.sources.busFrequencyHz(e.sim, 'PB-A'))));
    expect(min).toBeLessThan(59.5);
    expect(min).toBeGreaterThanOrEqual(54);
    e.run(30);
    expect(e.sources.busFrequencyHz(e.sim, 'PB-A')).toBeCloseTo(60, 2);
  });
});

describe('UPS detail', () => {
  it('normal: double conversion, float, 96%; eco: 99%; logged and replayable', () => {
    const e = new EngineV2('2N', 1);
    e.run(5);
    const u = e.sources.ups(e.sim, 'UPS-A1');
    expect(u).toMatchObject({ mode: 'double-conversion', battery: 'float', efficiency: SOURCES.effDoubleConversion });
    expect(e.apply({ a: 'eco', system: 'A', on: true }).ok).toBe(true);
    expect(e.sources.ups(e.sim, 'UPS-A1')).toMatchObject({ mode: 'eco', efficiency: SOURCES.effEco });
    expect(e.apply({ a: 'eco', system: 'Z', on: true }).ok).toBe(false);
    const r = EngineV2.replay('2N', 1, e.log);
    expect(r.sources.ups(r.sim, 'UPS-A1').mode).toBe('eco');
  });
  it('on battery → discharge; after power returns → recharge; runtime derated for a cold room', () => {
    const e = new EngineV2('N', 1);
    e.run(5);
    for (const g of e.sim.graph.byKind('generator', 'bess')) e.apply({ a: 'fail', id: g.id });
    e.apply({ a: 'fail', id: 'UTIL-A' });
    e.run(3);
    const b = e.sources.ups(e.sim, 'UPS-A1');
    expect(b.battery).toBe('discharge');
    e.sim.thermal.state.upsRoomC = 15;
    const cold = e.sources.ups(e.sim, 'UPS-A1');
    expect(cold.tempFactor).toBeCloseTo(0.9);
    expect(cold.runtimeS).toBeCloseTo(e.sim.upsRuntimeS('UPS-A1') * 0.9, 3);
    e.sim.thermal.state.upsRoomC = 24;
    e.apply({ a: 'restore', id: 'UTIL-A' });
    e.run(5);
    expect(e.sources.ups(e.sim, 'UPS-A1').battery).toBe('recharge');
  });
});

describe('ATS in-phase window', () => {
  it('while on generator with the utility back, the angle slips through ±10° about 5.6% of the time', () => {
    const e = utilityLoss();
    e.schedule(60, { a: 'restore', id: 'UTIL-A' });
    e.run(61);
    let inPhase = 0;
    let samples = 0;
    for (let i = 0; i < 200; i++) {
      e.run(1);
      const a = e.sources.ats(e.sim, 'ATS-A');
      if (a.position !== 'emergency') break;
      expect(a.normalAvailable).toBe(true);
      expect(a.angleDeg).not.toBeNull();
      samples++;
      if (a.inPhase) inPhase++;
    }
    // 1 s samples of a 10 s slip cycle: angles 0, ±36, ±72… so exactly 1 in 10 lands at 0°.
    expect(samples).toBeGreaterThan(100);
    expect(inPhase / samples).toBeCloseTo(0.1, 1);
  });
  it('on normal with no generator running, there is no angle', () => {
    const e = new EngineV2('2N', 1);
    e.run(5);
    expect(e.sources.ats(e.sim, 'ATS-A')).toMatchObject({ position: 'normal', angleDeg: null, inPhase: false });
  });
});

describe('sources state in snapshots', () => {
  it('survives JSON round trip mid-start (with heater off and fail chance set)', () => {
    const e = utilityLoss(3, (x) => (x.apply({ a: 'failToStart', p: 0.5 }), x.apply({ a: 'blockHeater', id: 'GEN-A2', on: false })));
    e.run(16);
    const b = EngineV2.fromSnapshot(JSON.parse(JSON.stringify(e.snapshot())));
    expect(b.sources.state).toEqual(e.sources.state);
    e.run(100);
    b.run(100);
    expect(JSON.parse(JSON.stringify(b.snapshot().sim))).toEqual(JSON.parse(JSON.stringify(e.snapshot().sim)));
  });
});
