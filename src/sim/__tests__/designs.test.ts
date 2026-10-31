import { compareDesigns, powerBreakdown } from '../designs';
import { Simulation } from '../engine';
import { buildPlant } from '../plant/builder';

describe('design comparison', () => {
  const rows = compareDesigns();
  const row = (t: string) => rows.find((r) => r.topology === t)!;
  it('covers all seven designs', () => expect(rows).toHaveLength(7));
  it('N drops load on a single module failure; N+1 does not', () => {
    expect(row('N').survivesModule).toBe(false);
    expect(row('N+1').survivesModule).toBe(true);
  });
  it('single-path designs drop load when the UPS system is lost', () => {
    for (const t of ['N', 'N+1', 'N+2']) expect(row(t).survivesSystem).toBe(false);
  });
  it('2N, 2N+1, DR and block designs survive losing a whole UPS system', () => {
    for (const t of ['2N', '2N+1', 'DR', 'BLOCK']) expect(row(t).survivesSystem, t).toBe(true);
  });
  it('2N runs each UPS system near half load', () => expect(row('2N').peakUpsLoad).toBeLessThanOrEqual(0.55));
  it('DR uses fewer modules than 2N for the same load', () => expect(row('DR').upsRatio).toBeLessThan(row('2N').upsRatio));
});

describe('power breakdown', () => {
  it('IT + cooling + losses adds up to the facility total', () => {
    const sim = new Simulation(buildPlant('2N'));
    sim.advance(120);
    const b = powerBreakdown(sim);
    expect(b.itKw + b.coolingKw + b.lossesKw).toBeCloseTo(b.totalKw, 3);
    expect(b.coolingKw).toBeGreaterThan(0);
    expect(b.lossesKw).toBeGreaterThan(0);
  });
});
