/**
 * Badges: earned from progress, never stored separately, so they can't
 * drift out of sync. Shown on Home; a toast fires when a new one is earned.
 */
import { GLOSSARY } from '../content/glossary';
import { LADDER } from '../content/ladder';
import { LESSONS } from '../content/lessons';
import { PROCEDURES } from '../content/procedures';
import { HAZARD_HUNTS, LOTO_DRILLS } from '../content/safetyTools';
import { streakOf } from './dates';
import type { IconName } from './icons';
import type { Progress } from './progress';

export interface Badge {
  id: string;
  name: string;
  how: string;
  icon: IconName;
  earned: (p: Progress) => boolean;
}

const mops = PROCEDURES.filter((x) => x.kind === 'mop').map((x) => x.id);
const drills = PROCEDURES.filter((x) => x.kind === 'drill').map((x) => x.id);

export const BADGES: Badge[] = [
  { id: 'first-steps', name: 'First steps', how: 'Finish your first walkthrough.', icon: 'book', earned: (p) => p.lessons.length >= 1 },
  { id: 'scholar', name: 'Scholar', how: 'Finish every walkthrough.', icon: 'book', earned: (p) => LESSONS.every((l) => p.lessons.includes(l.id)) },
  { id: 'switchman', name: 'By the book', how: 'Complete your first MOP.', icon: 'list', earned: (p) => mops.some((id) => id in p.procs) },
  { id: 'flawless', name: 'Flawless', how: 'Score 100 on any MOP or drill.', icon: 'star', earned: (p) => Object.values(p.procs).some((v) => v === 100) },
  { id: 'all-mops', name: 'MOP master', how: 'Complete every MOP.', icon: 'clipboard', earned: (p) => mops.every((id) => id in p.procs) },
  { id: 'first-responder', name: 'First responder', how: 'Complete every emergency drill.', icon: 'warning', earned: (p) => drills.filter((id) => id !== 'drill-surprise').every((id) => id in p.procs) },
  { id: 'quiz-20', name: 'Sharp', how: 'Answer 20 quiz questions right.', icon: 'target', earned: (p) => Object.values(p.quiz).filter(Boolean).length >= 20 },
  { id: 'exam', name: 'Exam ready', how: 'Score 80 or more on the timed exam.', icon: 'check', earned: (p) => p.exam >= 80 },
  { id: 'safety-first', name: 'Safety first', how: 'Finish every Safety Center drill.', icon: 'shield', earned: (p) => [...LOTO_DRILLS, ...HAZARD_HUNTS].every((d) => d.id in p.safety) },
  { id: 'lock-pro', name: 'Your lock, your life', how: 'Score 100 on every lockout drill.', icon: 'lock', earned: (p) => LOTO_DRILLS.every((d) => p.safety[d.id] === 100) },
  { id: 'streak-3', name: 'On a roll', how: 'Do the daily challenge 3 days in a row.', icon: 'flame', earned: (p) => streakOf(p.daily) >= 3 },
  { id: 'streak-7', name: 'Week strong', how: 'Do the daily challenge 7 days in a row.', icon: 'flame', earned: (p) => streakOf(p.daily) >= 7 },
  { id: 'cards-20', name: 'Word smith', how: 'Master 20 flashcards.', icon: 'search', earned: (p) => Object.values(p.cards).filter((b) => b >= 3).length >= 20 },
  { id: 'cards-all', name: 'Fluent', how: 'Master every glossary flashcard.', icon: 'chat', earned: (p) => GLOSSARY.every((t) => (p.cards[`g:${t.term}`] ?? 0) >= 3) },
  { id: 'tips-10', name: 'Tip collector', how: 'Save 10 tips to your favorites.', icon: 'star', earned: (p) => p.favTips.length >= 10 },
  { id: 'climber', name: 'Climber', how: 'Tick off every goal on one career ladder rung.', icon: 'arrow-up', earned: (p) => LADDER.some((r) => r.doNow.every((_, i) => p.careerChecks.includes(`${r.id}:${i}`))) },
  { id: 'dc-certified', name: 'Certified', how: 'Mark a data center certification as earned in Career.', icon: 'check', earned: (p) => p.dcCerts.length >= 1 },
  { id: 'gear-10', name: 'Gearhead', how: 'Read 10 equipment guides.', icon: 'wrench', earned: (p) => p.guides.length >= 10 },
];

export function earnedBadges(p: Progress): Badge[] {
  return BADGES.filter((b) => b.earned(p));
}
