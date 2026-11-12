import type { Action } from './actions';
/**
 * Procedure runner for MOP practice and emergency drills.
 *
 * A procedure is an ordered list of steps. A step finishes in one of three
 * ways: the engine sees the plant reach the right state (check), the
 * operator confirms a hold point (confirm), or the operator picks the right
 * answer at a decision point (choices). The runner watches the event log
 * and the racks to score the run: blocked actions, hints, wrong answers
 * and dropped load all cost points.
 *
 * Pure logic, no UI. The UI calls evaluate() after every engine change.
 */
import { Simulation } from './engine';
import { buildPlant } from './plant/builder';
import type { WeatherId } from './thermal';
import type { Topology } from './plant/builder';
import type { ActionResult } from './types';

export type ProcKind = 'mop' | 'drill';

export interface ProcChoice {
  text: string;
  correct: boolean;
  /** Why this answer is right or wrong. Shown after it is picked. */
  why: string;
  /**
   * What this choice would actually do to the plant. Run on a copy of the
   * live simulation when the choice is picked, so the operator sees the
   * real outcome without the live plant being touched.
   */
  consequence?: (sim: Simulation) => ActionResult | void;
  /** How long to run the copy after the consequence (s). Default 90. */
  consequenceS?: number;
}

/** What a choice would have done, measured on a copy of the plant. */
export interface Consequence {
  /** The plant refused the action (interlock or engine rule). */
  refused?: string;
  racksDown: number;
  gpuRowsTripped: number[];
  maxInletC: number;
  /** The most important new event-log lines. */
  lines: string[];
  seconds: number;
}

/** A copy of the plant to try a wrong answer on: the bare plant, or an engine v2 copy (what the app runs). */
export interface PlantCopy {
  sim: Simulation;
  advance(seconds: number): void;
}

export function previewConsequence(sim: Simulation, c: ProcChoice, makeCopy?: () => PlantCopy): Consequence | null {
  if (!c.consequence) return null;
  // Count from the live plant: making the copy can itself settle a pending trip.
  const from = sim.events.length;
  const racksBefore = sim.itDownRacks().length;
  const plant: PlantCopy = makeCopy ? makeCopy() : (() => {
    const bare = sim.clone();
    return { sim: bare, advance: (s: number) => bare.advance(s) };
  })();
  const copy = plant.sim;
  const r = c.consequence(copy);
  const seconds = c.consequenceS ?? 90;
  let maxInletC = copy.thermal.readout.hallInletC;
  for (let t = 0; t < seconds; t += 10) {
    plant.advance(Math.min(10, seconds - t));
    maxInletC = Math.max(maxInletC, copy.thermal.readout.hallInletC);
  }
  const rank = { critical: 0, alarm: 1, warning: 2, info: 3 } as const;
  const lines = copy.events
    .slice(from)
    .filter((e) => e.severity !== 'info')
    .sort((a, b) => rank[a.severity] - rank[b.severity] || a.t - b.t)
    .map((e) => e.message)
    .filter((m, i, all) => all.indexOf(m) === i)
    .slice(0, 4);
  return {
    refused: r && !r.ok ? r.reason : undefined,
    racksDown: Math.max(0, copy.itDownRacks().length - racksBefore),
    gpuRowsTripped: copy.thermal.readout.gpuRows.filter((g) => g.tripped).map((g) => g.row),
    maxInletC,
    lines,
    seconds,
  };
}

export interface ProcStep {
  title: string;
  /** What to do, in plain words. */
  detail: string;
  /** Why the step matters. */
  why: string;
  /** Where to tap. Using it costs points. */
  hint?: string;
  /** Component to select on the diagram when the step starts. */
  focus?: string;
  view?: 'electrical' | 'mechanical';
  /** Finishes automatically when this returns true. */
  check?: (sim: Simulation) => boolean;
  /** Hold point: the operator confirms it by pressing a button with this label. */
  confirm?: string;
  /**
   * Verification hold point (Phase 9e): what the plant must show before this confirm is true. Signing off early
   * costs points (once per step) and keeps you on the step until it is true.
   */
  verify?: (sim: Simulation) => boolean;
  /** Decision point. */
  choices?: ProcChoice[];
  /** Runs once when the step finishes (drills use it to move the story along). */
  after?: (sim: Simulation) => void;
}

export interface ScenarioStep {
  at: number;
  action: Action;
}

/** The MOP sheet a real method of procedure starts with (Phase 9). */
export interface MopPlan {
  risk: 'Low' | 'Medium' | 'High';
  /** What has to be true before the work starts. */
  prereqs: string[];
  /** Conditions that stop the job on the spot. */
  stopWork: string[];
  /** How to put everything back if the job is stopped. */
  rollback: string[];
}

export interface Procedure {
  id: string;
  kind: ProcKind;
  title: string;
  summary: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  minutes: number;
  topology: Topology;
  weather?: WeatherId;
  /** Puts the plant in the starting condition (drills fail something here). */
  setup?: (sim: Simulation) => void;
  /**
   * Engine v2 scenario switches and timed events (Phase 8c), applied right after the plant is loaded:
   * `at` = seconds after the start (0 = before the first tick). E.g. fail-to-start, block heater off,
   * eco mode, a utility sag at 5 s. Only new scenarios use these; older drills keep their v1 setup.
   */
  scenario?: ScenarioStep[];
  /** Start the clock running (drills) or leave it paused (MOPs). */
  run?: boolean;
  steps: ProcStep[];
  /** MOPs: risk, prerequisites, stop-work points and rollback (Phase 9). */
  plan?: MopPlan;
  /** Key takeaways shown on the result screen. */
  debrief: string[];
  /** Open questions to think about afterwards, each with a model answer. */
  deeper?: { q: string; a: string }[];
}

export const SCORE = { start: 100, blocked: 5, hint: 5, wrongChoice: 10, dropped: 30, unverified: 10 } as const;

export interface ProcRun {
  id: string;
  step: number;
  score: number;
  done: boolean;
  /** Plain-English list of what cost points. */
  mistakes: string[];
  /** Steps where the hint was opened. */
  hints: number[];
  /** Wrong answers picked so far, per step. */
  wrong: Record<number, number[]>;
  /** Events already scored. */
  eventIdx: number;
  /** Racks down at the last check; more than this costs points. */
  racksDown: number;
}

/** Build the plant a procedure starts from. */
export function procedureSim(p: Procedure): Simulation {
  const sim = new Simulation(buildPlant(p.topology));
  if (p.weather) {
    sim.setWeather(p.weather);
    sim.advance(600); // let the plant settle into the weather before the clock starts
  }
  p.setup?.(sim);
  return sim;
}

export function startRun(p: Procedure, sim: Simulation): ProcRun {
  return evaluate(p, {
    id: p.id,
    step: 0,
    score: SCORE.start,
    done: false,
    mistakes: [],
    hints: [],
    wrong: {},
    eventIdx: sim.events.length,
    racksDown: sim.itDownRacks().length,
  }, sim);
}

const clampScore = (n: number) => Math.max(0, Math.min(SCORE.start, n));

/** Finish the current step and move on, running its after() hook. */
function advanceStep(p: Procedure, run: ProcRun, sim: Simulation): ProcRun {
  p.steps[run.step]?.after?.(sim);
  const step = run.step + 1;
  return { ...run, step, done: step >= p.steps.length, eventIdx: run.eventIdx };
}

/**
 * Score anything new in the event log and the racks, then auto-finish any
 * steps whose check is now true. Call after every engine change.
 */
export function evaluate(p: Procedure, run: ProcRun, sim: Simulation): ProcRun {
  if (run.done) return run;
  let r = { ...run, mistakes: [...run.mistakes] };
  // Blocked actions: the interlock or the engine said no.
  for (const e of sim.events.slice(r.eventIdx)) {
    if (e.severity === 'warning' && e.message.startsWith('Blocked:')) {
      r.score -= SCORE.blocked;
      r.mistakes.push(`Blocked action (${e.source}): ${e.message.replace(/^Blocked:\s*/, '')}`);
    }
  }
  r.eventIdx = sim.events.length;
  // Dropped load is the worst outcome.
  const down = sim.itDownRacks().length;
  if (down > r.racksDown) {
    r.score -= SCORE.dropped;
    r.mistakes.push(`Dropped load: ${down - r.racksDown} rack${down - r.racksDown > 1 ? 's' : ''} lost power.`);
  }
  r.racksDown = down;
  // Auto-finish consecutive steps the plant already satisfies.
  let guard = 0;
  while (!r.done && guard++ < p.steps.length) {
    const s = p.steps[r.step]!;
    if (!s.check || s.choices || s.confirm || !s.check(sim)) break;
    r = advanceStep(p, r, sim);
    r.eventIdx = sim.events.length; // events from after() are the story, not the operator
  }
  r.score = clampScore(r.score);
  return r;
}

/** Operator confirms a hold point. */
export function confirmStep(p: Procedure, run: ProcRun, sim: Simulation): ProcRun {
  const s = p.steps[run.step];
  if (run.done || !s?.confirm) return run;
  if (s.verify && !s.verify(sim)) {
    // Signed off before the plant shows it: costs points once, and the step stays open.
    const tried = run.wrong[run.step] ?? [];
    if (tried.includes(-1)) return run;
    return {
      ...run,
      score: clampScore(run.score - SCORE.unverified),
      mistakes: [...run.mistakes, `Step ${run.step + 1}: signed off "${s.confirm}" before the plant showed it`],
      wrong: { ...run.wrong, [run.step]: [...tried, -1] },
    };
  }
  const r = advanceStep(p, run, sim);
  return evaluate(p, { ...r, eventIdx: sim.events.length }, sim);
}

/** Operator picks an answer at a decision point. */
export function choose(p: Procedure, run: ProcRun, sim: Simulation, index: number): ProcRun {
  const s = p.steps[run.step];
  const c = s?.choices?.[index];
  if (run.done || !s || !c) return run;
  if (!c.correct) {
    const tried = run.wrong[run.step] ?? [];
    if (tried.includes(index)) return run;
    return {
      ...run,
      score: clampScore(run.score - SCORE.wrongChoice),
      mistakes: [...run.mistakes, `Step ${run.step + 1}: picked "${c.text}"`],
      wrong: { ...run.wrong, [run.step]: [...tried, index] },
    };
  }
  const r = advanceStep(p, run, sim);
  return evaluate(p, { ...r, eventIdx: sim.events.length }, sim);
}

/** Operator opens the hint for the current step (costs points once per step). */
export function takeHint(run: ProcRun): ProcRun {
  if (run.done || run.hints.includes(run.step)) return run;
  return { ...run, hints: [...run.hints, run.step], score: clampScore(run.score - SCORE.hint) };
}

export function grade(score: number): { letter: string; label: string } {
  if (score >= 95) return { letter: 'A+', label: 'Flawless. You would be trusted to lead this.' };
  if (score >= 85) return { letter: 'A', label: 'Clean work. Small slips only.' };
  if (score >= 70) return { letter: 'B', label: 'Safe, but slow down and check before each step.' };
  if (score >= 50) return { letter: 'C', label: 'You got there, with mistakes that matter on a live site.' };
  return { letter: 'D', label: 'Review the steps and run it again. That is what practice is for.' };
}
