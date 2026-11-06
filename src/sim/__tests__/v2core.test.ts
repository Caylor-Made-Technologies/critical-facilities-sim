import { amps3ph, degC, degF, frac, kva, kvaFromKw, kw, kwFromKva, kwt, litres, lps, kpa, ratio, toC, toF, toGal, toGpm, toPsi, toTons, volts, add, type Kw } from '../v2/units';
import { Rng } from '../v2/rng';
import { EventQueue } from '../v2/queue';

describe('v2 units', () => {
  it('unit mix-ups fail typecheck (checked by npm run typecheck)', () => {
    const p: Kw = kw(100);
    // @ts-expect-error kVA is not kW
    const bad: Kw = kva(100);
    // @ts-expect-error °F is not °C
    toF(degF(70));
    // @ts-expect-error cannot add kW and kWt
    add(kw(1), kwt(1));
    expect(p + bad).toBe(200); // runtime is plain numbers
  });

  it('three-phase current, hand-worked', () => {
    // 1,000 kVA at 480 V: I = 1,000,000 / (1.7320508 × 480) = 1,000,000 / 831.38 = 1,202.8 A
    expect(amps3ph(kva(1000), volts(480))).toBeCloseTo(1202.8, 1);
    // 150 kW at PF 0.95 → 157.9 kVA → at 480 V: 157,894.7 / 831.38 = 189.9 A (matches Field Tools: 190 A)
    expect(amps3ph(kvaFromKw(kw(150), 0.95), volts(480))).toBeCloseTo(189.9, 1);
    expect(amps3ph(kva(100), volts(0))).toBe(0);
  });

  it('power factor relations and their edges', () => {
    // 1,000 kVA × 0.9 = 900 kW; 900 kW ÷ 0.9 = 1,000 kVA
    expect(kwFromKva(kva(1000), 0.9)).toBeCloseTo(900);
    expect(kvaFromKw(kw(900), 0.9)).toBeCloseTo(1000);
    expect(Number.isFinite(kvaFromKw(kw(900), 0))).toBe(true); // PF 0 is clamped, never Infinity
    expect(kwFromKva(kva(1000), 1.5)).toBe(1000); // PF clamped to 1
  });

  it('display conversions, hand-worked', () => {
    expect(toF(degC(27))).toBeCloseTo(80.6); // 27 × 1.8 + 32 = 80.6
    expect(toC(degF(64.4))).toBeCloseTo(18); // (64.4 − 32) × 5/9 = 18
    expect(toGal(litres(3.785411784))).toBeCloseTo(1);
    expect(toGpm(lps(1))).toBeCloseTo(15.85, 2);
    expect(toTons(kwt(2100))).toBeCloseTo(597.1, 1); // 2,100 ÷ 3.516853 = 597.1 (Field Tools: 597 tons)
    expect(toPsi(kpa(100))).toBeCloseTo(14.5, 2);
  });

  it('frac and ratio never return NaN or Infinity', () => {
    expect(frac(NaN)).toBe(0);
    expect(frac(-1)).toBe(0);
    expect(frac(2)).toBe(1);
    expect(frac(Infinity)).toBe(1);
    expect(ratio(kw(5), kw(0))).toBe(0);
    expect(ratio(kw(5), kw(10))).toBe(0.5);
  });
});

describe('v2 seeded random', () => {
  it('same seed → same sequence; different seed → different', () => {
    const a = new Rng(42), b = new Rng(42), c = new Rng(43);
    const sa = Array.from({ length: 5 }, () => a.next());
    expect(Array.from({ length: 5 }, () => b.next())).toEqual(sa);
    expect(Array.from({ length: 5 }, () => c.next())).not.toEqual(sa);
    expect(sa.every((x) => x >= 0 && x < 1)).toBe(true);
  });
  it('state can be saved and restored mid-sequence (replay)', () => {
    const a = new Rng(7);
    a.next();
    const saved = a.state;
    const x = [a.next(), a.next()];
    a.state = saved;
    expect([a.next(), a.next()]).toEqual(x);
  });
  it('helpers stay in range; bad seeds are normalized', () => {
    const r = new Rng(NaN);
    for (let i = 0; i < 200; i++) {
      const k = r.int(6);
      expect(k >= 0 && k < 6 && Number.isInteger(k)).toBe(true);
    }
    expect(r.int(0)).toBe(0);
    expect(r.pick([])).toBeUndefined();
    expect(r.chance(0)).toBe(false);
    expect(r.chance(1)).toBe(true);
    // Roughly uniform: 10,000 draws into 4 bins, each within 22–28%.
    const bins = [0, 0, 0, 0];
    const u = new Rng(1);
    for (let i = 0; i < 10_000; i++) bins[u.int(4)]!++;
    for (const n of bins) expect(n / 10_000).toBeGreaterThan(0.22), expect(n / 10_000).toBeLessThan(0.28);
  });
});

describe('v2 event queue', () => {
  it('pops due events in time order, ties in insertion order', () => {
    const q = new EventQueue<string>();
    q.push(10, 'b');
    q.push(5, 'a');
    q.push(10, 'c');
    q.push(20, 'd');
    expect(q.peekTime()).toBe(5);
    expect(q.popDue(10).map((s) => s.event)).toEqual(['a', 'b', 'c']);
    expect(q.size).toBe(1);
    expect(q.popDue(19)).toEqual([]);
  });
  it('rejects bad times, cancels, and survives snapshot/restore', () => {
    const q = new EventQueue<{ k: string }>();
    expect(q.push(NaN, { k: 'x' })).toBe(false);
    expect(q.push(-1, { k: 'x' })).toBe(false);
    q.push(3, { k: 'retransfer' });
    q.push(4, { k: 'keep' });
    expect(q.cancel((e) => e.k === 'retransfer')).toBe(1);
    const snap = JSON.parse(JSON.stringify(q.snapshot()));
    const r = new EventQueue<{ k: string }>();
    r.restore(snap);
    r.push(4, { k: 'later' });
    expect(r.popDue(4).map((s) => s.event.k)).toEqual(['keep', 'later']);
  });
});
