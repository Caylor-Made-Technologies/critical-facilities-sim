/**
 * Generic and public only (repo rule): no real equipment makers, operators or tech companies
 * anywhere in published content or UI text. Word-boundary match, case-insensitive.
 */
const FILES = import.meta.glob(['../../content/*.ts', '../../ui/**/*.tsx', '../../ui/**/*.ts'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

const BANNED = [
  // Operators and tech companies
  'amazon', 'aws', 'google', 'microsoft', 'azure', 'facebook', 'equinix', 'digital realty', 'nvidia', 'tesla',
  // Power equipment
  'caterpillar', 'cummins', 'kohler', 'generac', 'mtu', 'schneider', 'square d', 'eaton', 'cutler-hammer', 'vertiv', 'liebert', 'abb', 'siemens', 'general electric', 'asco', 'russelectric', 'enersys', 'exide', 'mitsubishi', 'toshiba',
  // Mechanical equipment
  'trane', 'carrier', 'york', 'daikin', 'stulz', 'munters', 'johnson controls', 'honeywell', 'emerson', 'baltimore aircoil', 'evapco', 'marley', 'grundfos', 'bell & gossett', 'danfoss', 'invertek', 'optidrive',
  // Tools and test gear (use the generic name: meter, insulation tester)
  'fluke', 'megger', 'salisbury',
];

// File → names allowed there, and why.
const ALLOW: Record<string, string[]> = {
  // Career content may name certification issuers (owner's decision 2026-11-02), as education only.
  'issuers.ts': ['schneider', 'uptime institute'],
  'ladder.ts': ['schneider', 'uptime institute'],
  'career.ts': ['schneider', 'uptime institute'],
  // Resume reader: matches words people write on their own resumes; never shown as advice.
  'path.ts': ['megger'],
};

describe('generic only: no real company or vendor names in content or UI', () => {
  it('scans every content and UI file', () => expect(Object.keys(FILES).length).toBeGreaterThan(40));
  for (const [path, text] of Object.entries(FILES)) {
    const file = path.split('/').pop()!;
    it(file, () => {
      const lower = text.toLowerCase();
      const hits = BANNED.filter((w) => !(ALLOW[file] ?? []).includes(w) && new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\&]/g, '\\$&')}\\b`).test(lower));
      expect(hits, `${file} names: ${hits.join(', ')}`).toEqual([]);
    });
  }
});

describe('trademark credit (owner decision 2026-11-06)', () => {
  it('while "Kirk key" is used as the trade term, About credits its trademark owner', () => {
    const uses = Object.entries(FILES).filter(([p, t]) => !p.endsWith('AboutTab.tsx') && /kirk[- ]?key/i.test(t)).length;
    expect(uses).toBeGreaterThan(0);
    const about = Object.entries(FILES).find(([p]) => p.endsWith('AboutTab.tsx'))![1];
    expect(about).toMatch(/Kirk Key is a trademark of Kirk Key Interlock Company/);
    expect(about).toMatch(/no affiliation with or endorsement/);
  });
});
