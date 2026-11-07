/**
 * Engine v2 core (Phase 4a).
 *
 * What v2 adds around the plant models:
 *   - a fixed timestep: the plant only ever moves in whole TICK_S steps, whatever the frame rate;
 *     real time is accumulated and the leftover fraction is returned for smooth drawing;
 *   - determinism: all randomness goes through one seeded Rng; same seed + same action log
 *     = same plant (replay);
 *   - a timed event queue (scheduled actions: failures, utility events, story beats);
 *   - an action log of everything the operator or the queue did, with times;
 *   - a full JSON snapshot (plant + clock + queue + Rng + log) for saves, undo and
 *     "try the wrong answer on a copy".
 *
 * Strangler pattern: the physics inside is still the v1 Simulation (power solver, thermal plant,
 * automatic controls). Phases 4b/4c replace those models behind this same interface, so every
 * MOP, drill and screen keeps working. `engine.sim` is the adapter the current UI and
 * procedure scoring read.
 */
import { Simulation, type SimSnapshot } from '../engine';
import type { BatteryAge } from '../physics';
import { buildPlant, type Topology } from '../plant/builder';
import type { WeatherId } from '../thermal';
import type { ActionResult } from '../types';
import { ElectricalModel, type ElecState } from './electrical';
import { EventQueue, type Scheduled } from './queue';
import { Rng } from './rng';

/** Sim seconds per tick. */
export const TICK_S = 1;
/** Most ticks run per advanceReal() call, so a long pause or a huge speed can't freeze the page. */
export const MAX_TICKS_PER_CALL = 600;
const EPS = 1e-6;

/** Everything that can change the plant, as plain data (so it can be logged, queued and replayed). */
export type Action =
  | { a: 'open' | 'close' | 'fail' | 'restore' | 'maint'; id: string }
  | { a: 'upsMode'; system: string; mode: 'static-bypass' | 'auto' }
  | { a: 'removeKey'; lock: string }
  | { a: 'insertKey'; key: string; lock: string }
  | { a: 'genTest'; id: string; on: boolean }
  | { a: 'epo' }
  | { a: 'weather'; w: WeatherId }
  | { a: 'batteryAge'; age: BatteryAge }
  /** Let time pass in one go (used by "skip ahead" and by replays of it). */
  | { a: 'skip'; s: number };

export interface LoggedAction {
  t: number;
  action: Action;
  ok: boolean;
}

export interface EngineSnapshot {
  v: 1;
  seed: number;
  rng: number;
  acc: number;
  queue: { items: Scheduled<Action>[]; seq: number };
  log: LoggedAction[];
  sim: SimSnapshot;
  /** Electrical model state (Phase 4b). Missing in 4a snapshots: rebuilt from the seed. */
  elec?: ElecState;
}

export class EngineV2 {
  readonly sim: Simulation;
  readonly rng: Rng;
  readonly seed: number;
  private queue = new EventQueue<Action>();
  private actions: LoggedAction[] = [];
  /** Real seconds × speed not yet turned into ticks. */
  private acc = 0;
  /** Load flow, transformer heating and breaker protection (Phase 4b). */
  readonly elec = new ElectricalModel();

  constructor(topology: Topology = '2N', seed = 1, sim?: Simulation) {
    this.seed = Rng.normalize(seed);
    this.rng = new Rng(this.seed);
    this.sim = sim ?? new Simulation(buildPlant(topology));
    this.elec.init(this.sim, this.rng);
  }

  /** Adopt a plant that was already prepared (walkthroughs, MOP/drill setups) without rebuilding it. */
  static wrap(sim: Simulation, seed = 1): EngineV2 {
    return new EngineV2(sim.meta.topology, seed, sim);
  }

  get t(): number {
    return this.sim.t;
  }

  get topology(): Topology {
    return this.sim.meta.topology;
  }

  /** Everything done so far, in order (read-only copy). */
  get log(): readonly LoggedAction[] {
    return this.actions;
  }

  /** Do an action now. Logged whether or not the plant allowed it (blocked actions are part of the story). */
  apply(action: Action): ActionResult {
    let r: ActionResult;
    try {
      r = this.dispatch(action);
    } catch (err) {
      // An unknown id (e.g. from an edited or older saved scenario) is refused, never a crash.
      r = { ok: false, reason: err instanceof Error ? err.message : 'Action not possible.' };
    }
    this.actions.push({ t: this.sim.t, action, ok: r.ok });
    return r;
  }

  /** Schedule an action at an absolute sim time. Returns false for a bad or past time. */
  schedule(at: number, action: Action): boolean {
    if (at < this.sim.t) return false;
    return this.queue.push(at, action);
  }

  /** Scheduled actions still waiting. */
  get pending(): number {
    return this.queue.size;
  }

  /** One fixed step: run everything due now, then advance TICK_S. */
  tick(): void {
    for (const s of this.queue.popDue(this.sim.t)) this.apply(s.event);
    this.step(TICK_S);
  }

  /** Advance the plant and the electrical model together (dt ≤ 1 s per call). */
  private step(dt: number): void {
    this.sim.advance(dt);
    this.elec.step(this.sim, dt);
  }

  /** Run whole ticks for `seconds` of sim time (rounded down to whole ticks). */
  run(seconds: number): void {
    const n = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds / TICK_S) : 0;
    for (let i = 0; i < n; i++) this.tick();
  }

  /**
   * For the UI loop: add real elapsed time × speed, run the whole ticks it covers (capped),
   * and return the leftover fraction of a tick (0–1) for drawing in between.
   */
  advanceReal(realS: number, speed = 1): number {
    const add = realS * speed;
    if (Number.isFinite(add) && add > 0) this.acc += add;
    // EPS absorbs floating-point error (0.12 s × 60 = 7.1999…), so ten such frames are exactly 72 ticks.
    let n = Math.floor(this.acc / TICK_S + EPS);
    if (n > MAX_TICKS_PER_CALL) {
      n = MAX_TICKS_PER_CALL;
      this.acc = 0; // drop the backlog rather than freeze the page
    } else this.acc = Math.max(0, this.acc - n * TICK_S);
    for (let i = 0; i < n; i++) this.tick();
    return Math.min(1, Math.max(0, this.acc / TICK_S));
  }

  snapshot(): EngineSnapshot {
    return {
      v: 1,
      seed: this.seed,
      rng: this.rng.state,
      acc: this.acc,
      queue: this.queue.snapshot(),
      log: this.actions.map((x) => ({ ...x, action: { ...x.action } })),
      sim: this.sim.snapshot(),
      elec: this.elec.snapshot(),
    };
  }

  static fromSnapshot(s: EngineSnapshot): EngineV2 {
    const e = new EngineV2(s.sim.topology, s.seed);
    e.sim.restoreSnapshot(s.sim);
    e.rng.state = s.rng;
    e.acc = Number.isFinite(s.acc) ? Math.max(0, s.acc) : 0;
    e.queue.restore(s.queue);
    e.actions = s.log.map((x) => ({ ...x, action: { ...x.action } }));
    if (s.elec) e.elec.restore(s.elec);
    return e;
  }

  /** Independent copy (for "simulate the wrong answer on a copy"). */
  copy(): EngineV2 {
    return EngineV2.fromSnapshot(JSON.parse(JSON.stringify(this.snapshot())) as EngineSnapshot);
  }

  /**
   * Rebuild a run from its seed and action log: replays each action at its time on a fresh plant.
   * Same topology + seed + log → the same plant as the original (tested).
   */
  static replay(topology: Topology, seed: number, log: readonly LoggedAction[]): EngineV2 {
    const e = new EngineV2(topology, seed);
    for (const x of log) {
      while (e.sim.t + 1e-9 < x.t) {
        // Whole ticks up to the action; a fractional gap (from a 'skip') is advanced exactly.
        const gap = x.t - e.sim.t;
        if (gap >= TICK_S) e.tick();
        else e.step(gap);
      }
      e.apply(x.action);
    }
    return e;
  }

  private dispatch(x: Action): ActionResult {
    const s = this.sim;
    switch (x.a) {
      case 'open':
        return s.openBreaker(x.id);
      case 'close':
        return s.closeBreaker(x.id);
      case 'fail':
        return s.fail(x.id);
      case 'restore':
        return s.restore(x.id);
      case 'maint':
        return s.setMaintenance(x.id);
      case 'upsMode':
        return s.setUpsSystemMode(x.system, x.mode);
      case 'removeKey':
        return s.removeKey(x.lock);
      case 'insertKey':
        return s.insertKey(x.key, x.lock);
      case 'genTest':
        return s.testGenerator(x.id, x.on);
      case 'epo':
        return s.emergencyPowerOff();
      case 'weather':
        return s.setWeather(x.w);
      case 'batteryAge':
        return s.setBatteryAge(x.age);
      case 'skip':
        if (!(Number.isFinite(x.s) && x.s > 0)) return { ok: false, reason: 'Skip needs a positive time.' };
        for (let left = x.s; left > 1e-9; left -= TICK_S) this.step(Math.min(TICK_S, left));
        return { ok: true };
    }
  }
}
