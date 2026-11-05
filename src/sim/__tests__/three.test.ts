import { EQUIPMENT } from '../../content/equipment';
import { GUIDE_MODEL, MODEL_CAPTION, MODEL_KEYS } from '../../ui/three/models';
import { STATUS_COLOR, demoHall, hallVis, heat01 } from '../../ui/three/hallState';
import { ftToUnits } from '../../ui/three/scenes/boundary';
import { Simulation } from '../engine';
import { buildPlant } from '../plant/builder';

describe('3D data hall state', () => {
  it('matches the plant: 36 racks in 6 rows, all running at start', () => {
    const v = hallVis(new Simulation(buildPlant('2N')));
    expect(v.racks.length).toBe(36);
    expect(v.rows).toBe(6);
    expect(v.racks.every((r) => r.status === 'up')).toBe(true);
    expect(v.alarm).toBe(false);
    expect(v.airflow).toBeGreaterThan(0);
    expect(new Set(v.racks.map((r) => `${r.row}:${r.slot}`)).size).toBe(36);
    expect(v.racks.filter((r) => r.gpu).length).toBe(12);
  });
  it('turns racks red when their power is lost (N design, no backups)', () => {
    const sim = new Simulation(buildPlant('N'));
    for (const g of sim.graph.byKind('generator')) sim.fail(g.id);
    for (const b of sim.graph.byKind('bess')) sim.fail(b.id);
    for (const u of sim.graph.byKind('ups')) sim.fail(u.id);
    for (const u of sim.graph.byKind('utility')) sim.fail(u.id);
    sim.advance(5);
    const v = hallVis(sim);
    expect(v.racks.some((r) => r.status === 'down')).toBe(true);
    expect(v.alarm).toBe(true);
    expect(STATUS_COLOR.down).toBe('alarm');
  });
  it('airflow drops when air handlers fail', () => {
    const sim = new Simulation(buildPlant('2N'));
    const before = hallVis(sim).airflow;
    for (const c of sim.graph.byKind('crah').slice(0, 4)) sim.fail(c.id);
    expect(hallVis(sim).airflow).toBeLessThan(before);
  });
  it('demo hall and heat scale are sane', () => {
    const d = demoHall();
    expect(d.racks.length).toBe(36);
    expect(heat01(10)).toBe(0);
    expect(heat01(40)).toBe(1);
    expect(heat01(25)).toBeGreaterThan(0);
  });
});

describe('3D equipment models', () => {
  it('every equipment guide has a model and a caption', () => {
    for (const g of EQUIPMENT) {
      const m = GUIDE_MODEL[g.id];
      expect(m, g.id).toBeDefined();
      expect(MODEL_KEYS).toContain(m);
      expect(MODEL_CAPTION[m!].length, g.id).toBeGreaterThan(10);
    }
  });
});

describe('3D boundaries', () => {
  it('distance scale keeps order and fits 0–32 ft', () => {
    expect(ftToUnits(0)).toBe(0);
    expect(ftToUnits(1)).toBeLessThan(ftToUnits(3.5));
    expect(ftToUnits(3.5)).toBeLessThan(ftToUnits(8));
    expect(ftToUnits(32)).toBeLessThan(8);
  });
});
