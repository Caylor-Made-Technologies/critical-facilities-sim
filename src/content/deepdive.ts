/**
 * Deep dives (Phase 7): the extra layer under each Equipment guide.
 *
 * Generic training content. Every reading is a typical example range, never a
 * setpoint: the nameplate, the manufacturer's manual, the site's procedures and
 * the adopted code edition always win. Listed for expert review in docs/REVIEW-QUEUE.md.
 */
import type { LifeQuestion } from './lifecycleTypes';
import { ELEC_DEEP } from './deepElec';
import { MECH_DEEP } from './deepMech';
import { LIFE_DEEP } from './deepLife';

export interface DeepTopic {
  /** Short heading, e.g. "K-factor". */
  h: string;
  p: string[];
  /** Has numbers, code or safety content: shows the Verify flag. */
  verify?: boolean;
}

export interface DeepReading {
  /** What you read and where, e.g. "Top-oil temperature (gauge on the tank)". */
  what: string;
  /** Typical normal, with units, e.g. "40–75 °C at normal load". */
  normal: string;
  /** What to do when it's outside normal. */
  act: string;
}

export interface DeepFailure {
  mode: string;
  /** Early signs a tech can see, hear, smell or read. */
  signs: string;
  /** What happens if nobody acts. */
  then: string;
}

export type DeepPractice = { kind: 'proc' | 'lesson'; id: string };

export interface DeepDive {
  /** Equipment guide id. */
  id: string;
  topics: DeepTopic[];
  readings: DeepReading[];
  failures: DeepFailure[];
  /** Tip ids from tips.ts. */
  tips: string[];
  /** Where to see it live: walkthroughs (lessons) and MOPs/drills. */
  practice: DeepPractice[];
  quiz: LifeQuestion[];
}

/** Shown on every Readings table. */
export const READINGS_NOTE =
  'Typical example ranges for learning, not setpoints. Your nameplate, the manufacturer’s manual and your site’s rounds sheet win. Trend against your own baseline: a change matters more than the number.';

export const DEEP_DIVES: DeepDive[] = [...ELEC_DEEP, ...MECH_DEEP, ...LIFE_DEEP];

export function deepDiveFor(id: string): DeepDive | undefined {
  return DEEP_DIVES.find((d) => d.id === id);
}
