import { DC_CERTS, LADDER } from '../../content/ladder';
import {
  AREA_IDS,
  EMPTY_CONFIDENCE,
  analyzeResume,
  buildPath,
  confidenceFromResume,
  dcCertsInResume,
  equipmentFromResume,
  itemDone,
  roleFromResume,
  sanitizeProfile,
  scoreProfile,
  skillCheck,
  yearsIdFrom,
  type Profile,
} from '../../content/path';
import { xmlToText } from '../../ui/resumeReader';
import { sanitize } from '../../ui/progress';

const RESUME = `Jonathan Example
Building Engineer, 2024 - Present
Mixing Operator, 2019 - 2024
- Daily rounds on switchgear, UPS and generators; logged readings in CMMS
- Performed LOTO and followed MOPs for chiller and cooling tower PM
- Troubleshot VFD faults and BMS alarms; trained two new technicians
Certifications: OSHA 30, EPA 608 Universal, CDCP, CPR/AED`;

const base = (over: Partial<Profile> = {}): Profile => ({
  name: 'J',
  role: 'building-eng',
  jobTitle: '',
  years: '3',
  equipment: [],
  confidence: { ...EMPTY_CONFIDENCE },
  certs: [],
  goal: 'climb',
  branch: '',
  hours: 2,
  style: 'hands',
  check: {},
  resume: null,
  done: [],
  createdAt: '2026-11-03',
  ...over,
});

describe('resume signals', () => {
  it('finds titles, years, certs, keywords and equipment', () => {
    const r = analyzeResume(RESUME, new Date(2026, 10, 3));
    expect(r.titles.join(' ')).toMatch(/Building Engineer/);
    expect(r.titles.join(' ')).toMatch(/Mixing Operator/);
    expect(r.years).toBe(7);
    for (const c of ['OSHA 30', 'EPA 608', 'CDCP', 'CPR / First aid']) expect(r.certs).toContain(c);
    expect(r.hits.backup).toBeGreaterThan(0);
    expect(r.hits.safety).toBeGreaterThan(0);
    expect(equipmentFromResume(r)).toEqual(expect.arrayContaining(['switchgear', 'ups', 'gen', 'chiller', 'tower', 'vfd', 'bms']));
    expect(roleFromResume(r)).toBe('building-eng');
    expect(dcCertsInResume(RESUME)).toEqual(['cdcp']);
    expect(yearsIdFrom(r.years)).toBe('6');
    expect(Object.values(confidenceFromResume(r)).every((v) => v >= 2 && v <= 4)).toBe(true);
  });
  it('handles an empty or unrelated resume', () => {
    const r = analyzeResume('Barista. Made coffee. Loved people.');
    expect(r.certs).toEqual([]);
    expect(r.years).toBeNull();
    expect(roleFromResume(r)).toBeNull();
  });
  it('turns Word XML into text', () => {
    expect(xmlToText('<w:p><w:r><w:t>Hello &amp; welcome</w:t></w:r></w:p><w:p><w:t>Line 2</w:t></w:p>')).toBe('Hello & welcome\nLine 2');
  });
});

describe('scoring and the path', () => {
  it('the skill check has 8 questions, 2 per section', () => {
    const q = skillCheck();
    expect(q.length).toBe(8);
    for (const s of ['electrical', 'mechanical', 'safety', 'change']) expect(q.filter((x) => x.section === s).length).toBe(2);
  });
  it('scores go up with confidence and right answers, and pick weak areas as focus', () => {
    const qs = skillCheck();
    const low = scoreProfile(base({ confidence: Object.fromEntries(AREA_IDS.map((a) => [a, 1])) as Profile['confidence'], check: Object.fromEntries(qs.map((q) => [q.id, false])) }));
    const high = scoreProfile(base({ confidence: Object.fromEntries(AREA_IDS.map((a) => [a, 5])) as Profile['confidence'], check: Object.fromEntries(qs.map((q) => [q.id, true])) }));
    expect(high.overall).toBeGreaterThan(low.overall);
    for (const a of AREA_IDS) {
      expect(low.areas[a]).toBeGreaterThanOrEqual(0);
      expect(high.areas[a]).toBeLessThanOrEqual(100);
    }
    const mixed = scoreProfile(base({ confidence: { ...EMPTY_CONFIDENCE, mechanical: 1, controls: 1, electrical: 5 } }));
    expect(mixed.focus).toEqual(expect.arrayContaining(['mechanical', 'controls']));
    expect(mixed.strengths).toContain('electrical');
  });
  it('builds a phased, scheduled path that starts with safety when safety is weak', () => {
    const p = base({ confidence: { ...EMPTY_CONFIDENCE, safety: 1 }, hours: 1 });
    const path = buildPath(p);
    expect(path.phases.length).toBeGreaterThanOrEqual(3);
    expect(path.phases[0]!.items[0]!.area).toBe('safety');
    const keys = path.phases.flatMap((ph) => ph.items.map((i) => i.key));
    expect(new Set(keys).size).toBe(keys.length);
    for (const k of keys) expect(path.weekOf[k]).toBeGreaterThanOrEqual(1);
    expect(path.weeks).toBeGreaterThan(1);
    // More study time = fewer weeks.
    expect(buildPath({ ...p, hours: 8 }).weeks).toBeLessThan(path.weeks);
  });
  it('suggests certs you do not have yet, and respects a branch goal', () => {
    const p = base({ certs: ['cdcp'], goal: 'branch', branch: 'b-controls' });
    const items = buildPath(p).phases.flatMap((ph) => ph.items);
    expect(items.some((i) => i.key === 'cert:cdcp')).toBe(false);
    expect(items.some((i) => i.kind === 'cert' && DC_CERTS.some((c) => c.id === i.ref))).toBe(true);
    expect(items.some((i) => /Controls/.test(i.why))).toBe(true);
  });
  it('items tick off from real progress', () => {
    const p = base();
    const items = buildPath(p).phases.flatMap((ph) => ph.items);
    const lesson = items.find((i) => i.kind === 'lesson')!;
    const prog = { lessons: [lesson.ref], procs: {}, safety: {}, dcCerts: [], exam: -1 };
    expect(itemDone(lesson, prog, [])).toBe(true);
    const tab = items.find((i) => i.kind === 'tab');
    if (tab) expect(itemDone(tab, prog, [tab.key])).toBe(true);
    expect(LADDER.some((r) => r.id === scoreProfile(p).rung)).toBe(true);
  });
});

describe('saved profile', () => {
  it('is validated and never holds resume text', () => {
    const raw = { ...base(), resume: { hits: { electrical: 3 }, keywords: ['ups', 5], certs: ['CDCP'], titles: ['<b>x</b>'], years: 4, chars: 900, text: 'SECRET RESUME' }, name: 'J<script>', hours: 999 };
    const p = sanitizeProfile(raw)!;
    expect(p.name).toBe('Jscript');
    expect(p.hours).toBe(2);
    expect(JSON.stringify(p)).not.toMatch(/SECRET/);
    expect(p.resume!.keywords).toEqual(['ups']);
    expect(sanitizeProfile({ role: 'nope' })).toBeNull();
    expect(sanitize({ profile: raw }).profile!.role).toBe('building-eng');
  });
});
