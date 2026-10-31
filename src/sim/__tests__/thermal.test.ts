import { buildPlant, Simulation, PHYSICS, wetBulbC, type Topology } from '../index';

const steady = (w: Parameters<Simulation['setWeather']>[0] = 'mild', t: Topology = '2N') => {
  const s = new Simulation(buildPlant(t));
  s.setWeather(w);
  s.advance(300);
  return s;
};

describe('psychrometrics', () => {
  it('wet bulb is below dry bulb and close to it when humid', () => {
    expect(wetBulbC(20, 50)).toBeCloseTo(13.7, 0);
    expect(wetBulbC(30, 99)).toBeGreaterThan(29);
  });
});

describe('plant staging and free cooling', () => {
  it('free-cools with chillers off in winter and runs chillers on a hot day', () => {
    const cold = steady('winter');
    expect(cold.thermal.readout.economizer).toBe('full');
    expect(Object.values(cold.thermal.readout.chillers).every((m) => m === 'off')).toBe(true);
    const hot = steady('hot-dry');
    expect(hot.thermal.readout.economizer).toBe('off');
    expect(hot.thermal.readout.chillers['CH-01']).toBe('running');
  });

  it('PUE is lower when free cooling', () => {
    expect(steady('winter').pue()).toBeLessThan(steady('hot-dry').pue() - 0.1);
  });

  it('holds the data hall in the ASHRAE recommended range in normal operation', () => {
    for (const w of ['winter', 'mild', 'hot-dry', 'hot-humid'] as const) {
      const s = steady(w);
      expect(s.thermal.readout.hallInletC, w).toBeLessThanOrEqual(PHYSICS.ashraeRecommendedC[1]);
      expect(s.itDownRacks(), w).toEqual([]);
    }
  });
});

describe('chiller failures', () => {
  it('a failed chiller is replaced by the standby, with the storage tank covering the start-up', () => {
    const s = steady('hot-dry');
    s.fail('CH-01');
    s.advance(30);
    expect(s.thermal.readout.chillers['CH-03']).toBe('starting');
    expect(s.thermal.readout.tesDischargeKwt).toBeGreaterThan(0);
    s.advance(PHYSICS.chillerStartS);
    expect(s.thermal.readout.chillers['CH-03']).toBe('running');
    expect(s.thermal.readout.hallInletC).toBeLessThanOrEqual(PHYSICS.ashraeRecommendedC[1]);
  });

  it('105 °F day with two towers lost: chillers trip on high head pressure', () => {
    const s = steady('hot-dry');
    s.fail('CT-01');
    s.fail('CT-02');
    s.advance(5);
    expect(s.events.some((e) => e.message.includes('high head pressure'))).toBe(true);
    expect(s.graph.get('CH-01').status).toBe('failed');
  });

  it('the same tower losses on a mild day are survivable', () => {
    const s = steady('mild');
    s.fail('CT-01');
    s.fail('CT-02');
    s.advance(60);
    expect(s.events.some((e) => e.message.includes('high head pressure'))).toBe(false);
  });
});

describe('power transfers and thermal ride-through', () => {
  it('chillers restart after a power loss while the storage tank carries the load', () => {
    const s = steady('hot-dry', 'N+1');
    s.fail('BESS-A');
    s.fail('BESS-B');
    s.fail('UTIL-A');
    s.fail('UTIL-B');
    s.advance(30);
    expect(s.thermal.readout.chillers['CH-01']).not.toBe('running');
    expect(s.thermal.readout.tesSoc).toBeLessThan(1);
    s.advance(PHYSICS.chillerRestartS + 30);
    expect(s.thermal.readout.chillers['CH-01']).toBe('running');
    expect(s.itDownRacks()).toEqual([]);
  });
});

describe('liquid cooling', () => {
  it('CDU failure: GPUs throttle within ~30 s and trip within ~2 min; other rows unaffected', () => {
    const s = steady('mild');
    s.fail('CDU-1');
    s.advance(35);
    expect(s.thermal.readout.gpuRows[0]!.throttled).toBe(true);
    expect(s.graph.get('R-01').state.demandKw).toBeCloseTo(65); // 130 kW rack at half power
    s.advance(90);
    expect(s.graph.get('R-01').state.thermalTrip).toBe(true);
    expect(s.events.some((e) => e.message.startsWith('R-01 thermal shutdown'))).toBe(true);
    expect(s.graph.get('R-05').state.thermalTrip).toBeFalsy();
    // Restore the CDU and the row comes back.
    s.restore('CDU-1');
    s.advance(120);
    expect(s.graph.get('R-01').state.thermalTrip).toBe(false);
  });
});

describe('air side', () => {
  it('N+2 CRAHs: losing two changes nothing', () => {
    const s = steady('mild');
    s.fail('CRAH-101');
    s.fail('CRAH-102');
    s.advance(600);
    expect(s.thermal.readout.hallInletC).toBeLessThanOrEqual(PHYSICS.ashraeRecommendedC[1]);
  });

  it('losing all chilled water pumps overheats the hall and trips IT', () => {
    const s = steady('mild');
    for (const id of ['CHWP-01', 'CHWP-02', 'CHWP-03']) s.fail(id);
    s.advance(900);
    expect(s.thermal.readout.hallInletC).toBeGreaterThan(PHYSICS.ashraeRecommendedC[1]);
    expect(s.itDownRacks().length).toBeGreaterThan(0);
  });
});

describe('DOAS and UPS room', () => {
  it('without the DOAS on a humid day, dew point drifts out of range slowly', () => {
    const s = steady('hot-humid');
    s.fail('DOAS-01');
    s.fail('DOAS-02');
    s.advance(300);
    expect(s.thermal.readout.hallHumidity).toBe('ok');
    s.advance(3600);
    expect(s.thermal.readout.hallHumidity).toBe('too-humid');
    expect(s.thermal.readout.hallPressurePa).toBeLessThan(0);
  });

  it('losing the CRAC heats the UPS room', () => {
    const s = steady('mild');
    s.fail('CRAC-201');
    s.advance(3600);
    expect(s.thermal.readout.upsRoomC).toBeGreaterThan(30);
  });
});
