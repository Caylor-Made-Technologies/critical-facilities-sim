import { TIP_CATS, TIPS, tipOfDay } from '../../content/tips';
import { sanitize } from '../../ui/progress';
import { search } from '../../ui/search';

describe('tips & tricks', () => {
  it('has over 200 tips with unique ids, every topic filled', () => {
    expect(TIPS.length).toBeGreaterThan(200);
    expect(new Set(TIPS.map((t) => t.id)).size).toBe(TIPS.length);
    for (const c of TIP_CATS) expect(TIPS.filter((t) => t.cat === c.id).length, c.id).toBeGreaterThanOrEqual(10);
    for (const t of TIPS) expect(t.text.length, t.id).toBeGreaterThan(25);
  });
  it('includes the classic memory aids', () => {
    const titles = TIPS.map((t) => t.title).join(' | ');
    expect(titles).toMatch(/CCME/);
    expect(titles).toMatch(/BOY/);
    expect(titles).toMatch(/BRB/);
    expect(TIPS.find((t) => t.title.startsWith('CCME'))!.text).toMatch(/Compressor → Condenser → Metering device → Evaporator/);
  });
  it('risky in-a-pinch moves carry a caution', () => {
    for (const re of [/EC fans/, /VFD faulted/, /air-cooled/i, /Standby pump/]) {
      const t = TIPS.find((x) => x.cat === 'pinch' && re.test(x.title));
      expect(t, String(re)).toBeDefined();
      expect(t!.caution, t!.id).toBeTruthy();
    }
  });
  it('tip of the day is stable for a date', () => {
    expect(tipOfDay('2026-11-02')).toBe(tipOfDay('2026-11-02'));
  });
  it('saved tips survive sanitize; quick search finds tips', () => {
    expect(sanitize({ favTips: ['a', 2, 'b'] }).favTips).toEqual(['a', 'b']);
    expect(search('ccme')[0]!.type).toBe('Tip');
  });
});
