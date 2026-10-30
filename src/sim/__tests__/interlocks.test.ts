import { Simulation } from '../engine';
import { buildPlant } from '../plant/builder';

describe('main-tie-main Kirk-key scheme (2 keys, 3 locks)', () => {
  it('blocks closing the tie while both mains are closed', () => {
    const sim = new Simulation(buildPlant('2N'));
    const r = sim.closeBreaker('TIE-AB');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/locked open/);
    expect(sim.graph.get('TIE-AB').state.closed).toBe(false);
  });

  it('keys are trapped in closed breakers', () => {
    const sim = new Simulation(buildPlant('2N'));
    const r = sim.removeKey('L-MB-A');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/trapped/);
  });

  it('legal sequence: open Main A, move its key to the tie, close the tie', () => {
    const sim = new Simulation(buildPlant('2N'));
    expect(sim.openBreaker('MB-A').ok).toBe(true);
    expect(sim.removeKey('L-MB-A').ok).toBe(true);
    expect(sim.insertKey('K-MTM-1', 'L-TIE-AB').ok).toBe(true);
    expect(sim.closeBreaker('TIE-AB').ok).toBe(true);
    // Switchboard A is now fed from Utility B through the tie.
    expect([...sim.solution.origins.get('MSB-A')!]).toEqual(['UTIL-B']);
    expect(sim.droppedRacks()).toEqual([]);
    // And Main A can't be closed back in — its key is trapped in the tie.
    expect(sim.closeBreaker('MB-A').ok).toBe(false);
  });

  it('even with a "cheater" key, the engine refuses to parallel two utilities', () => {
    const plant = buildPlant('2N');
    plant.interlocks.schemes[0]!.keys.push({ id: 'K-ROGUE', code: 'MTM', inLock: 'L-TIE-AB' });
    const sim = new Simulation(plant);
    const r = sim.closeBreaker('TIE-AB');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/parallel unsynchronized sources/);
    expect(sim.graph.get('TIE-AB').state.closed).toBe(false);
  });
});

describe('UPS maintenance bypass interlock (SKRU)', () => {
  it('holds the key while the UPS is on inverter', () => {
    const sim = new Simulation(buildPlant('N+1'));
    const r = sim.removeKey('L-SKRU-A');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/static bypass/);
  });

  it('blocks closing MBB without its key', () => {
    const sim = new Simulation(buildPlant('N+1'));
    expect(sim.closeBreaker('MBB-A').ok).toBe(false);
  });

  it('full make-before-break sequence isolates the UPS with zero dropped load', () => {
    const sim = new Simulation(buildPlant('N+1'));
    const steps = [
      () => sim.setUpsSystemMode('A', 'static-bypass'),
      () => sim.removeKey('L-SKRU-A'),
      () => sim.insertKey('K-MBP-A', 'L-MBB-A'),
      () => sim.closeBreaker('MBB-A'),
      () => sim.openBreaker('UOB-A'),
      () => sim.openBreaker('UIB-A'),
      () => sim.openBreaker('SBB-A'),
      () => sim.setMaintenance('UPS-A1'),
    ];
    for (const [i, step] of steps.entries()) {
      const r = step();
      expect(r.ok, `step ${i + 1}: ${r.ok ? '' : r.reason}`).toBe(true);
      expect(sim.droppedRacks(), `step ${i + 1}`).toEqual([]);
    }
    expect(sim.graph.get('UPS-A1').status).toBe('maintenance');
    expect(sim.solution.feeders.get('CB-A')).toEqual(['MBB-A']);
    // With MBB closed the key is trapped, so it can't go back to the SKRU early.
    expect(sim.removeKey('L-MBB-A').ok).toBe(false);
  });

  it('the wrong order (opening UOB first) drops the load — the sim shows why the MOP matters', () => {
    const sim = new Simulation(buildPlant('N+1'));
    sim.openBreaker('UOB-A');
    expect(sim.droppedRacks().length).toBe(36);
  });
});
