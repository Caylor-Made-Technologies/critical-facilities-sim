/**
 * Life of a Data Center: types shared by the content, the 3D campus scene and
 * the Learn track. Plain data, no UI.
 */

/** Spots on the 3D campus the tour can fly to. */
export const ANCHORS = [
  'field',
  'substation',
  'powerline',
  'fiber',
  'water',
  'flood',
  'road',
  'foundation',
  'shell',
  'crane',
  'genyard',
  'fuel',
  'switchgear',
  'ups',
  'batteries',
  'chillers',
  'towers',
  'hall',
  'racks',
  'floor',
  'mmr',
  'noc',
  'dock',
  'fence',
  'loadbank',
  'growth',
  'incident',
  'truck',
] as const;
export type Anchor = (typeof ANCHORS)[number];

/** How far along the campus is, which sets what the 3D scene shows. */
export const SCENE_STATES = ['field', 'site', 'design', 'construction', 'built', 'commission', 'ops', 'growth', 'incident', 'decom'] as const;
export type SceneState = (typeof SCENE_STATES)[number];

export interface TourStop {
  anchor: Anchor;
  title: string;
  text: string;
}

export interface LifeQuestion {
  id: string;
  q: string;
  choices: string[];
  /** Index of the one right answer. */
  answer: number;
  why: string;
}

export type LifeTask =
  | { kind: 'order'; title: string; prompt: string; items: string[]; explain: string }
  | { kind: 'sort'; title: string; prompt: string; buckets: { id: string; label: string }[]; items: { text: string; bucket: string }[]; explain: string }
  | { kind: 'calc'; title: string; prompt: string; calc: 'downtime' | 'site' | 'design' | 'capacity'; explain: string }
  | { kind: 'sim'; title: string; prompt: string; explain: string };

export interface LifeStage {
  id: string;
  n: number;
  title: string;
  /** One line for the stage card. */
  short: string;
  scene: SceneState;
  lesson: { h: string; p: string[] }[];
  tour: TourStop[];
  task: LifeTask;
  /** The small stuff a technician actually touches. `verify` marks numbers, code or safety items. */
  details: { title: string; text: string; verify?: boolean }[];
  mistakes: { mistake: string; why: string }[];
  quiz: LifeQuestion[];
}

/** Shown wherever a stage has numbers, code references or safety content. */
export const VERIFY_NOTE = "Typical, generic figures for learning. Verify with your site's qualified person, the manufacturer, and the current code edition your jurisdiction adopted.";
