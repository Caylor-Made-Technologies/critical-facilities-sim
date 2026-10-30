import {
  PHYSICS,
  bessRuntimeS,
  bessSocDrop,
  cToF,
  chillerCop,
  classifyHumidity,
  classifyInlet,
  dewPointC,
  doasLeavingDewPointC,
  economizerFraction,
  economizerMode,
  fToC,
  genRuntimeS,
  pue,
  relativeHumidity,
  stepInletTemp,
  tesRideThroughS,
  upsRuntimeS,
  upsSocDrop,
} from '../physics';

describe('unit conversions', () => {
  it('round-trips °C and °F', () => {
    expect(cToF(27)).toBeCloseTo(80.6);
    expect(fToC(cToF(18.3))).toBeCloseTo(18.3);
  });
});

describe('UPS battery', () => {
  it('gives rated runtime at full load', () => {
    expect(upsRuntimeS(1)).toBeCloseTo(PHYSICS.upsRatedRuntimeS);
  });
  it('lasts more than twice as long at half load (Peukert effect)', () => {
    expect(upsRuntimeS(0.5)).toBeGreaterThan(2 * upsRuntimeS(1));
  });
  it('scales with state of charge', () => {
    expect(upsRuntimeS(1, 0.5)).toBeCloseTo(PHYSICS.upsRatedRuntimeS / 2);
    expect(upsRuntimeS(1, 0)).toBe(0);
  });
  it('drains in exactly the predicted runtime', () => {
    const runtime = upsRuntimeS(0.8);
    expect(upsSocDrop(0.8, runtime)).toBeCloseTo(1);
  });
});

describe('BESS', () => {
  it('runtime and SOC drop agree', () => {
    const t = bessRuntimeS(2000, 1, 1000);
    expect(bessSocDrop(2000, t, 1000)).toBeCloseTo(1);
    // 1 MWh at 2 MW is a little under 30 minutes after losses.
    expect(t / 60).toBeGreaterThan(25);
    expect(t / 60).toBeLessThan(30);
  });
});

describe('generator fuel', () => {
  it('runs longer at light load', () => {
    expect(genRuntimeS(1000, 300, 1250)).toBeGreaterThan(genRuntimeS(1000, 1250, 1250));
  });
});

describe('thermal', () => {
  it('heats the inlet when cooling falls short', () => {
    const t = stepInletTemp(24, 100, 0, 60);
    expect(t).toBeCloseTo(24 + (100 * 60) / PHYSICS.rackThermalMassKjPerC);
  });
  it('recovers toward supply air when cooling is restored', () => {
    const t = stepInletTemp(30, 100, 120, 600);
    expect(t).toBeLessThan(25);
    expect(t).toBeGreaterThanOrEqual(PHYSICS.supplyAirC);
  });
  it('classifies inlet temperatures against ASHRAE bands', () => {
    expect(classifyInlet(24)).toBe('recommended');
    expect(classifyInlet(30)).toBe('allowable');
    expect(classifyInlet(35)).toBe('out-of-range');
  });
  it('chilled water storage buys minutes', () => {
    // 200,000 L tank, 8 °C usable delta-T, 2,500 kWt load → ~45 minutes.
    const s = tesRideThroughS(200_000, 2500);
    expect(s / 60).toBeGreaterThan(40);
    expect(s / 60).toBeLessThan(50);
  });
});

describe('chillers and economizer', () => {
  it('loses efficiency on a hot day (higher lift)', () => {
    expect(chillerCop(18, 30)).toBeGreaterThan(chillerCop(18, 40));
  });
  it('free-cools on cold days only', () => {
    expect(economizerMode(5)).toBe('full');
    expect(economizerMode(15)).toBe('partial');
    expect(economizerMode(26)).toBe('off');
    expect(economizerFraction(5)).toBe(1);
    expect(economizerFraction(26)).toBe(0);
    const f = economizerFraction(15);
    expect(f).toBeGreaterThan(0);
    expect(f).toBeLessThan(1);
  });
});

describe('psychrometrics (DOAS)', () => {
  it('computes dew point (20 °C, 50% RH ≈ 9.3 °C)', () => {
    expect(dewPointC(20, 50)).toBeCloseTo(9.3, 0);
  });
  it('relative humidity inverts dew point', () => {
    expect(relativeHumidity(25, dewPointC(25, 40))).toBeCloseTo(40, 0);
  });
  it('flags humid and dry air', () => {
    expect(classifyHumidity(24, 10)).toBe('ok');
    expect(classifyHumidity(24, 20)).toBe('too-humid');
    expect(classifyHumidity(24, -15)).toBe('too-dry');
  });
  it('dehumidifying coil caps supply dew point at coil leaving temp', () => {
    expect(doasLeavingDewPointC(22, 12)).toBe(12);
    expect(doasLeavingDewPointC(5, 12)).toBe(5);
  });
});

describe('PUE', () => {
  it('is total over IT', () => {
    expect(pue(1300, 1000)).toBeCloseTo(1.3);
    expect(pue(100, 0)).toBeNaN();
  });
});
