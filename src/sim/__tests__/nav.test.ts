/** Phase 6b: navigation grouped by intent; tab ids (and so old #/ links) unchanged. */
import { describe, expect, it } from 'vitest';
import { BOTTOM, GROUP_DESC, GROUPS, NAV, TAB_IDS } from '../../ui/nav';

const ALL = ['home', 'mypath', 'sim', 'learn', 'procedures', 'cases', 'designs', 'quiz', 'equipment', 'never', 'glossary', 'safety', 'tools', 'tips', 'career', 'codes', 'uptime', 'change', 'feedback', 'about'];

describe('navigation groups', () => {
  it('keeps all 20 tab ids, each once', () => {
    expect([...TAB_IDS].sort()).toEqual([...ALL].sort());
    expect(new Set(TAB_IDS).size).toBe(20);
  });
  it('puts every tab in exactly one of the six groups, none empty, each described', () => {
    expect(GROUPS).toEqual(['Start', 'Simulator', 'Learn', 'Practice', 'Reference', 'Me']);
    for (const n of NAV) expect(GROUPS).toContain(n.group);
    for (const g of GROUPS) {
      expect(NAV.filter((n) => n.group === g).length).toBeGreaterThan(0);
      expect(GROUP_DESC[g].length).toBeGreaterThan(10);
    }
  });
  it('lists tabs in group order (sidebar and slide direction follow it)', () => {
    const idx = NAV.map((n) => GROUPS.indexOf(n.group));
    expect(idx).toEqual([...idx].sort((a, b) => a - b));
  });
  it('phone bottom bar = Home, Sim, Learn, Practice (+ More)', () => {
    expect(BOTTOM).toEqual(['home', 'sim', 'learn', 'procedures']);
    expect(NAV.find((n) => n.id === 'procedures')!.short).toBe('Practice');
  });
});
