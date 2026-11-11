/**
 * My Path saved profile: the shape, the answer options and validation. Split from path.ts (Phase 8a) so
 * saved-progress loading on Home doesn't pull the whole path builder (ladder, quiz, safety drills) into the
 * main bundle. Quiz and branch ids are checked by shape here; the path builder ignores ids it doesn't know.
 */

/** Shape of a quiz question id and a career branch id (validated against the full lists where they're used). */
const QUIZ_ID = /^[a-z0-9][a-z0-9-]{0,39}$/;
const BRANCH_ID = /^b-[a-z-]{2,30}$/;

export type SkillArea = 'electrical' | 'backup' | 'mechanical' | 'controls' | 'safety' | 'procedures' | 'troubleshooting' | 'leadership';

export const SKILL_AREAS: { id: SkillArea; label: string; emoji: string; blurb: string }[] = [
  { id: 'electrical', label: 'Electrical distribution', emoji: '⚡', blurb: 'Switchgear, breakers, transformers, one-lines' },
  { id: 'backup', label: 'UPS, batteries & generators', emoji: '🔋', blurb: 'Ride-through, transfers, fuel' },
  { id: 'mechanical', label: 'Cooling & HVAC', emoji: '❄️', blurb: 'Chillers, towers, pumps, air handlers' },
  { id: 'controls', label: 'Controls & BMS', emoji: '🎛️', blurb: 'Sensors, alarms, trends, VFDs' },
  { id: 'safety', label: 'Safety & LOTOTO', emoji: '🦺', blurb: 'Lockout, arc flash, PPE, permits' },
  { id: 'procedures', label: 'MOPs & change', emoji: '📋', blurb: 'Following and writing procedures' },
  { id: 'troubleshooting', label: 'Troubleshooting', emoji: '🔍', blurb: 'Finding root causes' },
  { id: 'leadership', label: 'Communication & leading', emoji: '🤝', blurb: 'Handoffs, training others, incidents' },
];

export const AREA_IDS = SKILL_AREAS.map((a) => a.id);

// ---------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------
export const ROLES = [
  { id: 'new', label: 'New to the trade / career changer', rung: 'r1' },
  { id: 'industrial', label: 'Industrial or plant maintenance (mill, factory, plant)', rung: 'r1' },
  { id: 'hvac', label: 'HVAC or refrigeration technician', rung: 'r2' },
  { id: 'electrician', label: 'Electrician (apprentice, journeyman or master)', rung: 'r2' },
  { id: 'military', label: 'Military technical background', rung: 'r2' },
  { id: 'dc-tech', label: 'Data center / critical facilities technician', rung: 'r2' },
  { id: 'building-eng', label: 'Building engineer / critical facilities engineer', rung: 'r3' },
  { id: 'senior', label: 'Senior engineer or lead', rung: 'r4' },
  { id: 'manager', label: 'Supervisor, chief engineer or manager', rung: 'r5' },
] as const;
export type RoleId = (typeof ROLES)[number]['id'];

export const YEARS = [
  { id: '0', label: 'Less than 1 year', n: 0 },
  { id: '1', label: '1–2 years', n: 1.5 },
  { id: '3', label: '3–5 years', n: 4 },
  { id: '6', label: '6–10 years', n: 8 },
  { id: '10', label: 'More than 10 years', n: 12 },
] as const;
export type YearsId = (typeof YEARS)[number]['id'];

export const EQUIPMENT_EXP = [
  { id: 'switchgear', label: 'Switchgear & breakers', area: 'electrical' },
  { id: 'ups', label: 'UPS systems', area: 'backup' },
  { id: 'gen', label: 'Generators', area: 'backup' },
  { id: 'ats', label: 'Transfer switches (ATS/STS)', area: 'electrical' },
  { id: 'chiller', label: 'Chillers', area: 'mechanical' },
  { id: 'tower', label: 'Cooling towers', area: 'mechanical' },
  { id: 'ahu', label: 'Air handlers / CRAH / CRAC', area: 'mechanical' },
  { id: 'vfd', label: 'VFDs & motors', area: 'controls' },
  { id: 'bms', label: 'BMS / EPMS screens', area: 'controls' },
  { id: 'liquid', label: 'Liquid cooling / CDUs', area: 'mechanical' },
  { id: 'fire', label: 'Fire alarm & suppression', area: 'safety' },
  { id: 'battery', label: 'Battery rooms', area: 'backup' },
] as const;

export const GOALS = [
  { id: 'climb', label: 'Climb the ladder (lead, chief engineer)' },
  { id: 'first-job', label: 'Land my first data center job' },
  { id: 'branch', label: 'Branch into a specialty' },
  { id: 'certs', label: 'Earn certifications' },
  { id: 'safety', label: 'Get safer and more confident on the floor' },
] as const;
export type GoalId = (typeof GOALS)[number]['id'];

export const HOURS = [1, 2, 3, 5, 8] as const;

export const STYLES = [
  { id: 'hands', label: 'Hands-on: let me break things', emoji: '🔧' },
  { id: 'read', label: 'Reading and step-by-step lessons', emoji: '📘' },
  { id: 'quiz', label: 'Quizzes and challenges', emoji: '🎯' },
] as const;
export type StyleId = (typeof STYLES)[number]['id'];

export interface Profile {
  name: string;
  role: RoleId;
  jobTitle: string;
  years: YearsId;
  equipment: string[];
  /** Self-rating 1–5 per area. */
  confidence: Record<SkillArea, number>;
  certs: string[];
  goal: GoalId;
  branch: string;
  hours: number;
  style: StyleId;
  /** Skill check: quiz question id → correct. */
  check: Record<string, boolean>;
  /** Signals from the resume (only these are kept, never the resume text). */
  resume: ResumeSignals | null;
  /** Path items marked done by hand (tabs, certs, ladder steps). */
  done: string[];
  createdAt: string;
  /** Blueprint revision: goes up each time the path is rebuilt. */
  rev: number;
}

export const EMPTY_CONFIDENCE: Record<SkillArea, number> = {
  electrical: 3,
  backup: 3,
  mechanical: 3,
  controls: 3,
  safety: 3,
  procedures: 3,
  troubleshooting: 3,
  leadership: 3,
};

// ---------------------------------------------------------------------------
// Resume signals
// ---------------------------------------------------------------------------
export interface ResumeSignals {
  /** Keyword hits per area. */
  hits: Record<SkillArea, number>;
  /** Up to 30 matched keywords, for display. */
  keywords: string[];
  /** Certification names found. */
  certs: string[];
  /** Job titles found. */
  titles: string[];
  /** Rough years of experience from date ranges, or null. */
  years: number | null;
  /** Characters read (so the UI can say "read 2,431 characters"). */
  chars: number;
}

// ---------------------------------------------------------------------------
// Saved profile validation
// ---------------------------------------------------------------------------
const str = (v: unknown, max = 80) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f<>]/g, '').slice(0, max) : '');
const strs = (v: unknown, max = 60, n = 60) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').map((x) => str(x, max)).slice(0, n) : []);

export function sanitizeProfile(raw: unknown): Profile | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Record<string, unknown>;
  const role = ROLES.find((r) => r.id === p.role)?.id;
  if (!role) return null;
  const conf = { ...EMPTY_CONFIDENCE };
  if (p.confidence && typeof p.confidence === 'object')
    for (const a of AREA_IDS) {
      const v = (p.confidence as Record<string, unknown>)[a];
      if (typeof v === 'number' && v >= 1 && v <= 5) conf[a] = Math.round(v);
    }
  const check: Record<string, boolean> = {};
  if (p.check && typeof p.check === 'object')
    for (const [k, v] of Object.entries(p.check as Record<string, unknown>)) if (typeof v === 'boolean' && QUIZ_ID.test(k)) check[k] = v;
  let resume: ResumeSignals | null = null;
  if (p.resume && typeof p.resume === 'object') {
    const r = p.resume as Record<string, unknown>;
    const hits = Object.fromEntries(AREA_IDS.map((a) => [a, 0])) as Record<SkillArea, number>;
    if (r.hits && typeof r.hits === 'object') for (const a of AREA_IDS) {
      const v = (r.hits as Record<string, unknown>)[a];
      if (typeof v === 'number' && v >= 0 && v < 1000) hits[a] = Math.round(v);
    }
    resume = { hits, keywords: strs(r.keywords, 40, 30), certs: strs(r.certs, 40, 30), titles: strs(r.titles, 60, 6), years: typeof r.years === 'number' && r.years >= 0 && r.years <= 50 ? r.years : null, chars: typeof r.chars === 'number' ? Math.max(0, Math.min(1e7, r.chars)) : 0 };
  }
  return {
    name: str(p.name, 40),
    role,
    jobTitle: str(p.jobTitle, 80),
    years: YEARS.find((y) => y.id === p.years)?.id ?? '0',
    equipment: strs(p.equipment).filter((e) => EQUIPMENT_EXP.some((x) => x.id === e)),
    confidence: conf,
    certs: strs(p.certs).filter((c) => /^[a-z]{2,8}$/.test(c)),
    goal: GOALS.find((g) => g.id === p.goal)?.id ?? 'climb',
    branch: typeof p.branch === 'string' && BRANCH_ID.test(p.branch) ? p.branch : '',
    hours: HOURS.includes(p.hours as (typeof HOURS)[number]) ? (p.hours as number) : 2,
    style: STYLES.find((s) => s.id === p.style)?.id ?? 'hands',
    check,
    resume,
    done: strs(p.done, 200, 200),
    createdAt: str(p.createdAt, 30),
    rev: typeof p.rev === 'number' && p.rev >= 1 && p.rev < 1000 ? Math.floor(p.rev) : 1,
  };
}
