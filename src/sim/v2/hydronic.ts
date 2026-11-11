/**
 * Engine v2 hydronic model (Phase 4c part 2): chilled water and condenser loops. Labeled "simplified".
 *
 * Nodes (lumped, exact exponential step, sub-steps keep dt/τ ≤ 1):
 *   CHW supply ──► coils (air side, CDUs, DOAS) ──► CHW return ──► economizer HX / chillers / TES ──► CHW supply
 *   condenser water (tower leaving / chiller entering) ◄── heat of rejection from water-cooled chillers + HX
 *   TES tank: stratified, state of charge (cold-water volume share) with a thermocline near empty.
 *
 * Each tick: loads → required CHW flow → VFD pumps on the DP-setpoint system curve → economizer →
 * chiller staging (lead/lag, start/restart delays, anti-short-cycle, min run, low evaporator flow trip,
 * high head trip) with capacity from lift → TES discharge or recharge → node temperatures.
 *
 * Reads the v1 plant for what's available (status + power), the weather, and the liquid/DOAS share
 * of the load; reads the v2 air side's coil duty. It owns chilled water (since the 2026-11-08 parity
 * switch) and publishes its loop, tank and chiller modes into the v1 readout that screens and checks read.
 * Every formula is in physics.ts.
 */
import type { Simulation } from '../engine';
import {
  airCooledDerate,
  chillerCop,
  chillerLiftFactor,
  EFF,
  econModeFor,
  econModeNext,
  econShare,
  type EconMode,
  heatFlowKw,
  HYD,
  massFlowForKw,
  nodeTauS,
  partLoadPowerFrac,
  PHYSICS,
  pumpKw,
  pumpOperatingPoint,
  relaxExact,
  tesDeliverable,
  towerLeavingLoadedC,
  wetBulbC,
} from '../physics';
import { WEATHER } from '../thermal';
import type { ActionResult, Component } from '../types';

export type HydChillerMode = 'off' | 'starting' | 'running' | 'tripped';

export interface HydChiller {
  mode: HydChillerMode;
  /** Seconds left to load (starting). */
  timer: number;
  /** Sim time of the last start call, and of reaching 'running'. */
  lastStart: number | null;
  runningSince: number | null;
  /** Seconds spent below minimum evaporator flow while on. */
  lowFlowS: number;
  /** Next start is a rapid restart after a stop (power loss, flow loss): restart delay, no anti-short-cycle. */
  restart: boolean;
  tripWhy?: string;
}

export interface HydState {
  chwsC: number;
  chwrC: number;
  cwC: number;
  /** Stored cooling (kJ) and the full-tank value. */
  tesKj: number;
  chillers: Record<string, HydChiller>;
  /** Economizer mode and when it entered it (Phase 4c part 3: hysteresis + minimum dwell). */
  econMode: EconMode;
  econSince: number;
}

export interface HydReading {
  loadKwt: number;
  econKwt: number;
  econMode: EconMode;
  wetBulbC: number;
  cwPumpKw: number;
  towerFanKw: number;
  chillerKwt: number;
  chillerCapKwt: number;
  tesKwt: number;
  /** Negative = recharging. */
  tesSoc: number;
  tesMinutes: number;
  deficitKwt: number;
  chwsC: number;
  chwrC: number;
  cwC: number;
  condLeavingC: number;
  flowReqKgS: number;
  flowKgS: number;
  flowFrac: number;
  pumpsRunning: number;
  pumpSpeed: number;
  pumpHeadKpa: number;
  pumpKw: number;
  chillers: Record<string, { mode: HydChillerMode; kwt: number; kw: number; kwPerTon: number; liftK: number; capKwt: number }>;
}

const ORDER = ['CH-01', 'CH-02', 'CH-03', 'ACH-04'];
const WC_KWT = 1400;
const AC_KWT = 900;
const TOWER_KWT = 1800;
const TES_FULL_KJ = PHYSICS.tesLitres * PHYSICS.waterCpKj * PHYSICS.chwDeltaTC;
const MAX_SUBSTEPS = 50;
/** "Started long ago" (finite so it survives JSON snapshots). */
const LONG_AGO = -1e9;

const newChiller = (): HydChiller => ({ mode: 'off', timer: 0, lastStart: null, runningSince: null, lowFlowS: 0, restart: false });

export class HydronicModel {
  state: HydState = {
    chwsC: HYD.chwSetpointC,
    chwrC: HYD.chwSetpointC + HYD.chwDeltaTK,
    cwC: 25,
    tesKj: TES_FULL_KJ,
    chillers: Object.fromEntries(ORDER.map((id) => [id, newChiller()])),
    econMode: 'off',
    econSince: 0,
  };
  reading!: HydReading;
  lastMaxDtOverTau = 0;

  /** Start from v1's steady plant: same chillers on, nodes at their steady state. */
  init(sim: Simulation, airCoilKw: number): void {
    const v1 = sim.thermal.state;
    for (const id of ORDER) {
      const m = v1.chillers[id]?.mode;
      if (m && m !== 'off' && sim.graph.nodes.has(id)) {
        this.state.chillers[id] = { ...newChiller(), mode: 'running', lastStart: LONG_AGO, runningSince: LONG_AGO };
      }
    }
    this.state.tesKj = v1.tesKj;
    // Settle temperatures without advancing time.
    for (let i = 0; i < 400; i++) this.solve(sim, airCoilKw, 0, true);
  }

  // --- Plant inputs ------------------------------------------------------------------------------

  private avail(sim: Simulation, id: string): boolean {
    if (!sim.graph.nodes.has(id)) return false;
    const n = sim.graph.get(id);
    return (n.status === 'online' || n.status === 'standby') && sim.solution.energized.has(id);
  }

  private okList(sim: Simulation, kind: Component['kind']): string[] {
    return sim.graph
      .byKind(kind)
      .map((n) => n.id)
      .filter((id) => this.avail(sim, id));
  }

  /** CHW load: v2 air coils plus the CDU and DOAS coil duty (from v1 until they get v2 models). */
  private loadKw(sim: Simulation, airCoilKw: number): number {
    const r = sim.thermal.readout;
    const other = r ? Math.max(0, r.loadKwt - r.airCoolingKwt) : 0;
    return airCoilKw + other;
  }

  // --- Tick ------------------------------------------------------------------------------------------

  step(sim: Simulation, airCoilKw: number, dt: number): void {
    if (!(dt > 0)) return;
    this.solve(sim, airCoilKw, dt, false);
  }

  private solve(sim: Simulation, airCoilKw: number, dt: number, settle: boolean): void {
    const st = this.state;
    const g = sim.graph;
    const t = sim.t;
    const cp = HYD.chwDeltaTK > 0 ? PHYSICS.waterCpKj : 4.186;
    const w = WEATHER[sim.thermal.state.weather];
    const wb = wetBulbC(w.dryBulbC, w.rh);

    // Loads and flow.
    const load = this.loadKw(sim, airCoilKw);
    const flowReq = massFlowForKw(load, cp, HYD.chwDeltaTK);
    const chwps = this.okList(sim, 'pump-chw');
    const nPumps = Math.min(chwps.length, Math.max(1, Math.ceil(flowReq / HYD.pumpDesignKgS)));
    const op = chwps.length ? pumpOperatingPoint(flowReq, nPumps) : { speed: 0, flowKgS: 0, headKpa: 0 };
    const flow = op.flowKgS;
    const flowFrac = flowReq > 0 ? Math.min(1, flow / flowReq) : chwps.length ? 1 : 0;

    // Economizer (same wet-bulb rule as v1 until 4c part 3 adds hysteresis).
    const towers = this.okList(sim, 'cooling-tower');
    const cwps = this.okList(sim, 'pump-cw');
    if (!(towers.length && cwps.length)) {
      if (st.econMode !== 'off') Object.assign(st, { econMode: 'off', econSince: t });
    } else if (settle) {
      Object.assign(st, { econMode: econModeFor(wb), econSince: t });
    } else {
      const next = econModeNext(st.econMode, wb, t - st.econSince);
      if (next !== st.econMode) Object.assign(st, { econMode: next, econSince: t });
    }
    const econFrac = econShare(st.econMode, wb);
    const coilDuty = load * flowFrac;
    const econ = econFrac * coilDuty;
    const need = Math.max(0, coilDuty - econ);

    // Chiller availability and capacity from lift.
    const isWc = (id: string) => g.get(id).kind === 'chiller-water-cooled';
    const condLeaving = st.cwC + PHYSICS.condenserRangeC;
    const acCond = w.dryBulbC + PHYSICS.airCooledCondenserLiftC;
    const capOf = (id: string) =>
      isWc(id) ? WC_KWT * chillerLiftFactor(condLeaving - st.chwsC) : AC_KWT * airCooledDerate(w.dryBulbC);
    const canRun = (id: string) => this.avail(sim, id) && chwps.length > 0 && (!isWc(id) || (towers.length > 0 && cwps.length > 0));
    const C = st.chillers;
    for (const id of ORDER) if (!C[id]) C[id] = newChiller();
    // When v2 owns chilled water its trips mark the chiller failed in the plant, so the operator's Restore
    // (from any screen, not only EngineV2.apply) is the manual reset.
    {
      for (const id of ORDER) {
        const c = C[id]!;
        if (c.mode === 'tripped' && g.nodes.has(id) && g.get(id).status !== 'failed') Object.assign(c, { mode: 'off', restart: true, tripWhy: undefined });
      }
    }

    // Stops: lost power, failed, no flow path (rapid restart allowed later).
    for (const id of ORDER) {
      const c = C[id]!;
      if (!g.nodes.has(id)) continue;
      if ((c.mode === 'starting' || c.mode === 'running') && !canRun(id)) Object.assign(c, { mode: 'off', timer: 0, runningSince: null, lowFlowS: 0, restart: true });
    }
    const onIds = () => ORDER.filter((id) => C[id]!.mode === 'starting' || C[id]!.mode === 'running');
    const onCap = () => onIds().reduce((s, id) => s + capOf(id), 0);

    // Start-up settle keeps the chillers exactly as the plant has them (no staging, no protection):
    // it only brings temperatures to steady state.
    // Stage on (lead/lag), honoring anti-short-cycle for normal starts.
    for (const id of settle ? [] : ORDER) {
      if (onCap() >= need * 1.05 || need <= 0) break;
      const c = C[id];
      if (!c || !g.nodes.has(id) || c.mode !== 'off' || !canRun(id)) continue;
      if (!c.restart && c.lastStart !== null && t - c.lastStart < HYD.startToStartS) continue;
      Object.assign(c, {
        mode: 'starting',
        timer: c.restart ? PHYSICS.chillerRestartS : PHYSICS.chillerStartS,
        lastStart: t,
        runningSince: null,
        restart: false,
      });
    }
    // Stage off the last one if the rest carry 125% of the need and it has run its minimum time.
    const on = onIds();
    const last = on[on.length - 1];
    if (!settle && last && C[last]!.mode === 'running' && onCap() - capOf(last) >= need * 1.25) {
      const ran = C[last]!.runningSince === null ? 0 : t - C[last]!.runningSince!;
      if (ran >= HYD.minRunS) Object.assign(C[last]!, { mode: 'off', timer: 0, runningSince: null });
    }
    for (const id of ORDER) {
      const c = C[id]!;
      if (c.mode === 'starting') {
        c.timer -= dt;
        if (c.timer <= 0) Object.assign(c, { mode: 'running', timer: 0, runningSince: t });
      }
    }

    // Protection: low evaporator flow, high head pressure (trips latch until reset/restore).
    let running = ORDER.filter((id) => C[id]!.mode === 'running');
    // Minimum-flow bypass valve keeps each running evaporator at 110% of its minimum when the pumps can
    // deliver it; a low-flow trip means the pumps can't (lost pumps, too many chillers on too few pumps).
    const pumpMax = chwps.length ? pumpOperatingPoint(1e6, chwps.length).flowKgS : 0;
    const evapFlow = Math.min(pumpMax, Math.max(flow, running.length * HYD.minFlowFrac * HYD.pumpDesignKgS * 1.1));
    const evapPer = running.length ? evapFlow / running.length : 0;
    for (const id of settle ? [] : running) {
      const c = C[id]!;
      c.lowFlowS = evapPer < HYD.minFlowFrac * HYD.pumpDesignKgS ? c.lowFlowS + dt : 0;
      if (c.lowFlowS > HYD.minFlowDelayS) this.trip(sim, id, 'low evaporator flow');
      else if (isWc(id) && condLeaving > PHYSICS.chillerHighHeadTripC) this.trip(sim, id, `high head pressure (condenser water ${Math.round((condLeaving * 9) / 5 + 32)} °F)`);
      else if (!isWc(id) && acCond > PHYSICS.airCooledHighHeadTripC) this.trip(sim, id, `high head pressure (condensing ${Math.round((acCond * 9) / 5 + 32)} °F)`);
    }
    running = ORDER.filter((id) => C[id]!.mode === 'running');
    const cap = running.reduce((s, id) => s + capOf(id), 0);

    // Chillers make what's needed to bring return water to setpoint (after the economizer), up to capacity.
    const toSetpoint = flow > 0 ? Math.max(0, heatFlowKw(flow, cp, st.chwrC - HYD.chwSetpointC) - econ) : 0;
    const chillerOut = Math.min(cap, toSetpoint);
    let deficit = Math.max(0, toSetpoint - chillerOut);
    let tes = 0;
    if (deficit > 1 && flow > 0 && st.tesKj > 0) {
      tes = Math.min(deficit, HYD.tesMaxDischargeKw * tesDeliverable(st.tesKj / TES_FULL_KJ), dt > 0 ? st.tesKj / dt : deficit);
      deficit -= tes;
    } else if (cap > chillerOut && st.tesKj < TES_FULL_KJ) {
      tes = -Math.min(PHYSICS.tesRechargeKw, cap - chillerOut, dt > 0 ? (TES_FULL_KJ - st.tesKj) / dt : 0);
    }
    if (!settle) st.tesKj = Math.min(TES_FULL_KJ, Math.max(0, st.tesKj - tes * dt));

    // Condenser water: heat of rejection from water-cooled chillers + economizer HX.
    const wcOut = cap > 0 ? running.filter(isWc).reduce((s, id) => s + (chillerOut * capOf(id)) / cap, 0) : 0;
    const rejected = wcOut * HYD.heatOfCompression + econ;
    // A CW pump runs for each water-cooled chiller starting or running (it starts with the chiller's start
    // sequence, so the tower pulls the water down before the compressor loads), plus one for the economizer HX.
    const wcOn = ORDER.filter((id) => g.nodes.has(id) && isWc(id) && (C[id]!.mode === 'starting' || C[id]!.mode === 'running')).length;
    const cwFlow = Math.min(cwps.length, wcOn + (econ > 0 ? 1 : 0)) * HYD.cwPumpKgS;
    const towerLoad = towers.length ? rejected / (towers.length * TOWER_KWT) : 0;
    const cwSs = towers.length && cwFlow > 0 ? Math.max(HYD.towerMinLeavingC, towerLeavingLoadedC(wb, towerLoad)) : st.cwC + (cwFlow > 0 ? rejected / heatFlowKw(cwFlow, cp, 1) : 0);

    // Node temperatures: exact steps, sub-stepped so dt/τ ≤ 1.
    const removed = econ + chillerOut + Math.max(0, tes);
    const tauS = nodeTauS(HYD.chwSupplyMassKjPerK, flow, cp);
    const tauR = nodeTauS(HYD.chwReturnMassKjPerK, flow, cp);
    const tauC = nodeTauS(HYD.cwMassKjPerK, cwFlow, cp);
    if (settle) {
      if (flow > 0) {
        st.chwrC = st.chwsC + coilDuty / heatFlowKw(flow, cp, 1);
        st.chwsC = st.chwrC - removed / heatFlowKw(flow, cp, 1);
      }
      if (cwFlow > 0 && towers.length) st.cwC = cwSs;
    } else {
      const minTau = Math.min(tauS, tauR, tauC);
      const n = Math.min(MAX_SUBSTEPS, Math.max(1, Math.ceil(dt / minTau)));
      const h = dt / n;
      this.lastMaxDtOverTau = Number.isFinite(minTau) ? h / minTau : 0;
      for (let i = 0; i < n; i++) {
        const sSs = flow > 0 ? st.chwrC - removed / heatFlowKw(flow, cp, 1) : st.chwsC;
        const rSs = flow > 0 ? st.chwsC + coilDuty / heatFlowKw(flow, cp, 1) : st.chwrC;
        st.chwsC = relaxExact(st.chwsC, sSs, h, tauS);
        st.chwrC = relaxExact(st.chwrC, rSs, h, tauR);
        st.cwC = relaxExact(st.cwC, cwSs, h, tauC);
      }
    }

    // Readout: chiller power from lift and part load.
    const chillers: HydReading['chillers'] = {};
    for (const id of ORDER) {
      if (!g.nodes.has(id)) continue;
      const c = C[id]!;
      const capId = capOf(id);
      const kwt = c.mode === 'running' && cap > 0 ? ((chillerOut + Math.max(0, -tes)) * capId) / cap : 0;
      const cond = isWc(id) ? condLeaving : acCond - 2;
      const fullKw = capId / chillerCop(st.chwsC, Math.max(cond, st.chwsC + HYD.minLiftK));
      const kw = c.mode === 'running' ? fullKw * partLoadPowerFrac(capId > 0 ? kwt / capId : 0) : c.mode === 'starting' ? 15 : 0;
      chillers[id] = { mode: c.mode, kwt, kw, kwPerTon: kwt > 0 ? kw / (kwt / 3.517) : 0, liftK: cond - st.chwsC, capKwt: capId };
    }
    this.reading = {
      loadKwt: load,
      econKwt: econ,
      econMode: st.econMode,
      wetBulbC: wb,
      cwPumpKw: (cwFlow / HYD.cwPumpKgS) * pumpKw(HYD.cwPumpKgS, EFF.cwPumpHeadKpa),
      towerFanKw: (() => {
        if (!towers.length || cwFlow <= 0 || rejected <= 0) return 0;
        const n = Math.min(towers.length, Math.ceil(rejected / TOWER_KWT));
        return n * EFF.towerFanKw * Math.min(1, rejected / (n * TOWER_KWT)) ** 3;
      })(),
      chillerKwt: chillerOut,
      chillerCapKwt: cap,
      tesKwt: tes,
      tesSoc: st.tesKj / TES_FULL_KJ,
      tesMinutes: load > 0 ? st.tesKj / load / 60 : Infinity,
      deficitKwt: deficit,
      chwsC: st.chwsC,
      chwrC: st.chwrC,
      cwC: st.cwC,
      condLeavingC: wcOut > 0 ? condLeaving : st.cwC,
      flowReqKgS: flowReq,
      flowKgS: flow,
      flowFrac,
      pumpsRunning: chwps.length ? nPumps : 0,
      pumpSpeed: op.speed,
      pumpHeadKpa: op.headKpa,
      pumpKw: chwps.length ? nPumps * pumpKw(flow / Math.max(1, nPumps), op.headKpa) : 0,
      chillers,
    };
  }

  private trip(sim: Simulation, id: string, why: string): void {
    Object.assign(this.state.chillers[id]!, { mode: 'tripped', timer: 0, runningSince: null, lowFlowS: 0, tripWhy: why });
    if (!sim.graph.nodes.has(id)) return;
    const n = sim.graph.get(id);
    if (n.status === 'failed') return;
    n.status = 'failed';
    sim.log('critical', n.tag, `${n.tag} TRIPPED: ${why}. Needs investigation and a manual reset (Restore).`);
  }

  /**
   * Voltage dip (Phase 8a): a running or starting chiller drops offline and restarts on its restart timer
   * once voltage is back (not a latched trip). Returns true if it was running.
   */
  powerDip(id: string): boolean {
    const c = this.state.chillers[id];
    if (!c || (c.mode !== 'running' && c.mode !== 'starting')) return false;
    const was = c.mode === 'running';
    Object.assign(c, { mode: 'off', timer: 0, runningSince: null, lowFlowS: 0, restart: true });
    return was;
  }

  /** Manual reset after a trip (the operator's Restore of that chiller also resets it). */
  reset(id: string): ActionResult {
    const c = this.state.chillers[id];
    if (!c) return { ok: false, reason: `${id} is not a chiller.` };
    if (c.mode === 'tripped') Object.assign(c, { mode: 'off', restart: true, tripWhy: undefined });
    return { ok: true };
  }

  /**
   * When v2 owns chilled water: write its loop temperatures, flow, TES and chiller modes into the v1
   * state and readout, so every screen, the CDUs/DOAS (which still run on v1) and procedure checks
   * read the v2 plant.
   */
  publish(sim: Simulation): void {
    if (!this.reading) return;
    const r = this.reading;
    const v1 = sim.thermal.state;
    v1.chwSupplyC = r.chwsC;
    v1.tesKj = this.state.tesKj;
    const ro = sim.thermal.readout;
    if (!ro) return;
    ro.chwSupplyC = r.chwsC;
    ro.chwReturnC = r.chwrC;
    ro.chwFlowFraction = r.flowFrac;
    ro.tesSoc = r.tesSoc;
    ro.tesMinutes = r.tesMinutes;
    ro.tesDischargeKwt = Math.max(0, r.tesKwt);
    ro.chillerKwt = r.chillerKwt;
    ro.chillerCapacityKwt = r.chillerCapKwt;
    ro.condenserC = r.condLeavingC;
    ro.economizerKwt = r.econKwt;
    for (const [id, c] of Object.entries(r.chillers)) {
      ro.chillers[id] = c.mode === 'tripped' ? 'off' : c.mode;
      ro.chillerTimers[id] = this.state.chillers[id]?.timer ?? 0;
    }
  }

  snapshot(): HydState {
    return JSON.parse(JSON.stringify(this.state)) as HydState;
  }

  restore(s: HydState): void {
    this.state = JSON.parse(JSON.stringify(s)) as HydState;
  }
}
