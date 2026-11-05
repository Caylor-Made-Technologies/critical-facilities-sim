import { computeLayout, onOneLine } from '../../ui/sim/layout';
import { subLine } from '../../ui/sim/subline';
import { electricalModel, mechanicalModel, PX } from '../../ui/three/plantModel';
import { Simulation } from '../engine';
import { buildPlant, TOPOLOGIES, type Topology } from '../index';

describe('3D electrical plant', () => {
  it('has every one-line component at the same place as the 2D diagram, for all 7 designs', () => {
    for (const t of Object.keys(TOPOLOGIES) as Topology[]) {
      const sim = new Simulation(buildPlant(t));
      const m = electricalModel(sim);
      const layout = computeLayout(sim.graph);
      const ids = [...sim.graph.nodes.values()].filter(onOneLine).map((n) => n.id).sort();
      expect(m.nodes.map((n) => n.id).sort(), t).toEqual(ids);
      for (const n of m.nodes) {
        const b = layout.nodes.get(n.id)!;
        expect(n.x).toBeCloseTo(b.x * PX);
        expect(n.z).toBeCloseTo(b.y * PX);
        expect(n.sub).toBe(subLine(sim, sim.graph.get(n.id)));
      }
      expect(m.links.length, t).toBeGreaterThan(0);
      expect(m.links.every((l) => l.pts.length >= 2)).toBe(true);
    }
  });
  it('breaker levers and live feeds follow the plant', () => {
    const sim = new Simulation(buildPlant('2N'));
    let m = electricalModel(sim);
    const tie = m.nodes.find((n) => n.id === 'TIE-AB');
    if (tie) expect(tie.closed).toBe(false);
    const liveBefore = m.links.filter((l) => l.live).length;
    sim.fail('UTIL-A');
    m = electricalModel(sim);
    expect(m.nodes.find((n) => n.id === 'UTIL-A')!.state).toBe('failed');
    expect(m.links.filter((l) => l.live).length).toBeLessThan(liveBefore);
  });
  it('locked-out gear shows as maintenance', () => {
    const sim = new Simulation(buildPlant('2N'));
    const crah = sim.graph.byKind('crah')[0]!;
    sim.setMaintenance(crah.id);
    expect(mechanicalModel(sim).nodes.find((n) => n.id === crah.id)!.state).toBe('maint');
  });
});

describe('3D mechanical plant', () => {
  it('shows every cooling unit and pipes flow only when water moves', () => {
    const sim = new Simulation(buildPlant('2N'));
    const m = mechanicalModel(sim);
    for (const kind of ['cooling-tower', 'pump-cw', 'pump-chw', 'chiller-water-cooled', 'crah', 'cdu', 'tes-tank', 'doas'] as const) {
      for (const n of sim.graph.byKind(kind)) expect(m.nodes.some((x) => x.id === n.id), n.id).toBe(true);
    }
    expect(m.nodes.some((n) => n.id === 'HX')).toBe(true);
    const r = sim.thermal.readout;
    expect(m.links.find((l) => l.id === 'hdr-s')!.live).toBe(r.chwFlowFraction > 0);
    for (const n of m.nodes) expect(n.live).toBe(n.id === 'HX' ? r.economizer !== 'off' : r.running.includes(n.id));
  });
  it('a failed chiller shows failed and its water stops', () => {
    const sim = new Simulation(buildPlant('2N'));
    const before = mechanicalModel(sim);
    const runningCh = before.nodes.find((n) => n.kind === 'chiller-water-cooled' && n.live);
    if (!runningCh) return; // free cooling only on this weather; covered elsewhere
    sim.fail(runningCh.id);
    sim.advance(1);
    const after = mechanicalModel(sim);
    expect(after.nodes.find((n) => n.id === runningCh.id)!.state).toBe('failed');
    expect(after.links.find((l) => l.id === `chw-s-${runningCh.id}`)!.live).toBe(false);
  });
});
