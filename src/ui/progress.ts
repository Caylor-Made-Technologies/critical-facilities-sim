/**
 * Learning progress: lessons finished, quiz answers, guides read.
 * Stored only in this browser's localStorage (never sent anywhere), with
 * every access guarded. Turned into XP and a level to make growth visible.
 */
import { useCallback, useState } from 'react';

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
}

const EMPTY: Progress = { lessons: [], quiz: {}, guides: [], procs: {}, times: {}, safety: {} };

export const XP = { lesson: 50, quizCorrect: 10, quizTried: 3, guide: 5, procedure: 40, safety: 20 } as const;

export const LEVELS = [
  { xp: 0, name: 'Rookie', blurb: 'Every pro started here. Take the guided tour.' },
  { xp: 100, name: 'Apprentice', blurb: 'You know the path from utility to rack.' },
  { xp: 250, name: 'Technician', blurb: 'You can explain redundancy and read a one-line.' },
  { xp: 450, name: 'Lead Tech', blurb: 'You think in MOPs, interlocks, and failure modes.' },
  { xp: 700, name: 'Critical Facilities Pro', blurb: 'You can teach this. Keep growing.' },
] as const;

function load(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const p = JSON.parse(raw) as Partial<Progress>;
    return {
      lessons: Array.isArray(p.lessons) ? p.lessons.filter((x) => typeof x === 'string') : [],
      quiz: p.quiz && typeof p.quiz === 'object' ? Object.fromEntries(Object.entries(p.quiz).filter(([, v]) => typeof v === 'boolean')) : {},
      guides: Array.isArray(p.guides) ? p.guides.filter((x) => typeof x === 'string') : [],
      procs:
        p.procs && typeof p.procs === 'object'
          ? Object.fromEntries(Object.entries(p.procs).filter(([, v]) => typeof v === 'number' && v >= 0 && v <= 100))
          : {},
      times:
        p.times && typeof p.times === 'object'
          ? Object.fromEntries(Object.entries(p.times).filter(([, v]) => typeof v === 'number' && v > 0 && v < 1e6))
          : {},
      safety:
        p.safety && typeof p.safety === 'object'
          ? Object.fromEntries(Object.entries(p.safety).filter(([, v]) => typeof v === 'number' && v >= 0 && v <= 100))
          : {},
    };
  } catch {
    return EMPTY;
  }
}

function save(p: Progress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
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
    Object.keys(p.safety ?? {}).length * XP.safety
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
        if (msg && onGain) {
          const before = levelOf(xpOf(p));
          const after = levelOf(xpOf(next));
          // Defer so the toast isn't set during render.
          queueMicrotask(() => onGain(after.index > before.index ? `Level up! You're now a ${after.name}.` : msg));
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
  const reset = useCallback(() => {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* nothing stored */
    }
    setProgress(EMPTY);
  }, []);

  return { progress, xp: xpOf(progress), finishLesson, answer, readGuide, finishProcedure, finishSafety, reset };
}

export type ProgressHandle = ReturnType<typeof useProgress>;
