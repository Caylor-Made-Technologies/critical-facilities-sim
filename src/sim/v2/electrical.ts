/**
 * Engine v2 electrical model (Phase 4b, part 1): simplified load flow and protection on top of the
 * power solver's energized paths and kW. Labeled "simplified, not a load-flow or coordination study".
 *
 * Adds, per component: voltage, kW, kVA, power factor, line current and per-phase currents,
 * phase imbalance %, loading % of nameplate; per transformer: temperature rise with a time lag;
 * per breaker: inverse-time protection with thermal memory that trips a breaker held in overload.
 *
 * Simplifications (stated so nobody mistakes this for a study):
 *   - power factor comes from the mix of loads a component feeds (IT, VFD motors), and a
 *     double-conversion UPS presents its own input PF upstream unless it is on static bypass;
 *   - each rack has a small seeded phase skew (realistic, not measured); mechanical loads are balanced;
 *   - nameplate ratings are treated as kVA ratings; voltage drop is ignored;
 *   - every formula is in physics.ts.
 */
import type { Simulation } from '../engine';
import { approach, breakerTripTimeS, ELEC, kvaOf, kvarOf, lineAmps, phaseImbalancePct, transformerRiseC } from '../physics';
import type { Component } from '../types';
import type { Rng } from './rng';

/** Per-phase load shares (sum to 1). */
export type PhaseSplit = [number, number, number];

export interface ElecReading {
  id: string;
  volts: number;
  kw: number;
  kva: number;
  pf: number;
  amps: number;
  phaseAmps: PhaseSplit;
  imbalancePct: number;
  /** kVA ÷ nameplate (0 when no rating). */
  loading: number;
}

export interface ElecState {
  /** Rack id → phase split (seeded once). */
  split: Record<string, PhaseSplit>;
  /** Transformer id → present winding rise (°C). */
  txRise: Record<string, number>;
  /** Breaker id → long-time thermal memory, 0 (cold) to 1 (trip). */
  heat: Record<string, number>;
}

const MV_KINDS = new Set<Component['kind']>(['utility', 'mv-switchgear']);
/** Motor-driven mechanical loads (VFD power factor, balanced phases). */
const MOTOR_KINDS = new Set<Component['kind']>(['chiller-water-cooled', 'chiller-air-cooled', 'cooling-tower', 'dry-cooler', 'pump-chw', 'pump-cw', 'crah', 'crac', 'cdu', 'doas']);

export class ElectricalModel {
  state: ElecState = { split: {}, txRise: {}, heat: {} };
  /** Static per-plant data, rebuilt on demand (graph shape never changes during a run). */
  private volts = new Map<string, number>();
  private pfMix = new Map<string, number>();

  /** Seed per-rack phase splits from the engine's Rng (deterministic for a given seed). */
  init(sim: Simulation, rng: Rng): void {
    for (const r of sim.graph.byKind('rack')) {
      const k = ELEC.rackPhaseSkew;
      const a = 1 + (rng.next() * 2 - 1) * k;
      const b = 1 + (rng.next() * 2 - 1) * k;
      const c = Math.max(0.01, 3 - a - b);
      this.state.split[r.id] = [a / 3, b / 3, c / 3];
    }
    for (const t of sim.graph.byKind('transformer')) this.state.txRise[t.id] = 0;
    for (const b of sim.graph.byKind('breaker')) this.state.heat[b.id] = 0;
    this.prepare(sim);
    // Start transformers at their steady-state rise for the starting load.
    for (const t of sim.graph.byKind('transformer')) this.state.txRise[t.id] = transformerRiseC(this.read(sim, t.id).loading);
  }

  /** Voltage and PF-mix lookups (cached per plant). */
  private prepare(sim: Simulation): void {
    if (this.volts.size) return;
    const g = sim.graph;
    const voltOf = (id: string, seen = new Set<string>()): number => {
      if (this.volts.has(id)) return this.volts.get(id)!;
      const n = g.get(id);
      let v: number = ELEC.lvVolts;
      if (MV_KINDS.has(n.kind)) v = ELEC.mvVolts;
      else if (n.kind === 'rack' || n.kind === 'rpp' || n.kind === 'busway') v = ELEC.rackVolts;
      else if (n.kind !== 'pdu' && n.kind !== 'transformer' && n.kind !== 'generator') {
        // Inherit from the feeder: below a PDU is rack voltage, otherwise LV.
        seen.add(id);
        const up = g.upstream(id, 'power').find((u) => !seen.has(u.id));
        if (up) v = up.kind === 'pdu' ? ELEC.rackVolts : Math.min(ELEC.lvVolts, voltOf(up.id, seen));
      }
      this.volts.set(id, v);
      return v;
    };
    for (const n of g.nodes.values()) voltOf(n.id);
  }

  /**
   * Power factor at a component: kW-weighted mix of the loads below it. A UPS (not on bypass) shows
   * its own input PF to everything upstream. Static per design, so cached by UPS-mode signature.
   */
  private pfAt(sim: Simulation, id: string): number {
    const sig = `${id}|${[...sim.solution.upsMode.values()].join(',')}`;
    const hit = this.pfMix.get(sig);
    if (hit !== undefined) return hit;
    const g = sim.graph;
    let kw = 0;
    let kvar = 0;
    const seen = new Set<string>();
    const walk = (nid: string) => {
      if (seen.has(nid)) return;
      seen.add(nid);
      const n = g.get(nid);
      const demand = n.state.demandKw ?? n.state.baseKw ?? 0;
      if (nid !== id && n.kind === 'ups' && sim.solution.upsMode.get(nid) !== 'static-bypass') {
        const below = Math.max(1, n.ratedKw);
        kw += below;
        kvar += kvarOf(below, ELEC.pfUpsInput);
        return;
      }
      if (n.kind === 'rack' || MOTOR_KINDS.has(n.kind)) {
        const pf = n.kind === 'rack' ? ELEC.pfIt : ELEC.pfMotorVfd;
        kw += demand;
        kvar += kvarOf(demand, pf);
        return;
      }
      for (const d of g.downstream(nid, 'power')) walk(d.id);
    };
    walk(id);
    const pf = kw > 0 ? kw / Math.hypot(kw, kvar) : 1;
    this.pfMix.set(sig, pf);
    return pf;
  }

  /** Per-phase shares at a component: kW-weighted mean of the rack splits below it (motors balanced). */
  private splitAt(sim: Simulation, id: string): PhaseSplit {
    const n = sim.graph.get(id);
    if (n.kind === 'rack') return this.state.split[id] ?? [1 / 3, 1 / 3, 1 / 3];
    const g = sim.graph;
    const acc: PhaseSplit = [0, 0, 0];
    let total = 0;
    const seen = new Set<string>();
    const walk = (nid: string) => {
      if (seen.has(nid)) return;
      seen.add(nid);
      const c = g.get(nid);
      if (c.kind === 'rack') {
        const w = sim.solution.loadKw.get(nid) ?? c.state.demandKw ?? 0;
        const s = this.state.split[nid] ?? [1 / 3, 1 / 3, 1 / 3];
        acc[0] += w * s[0];
        acc[1] += w * s[1];
        acc[2] += w * s[2];
        total += w;
        return;
      }
      if (MOTOR_KINDS.has(c.kind)) {
        const w = c.state.demandKw ?? 0;
        acc[0] += w / 3;
        acc[1] += w / 3;
        acc[2] += w / 3;
        total += w;
        return;
      }
      for (const d of g.downstream(nid, 'power')) walk(d.id);
    };
    walk(id);
    return total > 0 ? [acc[0] / total, acc[1] / total, acc[2] / total] : [1 / 3, 1 / 3, 1 / 3];
  }

  /** Live reading for one component. */
  read(sim: Simulation, id: string): ElecReading {
    this.prepare(sim);
    const n = sim.graph.get(id);
    const volts = this.volts.get(id) ?? ELEC.lvVolts;
    const kw = sim.solution.energized.has(id) ? Math.max(0, sim.solution.loadKw.get(id) ?? 0) : 0;
    const pf = kw > 0 ? this.pfAt(sim, id) : 1;
    const kva = kvaOf(kw, pf);
    const amps = lineAmps(kva, volts);
    const s = this.splitAt(sim, id);
    // Balanced current is amps on every phase; a skewed split scales each phase by 3 × its share.
    const phaseAmps: PhaseSplit = [amps * 3 * s[0], amps * 3 * s[1], amps * 3 * s[2]];
    return { id, volts, kw, kva, pf, amps, phaseAmps, imbalancePct: phaseImbalancePct(...phaseAmps), loading: n.ratedKw > 0 ? kva / n.ratedKw : 0 };
  }

  /**
   * One tick: transformer temperatures follow their load with a lag; every closed breaker's thermal
   * memory heats while loaded above pickup (by dt / trip time) and cools otherwise; a breaker that
   * reaches 1 trips. Short-time and instantaneous currents trip within this tick (≤ 1 s).
   */
  step(sim: Simulation, dtS: number): void {
    for (const t of sim.graph.byKind('transformer')) {
      const target = transformerRiseC(this.read(sim, t.id).loading);
      this.state.txRise[t.id] = approach(this.state.txRise[t.id] ?? 0, target, dtS, ELEC.txTauS);
    }
    for (const b of sim.graph.byKind('breaker')) {
      if (!b.state.closed || !b.ratedKw) {
        this.state.heat[b.id] = 0;
        continue;
      }
      // Multiple of pickup: phase-worst current against the rated current at this voltage.
      const r = this.read(sim, b.id);
      const ratedAmps = lineAmps(b.ratedKw, r.volts);
      const worst = Math.max(...r.phaseAmps);
      const m = ratedAmps > 0 ? worst / (ratedAmps * ELEC.ltPickup) : 0;
      const tTrip = breakerTripTimeS(m);
      let h = this.state.heat[b.id] ?? 0;
      if (Number.isFinite(tTrip)) h += dtS / Math.max(1e-3, tTrip);
      else h = approach(h, 0, dtS, ELEC.ltCoolTauS);
      this.state.heat[b.id] = h;
      if (h >= 1) {
        const zone = m >= ELEC.instPickup ? 'instantaneous' : m >= ELEC.stPickup ? 'short time' : `long time overload at ${Math.round(m * 100)}% of pickup`;
        this.state.heat[b.id] = 0;
        sim.tripBreaker(b.id, zone);
      }
    }
  }

  /** Transformer temperature (°C) = ambient + present rise. */
  txTempC(id: string): number {
    return ELEC.txAmbientC + (this.state.txRise[id] ?? 0);
  }

  /** Seconds until a breaker trips at its present load (Infinity if it won't). */
  secondsToTrip(sim: Simulation, id: string): number {
    const b = sim.graph.get(id);
    if (b.kind !== 'breaker' || !b.state.closed || !b.ratedKw) return Infinity;
    const r = this.read(sim, id);
    const m = Math.max(...r.phaseAmps) / (lineAmps(b.ratedKw, r.volts) * ELEC.ltPickup);
    const t = breakerTripTimeS(m);
    return Number.isFinite(t) ? Math.max(0, (1 - (this.state.heat[id] ?? 0)) * t) : Infinity;
  }

  snapshot(): ElecState {
    return JSON.parse(JSON.stringify(this.state)) as ElecState;
  }

  restore(s: ElecState): void {
    this.state = JSON.parse(JSON.stringify(s)) as ElecState;
  }
}
