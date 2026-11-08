import {
  econModeFor,
  econModeNext,
  econShare,
  EFF,
  enthalpyKjKg,
  humidityRatio,
  saturationKpa,
  transformerLossKw,
  upsLossKw,
} from '../physics';
import { EngineV2 } from '../v2/engine';

describe('efficiency formulas (hand-worked)', () => {
  it('psychrometrics (Verify): psat 20 °C = 2.333 kPa; 24 °C 50% → W 0.00928, h 47.76 kJ/kg', () => {
    expect(saturationKpa(20)).toBeCloseTo(2.333, 3);
    expect(Math.abs(saturationKpa(20) - 2.339) / 2.339).toBeLessThan(0.004); // vs steam tables
    const w = humidityRatio(24, 50);
    // psat 2.978, pv = 0.5 × 2.978 = 1.489 kPa; W = 0.622 × 1.489 / (101.325 − 1.489)
    expect(w).toBeCloseTo(0.00928, 5);
    expect(enthalpyKjKg(24, w)).toBeCloseTo(47.76, 1);
    expect(humidityRatio(30, 0)).toBe(0);
    expect(enthalpyKjKg(0, 0)).toBe(0);
  });
  it('economizer thresholds: full at wet bulb ≤ 12.5 °C, partial ≤ 20.5 °C, else off', () => {
    expect(econModeFor(5)).toBe('full');
    expect(econModeFor(12.5)).toBe('full');
    expect(econModeFor(17)).toBe('partial');
    expect(econModeFor(25)).toBe('off');
  });
  it('hysteresis: needs 1 K past a threshold and 15 min in a mode; one step at a time', () => {
    const long = EFF.econMinDwellS;
    expect(econModeNext('partial', 11.4, long)).toBe('full');
    expect(econModeNext('partial', 12.0, long)).toBe('partial'); // inside the deadband
    expect(econModeNext('partial', 11.0, long - 1)).toBe('partial'); // too soon
    expect(econModeNext('full', 13.2, long)).toBe('full');
    expect(econModeNext('full', 13.6, long)).toBe('partial');
    expect(econModeNext('full', 30, long)).toBe('partial'); // never full → off in one step
    expect(econModeNext('partial', 21.6, long)).toBe('off');
    expect(econModeNext('off', 19.6, long)).toBe('off');
    expect(econModeNext('off', 19.4, long)).toBe('partial');
    expect(econModeNext('off', NaN, long)).toBe('off');
  });
  it('economizer share: full 1, off 0, partial (26 − (wb + 5.5)) / 8 → wb 16.5 → 0.5', () => {
    expect(econShare('full', 20)).toBe(1);
    expect(econShare('off', 0)).toBe(0);
    expect(econShare('partial', 16.5)).toBeCloseTo(0.5, 6);
  });
  it('UPS loss: 1,000 kW at 96% → 41.67 kW; transformer 3,500 kVA at 60% → 23.1 kW', () => {
    expect(upsLossKw(1000, 0.96)).toBeCloseTo(41.667, 2);
    expect(upsLossKw(1000, 0)).toBe(0);
    expect(transformerLossKw(3500, 0.6)).toBeCloseTo(23.1, 6);
    expect(transformerLossKw(3500, 0.6, false)).toBe(0);
  });
});

function steady(w: 'mild' | 'hot-dry' | 'winter' = 'mild'): EngineV2 {
  const e = new EngineV2('2N');
  if (w !== 'mild') e.apply({ a: 'weather', w });
  e.run(1800);
  return e;
}

describe('live PUE (engine v2)', () => {
  it('total = IT + every part, PUE = total ÷ IT, mechanical and losses add up', () => {
    const r = steady().efficiency;
    const p = r.parts;
    const sum = p.crahFans + p.chwPumps + p.chillers + p.cwPumps + p.towerFans + p.otherMech + p.upsLoss + p.txLoss;
    expect(r.totalKw).toBeCloseTo(r.itKw + sum, 6);
    expect(r.pue).toBeCloseTo(r.totalKw / r.itKw, 9);
    expect(r.mechanicalKw + r.electricalLossKw).toBeCloseTo(sum, 6);
    for (const v of Object.values(p)) expect(v).toBeGreaterThanOrEqual(0);
  });

  it('PUE follows the weather: winter (full economizer) < mild (partial) < 105 °F (chillers only); all 1.1–1.5', () => {
    const winter = steady('winter').efficiency;
    const mild = steady('mild').efficiency;
    const hot = steady('hot-dry').efficiency;
    expect(winter.econMode).toBe('full');
    expect(mild.econMode).toBe('partial');
    expect(hot.econMode).toBe('off');
    expect(winter.pue).toBeLessThan(mild.pue);
    expect(mild.pue).toBeLessThan(hot.pue);
    for (const x of [winter, mild, hot]) (expect(x.pue).toBeGreaterThan(1.1), expect(x.pue).toBeLessThan(1.5));
    expect(winter.parts.chillers).toBe(0);
  });

  it('UPS eco mode lowers UPS losses and PUE', () => {
    const e = steady();
    const before = e.efficiency;
    e.apply({ a: 'eco', system: 'A', on: true });
    e.run(5);
    const after = e.efficiency;
    expect(after.parts.upsLoss).toBeLessThan(before.parts.upsLoss);
    expect(after.pue).toBeLessThan(before.pue);
  });

  it('economizer changeover waits out the dwell: winter → 105 °F goes full → partial at once, off 15 min later', () => {
    const e = steady('winter');
    expect(e.hyd.state.econMode).toBe('full');
    e.apply({ a: 'weather', w: 'hot-dry' });
    e.run(2);
    expect(e.hyd.state.econMode).toBe('partial');
    e.run(EFF.econMinDwellS - 30);
    expect(e.hyd.state.econMode).toBe('partial');
    e.run(60);
    expect(e.hyd.state.econMode).toBe('off');
  });

  it('psychrometric readout: outdoor mild day 24 °C 50% → h ≈ 47.76 kJ/kg; hall dew point from the DOAS model', () => {
    const r = steady().efficiency;
    expect(r.outdoor.enthalpyKjKg).toBeCloseTo(47.76, 1);
    expect(r.outdoor.rhPct).toBe(50);
    expect(r.hall.dewPointC).toBeLessThan(r.hall.dryBulbC);
    expect(r.hall.rhPct).toBeGreaterThan(0);
    expect(r.hall.rhPct).toBeLessThan(100);
  });
});
