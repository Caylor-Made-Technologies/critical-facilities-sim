import { describe, expect, it } from 'vitest';
import { capacityLimits, downtimeMinutesPerYear, itLoadKw, siteScore, upsModulesNeeded } from '../physics';

describe('life-of-a-data-center math', () => {
  it('the nines', () => {
    expect(downtimeMinutesPerYear(0.999)).toBeCloseTo(525.6, 1);
    expect(downtimeMinutesPerYear(0.9999)).toBeCloseTo(52.56, 2);
    expect(downtimeMinutesPerYear(0.99999)).toBeCloseTo(5.256, 3);
    expect(downtimeMinutesPerYear(1)).toBe(0);
    expect(downtimeMinutesPerYear(2)).toBe(0);
  });
  it('site score is a weighted percent', () => {
    expect(siteScore({ power: 5, fiber: 5 }, { power: 5, fiber: 5 })).toBe(100);
    expect(siteScore({ power: 5, fiber: 0 }, { power: 4, fiber: 0 })).toBe(80);
    expect(siteScore({ power: 2, fiber: 2 }, { power: 5, fiber: 0 })).toBe(50);
    expect(siteScore({}, {})).toBe(0);
    expect(siteScore({ power: 3 }, { power: 9 })).toBe(100);
  });
  it('UPS modules by redundancy', () => {
    expect(upsModulesNeeded(2100, 750, 'N')).toBe(3);
    expect(upsModulesNeeded(2100, 750, 'N+1')).toBe(4);
    expect(upsModulesNeeded(2100, 750, '2N')).toBe(6);
    expect(upsModulesNeeded(0, 750, '2N')).toBe(0);
  });
  it('IT load', () => {
    expect(itLoadKw(36, 10)).toBe(360);
  });
  it('stranded capacity: the smallest resource sets the limit', () => {
    const c = capacityLimits(1000, 800, 120, 10);
    expect(c.byPower).toBe(100);
    expect(c.byCooling).toBe(80);
    expect(c.bySpace).toBe(120);
    expect(c.limit).toBe('cooling');
    expect(c.racks).toBe(80);
    expect(c.strandedPowerKw).toBe(200);
    expect(c.strandedCoolingKw).toBe(0);
    expect(c.strandedRacks).toBe(40);
    expect(capacityLimits(1000, 1000, 50, 10).limit).toBe('space');
  });
});
