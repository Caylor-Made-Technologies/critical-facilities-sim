import { buildPlant } from '../plant/builder';
import { solvePower } from '../power';
import { Simulation } from '../engine';

describe('power solver — normal operation', () => {
  it('powers every rack in every topology', () => {
    for (const t of ['N', 'N+1', 'N+2', '2N', '2N+1', 'DR', 'BLOCK'] as const) {
      const sol = solvePower(buildPlant(t).graph);
      expect(sol.itPoweredKw, t).toBe(2100);
      expect(sol.paralleled, t).toEqual([]);
    }
  });

  it('splits a dual-corded rack about 50/50 between A and B in 2N', () => {
    const { graph } = buildPlant('2N');
    const sol = solvePower(graph);
    expect(sol.feeders.get('R-01')).toEqual(['BW-1A', 'BW-1B']);
    expect(sol.loadKw.get('BW-1A')).toBeCloseTo(sol.loadKw.get('BW-1B')!, 5);
  });

  it('accounts for UPS double-conversion losses upstream', () => {
    const { graph } = buildPlant('N+1');
    const sol = solvePower(graph);
    const out = sol.loadKw.get('CB-A')!;
    const into = sol.loadKw.get('UIB-A')!;
    expect(into).toBeCloseTo(out / 0.96, 3);
  });

  it('shares UPS load evenly across paralleled modules', () => {
    const { graph } = buildPlant('N+1');
    const sol = solvePower(graph);
    const loads = ['UPS-A1', 'UPS-A2', 'UPS-A3', 'UPS-A4'].map((id) => sol.loadKw.get(id)!);
    for (const l of loads) expect(l).toBeCloseTo(loads[0]!, 5);
  });
});

describe('power solver — failures', () => {
  it('2N: losing the whole A critical bus drops nothing', () => {
    const sim = new Simulation(buildPlant('2N'));
    sim.fail('CB-A');
    expect(sim.droppedRacks()).toEqual([]);
    expect(sim.solution.feeders.get('R-01')).toEqual(['BW-1B']);
  });

  it('N+1: losing the single critical bus drops every rack', () => {
    const sim = new Simulation(buildPlant('N+1'));
    sim.fail('CB-A');
    expect(sim.droppedRacks().length).toBe(36);
    expect(sim.events.some((e) => e.message === 'R-14 lost power at T+0s.')).toBe(true);
  });

  it('N: one UPS module fault overloads the rest, which go to static bypass', () => {
    const sim = new Simulation(buildPlant('N'));
    sim.fail('UPS-A1');
    expect(sim.solution.upsMode.get('UPS-A2')).toBe('static-bypass');
    expect(sim.droppedRacks()).toEqual([]); // still up, but with no battery protection
    expect(sim.events.some((e) => e.message.includes('static bypass (overload)'))).toBe(true);
  });

  it('N+1: one UPS module fault is absorbed', () => {
    const sim = new Simulation(buildPlant('N+1'));
    sim.fail('UPS-A1');
    expect(sim.solution.upsMode.get('UPS-A2')).toBe('normal');
    const cap = sim.capacityReport().find((c) => c.name === 'UPS A')!;
    expect(cap.label).toBe('N');
  });

  it('STS moves single-corded racks to the alternate source', () => {
    const sim = new Simulation(buildPlant('2N'));
    expect(sim.solution.feeders.get('STS-4')).toEqual(['PDU-4A']);
    sim.fail('PDU-4A');
    expect(sim.solution.feeders.get('STS-4')).toEqual(['PDU-4B']);
    expect(sim.solution.energized.has('R-19')).toBe(true);
  });

  it('single-corded racks drop when their RPP fails', () => {
    const sim = new Simulation(buildPlant('2N'));
    sim.fail('RPP-4');
    expect(sim.droppedRacks().map((r) => r.id)).toEqual(['R-19', 'R-20']);
  });
});

describe('redundancy designs survive losing a whole UPS system', () => {
  it.each(['2N', '2N+1', 'DR', 'BLOCK'] as const)('%s', (t) => {
    const sim = new Simulation(buildPlant(t));
    for (const r of sim.failoverCheck()) {
      expect(r.dropped, `${t} lose ${r.system}`).toEqual([]);
    }
  });

  it('2N: the surviving side carries everything without overload', () => {
    const sim = new Simulation(buildPlant('2N'));
    const r = sim.whatIfFail(['UPS-A1', 'UPS-A2', 'UPS-A3']);
    expect(r.overloaded).toEqual([]);
  });

  it('block redundant: two blocks lost at once overloads the catcher', () => {
    const sim = new Simulation(buildPlant('BLOCK'));
    const r = sim.whatIfFail(['UPS-A1', 'UPS-B1']);
    expect(r.overloaded).toContain('UPS-R1');
  });

  it('N+1 does NOT survive losing the whole UPS system', () => {
    const sim = new Simulation(buildPlant('N+1'));
    expect(sim.failoverCheck()[0]!.dropped.length).toBe(36);
  });
});
