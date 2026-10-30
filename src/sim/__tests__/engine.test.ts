import { Simulation, formatT } from '../engine';
import { PHYSICS } from '../physics';
import { buildPlant } from '../plant/builder';

const has = (sim: Simulation, text: string) => sim.events.some((e) => e.message.includes(text));

describe('utility outage → generator transfer', () => {
  it('BESS bridges, generators start in ~10 s, ATS transfers, nothing drops', () => {
    const sim = new Simulation(buildPlant('N+1'));
    sim.fail('UTIL-A');
    expect(sim.solution.bessDischargeKw.has('BESS-A')).toBe(true);
    sim.advance(20);
    expect(sim.graph.get('ATS-A').state.selected).toBe('emergency');
    expect(sim.graph.get('GEN-01').state.genState).toBe('running');
    expect(sim.solution.bessDischargeKw.has('BESS-A')).toBe(false);
    expect(sim.droppedRacks()).toEqual([]);
    expect(has(sim, 'transferred to generator')).toBe(true);
  });

  it('without the BESS, the UPS rides on battery until generators pick up', () => {
    const sim = new Simulation(buildPlant('N+1'));
    sim.fail('BESS-A');
    sim.fail('UTIL-A');
    expect(sim.solution.upsMode.get('UPS-A1')).toBe('battery');
    const socBefore = sim.graph.get('UPS-A1').state.soc!;
    sim.advance(20);
    expect(sim.solution.upsMode.get('UPS-A1')).toBe('normal');
    expect(sim.graph.get('UPS-A1').state.soc!).toBeLessThan(socBefore);
    expect(sim.droppedRacks()).toEqual([]);
    expect(has(sim, 'UPS-A1 on battery')).toBe(true);
  });

  it('generators fail to start: UPS batteries run out and racks drop', () => {
    const sim = new Simulation(buildPlant('N+1'));
    for (const g of ['GEN-01', 'GEN-02', 'GEN-03', 'GEN-04', 'BESS-A']) sim.fail(g);
    sim.fail('UTIL-A');
    sim.advance(PHYSICS.upsMaxRuntimeS);
    expect(sim.droppedRacks().length).toBe(36);
    const drop = sim.events.find((e) => e.message.startsWith('R-14 lost power'))!;
    expect(drop.t).toBeGreaterThan(60);
    expect(drop.message).toBe(`R-14 lost power at ${formatT(drop.t)}.`);
  });

  it('retransfers to utility after the stability timer and stops the generators', () => {
    const sim = new Simulation(buildPlant('N+1'));
    sim.fail('UTIL-A');
    sim.advance(20);
    sim.restore('UTIL-A');
    sim.advance(PHYSICS.atsRetransferDelayS + 2);
    expect(sim.graph.get('ATS-A').state.selected).toBe('normal');
    expect(sim.graph.get('GEN-01').state.genState).toBe('off');
    expect(has(sim, 'retransferred to normal')).toBe(true);
  });

  it('burns generator fuel while running', () => {
    const sim = new Simulation(buildPlant('N+1'));
    sim.fail('UTIL-A');
    sim.advance(600);
    expect(sim.graph.get('GEN-01').state.fuelL!).toBeLessThan(1000);
  });
});

describe('PUE', () => {
  it('is believable for a chilled-water plant', () => {
    const p = new Simulation(buildPlant('2N')).pue();
    expect(p).toBeGreaterThan(1.1);
    expect(p).toBeLessThan(1.6);
  });
});

describe('maintenance guard', () => {
  it('refuses to tag out energized equipment', () => {
    const sim = new Simulation(buildPlant('N+1'));
    const r = sim.setMaintenance('UPS-A1');
    expect(r.ok).toBe(false);
  });
});

describe('formatT', () => {
  it('formats seconds and minutes', () => {
    expect(formatT(12)).toBe('T+12s');
    expect(formatT(245)).toBe('T+4m05s');
  });
});
