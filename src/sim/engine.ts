/**
 * engine.ts — the time-stepping simulation.
 *
 * Owns the plant, advances time, runs the automatic controls a real plant
 * has (ATS transfer logic, generator start, UPS battery, BESS), and turns
 * every change into a timestamped event.
 *
 * The UI only calls the public methods here and reads the results, so the
 * whole behavior can be unit tested without a browser.
 */

import { groupCapacity, type GroupCapacity } from './capacity';
import type { PlantGraph } from './graph';
import type { InterlockSystem } from './interlocks';
import { BATTERY_AGES, bessSocDrop, genFuelLPerS, PHYSICS, pue, upsSocDrop, type BatteryAge } from './physics';
import type { Plant, PlantMeta } from './plant/builder';
import { loadFraction, solvePower, type PowerSolution } from './power';
import { ThermalPlant, WEATHER, type WeatherId } from './thermal';
import type { ActionResult, Component, Severity, SimEvent, Status } from './types';

/** Format simulation seconds as "T+12s" or "T+4m05s". */
export function formatT(t: number): string {
  const s = Math.round(t);
  if (s < 60) return `T+${s}s`;
  const m = Math.floor(s / 60);
  return `T+${m}m${String(s % 60).padStart(2, '0')}s`;
}

interface AtsTimers {
  lossS: number;
  restoreS: number;
}

/** UPS battery recharge rate (SOC per second) while on normal power: ~30 min to full. */
const UPS_RECHARGE_PER_S = 1 / 1800;
/** BESS recharge rate (SOC per second) once the bus is healthy: ~1 hour to full. */
const BESS_RECHARGE_PER_S = 1 / 3600;
/** Internal step used when advancing time, so timers resolve to the second. */
const MAX_STEP_S = 1;

export class Simulation {
  readonly graph: PlantGraph;
  readonly interlocks: InterlockSystem;
  readonly meta: PlantMeta;
  t = 0;
  events: SimEvent[] = [];
  solution: PowerSolution;
  /** Mechanical plant and thermal model (Phase 4). */
  thermal: ThermalPlant;
  /** Age of every UPS battery string (sets usable capacity). */
  batteryAge: BatteryAge = 'new';
  private atsTimers = new Map<string, AtsTimers>();
  /** Status each component had at build time, used by restore(). */
  private homeStatus = new Map<string, Status>();
  /** Last overload state per component, so alarms fire once per crossing. */
  private overloaded = new Set<string>();

  constructor(plant: Plant) {
    this.graph = plant.graph;
    this.interlocks = plant.interlocks;
    this.meta = plant.meta;
    for (const n of this.graph.nodes.values()) this.homeStatus.set(n.id, n.status);
    for (const a of this.graph.byKind('ats')) this.atsTimers.set(a.id, { lossS: 0, restoreS: 0 });
    this.solution = solvePower(this.graph);
    this.thermal = new ThermalPlant(this);
    this.thermal.init();
    // Mechanical loads now carry their real running kW; solve again so PUE starts right.
    this.solution = solvePower(this.graph);
  }

  /** Independent copy for "what if" previews. Events and time carry over. */
  clone(): Simulation {
    const sim = new Simulation({ graph: this.graph.clone(), interlocks: this.interlocks.clone(), meta: this.meta });
    sim.t = this.t;
    sim.batteryAge = this.batteryAge;
    sim.events = [...this.events];
    sim.homeStatus = new Map(this.homeStatus);
    sim.overloaded = new Set(this.overloaded);
    for (const [k, v] of this.atsTimers) sim.atsTimers.set(k, { ...v });
    sim.thermal.restore(this.thermal.snapshot());
    sim.thermal.step(0);
    sim.solution = solvePower(sim.graph);
    return sim;
  }

  // -------------------------------------------------------------------------
  // Event log
  // -------------------------------------------------------------------------

  log(severity: Severity, source: string, message: string): void {
    this.events.push({ t: this.t, severity, source, message });
  }

  eventsSince(t: number): SimEvent[] {
    return this.events.filter((e) => e.t >= t);
  }

  // -------------------------------------------------------------------------
  // Time
  // -------------------------------------------------------------------------

  /** Advance the simulation by `seconds`, in steps of at most one second. */
  advance(seconds: number): void {
    let left = seconds;
    while (left > 1e-9) {
      const dt = Math.min(MAX_STEP_S, left);
      this.step(dt);
      left -= dt;
    }
  }

  private step(dt: number): void {
    this.t += dt;
    this.runGenerators(dt);
    this.runTransferSwitches(dt);
    this.resolve();
    this.runStorage(dt);
    this.thermal.step(dt);
  }

  // -------------------------------------------------------------------------
  // Automatic controls
  // -------------------------------------------------------------------------

  private runGenerators(dt: number): void {
    for (const gen of this.graph.byKind('generator')) {
      const s = gen.state;
      if (gen.status === 'failed' || gen.status === 'maintenance') continue;
      if (s.genState === 'cranking') {
        s.genTimer = (s.genTimer ?? 0) - dt;
        if (s.genTimer <= 0) {
          s.genState = 'running';
          gen.status = 'online';
          this.log('info', gen.tag, `${gen.tag} at rated speed and voltage, closed to the paralleling bus.`);
        }
      } else if (s.genState === 'running') {
        const loadKw = this.solution.sourceKw.get(gen.id) ?? 0;
        s.fuelL = Math.max(0, (s.fuelL ?? 0) - genFuelLPerS(loadKw, gen.ratedKw) * dt);
        if (s.fuelL === 0) {
          s.genState = 'off';
          gen.status = 'failed';
          this.log('critical', gen.tag, `${gen.tag} shut down: day tank empty. Check the bulk fuel transfer pumps.`);
        }
      }
    }
  }

  /** Signal every available generator on a paralleling bus to start. */
  private startGenerators(busId: string): void {
    const units = this.graph.upstream(busId, 'power').filter((n) => n.kind === 'generator');
    for (const gen of units) {
      if (gen.status === 'failed' || gen.status === 'maintenance' || gen.state.genState !== 'off') continue;
      gen.state.genState = 'cranking';
      gen.state.genTimer = PHYSICS.genStartDelayS;
      this.log('info', gen.tag, `${gen.tag} start signal received, cranking.`);
    }
  }

  /** Stop generators on a bus once no transfer switch is using it. */
  private stopGeneratorsIfIdle(busId: string): void {
    const users = this.graph.downstream(busId, 'power').filter((a) => a.kind === 'ats' && a.state.selected === 'emergency');
    if (users.length) return;
    for (const gen of this.graph.upstream(busId, 'power')) {
      if (gen.kind !== 'generator' || gen.state.genState === 'off' || gen.state.manualRun) continue;
      gen.state.genState = 'off';
      if (gen.status === 'online') gen.status = 'standby';
      this.log('info', gen.tag, `${gen.tag} cooled down and shut off. Back in automatic standby.`);
    }
  }

  private runTransferSwitches(dt: number): void {
    for (const ats of this.graph.byKind('ats')) {
      if (ats.status === 'failed' || ats.status === 'maintenance') continue;
      const timers = this.atsTimers.get(ats.id)!;
      const normalEdge = this.graph.inEdges(ats.id, 'power').find((e) => e.port === 'normal');
      const emergEdge = this.graph.inEdges(ats.id, 'power').find((e) => e.port === 'emergency');
      const normalLive = !!normalEdge && this.solution.energized.has(normalEdge.from);
      const emergLive = !!emergEdge && this.solution.energized.has(emergEdge.from);

      if (ats.state.selected === 'normal') {
        timers.restoreS = 0;
        if (normalLive) {
          timers.lossS = 0;
          continue;
        }
        const before = timers.lossS;
        timers.lossS += dt;
        if (before < PHYSICS.atsStartDelayS && timers.lossS >= PHYSICS.atsStartDelayS && emergEdge) {
          this.log('warning', ats.tag, `${ats.tag} lost normal source. Start signal sent to generators.`);
          this.startGenerators(emergEdge.from);
        }
        if (emergLive && timers.lossS >= PHYSICS.atsStartDelayS + PHYSICS.atsTransferDelayS) {
          ats.state.selected = 'emergency';
          this.log('warning', ats.tag, `${ats.tag} transferred to generator (emergency) source.`);
        }
      } else if (ats.state.selected === 'emergency') {
        timers.lossS = 0;
        if (!normalLive) {
          timers.restoreS = 0;
          continue;
        }
        if (!emergLive) {
          // Generators lost while utility is back: go straight to normal.
          ats.state.selected = 'normal';
          this.log('warning', ats.tag, `${ats.tag} emergency source lost; transferred back to normal.`);
          if (emergEdge) this.stopGeneratorsIfIdle(emergEdge.from);
          continue;
        }
        const before = timers.restoreS;
        timers.restoreS += dt;
        if (before === 0) {
          this.log('info', ats.tag, `${ats.tag} sees normal source restored. Retransfer timer started (${PHYSICS.atsRetransferDelayS}s).`);
        }
        if (timers.restoreS >= PHYSICS.atsRetransferDelayS) {
          ats.state.selected = 'normal';
          timers.restoreS = 0;
          this.log('info', ats.tag, `${ats.tag} retransferred to normal (utility) source.`);
          if (emergEdge) this.stopGeneratorsIfIdle(emergEdge.from);
        }
      }
    }
  }

  private runStorage(dt: number): void {
    const sol = this.solution;
    for (const u of this.graph.byKind('ups')) {
      const mode = sol.upsMode.get(u.id);
      const s = u.state;
      if (mode === 'battery') {
        s.soc = Math.max(0, (s.soc ?? 0) - upsSocDrop(loadFraction(this.graph, sol, u.id), dt, PHYSICS, BATTERY_AGES[this.batteryAge].health));
      } else if (mode === 'normal') {
        s.soc = Math.min(1, (s.soc ?? 0) + UPS_RECHARGE_PER_S * dt);
      }
    }
    for (const b of this.graph.byKind('bess')) {
      const s = b.state;
      const kw = sol.bessDischargeKw.get(b.id);
      if (kw !== undefined) {
        s.soc = Math.max(0, (s.soc ?? 0) - bessSocDrop(kw, dt, s.capacityKwh ?? 0));
      } else if (b.status === 'online' && this.graph.downstream(b.id).every((d) => sol.energized.has(d.id))) {
        s.soc = Math.min(1, (s.soc ?? 0) + BESS_RECHARGE_PER_S * dt);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Solve and report changes
  // -------------------------------------------------------------------------

  /** Re-solve the network and log anything that changed. */
  /** Signature of every input the power solver reads. Same signature → same solution. */
  private solveKey(): string {
    const parts: (string | number)[] = [];
    for (const n of this.graph.nodes.values()) {
      const s = n.state;
      parts.push(
        n.status,
        s.closed ? 1 : 0,
        s.selected ?? '',
        s.upsMode ?? '',
        s.genState ?? '',
        (s.fuelL ?? 1) > 0 ? 1 : 0,
        (s.soc ?? 1) > 0 ? 1 : 0,
        s.demandKw ?? '',
        s.baseKw ?? '',
        s.thermalTrip ? 1 : 0,
      );
    }
    return parts.join('|');
  }
  private lastKey = '';

  resolve(): void {
    const prev = this.solution;
    // Skip the solve when nothing it depends on has changed (most steps at steady state).
    const key = this.solveKey();
    if (key === this.lastKey) return;
    this.lastKey = key;
    const next = solvePower(this.graph);
    this.solution = next;

    for (const r of this.graph.byKind('rack', 'cdu')) {
      const was = prev.energized.has(r.id);
      const is = next.energized.has(r.id);
      if (was && !is) this.log('critical', r.tag, `${r.tag} lost power at ${formatT(this.t)}.`);
      if (!was && is) this.log('info', r.tag, `${r.tag} power restored at ${formatT(this.t)}.`);
    }

    for (const u of this.graph.byKind('ups')) {
      const a = prev.upsMode.get(u.id);
      const b = next.upsMode.get(u.id);
      if (a === b) continue;
      if (b === 'battery') {
        this.log('alarm', u.tag, `${u.tag} on battery. ${Math.round(this.upsRuntimeS(u.id))}s runtime at current load.`);
      } else if (b === 'static-bypass') {
        const overload = loadFraction(this.graph, next, u.id) > 1;
        this.log('alarm', u.tag, `${u.tag} transferred to static bypass${overload ? ' (overload)' : ''}. Load is on raw bypass power with no battery protection.`);
      } else if (b === 'normal') {
        this.log('info', u.tag, `${u.tag} back on inverter (normal).`);
      } else if (b === 'off') {
        this.log('critical', u.tag, `${u.tag} output OFF.`);
      }
    }

    for (const b of this.graph.byKind('bess')) {
      const was = prev.bessDischargeKw.has(b.id);
      const is = next.bessDischargeKw.has(b.id);
      if (!was && is) this.log('warning', b.tag, `${b.tag} discharging to support ${this.graph.downstream(b.id).map((d) => d.tag).join(', ')}.`);
      if (was && !is) this.log('info', b.tag, `${b.tag} stopped discharging. SOC ${Math.round((b.state.soc ?? 0) * 100)}%.`);
    }

    // Overload alarms (once per crossing).
    for (const n of this.graph.nodes.values()) {
      if (!n.ratedKw || n.kind === 'rack') continue;
      const over = loadFraction(this.graph, next, n.id) > 1;
      if (over && !this.overloaded.has(n.id)) {
        this.overloaded.add(n.id);
        this.log('alarm', n.tag, `${n.tag} OVERLOAD: ${Math.round(loadFraction(this.graph, next, n.id) * 100)}% of rating.`);
      } else if (!over && this.overloaded.has(n.id)) {
        this.overloaded.delete(n.id);
      }
    }

    const newPar = next.paralleled.filter((id) => !prev.paralleled.includes(id));
    if (newPar.length) {
      this.log('critical', 'SYSTEM', `Unsynchronized sources paralleled at ${newPar.map((id) => this.graph.get(id).tag).join(', ')}.`);
    }
  }

  // -------------------------------------------------------------------------
  // Operator actions
  // -------------------------------------------------------------------------

  /** Fail a component (Failure mode). Breakers trip open. */
  fail(id: string): ActionResult {
    const n = this.graph.get(id);
    if (n.status === 'failed') return { ok: false, reason: `${n.tag} is already failed.` };
    n.status = 'failed';
    if (n.kind === 'breaker') n.state.closed = false;
    if (n.kind === 'generator') n.state.genState = 'off';
    this.log('critical', n.tag, `${n.tag} FAILED.`);
    this.resolve();
    return { ok: true };
  }

  /** Return a failed or maintenance component to its normal status. */
  restore(id: string): ActionResult {
    const n = this.graph.get(id);
    const home = this.homeStatus.get(id) ?? 'online';
    if (n.status === home) return { ok: false, reason: `${n.tag} is already ${home}.` };
    n.status = home;
    this.log('info', n.tag, `${n.tag} returned to service (${home}).`);
    this.resolve();
    return { ok: true };
  }

  /**
   * Take a component out of service for maintenance. Refuses if it is still
   * energized or carrying load, because maintenance means isolated.
   */
  setMaintenance(id: string): ActionResult {
    const n = this.graph.get(id);
    const block = (reason: string): ActionResult => {
      this.log('warning', n.tag, `Blocked: ${reason}`);
      return { ok: false, reason };
    };
    if (n.status === 'maintenance') return { ok: false, reason: `${n.tag} is already out of service.` };
    if (n.status === 'failed') return block(`${n.tag} is failed. Restore it before changing its service state.`);
    if (n.kind === 'rack' || n.domain === 'life-safety') return block(`${n.tag} is not taken out of service from here.`);
    if (n.kind === 'generator') {
      if (n.state.genState !== 'off') return block(`${n.tag} is running. Stop it (or wait for cooldown) before locking it out.`);
    } else if (n.domain === 'mechanical') {
      // Mechanical units are locked out at their own disconnect; the BMS runs the plant without them.
    } else if (this.solution.energized.has(id)) {
      return block(`${n.tag} is still energized. Isolate it (open its input and output breakers) before declaring it out of service.`);
    }
    n.status = 'maintenance';
    if (n.kind === 'generator') n.state.manualRun = false;
    this.log('info', n.tag, n.domain === 'mechanical' ? `${n.tag} shut down and locked out for maintenance. The BMS will run the plant without it.` : `${n.tag} tagged out for maintenance.`);
    this.resolve();
    return { ok: true };
  }

  /**
   * Emergency power off for the data hall: every UPS output is shut off and
   * the maintenance bypasses opened, so all IT in the hall goes dark at once.
   * Life-safety device: for fire or electrocution only.
   */
  emergencyPowerOff(): ActionResult {
    for (const u of this.graph.byKind('ups')) u.state.upsMode = 'off';
    for (const b of this.graph.byKind('breaker')) if (b.id.startsWith('MBB-')) b.state.closed = false;
    this.log('critical', 'EPO-01', 'EMERGENCY POWER OFF pressed. All UPS outputs shut down; the data hall is dark.');
    this.resolve();
    return { ok: true };
  }

  /** Start or stop a generator test run. Unloaded unless an ATS calls for it. */
  testGenerator(id: string, on: boolean): ActionResult {
    const g = this.graph.get(id);
    if (g.kind !== 'generator') return { ok: false, reason: `${g.tag} is not a generator.` };
    if (on) {
      if (g.status === 'failed' || g.status === 'maintenance') return { ok: false, reason: `${g.tag} is ${g.status}. Return it to service first.` };
      if (g.state.genState !== 'off') return { ok: false, reason: `${g.tag} is already ${g.state.genState}.` };
      g.state.genState = 'cranking';
      g.state.genTimer = PHYSICS.genStartDelayS;
      g.state.manualRun = true;
      this.log('info', g.tag, `${g.tag} test run: start command from the control panel, cranking.`);
      return { ok: true };
    }
    if (!g.state.manualRun) return { ok: false, reason: `${g.tag} was not started for a test run.` };
    const bus = this.graph.downstream(g.id).find((n) => n.kind === 'paralleling-bus');
    const inUse = bus && this.graph.downstream(bus.id).some((a) => a.kind === 'ats' && a.state.selected === 'emergency');
    g.state.manualRun = false;
    if (inUse) {
      this.log('warning', g.tag, `${g.tag} test run ended, but the generator stays on: an ATS is using this generator bus.`);
      return { ok: true };
    }
    g.state.genState = 'off';
    if (g.status === 'online') g.status = 'standby';
    this.log('info', g.tag, `${g.tag} test run complete: cooled down and back in automatic standby.`);
    this.resolve();
    return { ok: true };
  }

  openBreaker(id: string): ActionResult {
    const b = this.graph.get(id);
    if (b.kind !== 'breaker') return { ok: false, reason: `${b.tag} is not a breaker.` };
    if (!b.state.closed) return { ok: false, reason: `${b.tag} is already open.` };
    b.state.closed = false;
    this.log('info', b.tag, `${b.tag} opened.`);
    this.resolve();
    return { ok: true };
  }

  /**
   * Close a breaker. Blocked if the Kirk-key interlock says no, if the
   * breaker is failed or tagged out, or if closing it would parallel two
   * unsynchronized sources.
   */
  closeBreaker(id: string): ActionResult {
    const b = this.graph.get(id);
    if (b.kind !== 'breaker') return { ok: false, reason: `${b.tag} is not a breaker.` };
    if (b.state.closed) return { ok: false, reason: `${b.tag} is already closed.` };
    if (b.status === 'failed' || b.status === 'maintenance') {
      return { ok: false, reason: `${b.tag} is ${b.status}. It cannot be closed until it's returned to service.` };
    }
    const lock = this.interlocks.canClose(id);
    if (!lock.ok) {
      this.log('warning', b.tag, `Blocked: ${lock.reason}`);
      return lock;
    }
    // Look before closing: would this parallel two independent sources?
    b.state.closed = true;
    const trial = solvePower(this.graph);
    const newPar = trial.paralleled.filter((x) => !this.solution.paralleled.includes(x));
    if (newPar.length) {
      b.state.closed = false;
      const srcs = [...(trial.origins.get(newPar[0]!) ?? [])].join(' and ');
      const reason = `Closing ${b.tag} would parallel unsynchronized sources (${srcs}). That can cause a violent out-of-phase fault and back-feed. Blocked.`;
      this.log('warning', b.tag, `Blocked: ${reason}`);
      return { ok: false, reason };
    }
    this.log('info', b.tag, `${b.tag} closed.`);
    this.resolve();
    return { ok: true };
  }

  /** Transfer every module of a UPS system to static bypass, or back to inverter. */
  setUpsSystemMode(systemId: string, mode: 'static-bypass' | 'auto'): ActionResult {
    const modules = this.graph.downstream(`UIB-${systemId}`).filter((n) => n.kind === 'ups');
    if (!modules.length) return { ok: false, reason: `No UPS system ${systemId}.` };
    if (mode === 'static-bypass') {
      const bypassSrc = this.graph.upstream(`SBB-${systemId}`)[0];
      const sbb = this.graph.get(`SBB-${systemId}`);
      if (!sbb.state.closed || !bypassSrc || !this.solution.energized.has(bypassSrc.id)) {
        return { ok: false, reason: `Bypass source for UPS ${systemId} is not available. The UPS will not transfer onto a dead or open bypass.` };
      }
    }
    for (const m of modules) m.state.upsMode = mode;
    this.log('info', `UPS-${systemId}`, mode === 'static-bypass' ? `UPS ${systemId} commanded to static bypass.` : `UPS ${systemId} commanded back to inverter.`);
    this.resolve();
    return { ok: true };
  }

  removeKey(lockId: string): ActionResult {
    const r = this.interlocks.removeKey(this.graph, lockId);
    this.log(r.ok ? 'info' : 'warning', lockId, r.ok ? r.message ?? '' : `Blocked: ${r.reason}`);
    return r;
  }

  insertKey(keyId: string, lockId: string): ActionResult {
    const r = this.interlocks.insertKey(keyId, lockId);
    this.log(r.ok ? 'info' : 'warning', lockId, r.ok ? r.message ?? '' : `Blocked: ${r.reason}`);
    return r;
  }

  // -------------------------------------------------------------------------
  // Read-outs
  // -------------------------------------------------------------------------

  /** Seconds of battery left on a UPS module at its current load. */
  upsRuntimeS(id: string): number {
    const u = this.graph.get(id);
    const frac = loadFraction(this.graph, this.solution, id);
    if (frac <= 0) return Infinity;
    return (u.state.soc ?? 0) * (1 / upsSocDrop(frac, 1, PHYSICS, BATTERY_AGES[this.batteryAge].health));
  }

  /** Set the age of all UPS battery strings, which changes their runtime. */
  setBatteryAge(age: BatteryAge): ActionResult {
    if (!(age in BATTERY_AGES)) return { ok: false, reason: `Unknown battery age ${age}.` };
    this.batteryAge = age;
    const b = BATTERY_AGES[age];
    this.log(age === 'overdue' ? 'warning' : 'info', 'UPS', `UPS batteries set to ${b.label}: ${Math.round(b.health * 100)}% capacity. ${b.note}`);
    return { ok: true };
  }

  /** Change the outdoor conditions the mechanical plant works against. */
  setWeather(w: WeatherId): ActionResult {
    if (!(w in WEATHER)) return { ok: false, reason: `Unknown weather ${w}.` };
    this.thermal.setWeather(w);
    this.thermal.step(0);
    return { ok: true };
  }

  /** Racks with no IT running: no power, or shut down by their own thermal protection. */
  itDownRacks(): Component[] {
    return this.graph.byKind('rack').filter((r) => !this.solution.energized.has(r.id) || r.state.thermalTrip);
  }

  /** Racks currently without power. */
  droppedRacks(): Component[] {
    return this.graph.byKind('rack').filter((r) => !this.solution.energized.has(r.id));
  }

  /** Total facility input power (kW): utilities + generators + storage discharge. */
  facilityKw(): number {
    const sol = this.solution;
    let kw = 0;
    for (const v of sol.sourceKw.values()) kw += v;
    for (const v of sol.bessDischargeKw.values()) kw += v;
    for (const u of this.graph.byKind('ups')) if (sol.upsMode.get(u.id) === 'battery') kw += sol.loadKw.get(u.id) ?? 0;
    return kw;
  }

  pue(): number {
    return pue(this.facilityKw(), this.solution.itPoweredKw);
  }

  /** Capacity math for each UPS system and generator group. */
  capacityReport(): GroupCapacity[] {
    const out: GroupCapacity[] = [];
    const sol = this.solution;
    for (const sys of this.meta.upsSystems) {
      const modules = this.graph.downstream(`UIB-${sys.id}`).filter((n) => n.kind === 'ups');
      const avail = modules.filter((m) => m.status === 'online' || m.status === 'standby').length;
      const load = sol.loadKw.get(`CB-${sys.id}`) ?? 0;
      out.push(groupCapacity(`UPS ${sys.id}`, sys.moduleKw, modules.length, avail, load));
    }
    for (const grp of this.meta.generatorGroups) {
      const gens = grp.units.map((id) => this.graph.get(id));
      const avail = gens.filter((x) => x.status !== 'failed' && x.status !== 'maintenance').length;
      // Load the generators would pick up: everything behind the ATSs they back up.
      const atsIds = this.graph.downstream(grp.busId).filter((n) => n.kind === 'ats').map((n) => n.id);
      const load = atsIds.reduce((s, id) => s + (sol.loadKw.get(id) ?? 0), 0);
      out.push(groupCapacity(`Generators ${grp.busId}`, gens[0]?.ratedKw ?? 0, gens.length, avail, load));
    }
    return out;
  }

  /**
   * Failover check per UPS system: lose the whole system and see if the
   * plant still carries every rack. This is the real test of 2N, DR and
   * block designs, since the redundancy is between systems, not modules.
   */
  failoverCheck(): { system: string; dropped: string[]; overloaded: string[] }[] {
    return this.meta.upsSystems.map((sys) => {
      const modules = this.graph.downstream(`UIB-${sys.id}`).filter((n) => n.kind === 'ups').map((n) => n.id);
      return { system: sys.id, ...this.whatIfFail(modules, 30) };
    });
  }

  /**
   * What if these components failed? Runs the scenario on a copy for
   * `seconds` and reports racks that dropped and components overloaded.
   */
  whatIfFail(ids: string[], seconds = 60): { dropped: string[]; overloaded: string[] } {
    const sim = this.clone();
    for (const id of ids) sim.fail(id);
    sim.advance(seconds);
    const overloaded = [...sim.graph.nodes.values()]
      .filter((n) => n.ratedKw && n.kind !== 'rack' && loadFraction(sim.graph, sim.solution, n.id) > 1)
      .map((n) => n.id);
    return { dropped: sim.droppedRacks().map((r) => r.id), overloaded };
  }
}

/** Convenience: build a plant and wrap it in a simulation. */
export function createSimulation(plant: Plant): Simulation {
  return new Simulation(plant);
}
