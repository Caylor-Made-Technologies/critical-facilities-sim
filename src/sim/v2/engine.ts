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
import { applyToSim, type Action } from '../actions';
import { Simulation, type SimSnapshot } from '../engine';
import { buildPlant, type Topology } from '../plant/builder';
import type { ActionResult } from '../types';
import { procedureSim, type Procedure, type ScenarioStep } from '../procedure';
import { AlarmSystem, type AlarmsState, type AlarmSummary } from './alarms';
import { AirsideModel, type AirState } from './airside';
import { readEfficiency, type EfficiencyReading } from './efficiency';
import { ElectricalModel, type ElecState } from './electrical';
import { HydronicModel, type HydState } from './hydronic';
import { SourcesModel, type SourcesState } from './sources';
import { PowerQualityModel, type PqState } from './quality';
import { EventQueue, type Scheduled } from './queue';
import { Rng } from './rng';
import { TrendRecorder, type TrendSample } from './trends';

/** Sim seconds per tick. */
export const TICK_S = 1;
/** Most ticks run per advanceReal() call, so a long pause or a huge speed can't freeze the page. */
export const MAX_TICKS_PER_CALL = 600;
const EPS = 1e-6;

/** Everything that can change the plant, as plain data (so it can be logged, queued and replayed). */
export type { Action } from '../actions';

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
  /** Sources detail state (Phase 4b part 2). */
  sources?: SourcesState;
  /** Air-side thermal state (Phase 4c part 1). */
  air?: AirState;
  /** Hydronic state (Phase 4c part 2). */
  hyd?: HydState;
  /** Alarm states (Phase 4d). */
  alarms?: AlarmsState;
  /** Active utility power quality events (Phase 8a). */
  pq?: PqState;
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
  /** Generator start stages, fail-to-start, block heaters, load-step dip, UPS and ATS detail (Phase 4b part 2). */
  readonly sources = new SourcesModel();
  /** Data hall air side: aisles, racks, CRAH coils and fans, containment (Phase 4c part 1). */
  readonly air = new AirsideModel();
  /** Chilled water and condenser loops, pumps, chillers, TES (Phase 4c part 2). */
  readonly hyd = new HydronicModel();
  /** Alarm system: priorities, delays, deadbands, ack/shelve, first-out, flood (Phase 4d). */
  readonly alarms = new AlarmSystem();
  /** Utility sags, swells, single-phasing and imbalance (Phase 8a). */
  readonly pq = new PowerQualityModel();
  /** BMS-style trend log of key readings, one sample per 10 s, 1 h kept (Phase 5). Not in snapshots. */
  readonly trends = new TrendRecorder();

  constructor(topology: Topology = '2N', seed = 1, sim?: Simulation) {
    this.seed = Rng.normalize(seed);
    this.rng = new Rng(this.seed);
    this.sim = sim ?? new Simulation(buildPlant(topology));
    this.elec.init(this.sim, this.rng);
    this.sources.init(this.sim);
    this.air.init(this.sim);
    this.hyd.init(this.sim, this.air.reading.coilKw);
    this.feedChw();
    this.alarms.init(this.sim);
    this.recordTrend();
  }

  /** Apply a procedure's scenario steps (Phase 8c): at ≤ 0 now, later ones scheduled from the current time. */
  applyScenario(steps: readonly ScenarioStep[] | undefined): void {
    for (const x of steps ?? []) {
      if (x.at <= 0) this.apply(x.action);
      else this.schedule(this.sim.t + x.at, x.action);
    }
  }

  /** The engine a procedure starts on: its prepared plant plus its scenario steps. */
  static forProcedure(p: Procedure, seed = 1): EngineV2 {
    const e = EngineV2.wrap(procedureSim(p), seed);
    e.applyScenario(p.scenario);
    return e;
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

  /** Live PUE, its breakdown, economizer mode and psychrometrics (Phase 4c part 3). Read-only. */
  get efficiency(): EfficiencyReading {
    return readEfficiency(this.sim, this.air, this.hyd, this.elec, this.sources);
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
    this.pq.apply(this.sim, this.hyd);
    this.sim.advance(dt);
    this.elec.step(this.sim, dt);
    this.sources.step(this.sim, this.rng);
    this.hyd.step(this.sim, this.air.reading.coilKw, dt);
    this.hyd.publish(this.sim);
    this.feedChw();
    this.air.step(this.sim, dt);
    this.alarms.step(this.alarmCtx);
    this.recordTrend();
  }

  private recordTrend(): void {
    this.trends.maybeRecord(this.sim.t, () => this.trendReading());
  }

  /** The trended readings right now (the trend screen adds this as its live end point). */
  trendReading(): Omit<TrendSample, 't'> {
    const e = this.efficiency;
    const h = this.hyd.reading;
    return { inletC: this.air.reading.temps.rackIn, chwsC: h.chwsC, cwC: h.cwC, pue: e.pue, tesSoc: h.tesSoc, fanSpeed: this.air.reading.fanSpeed, itKw: e.itKw };
  }

  private get alarmCtx() {
    return { sim: this.sim, air: this.air, hyd: this.hyd, sources: this.sources, pq: this.pq };
  }

  /** The alarm list as an operator sees it now. */
  get alarmSummary(): AlarmSummary {
    return this.alarms.summary(this.alarmCtx);
  }

  /** Air side reads chilled water from v2 hydronics once that output is switched in. */
  private feedChw(): void {
    const r = this.hyd.reading;
    this.air.chw = r ? { supplyC: r.chwsC, flowFrac: r.flowFrac } : null;
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
      sources: this.sources.snapshot(),
      air: this.air.snapshot(),
      hyd: this.hyd.snapshot(),
      alarms: this.alarms.snapshot(),
      pq: this.pq.snapshot(),
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
    if (s.sources) e.sources.restore(s.sources);
    if (s.air) {
      e.air.restore(s.air);
      e.air.refreshRackHeat(e.sim);
    }
    if (s.hyd) {
      e.hyd.restore(s.hyd);
      e.feedChw();
    }
    if (s.alarms) e.alarms.restore(s.alarms);
    if (s.pq) {
      e.pq.restore(s.pq);
      e.pq.sync(e.sim);
    }
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
      case 'restore': {
        const r = s.restore(x.id);
        if (r.ok && this.hyd.state.chillers[x.id]) this.hyd.reset(x.id);
        return r;
      }
      case 'blockHeater':
        return this.sources.setHeater(s, x.id, x.on);
      case 'failToStart':
        return this.sources.setFailToStart(x.p);
      case 'eco':
        return this.sources.setEco(s, x.system, x.on);
      case 'containment':
        return this.air.setContainment(x.mode);
      case 'blanking':
        return this.air.setBlanking(x.missing);
      case 'tiles':
        return this.air.setTiles(x.ratio);
      case 'utilityEvent':
        return this.pq.add(s, this.hyd, x.id, x.kind, x.pct, x.s);
      case 'chillerReset':
        return this.hyd.reset(x.id);
      case 'ack':
        return this.alarms.ack(x.alarm, s.t);
      case 'ackAll':
        return this.alarms.ackAll(s.t);
      case 'shelve':
        return this.alarms.shelve(x.alarm, x.s, s.t);
      case 'unshelve':
        return this.alarms.unshelve(x.alarm);
      case 'skip':
        if (!(Number.isFinite(x.s) && x.s > 0)) return { ok: false, reason: 'Skip needs a positive time.' };
        for (let left = x.s; left > 1e-9; left -= TICK_S) this.step(Math.min(TICK_S, left));
        return { ok: true };
      default:
        return applyToSim(s, x) ?? { ok: false, reason: 'Action not possible.' };
    }
  }
}
