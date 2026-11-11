/** Phase 8b: per-rack inlet temperatures on top of the lumped hall. */
import { describe, expect, it } from 'vitest';
import { gapRacks, rackInletC, rackRecircWeights, RACKHEAT } from '../physics';
import { ROWS } from '../plant/builder';
import { EngineV2 } from '../v2/engine';

const plant = () => {
  const e = new EngineV2('2N');
  e.run(900);
  return e;
};
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const mids = (e: EngineV2) => Object.values(e.air.rackHeat.racks).map((r) => r.mid);
const top = (e: EngineV2, id: string) => e.air.rackHeat.racks[id]!.top;
const rowIds = (ri: number) => [...ROWS[ri]!.dual, ...ROWS[ri]!.single].map((n) => `R-${String(n).padStart(2, '0')}`);

describe('rack heat physics (hand-worked)', () => {
  it('one row of 3, full containment: [1.3, 1, 1.3] / 1.2', () => {
    const w = rackRecircWeights([0, 1, 2].map((slot) => ({ row: 0, slot, perRow: 3, rows: 1, gap: false })), [], 'full');
    expect(w[0]).toBeCloseTo(1.3 / 1.2, 6);
    expect(w[1]).toBeCloseTo(1 / 1.2, 6);
    expect(mean(w)).toBeCloseTo(1, 12);
  });
  it('inlet: cold 23.2, lumped 24.0, weight 1.5 → mid 24.4, top 25.0', () => {
    const t = rackInletC(23.2, 24.0, 1.5);
    expect(t.mid).toBeCloseTo(24.4, 9);
    expect(t.top).toBeCloseTo(25.0, 9);
  });
  it('no negative rise when the lumped inlet is below the cold aisle', () => expect(rackInletC(24, 23, 2)).toEqual({ mid: 24, top: 24 }));
  it('gap racks: a fixed scattered set of the right size', () => {
    const nums = Array.from({ length: 36 }, (_, i) => i + 1);
    expect(gapRacks(nums, 0).size).toBe(0);
    expect(gapRacks(nums, 0.25).size).toBe(9);
    expect(gapRacks(nums, 1).size).toBe(36);
    expect([...gapRacks(nums, 0.25)]).toEqual([...gapRacks(nums, 0.25)]);
  });
  it('weights always average 1 (CRAHs down on one wall, gaps, no containment)', () => {
    const racks = Array.from({ length: 12 }, (_, i) => ({ row: Math.floor(i / 4), slot: i % 4, perRow: 4, rows: 3, gap: i % 5 === 0 }));
    const crahs = [0, 1, 2, 3].map((i) => ({ side: (i % 2 ? 1 : -1) as -1 | 1, pos: Math.floor(i / 2), down: i === 0 }));
    expect(mean(rackRecircWeights(racks, crahs, 'none'))).toBeCloseTo(1, 12);
  });
});

describe('rack heat in the plant', () => {
  it('normal day: the mean rack inlet equals the lumped inlet; no hot spot', () => {
    const e = plant();
    expect(mean(mids(e))).toBeCloseTo(e.air.state.temps.rackIn, 9);
    expect(Object.keys(e.air.rackHeat.racks)).toHaveLength(36);
    expect(e.air.rackHeat.hottest!.topC).toBeLessThan(RACKHEAT.hotspotC);
    expect(e.alarmSummary.list.map((a) => a.id)).not.toContain('HALL.HOTSPOT');
    // Row ends run a little warmer than the middle.
    const r = rowIds(3);
    expect(top(e, r[0]!)).toBeGreaterThan(top(e, r[3]!));
  });

  it('a quarter of the blanking missing: the gapped racks are the hot ones', () => {
    const e = plant();
    e.apply({ a: 'blanking', missing: 0.25 });
    e.run(600);
    const gaps = gapRacks(ROWS.flatMap((r) => [...r.dual, ...r.single]), 0.25);
    const ids = (on: boolean) => Object.keys(e.air.rackHeat.racks).filter((id) => gaps.has(Number(id.slice(2))) === on);
    expect(mean(ids(true).map((id) => top(e, id)))).toBeGreaterThan(mean(ids(false).map((id) => top(e, id))) + 0.5);
    expect(mean(mids(e))).toBeCloseTo(e.air.state.temps.rackIn, 9);
  });

  it('two CRAHs down on the west wall: west-end racks run hotter than east-end racks', () => {
    const e = plant();
    e.apply({ a: 'fail', id: 'CRAH-101' });
    e.apply({ a: 'fail', id: 'CRAH-103' });
    e.run(600);
    const west = ROWS.map((_, ri) => rowIds(ri)[0]!);
    const east = ROWS.map((_, ri) => rowIds(ri).at(-1)!);
    expect(mean(west.map((id) => top(e, id)))).toBeGreaterThan(mean(east.map((id) => top(e, id))));
  });

  it('containment door open: row ends get hotter than with doors shut', () => {
    const shut = plant();
    const open = plant();
    open.apply({ a: 'containment', mode: 'door-open' });
    shut.run(1800);
    open.run(1800);
    const end = rowIds(4)[0]!;
    expect(top(open, end) - open.air.state.temps.cold).toBeGreaterThan(top(shut, end) - shut.air.state.temps.cold);
  });

  it('every chiller lost: the hot-spot alarm comes in before the hall-average inlet alarm', () => {
    const e = plant();
    for (const id of ['CH-01', 'CH-02', 'CH-03', 'CH-04']) if (e.sim.graph.nodes.has(id)) e.apply({ a: 'fail', id });
    let hot = -1;
    let avg = -1;
    for (let s = 0; s < 4 * 3600 && avg < 0; s++) {
      e.tick();
      const ids = e.alarmSummary.list.map((a) => a.id);
      if (hot < 0 && ids.includes('HALL.HOTSPOT')) hot = e.t;
      if (avg < 0 && ids.includes('HALL.INLET-HI')) avg = e.t;
    }
    expect(hot).toBeGreaterThan(0);
    expect(avg).toBeGreaterThan(hot);
  });
});
