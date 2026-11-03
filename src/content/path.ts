/**
 * Personalized training path: skill areas, resume signal detection, skill
 * scoring and the plan builder. Pure functions, no UI, so they're unit
 * tested. Everything runs in the browser; the resume text is never stored
 * or sent anywhere, only the signals found in it.
 */
import { LESSONS } from './lessons';
import { PROCEDURES } from './procedures';
import { QUIZ, type QuizQuestion, type QuizSection } from './quiz';
import { HAZARD_HUNTS, LOTO_DRILLS } from './safetyTools';
import { BRANCHES, DC_CERTS, LADDER } from './ladder';

// ---------------------------------------------------------------------------
// Skill areas
// ---------------------------------------------------------------------------
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

/** Which quiz section measures each area in the skill check. */
const AREA_QUIZ: Partial<Record<SkillArea, QuizSection>> = {
  electrical: 'electrical',
  backup: 'electrical',
  mechanical: 'mechanical',
  controls: 'mechanical',
  safety: 'safety',
  procedures: 'change',
  troubleshooting: 'change',
};

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

const KEYWORDS: Record<SkillArea, string[]> = {
  electrical: ['switchgear', 'breaker', 'transformer', 'electrician', 'electrical', 'one-line', 'one line', 'panelboard', 'busway', 'pdu', 'rpp', 'ats', 'sts', 'medium voltage', '480', '208', '4160', 'nec', 'wiring', 'conduit', 'kirk key', 'power distribution', 'motor control', 'mcc', 'arc flash study'],
  backup: ['ups', 'uninterruptible', 'battery', 'batteries', 'generator', 'genset', 'diesel', 'transfer switch', 'load bank', 'bess', 'fuel', 'paralleling', 'static bypass'],
  mechanical: ['hvac', 'chiller', 'cooling tower', 'cooling', 'refrigeration', 'refrigerant', 'compressor', 'condenser', 'evaporator', 'pump', 'crah', 'crac', 'air handler', 'ahu', 'boiler', 'hydronic', 'glycol', 'cdu', 'liquid cooling', 'mechanical', 'millwright', 'bearing', 'gearbox', 'belt', 'lubrication', 'hydraulic', 'pneumatic', 'conveyor'],
  controls: ['bms', 'bas', 'epms', 'scada', 'plc', 'controls', 'vfd', 'variable frequency', 'drive', 'sensor', 'instrumentation', 'setpoint', 'trend', 'automation', '4-20', 'hmi', 'dcim'],
  safety: ['osha', 'loto', 'lockout', 'tagout', 'arc flash', 'nfpa 70e', 'ppe', 'confined space', 'hot work', 'safety', 'fall protection', 'hazcom', 'jha', 'jsa', 'permit'],
  procedures: ['mop', 'sop', 'eop', 'procedure', 'change management', 'moc', 'work order', 'cmms', 'preventive maintenance', 'pm ', 'documentation', 'compliance', 'audit', 'checklist', 'rounds', 'log'],
  troubleshooting: ['troubleshoot', 'diagnos', 'root cause', 'rca', 'repair', 'fault', 'failure analysis', 'vibration', 'thermography', 'infrared', 'megger', 'multimeter', 'reliability'],
  leadership: ['lead', 'supervis', 'manager', 'trained', 'training', 'mentor', 'team', 'coordinat', 'vendor', 'contractor', 'customer', 'shift', 'handoff', 'scheduling', 'budget'],
};

const CERT_PATTERNS: { re: RegExp; name: string; dc?: string }[] = [
  { re: /\bOSHA[\s-]*30\b/i, name: 'OSHA 30' },
  { re: /\bOSHA[\s-]*10\b/i, name: 'OSHA 10' },
  { re: /\b(EPA[\s-]*608|section\s*608)\b/i, name: 'EPA 608' },
  { re: /\bNFPA[\s-]*70E\b/i, name: 'NFPA 70E training' },
  { re: /\bCDCP\b|certified data cent(er|re) professional/i, name: 'CDCP', dc: 'cdcp' },
  { re: /\bCDCTP\b/i, name: 'CDCTP', dc: 'cdctp' },
  { re: /\bCDFOM\b/i, name: 'CDFOM', dc: 'cdfom' },
  { re: /\bCDCMP\b/i, name: 'CDCMP', dc: 'cdcmp' },
  { re: /\bDCCA\b/i, name: 'DCCA', dc: 'dcca' },
  { re: /accredited operations specialist|\bAOS\b/, name: 'Uptime AOS', dc: 'aos' },
  { re: /accredited tier specialist|\bATS\b certified/i, name: 'Uptime ATS', dc: 'ats' },
  { re: /journeyman/i, name: 'Journeyman electrician' },
  { re: /master electrician/i, name: 'Master electrician' },
  { re: /\bCPR\b|first aid|\bAED\b/i, name: 'CPR / First aid' },
  { re: /\bNETA\b/, name: 'NETA ETT' },
  { re: /\bCCST\b/, name: 'ISA CCST' },
  { re: /\bCMRP\b|\bCMRT\b/, name: 'SMRP reliability' },
  { re: /\bPMP\b|\bCAPM\b/, name: 'PMI project management' },
  { re: /\bCEM\b/, name: 'Certified Energy Manager' },
  { re: /python/i, name: 'Python' },
];

const TITLE_PATTERNS: RegExp[] = [
  /(critical facilities|data cent(?:er|re)|building|facilities|maintenance|chief|lead|senior|controls|hvac|electrical|mechanical|operations|field service|reliability)\s+(engineer|technician|tech|manager|supervisor|specialist|lead)/gi,
  /\b(millwright|electrician|mixing operator|machine operator|plant operator|stationary engineer|hvac technician|maintenance mechanic)\b/gi,
];

/** Find skill signals in resume text. Works on plain text from any file type. */
export function analyzeResume(text: string, now = new Date()): ResumeSignals {
  const t = ` ${text.toLowerCase().replace(/\s+/g, ' ')} `;
  const hits = Object.fromEntries(AREA_IDS.map((a) => [a, 0])) as Record<SkillArea, number>;
  const keywords: string[] = [];
  for (const a of AREA_IDS) {
    for (const k of KEYWORDS[a]) {
      const re = new RegExp(`(^|[^a-z0-9])${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').trim()}`, 'g');
      const n = (t.match(re) ?? []).length;
      if (n) {
        hits[a] += Math.min(n, 3);
        if (keywords.length < 30 && !keywords.includes(k.trim())) keywords.push(k.trim());
      }
    }
  }
  const certs = [...new Set(CERT_PATTERNS.filter((c) => c.re.test(text)).map((c) => c.name))];
  const titles = [...new Set(TITLE_PATTERNS.flatMap((re) => [...text.matchAll(re)].map((m) => m[0].replace(/\s+/g, ' ').trim())))]
    .map((s) => s.replace(/\b\w/g, (c) => c.toUpperCase()))
    .slice(0, 6);
  // Years: earliest start year to latest end year (Present = this year).
  const year = now.getFullYear();
  const ranges = [...text.matchAll(/\b(19[89]\d|20[0-4]\d)\s*(?:-|–|—|to)\s*(19[89]\d|20[0-4]\d|present|current|now)\b/gi)].map((m) => [
    Number(m[1]),
    /\d/.test(m[2]!) ? Number(m[2]) : year,
  ]);
  let years: number | null = null;
  if (ranges.length) {
    const start = Math.min(...ranges.map((r) => r[0]!));
    const end = Math.max(...ranges.map((r) => r[1]!));
    years = Math.max(0, Math.min(50, end - start));
  } else {
    const m = text.match(/(\d{1,2})\+?\s*years?\s+(?:of\s+)?experience/i);
    if (m) years = Math.min(50, Number(m[1]));
  }
  return { hits, keywords, certs, titles, years, chars: text.length };
}

/** Which data center certs (DC_CERTS ids) the resume mentions. */
export function dcCertsInResume(text: string): string[] {
  return CERT_PATTERNS.filter((c) => c.dc && c.re.test(text)).map((c) => c.dc!);
}

// ---------------------------------------------------------------------------
// Skill check
// ---------------------------------------------------------------------------
/** 8 skill check questions: 2 per quiz section, stable for a seed. */
export function skillCheck(seed = 7): QuizQuestion[] {
  let s = seed >>> 0 || 1;
  const rnd = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
  const out: QuizQuestion[] = [];
  for (const sec of ['electrical', 'mechanical', 'safety', 'change'] as QuizSection[]) {
    const pool = QUIZ.filter((q) => q.section === sec);
    for (let i = 0; i < 2 && pool.length; i++) out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]!);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------
export interface SkillScores {
  areas: Record<SkillArea, number>;
  overall: number;
  level: { name: string; blurb: string };
  strengths: SkillArea[];
  focus: SkillArea[];
  /** Ladder rung the profile most likely fits. */
  rung: string;
}

export const LEVEL_NAMES = [
  { min: 0, name: 'Just starting', blurb: 'Everyone starts here. Your path begins with the foundations.' },
  { min: 30, name: 'Building up', blurb: 'You have a base to build on. Time to fill the gaps.' },
  { min: 50, name: 'Solid', blurb: 'You know your way around. Now go deeper and prove it.' },
  { min: 70, name: 'Strong', blurb: 'You could teach parts of this. Aim for certs and leading.' },
  { min: 85, name: 'Expert', blurb: 'Rare air. Sharpen the edges and help others climb.' },
] as const;

export function scoreProfile(p: Pick<Profile, 'confidence' | 'check' | 'resume' | 'equipment' | 'years' | 'role'>): SkillScores {
  const yearsN = YEARS.find((y) => y.id === p.years)?.n ?? 0;
  const areas = {} as Record<SkillArea, number>;
  for (const a of AREA_IDS) {
    const parts: [number, number][] = [];
    parts.push([((p.confidence[a] ?? 3) - 1) * 25, 0.4]);
    const sec = AREA_QUIZ[a];
    if (sec) {
      const qs = Object.entries(p.check).filter(([id]) => QUIZ.find((q) => q.id === id)?.section === sec);
      if (qs.length) parts.push([(qs.filter(([, v]) => v).length / qs.length) * 100, 0.35]);
    }
    if (p.resume) parts.push([Math.min(100, p.resume.hits[a] * 14), 0.15]);
    const eq = EQUIPMENT_EXP.filter((e) => e.area === a);
    if (eq.length) parts.push([(eq.filter((e) => p.equipment.includes(e.id)).length / eq.length) * 100, 0.1]);
    const w = parts.reduce((n, [, wt]) => n + wt, 0);
    let v = parts.reduce((n, [x, wt]) => n + x * wt, 0) / w;
    v += Math.min(10, yearsN); // experience counts a little everywhere
    areas[a] = Math.round(Math.max(0, Math.min(100, v)));
  }
  const overall = Math.round(AREA_IDS.reduce((n, a) => n + areas[a], 0) / AREA_IDS.length);
  const level = [...LEVEL_NAMES].reverse().find((l) => overall >= l.min)!;
  const sorted = [...AREA_IDS].sort((x, y) => areas[x] - areas[y]);
  const roleRung = ROLES.find((r) => r.id === p.role)?.rung ?? 'r1';
  return { areas, overall, level: { name: level.name, blurb: level.blurb }, strengths: sorted.slice(-2).reverse(), focus: sorted.slice(0, 3), rung: roleRung };
}

// ---------------------------------------------------------------------------
// Path builder
// ---------------------------------------------------------------------------
export type PathKind = 'lesson' | 'proc' | 'safety' | 'tab' | 'cert' | 'exam';
export type PathTab = 'safety' | 'tips' | 'tools' | 'career' | 'cases' | 'change' | 'glossary' | 'quiz' | 'sim' | 'designs' | 'equipment';

export interface PathItem {
  key: string;
  kind: PathKind;
  /** Lesson, procedure, safety drill or cert id; or a tab for 'tab'. */
  ref: string;
  title: string;
  why: string;
  minutes: number;
  area: SkillArea | 'career';
}

export interface PathPhase {
  id: string;
  title: string;
  emoji: string;
  blurb: string;
  items: PathItem[];
}

export interface TrainingPath {
  phases: PathPhase[];
  totalMinutes: number;
  weeks: number;
  /** Week number (1-based) each item lands in, by key. */
  weekOf: Record<string, number>;
}

const lesson = (id: string, area: SkillArea, why: string): PathItem | null => {
  const l = LESSONS.find((x) => x.id === id);
  return l ? { key: `lesson:${id}`, kind: 'lesson', ref: id, title: l.title, why, minutes: l.minutes, area } : null;
};
const proc = (id: string, area: SkillArea, why: string): PathItem | null => {
  const p = PROCEDURES.find((x) => x.id === id);
  return p ? { key: `proc:${id}`, kind: 'proc', ref: id, title: p.title, why, minutes: p.minutes, area } : null;
};
const tab = (t: PathTab, title: string, area: SkillArea | 'career', why: string, minutes = 10): PathItem => ({ key: `tab:${t}:${title}`, kind: 'tab', ref: t, title, why, minutes, area });

/** What each area pulls into the path, from foundations to practice. */
const AREA_PLAN: Record<SkillArea, { learn: (PathItem | null)[]; practice: (PathItem | null)[] }> = {
  electrical: {
    learn: [lesson('power-path', 'electrical', 'The map of the whole plant. Everything else builds on it.'), lesson('redundancy', 'electrical', 'N+1 vs 2N comes up in every interview and every MOP.'), lesson('sts', 'electrical', 'How dual-corded racks survive a path failure.'), lesson('kirk-mtm', 'electrical', 'Trapped-key interlocks, step by step.')],
    practice: [proc('mop-mtm', 'electrical', 'Real switching order with interlocks.'), proc('mop-tie-return', 'electrical', 'Putting it back is where mistakes happen.'), tab('tips', 'Electrical tips & wire colors', 'electrical', 'BOY, BRB and rules of thumb.')],
  },
  backup: {
    learn: [lesson('utility-outage', 'backup', 'The first 30 seconds of an outage, second by second.'), lesson('ups-bypass', 'backup', 'The most common critical MOP on site.')],
    practice: [proc('drill-utility', 'backup', 'Your first emergency drill.'), proc('mop-gen-test', 'backup', 'End every test in AUTO.'), proc('mop-ups-bypass', 'backup', 'Do it in the right order, scored.'), proc('drill-fuel', 'backup', 'Long-outage fuel math.')],
  },
  mechanical: {
    learn: [lesson('heat-path', 'mechanical', 'Where the heat goes, chip to tower.'), lesson('chiller-cycle', 'mechanical', 'CCME: the refrigeration cycle.'), lesson('crah-crac', 'mechanical', 'Air side basics.'), lesson('liquid-cooling', 'mechanical', 'GPU racks give you seconds, not minutes.')],
    practice: [proc('drill-chiller', 'mechanical', 'Chiller trip on a hot day.'), proc('mop-chiller-pm', 'mechanical', 'Taking a chiller out safely.'), proc('drill-cdu', 'mechanical', 'Liquid cooling failure.'), lesson('cooling-failure', 'mechanical', 'Cooling failure at 105 °F, walked through.')],
  },
  controls: {
    learn: [lesson('doas-humidity', 'controls', 'Dew point and pressure control.'), tab('tips', 'Controls & BMS tips', 'controls', '4–20 mA, fail-safes, overrides.')],
    practice: [tab('sim', 'Read the BMS panel in the simulator', 'controls', 'Watch trends react to failures.', 15), proc('drill-surprise', 'controls', 'Find the failure from the alarms.'), tab('tools', 'Field Tools: amps, flow and airflow', 'controls', 'Numbers you need for sensors and drives.')],
  },
  safety: {
    learn: [lesson('loto-basics', 'safety', 'Your lock, your life.'), tab('safety', 'Safety Center: golden rules & library', 'safety', 'The ten rules and the reasons behind them.', 15)],
    practice: [
      { key: `safety:${LOTO_DRILLS[0]!.id}`, kind: 'safety', ref: LOTO_DRILLS[0]!.id, title: `LOTOTO drill: ${LOTO_DRILLS[0]!.title}`, why: 'Put lockout steps in the right order.', minutes: 5, area: 'safety' },
      { key: `safety:${HAZARD_HUNTS[0]!.id}`, kind: 'safety', ref: HAZARD_HUNTS[0]!.id, title: `Hazard hunt: ${HAZARD_HUNTS[0]!.title}`, why: 'Train your eye for hazards.', minutes: 5, area: 'safety' },
      proc('drill-fire', 'safety', 'Fire alarm response.'),
    ],
  },
  procedures: {
    learn: [lesson('rounds', 'procedures', 'Rounds done right.'), tab('change', 'Change management & MOP anatomy', 'procedures', 'How changes are approved and done.', 15)],
    practice: [proc('mop-crah-filters', 'procedures', 'A simple MOP to start with.'), proc('mop-ups-return', 'procedures', 'Back-out and return steps.')],
  },
  troubleshooting: {
    learn: [tab('cases', 'Case studies: the five whys', 'troubleshooting', 'Real-style incidents traced to root cause.', 20), tab('tips', 'Troubleshooting tips', 'troubleshooting', 'Half-split, what changed, simple stuff first.')],
    practice: [proc('drill-surprise', 'troubleshooting', 'Diagnose a random failure.'), proc('drill-towers', 'troubleshooting', 'Two towers lost at 105 °F.')],
  },
  leadership: {
    learn: [tab('career', 'Career ladder: your next rung', 'leadership', 'See what moving up takes.', 10)],
    practice: [tab('career', 'Write a shift handoff', 'leadership', 'Clear handoffs prevent incidents.', 10), tab('career', 'Interview practice cards', 'leadership', 'Say your answers out loud.', 15)],
  },
};

const RUNG_ORDER = LADDER.map((r) => r.id);

export function buildPath(p: Profile, s: SkillScores = scoreProfile(p)): TrainingPath {
  const seen = new Set<string>();
  const add = (list: PathItem[], it: PathItem | null) => {
    if (it && !seen.has(it.key)) {
      seen.add(it.key);
      list.push(it);
    }
  };
  // Areas ordered weakest first; safety jumps to the front if it's weak.
  const order = [...AREA_IDS].sort((a, b) => s.areas[a] - s.areas[b]);
  if (s.areas.safety < 60) order.splice(order.indexOf('safety'), 1), order.unshift('safety');
  const weak = order.filter((a) => s.areas[a] < 65);
  const focus = weak.length ? weak.slice(0, 4) : order.slice(0, 2);
  const styleFirst = p.style === 'hands';

  const foundation: PathItem[] = [];
  const practice: PathItem[] = [];
  for (const a of focus) {
    const plan = AREA_PLAN[a];
    const nLearn = s.areas[a] < 35 ? plan.learn.length : Math.min(2, plan.learn.length);
    plan.learn.slice(0, nLearn).forEach((it) => add(foundation, it));
    plan.practice.slice(0, s.areas[a] < 35 ? 2 : plan.practice.length).forEach((it) => add(practice, it));
  }
  if (styleFirst) foundation.splice(1, 0, tab('sim', 'Break the plant in the simulator', 'troubleshooting', 'You learn by doing, so start by doing.', 15));
  if (!seen.has('safety:' + LOTO_DRILLS[0]!.id)) add(practice, AREA_PLAN.safety.practice[0]!);

  const prove: PathItem[] = [];
  for (const sec of [...new Set(focus.map((a) => AREA_QUIZ[a]).filter(Boolean))] as QuizSection[]) {
    add(prove, tab('quiz', `Quiz: ${sec === 'change' ? 'Change management' : sec[0]!.toUpperCase() + sec.slice(1)} section`, 'procedures', 'Check what stuck.', 10));
  }
  add(prove, tab('glossary', 'Glossary flashcards (10 minutes a day)', 'leadership', 'Speak the language on the floor.', 10));
  add(prove, { key: 'exam', kind: 'exam', ref: 'quiz', title: 'Timed exam: aim for 80+', why: 'Proof you are ready for the next step.', minutes: 15, area: 'procedures' });

  // Level up: certs and career moves for the next rung.
  const level: PathItem[] = [];
  const rungIdx = RUNG_ORDER.indexOf(s.rung);
  const nextRung = LADDER[Math.min(LADDER.length - 1, rungIdx + 1)]!;
  for (const c of DC_CERTS.filter((c) => RUNG_ORDER.indexOf(c.rung) <= rungIdx + 1 && !p.certs.includes(c.id)).slice(0, 2)) {
    add(level, { key: `cert:${c.id}`, kind: 'cert', ref: c.id, title: `Earn ${c.short}: ${c.name}`, why: c.why, minutes: 0, area: 'career' });
  }
  if (p.goal === 'branch' && p.branch) {
    const b = BRANCHES.find((x) => x.id === p.branch);
    if (b) b.firstSteps.slice(0, 2).forEach((step) => add(level, { key: `tab:career:${b.id}:${step}`, kind: 'tab', ref: 'career', title: step, why: `First step toward ${b.title}.`, minutes: 30, area: 'career' }));
  }
  add(level, tab('career', `Ladder goals for ${nextRung.role}`, 'career', 'Tick off the goals that get you to the next rung.', 15));
  if (p.goal === 'first-job') add(level, tab('career', 'Interview prep: practice 5 cards a day', 'career', 'Get ready to land the job.', 15));

  const phases: PathPhase[] = [
    { id: 'foundation', title: 'Lay the foundation', emoji: '📐', blurb: `Shore up ${focus.slice(0, 2).map((a) => SKILL_AREAS.find((x) => x.id === a)!.label).join(' and ')} first.`, items: foundation },
    { id: 'practice', title: 'Wire it up', emoji: '🛠️', blurb: 'Hands-on practice on the live plant model. Wrong calls are safe here.', items: practice },
    { id: 'prove', title: 'Test & verify', emoji: '🔬', blurb: 'Prove it: quizzes, flashcards and the timed exam.', items: prove },
    { id: 'level', title: 'Energize', emoji: '⚡', blurb: `Level up: certs and goals toward ${nextRung.role.toLowerCase()}.`, items: level },
  ].filter((ph) => ph.items.length);

  // Spread items across weeks by study time.
  const perWeek = Math.max(30, p.hours * 60);
  const weekOf: Record<string, number> = {};
  let week = 1;
  let used = 0;
  for (const ph of phases) {
    for (const it of ph.items) {
      const m = it.minutes || 30;
      if (used + m > perWeek && used > 0) {
        week++;
        used = 0;
      }
      weekOf[it.key] = week;
      used += m;
    }
  }
  const totalMinutes = phases.reduce((n, ph) => n + ph.items.reduce((k, it) => k + it.minutes, 0), 0);
  return { phases, totalMinutes, weeks: week, weekOf };
}

/** Is a path item done, given saved progress? */
export function itemDone(it: PathItem, prog: { lessons: string[]; procs: Record<string, number>; safety: Record<string, number>; dcCerts: string[]; exam: number }, manual: string[]): boolean {
  if (it.kind === 'lesson') return prog.lessons.includes(it.ref);
  if (it.kind === 'proc') return it.ref in prog.procs;
  if (it.kind === 'safety') return it.ref in prog.safety;
  if (it.kind === 'cert') return prog.dcCerts.includes(it.ref);
  if (it.kind === 'exam') return prog.exam >= 80;
  return manual.includes(it.key);
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
    for (const [k, v] of Object.entries(p.check as Record<string, unknown>)) if (typeof v === 'boolean' && QUIZ.some((q) => q.id === k)) check[k] = v;
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
    branch: BRANCHES.some((b) => b.id === p.branch) ? (p.branch as string) : '',
    hours: HOURS.includes(p.hours as (typeof HOURS)[number]) ? (p.hours as number) : 2,
    style: STYLES.find((s) => s.id === p.style)?.id ?? 'hands',
    check,
    resume,
    done: strs(p.done, 200, 200),
    createdAt: str(p.createdAt, 30),
    rev: typeof p.rev === 'number' && p.rev >= 1 && p.rev < 1000 ? Math.floor(p.rev) : 1,
  };
}

// ---------------------------------------------------------------------------
// Pre-fill answers from resume signals (the person can change all of them)
// ---------------------------------------------------------------------------
const EQUIP_KEYS: Record<string, string[]> = {
  switchgear: ['switchgear', 'breaker', 'panelboard', 'medium voltage'],
  ups: ['ups', 'uninterruptible'],
  gen: ['generator', 'genset', 'diesel', 'load bank'],
  ats: ['ats', 'sts', 'transfer switch'],
  chiller: ['chiller', 'refrigeration', 'compressor'],
  tower: ['cooling tower'],
  ahu: ['crah', 'crac', 'air handler', 'ahu', 'hvac'],
  vfd: ['vfd', 'variable frequency', 'drive', 'motor control', 'mcc'],
  bms: ['bms', 'bas', 'epms', 'scada', 'hmi', 'dcim'],
  liquid: ['cdu', 'liquid cooling'],
  battery: ['battery', 'batteries', 'bess'],
};

export function equipmentFromResume(r: ResumeSignals): string[] {
  return Object.entries(EQUIP_KEYS)
    .filter(([, keys]) => keys.some((k) => r.keywords.includes(k)))
    .map(([id]) => id);
}

export function roleFromResume(r: ResumeSignals): RoleId | null {
  const t = r.titles.join(' | ').toLowerCase();
  if (/chief|manager|supervisor|director/.test(t)) return 'manager';
  if (/building engineer|critical facilities engineer|facilities engineer|data cent(er|re) engineer/.test(t)) return 'building-eng';
  if (/senior|lead/.test(t)) return 'senior';
  if (/critical facilities tech|data cent(er|re) tech/.test(t)) return 'dc-tech';
  if (/electrician|electrical tech/.test(t)) return 'electrician';
  if (/hvac/.test(t)) return 'hvac';
  if (/millwright|operator|maintenance|mechanic|plant/.test(t)) return 'industrial';
  return null;
}

export function yearsIdFrom(n: number | null): YearsId | null {
  if (n === null) return null;
  if (n < 1) return '0';
  if (n < 3) return '1';
  if (n < 6) return '3';
  if (n <= 10) return '6';
  return '10';
}

/** Suggested confidence (1–5) per area from resume keyword hits. */
export function confidenceFromResume(r: ResumeSignals): Record<SkillArea, number> {
  const out = { ...EMPTY_CONFIDENCE };
  for (const a of AREA_IDS) out[a] = r.hits[a] >= 6 ? 4 : r.hits[a] >= 2 ? 3 : 2;
  return out;
}
