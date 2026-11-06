/**
 * Learning progress: lessons finished, quiz answers, guides read.
 * Stored only in this browser's localStorage (never sent anywhere), with
 * every access guarded. Turned into XP and a level to make growth visible.
 */
import { useCallback, useState } from 'react';
import { sanitizeProfile, type Profile } from '../content/path';
import { earnedBadges } from './badges';
import { today } from './dates';
export { streakOf, today } from './dates';

const KEY = 'cfs-progress-v1';

export interface Progress {
  lessons: string[];
  /** Question id → answered correctly on the first try. */
  quiz: Record<string, boolean>;
  guides: string[];
  /** Procedure / drill id → best score (0–100). */
  procs: Record<string, number>;
  /** Procedure / drill id → fastest finish in seconds (real time). */
  times: Record<string, number>;
  /** Safety Center drill id → best score (0–100). */
  safety: Record<string, number>;
  /** Daily challenge: YYYY-MM-DD → score (0–100). */
  daily: Record<string, number>;
  /** Flashcard id → Leitner box (0 = new/missed … 4 = mastered). */
  cards: Record<string, number>;
  /** Best exam score (0–100), or -1 if never taken. */
  exam: number;
  /** Saved (starred) tip ids. */
  favTips: string[];
  /** Career ladder: the rung you marked "I'm here" ('' if none). */
  careerRung: string;
  /** Career ladder goals ticked off (rung id + index). */
  careerChecks: string[];
  /** Data center certifications the viewer marked as earned. */
  dcCerts: string[];
  /** My Path: answers and resume signals (never the resume text), or null. */
  profile: Profile | null;
  /** Life of a Data Center: per stage, best quiz %, hands-on task done, tour finished. */
  life: Record<string, LifeProgress>;
}

export interface LifeProgress {
  quiz: number;
  task: boolean;
  tour: boolean;
}

const EMPTY: Progress = { lessons: [], quiz: {}, guides: [], procs: {}, times: {}, safety: {}, daily: {}, cards: {}, exam: -1, favTips: [], careerRung: '', careerChecks: [], dcCerts: [], profile: null, life: {} };

export const XP = { lifeStage: 60, lesson: 50, quizCorrect: 10, quizTried: 3, guide: 5, procedure: 40, safety: 20, daily: 15, exam: 60 } as const;

export const LEVELS = [
  { xp: 0, name: 'Rookie', blurb: 'Every pro started here. Take the guided tour.' },
  { xp: 100, name: 'Apprentice', blurb: 'You know the path from utility to rack.' },
  { xp: 250, name: 'Technician', blurb: 'You can explain redundancy and read a one-line.' },
  { xp: 450, name: 'Lead Tech', blurb: 'You think in MOPs, interlocks, and failure modes.' },
  { xp: 700, name: 'Critical Facilities Pro', blurb: 'You can teach this. Keep growing.' },
] as const;

const numMap = (v: unknown, ok: (n: number) => boolean): Record<string, number> =>
  v && typeof v === 'object' ? Object.fromEntries(Object.entries(v as Record<string, unknown>).filter((e): e is [string, number] => typeof e[1] === 'number' && ok(e[1]))) : {};

/** Turn anything (saved data, an imported backup) into a valid Progress. */
export function sanitize(raw: unknown): Progress {
  const p = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<keyof Progress, unknown>>;
  const strs = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
  const score = (n: number) => n >= 0 && n <= 100;
  return {
    lessons: strs(p.lessons),
    quiz: p.quiz && typeof p.quiz === 'object' ? Object.fromEntries(Object.entries(p.quiz as Record<string, unknown>).filter((e): e is [string, boolean] => typeof e[1] === 'boolean')) : {},
    guides: strs(p.guides),
    procs: numMap(p.procs, score),
    times: numMap(p.times, (n) => n > 0 && n < 1e6),
    safety: numMap(p.safety, score),
    daily: Object.fromEntries(Object.entries(numMap(p.daily, score)).filter(([k]) => /^\d{4}-\d{2}-\d{2}$/.test(k))),
    cards: numMap(p.cards, (n) => Number.isInteger(n) && n >= 0 && n <= 4),
    exam: typeof p.exam === 'number' && p.exam >= -1 && p.exam <= 100 ? p.exam : -1,
    favTips: strs(p.favTips).slice(0, 500),
    careerRung: typeof p.careerRung === 'string' && /^r\d$/.test(p.careerRung) ? p.careerRung : '',
    careerChecks: strs(p.careerChecks).filter((x) => /^r\d:\d+$/.test(x)).slice(0, 200),
    dcCerts: strs(p.dcCerts).filter((x) => /^[a-z]{2,8}$/.test(x)).slice(0, 50),
    profile: sanitizeProfile(p.profile),
    life: sanitizeLife(p.life),
  };
}

function sanitizeLife(v: unknown): Record<string, LifeProgress> {
  if (!v || typeof v !== 'object') return {};
  const out: Record<string, LifeProgress> = {};
  for (const [k, raw] of Object.entries(v as Record<string, unknown>).slice(0, 30)) {
    if (!/^life-[a-z]{2,12}$/.test(k) || !raw || typeof raw !== 'object') continue;
    const r = raw as Record<string, unknown>;
    const quiz = typeof r.quiz === 'number' && r.quiz >= 0 && r.quiz <= 100 ? r.quiz : 0;
    out[k] = { quiz, task: r.task === true, tour: r.tour === true };
  }
  return out;
}

/** A Life of a Data Center stage is complete with a passing quiz and its hands-on task done. */
export const LIFE_PASS = 80;
export function lifeStageDone(p: Progress, id: string): boolean {
  const l = p.life?.[id];
  const task = id === 'life-cx' ? 'life-ist' in p.procs || !!l?.task : !!l?.task;
  return !!l && l.quiz >= LIFE_PASS && task;
}

/**
 * Version of the saved progress shape (B-004). When the shape changes: bump SCHEMA and
 * add a step to MIGRATIONS that turns version N into N+1. Old saves then upgrade on load.
 */
export const SCHEMA = 2;
const MIGRATIONS: Record<number, (r: Record<string, unknown>) => Record<string, unknown>> = {
  // v1: saves before 2026-11-06 had no version field. Same fields as v2, so nothing moves.
  1: (r) => r,
};

/** Upgrade saved progress from any older version, then sanitize it. Never throws. */
export function migrate(raw: unknown): Progress {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return sanitize(raw);
  let r = { ...(raw as Record<string, unknown>) };
  const v0 = r.schema;
  let v = typeof v0 === 'number' && Number.isInteger(v0) && v0 >= 1 ? v0 : 1;
  for (; v < SCHEMA; v++) r = MIGRATIONS[v]?.(r) ?? r;
  // Newer than this app (a backup from a later version): keep the fields this version understands.
  return sanitize(r);
}

/** Largest backup file accepted (bytes). Real backups are a few KB. */
export const BACKUP_MAX_BYTES = 500_000;

/** Backup file contents for download. */
export function backupJson(p: Progress, now = new Date()): string {
  return JSON.stringify({ app: 'critical-facilities-sim', version: 2, saved: now.toISOString(), progress: { ...p, schema: SCHEMA } }, null, 2);
}

/**
 * Read a backup file. Returns null (and the caller changes nothing) for anything that
 * is not one of our backups: too big, not JSON, another app's file, or no progress in it.
 */
export function parseBackup(text: string, size = text.length): Progress | null {
  if (size > BACKUP_MAX_BYTES) return null;
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  if (!data || typeof data !== 'object') return null;
  const d = data as { app?: unknown; progress?: unknown };
  if (d.app !== 'critical-facilities-sim') return null;
  if (!d.progress || typeof d.progress !== 'object' || Array.isArray(d.progress)) return null;
  return migrate(d.progress);
}

function load(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? migrate(JSON.parse(raw)) : EMPTY;
  } catch {
    return EMPTY;
  }
}

function save(p: Progress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...p, schema: SCHEMA }));
  } catch {
    /* storage blocked: progress lasts for this visit only */
  }
}

export function fmtSecs(s: number): string {
  const t = Math.max(0, Math.round(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}

export function xpOf(p: Progress): number {
  const quiz = Object.values(p.quiz);
  return (
    p.lessons.length * XP.lesson +
    quiz.filter(Boolean).length * XP.quizCorrect +
    quiz.filter((v) => !v).length * XP.quizTried +
    p.guides.length * XP.guide +
    Object.keys(p.procs).length * XP.procedure +
    Object.keys(p.safety ?? {}).length * XP.safety +
    Object.keys(p.daily ?? {}).length * XP.daily +
    ((p.exam ?? -1) >= 80 ? XP.exam : 0) +
    Object.keys(p.life ?? {}).filter((id) => lifeStageDone(p, id)).length * XP.lifeStage
  );
}

export function levelOf(xp: number) {
  let i = 0;
  while (i + 1 < LEVELS.length && xp >= LEVELS[i + 1]!.xp) i++;
  const cur = LEVELS[i]!;
  const next = LEVELS[i + 1];
  const pct = next ? (xp - cur.xp) / (next.xp - cur.xp) : 1;
  return { index: i, ...cur, next, pct };
}

export function useProgress(onGain?: (msg: string) => void) {
  const [progress, setProgress] = useState<Progress>(load);

  const commit = useCallback(
    (fn: (p: Progress) => Progress | null, msg?: string) => {
      setProgress((p) => {
        const next = fn(p);
        if (!next) return p;
        save(next);
        if (onGain) {
          const before = levelOf(xpOf(p));
          const after = levelOf(xpOf(next));
          const had = new Set(earnedBadges(p).map((b) => b.id));
          const fresh = earnedBadges(next).filter((b) => !had.has(b.id));
          const text = after.index > before.index ? `Level up! You're now a ${after.name}.` : fresh.length ? `Badge earned: ${fresh[0]!.name}` : msg;
          // Defer so the toast isn't set during render.
          if (text) queueMicrotask(() => onGain(text));
        }
        return next;
      });
    },
    [onGain],
  );

  const finishLesson = useCallback(
    (id: string) => commit((p) => (p.lessons.includes(id) ? null : { ...p, lessons: [...p.lessons, id] }), `+${XP.lesson} XP · lesson complete`),
    [commit],
  );
  const answer = useCallback(
    (id: string, correct: boolean) =>
      commit((p) => (id in p.quiz ? null : { ...p, quiz: { ...p.quiz, [id]: correct } }), correct ? `+${XP.quizCorrect} XP` : `+${XP.quizTried} XP for trying`),
    [commit],
  );
  const readGuide = useCallback(
    (id: string) => commit((p) => (p.guides.includes(id) ? null : { ...p, guides: [...p.guides, id] })),
    [commit],
  );
  const finishProcedure = useCallback(
    (id: string, score: number, seconds?: number) =>
      commit((p) => {
        const betterScore = (p.procs[id] ?? -1) < score;
        const betterTime = seconds !== undefined && seconds > 0 && (p.times[id] === undefined || seconds < p.times[id]!);
        if (!betterScore && !betterTime) return null;
        return {
          ...p,
          procs: betterScore ? { ...p.procs, [id]: score } : p.procs,
          times: betterTime ? { ...p.times, [id]: Math.round(seconds!) } : p.times,
        };
      }, `Saved: ${score} / 100${seconds ? ` in ${fmtSecs(seconds)}` : ''}`),
    [commit],
  );
  const finishSafety = useCallback(
    (id: string, score: number) =>
      commit((p) => {
        const first = !(id in p.safety);
        if (!first && p.safety[id]! >= score) return null;
        return { ...p, safety: { ...p.safety, [id]: score } };
      }, `Safety drill saved: ${score} / 100`),
    [commit],
  );
  const finishDaily = useCallback(
    (score: number) =>
      commit((p) => {
        const d = today();
        if ((p.daily[d] ?? -1) >= score) return null;
        return { ...p, daily: { ...p.daily, [d]: score } };
      }, `+${XP.daily} XP · daily challenge done`),
    [commit],
  );
  const rateCard = useCallback(
    (id: string, knew: boolean) => commit((p) => ({ ...p, cards: { ...p.cards, [id]: knew ? Math.min(4, (p.cards[id] ?? 0) + 1) : 0 } })),
    [commit],
  );
  const finishExam = useCallback(
    (score: number) => commit((p) => (p.exam >= score ? null : { ...p, exam: score }), score >= 80 ? 'Exam passed. Best score saved.' : 'Exam score saved.'),
    [commit],
  );
  const toggleTip = useCallback(
    (id: string) => commit((p) => ({ ...p, favTips: p.favTips.includes(id) ? p.favTips.filter((x) => x !== id) : [...p.favTips, id] })),
    [commit],
  );
  const setCareerRung = useCallback((id: string) => commit((p) => (p.careerRung === id ? null : { ...p, careerRung: id }), 'Saved: this is where you are on the ladder.'), [commit]);
  const toggleCareerCheck = useCallback(
    (key: string) => commit((p) => ({ ...p, careerChecks: p.careerChecks.includes(key) ? p.careerChecks.filter((x) => x !== key) : [...p.careerChecks, key] })),
    [commit],
  );
  const toggleDcCert = useCallback(
    (id: string) =>
      commit((p) => {
        const has = p.dcCerts.includes(id);
        return { ...p, dcCerts: has ? p.dcCerts.filter((x) => x !== id) : [...p.dcCerts, id] };
      }),
    [commit],
  );
  const saveProfile = useCallback(
    (profile: Profile | null) => commit((p) => ({ ...p, profile, dcCerts: profile ? [...new Set([...p.dcCerts, ...profile.certs])] : p.dcCerts }), profile ? `Blueprint rev ${profile.rev} is ready.` : 'Your blueprint was deleted from this device.'),
    [commit],
  );
  const togglePathDone = useCallback(
    (key: string) =>
      commit((p) => {
        if (!p.profile) return null;
        const done = p.profile.done.includes(key) ? p.profile.done.filter((x) => x !== key) : [...p.profile.done, key];
        return { ...p, profile: { ...p.profile, done } };
      }),
    [commit],
  );
  // --- Life of a Data Center ---
  const lifeOf = (p: Progress, id: string): LifeProgress => p.life[id] ?? { quiz: 0, task: false, tour: false };
  const finishLifeQuiz = useCallback(
    (id: string, pct: number, answers: Record<string, boolean>) =>
      commit((p) => {
        const cur = lifeOf(p, id);
        // First answers count toward the quiz XP like any question; retries don't overwrite them.
        const quiz = { ...p.quiz };
        for (const [q, ok] of Object.entries(answers)) if (!(q in quiz)) quiz[q] = ok;
        return { ...p, quiz, life: { ...p.life, [id]: { ...cur, quiz: Math.max(cur.quiz, Math.round(pct)) } } };
      }, pct >= LIFE_PASS ? `Quiz passed: ${Math.round(pct)}%` : `Quiz saved: ${Math.round(pct)}%. ${LIFE_PASS}% passes.`),
    [commit],
  );
  const finishLifeTask = useCallback(
    (id: string) => commit((p) => (lifeOf(p, id).task ? null : { ...p, life: { ...p.life, [id]: { ...lifeOf(p, id), task: true } } }), 'Hands-on task done.'),
    [commit],
  );
  const finishLifeTour = useCallback(
    (id: string) => commit((p) => (lifeOf(p, id).tour ? null : { ...p, life: { ...p.life, [id]: { ...lifeOf(p, id), tour: true } } })),
    [commit],
  );

  /** Replace progress with an imported backup (already sanitized). */
  const restore = useCallback((next: Progress) => {
    save(next);
    setProgress(next);
  }, []);
  const reset = useCallback(() => {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* nothing stored */
    }
    setProgress(EMPTY);
  }, []);

  return { progress, xp: xpOf(progress), finishLesson, answer, readGuide, finishProcedure, finishSafety, finishDaily, rateCard, finishExam, toggleTip, setCareerRung, toggleCareerCheck, toggleDcCert, saveProfile, togglePathDone, finishLifeQuiz, finishLifeTask, finishLifeTour, restore, reset };
}

export type ProgressHandle = ReturnType<typeof useProgress>;
