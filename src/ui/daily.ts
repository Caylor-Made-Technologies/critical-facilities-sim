/**
 * Daily challenge: the same 3 quiz questions and one suggested practice for
 * everyone on a given date, picked from a seed so it works offline.
 */
import { PROCEDURES } from '../content/procedures';
import { QUIZ, type QuizQuestion } from '../content/quiz';
import { HAZARD_HUNTS } from '../content/safetyTools';

function seedOf(date: string): number {
  let h = 2166136261;
  for (const c of date) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return h;
}

function rng(seed: number) {
  let s = seed || 1;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}

export interface DailyChallenge {
  date: string;
  questions: QuizQuestion[];
  procId: string;
  huntId: string;
}

export function dailyChallenge(date: string): DailyChallenge {
  const r = rng(seedOf(date));
  const pool = [...QUIZ];
  const questions: QuizQuestion[] = [];
  while (questions.length < 3 && pool.length) questions.push(pool.splice(Math.floor(r() * pool.length), 1)[0]!);
  const procs = PROCEDURES.filter((p) => p.id !== 'drill-surprise');
  return { date, questions, procId: procs[Math.floor(r() * procs.length)]!.id, huntId: HAZARD_HUNTS[Math.floor(r() * HAZARD_HUNTS.length)]!.id };
}
