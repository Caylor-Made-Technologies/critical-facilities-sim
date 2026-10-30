import { describeCapacity, groupCapacity, redundancyLabel, unitsRequired, whatIfLose } from '../capacity';

describe('capacity math', () => {
  it('matches the classic example: 4 × 750 kW, 2,100 kW load → N+1', () => {
    const c = groupCapacity('UPS', 750, 4, 4, 2100);
    expect(c.unitsRequired).toBe(3);
    expect(c.label).toBe('N+1');
    expect(describeCapacity(c, 'UPS modules')).toBe('4 × 750 kW UPS modules, 2,100 kW load → N+1 holds (70% of available)');
  });

  it('loses two modules → overload', () => {
    const c = whatIfLose(groupCapacity('UPS', 750, 4, 4, 2100), 2);
    expect(c.holds).toBe(false);
    expect(c.label).toBe('N-short');
    expect(describeCapacity(c, 'UPS modules')).toContain('OVERLOAD: 600 kW short');
  });

  it('treats exact multiples as N, not N-short', () => {
    expect(unitsRequired(1500, 750)).toBe(2);
    expect(unitsRequired(0, 750)).toBe(0);
  });

  it('labels spare counts', () => {
    expect(redundancyLabel(-1)).toBe('N-short');
    expect(redundancyLabel(0)).toBe('N');
    expect(redundancyLabel(2)).toBe('N+2');
    expect(redundancyLabel(5)).toBe('N+3+');
  });
});
