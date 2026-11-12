/**
 * Engine v2 air side (Phase 4c part 1): lumped air nodes for the data hall, CRAH coils and fans,
 * containment, blanking panels and perforated tiles. Labeled "simplified, not a CFD model".
 *
 * Five nodes, each a lumped temperature with its own thermal mass (air + the metal it touches):
 *
 *   CRAH coil + fan ──► cold aisle ──► rack inlet ──► rack outlet ──► hot aisle ──► room / return ──► CRAH
 *                          │  bypass ─────────────────────────────────────────────────►│
 *                          │            ▲ leak (hot air back over/through racks)  │     │
 *                                       └──────────────────────────────────────────┘     │
 *                                       ▲ starved cold aisle: racks pull room air ◄──────┘
 *
 * Each tick (fixed 1 s) the airflows are worked out first (IT fans, CRAH fans, tiles), then every
 * node relaxes toward its mixed steady state with the exact step T += (Tss − T)(1 − e^(−dt/τ)),
 * τ = C / (ṁ·cp). If any dt/τ > 1 the tick is split into sub-steps so dt/τ ≤ 1 always holds.
 *
 * Reads the v1 plant (rack heat, CRAHs running, chilled water supply and
 * flow). It owns the rack-inlet trip and the hall inlet every screen reads (switched 2026-11-08 after the
 * parity test; the v1 shadow mode was retired 2026-11-09).
 * Every formula is in physics.ts.
 */
import type { Simulation } from '../engine';
import {
  AIR,
  affinity,
  airPaths,
  type AshraeClass,
  coilEffectiveness,
  coilMaxKw,
  type ContainmentMode,
  heatFlowKw,
  inletClassBand,
  type InletClassBand,
  massFlowForKw,
  nodeTauS,
  PHYSICS,
  relaxExact,
} from '../physics';
import type { ActionResult } from '../types';
import { ROWS } from '../plant/builder';
import { gapRacks, rackInletC, rackRecircWeights, RACKHEAT, type CrahSpot, type RackSpot } from '../physics';

export type AirNode = 'cold' | 'rackIn' | 'rackOut' | 'hot' | 'room';
export const AIR_NODES: readonly AirNode[] = ['cold', 'rackIn', 'rackOut', 'hot', 'room'];

export interface AirState {
  temps: Record<AirNode, number>;
  containment: ContainmentMode;
  /** Share of blanking panels missing, 0–1. */
  blankingMissing: number;
  /** Perforated-tile open area ÷ what the IT needs (1 = matched). */
  tileRatio: number;
  cls: AshraeClass;
  /** Design IT airflow (kg/s), fixed at start: what the tiles were laid out for. */
  itDesignKgS: number;
  /** Hall trip latch (rack inlet above the server shutdown temperature). */
  tripped: boolean;
  /** Sim time of the last trip / clear. */
  tripAt: number | null;
  clearAt: number | null;
  /** Fan speed the cooling call asks for (valve wide open → fans ramp up); follows with a lag. */
  coolSpeed: number;
}

/** Everything worked out for one tick (also the readout). */
export interface AirReading {
  temps: Record<AirNode, number>;
  itHeatKw: number;
  fanKw: number;
  coilKw: number;
  coilMaxKw: number;
  /** Chilled water through all running CRAH coils (kg/s) at the design water ΔT. */
  coilWaterKgS: number;
  itAirKgS: number;
  crahAirKgS: number;
  crahsRunning: number;
  fanSpeed: number;
  /** Effective recirculation (share of IT intake that is not CRAH supply air) and bypass. */
  recirc: number;
  bypass: number;
  supplyC: number;
  inletBand: InletClassBand;
  tripped: boolean;
}

/** Per-rack inlet temperatures (Phase 8b): middle and top of each rack, and the hottest top. */
export interface RackHeat {
  racks: Record<string, { mid: number; top: number }>;
  hottest: { id: string; topC: number } | null;
}

interface Flows {
  /** IT heat into the air (kW) and IT fan airflow (kg/s). */
  heat: number;
  it: number;
  /** Air through the racks: IT fans, or a little pushed through idle racks by the CRAHs. */
  rack: number;
  crah: number;
  leak: number;
  starve: number;
  coldUsed: number;
  byp: number;
  roomIn: number;
  hotToRoom: number;
  fanKw: number;
  speed: number;
  n: number;
}

const MAX_SUBSTEPS = 50;

export class AirsideModel {
  state: AirState = {
    temps: { cold: 23.6, rackIn: 24, rackOut: 36, hot: 36, room: 35 },
    containment: 'full',
    blankingMissing: 0,
    tileRatio: 1,
    cls: 'A1',
    itDesignKgS: 0,
    tripped: false,
    tripAt: null,
    clearAt: null,
    coolSpeed: 0,
  };
  reading!: AirReading;
  /** Sub-steps used in the last tick (tests check dt/τ ≤ 1 per sub-step). */
  lastSubsteps = 1;
  lastMaxDtOverTau = 0;

  init(sim: Simulation): void {
    sim.thermal.hallTripExternal = true;
    this.state.itDesignKgS = massFlowForKw(this.itHeatKw(sim), AIR.cpKj, AIR.itDeltaTK);
    this.settle(sim);
  }

  /** Jump straight to the steady state for the present plant (start-up, tests). */
  settle(sim: Simulation): void {
    let f = this.flows(sim);
    for (let i = 0; i < 2000; i++) {
      if (i % 50 === 0) {
        this.state.coolSpeed = this.coolingSpeed(sim);
        f = this.flows(sim);
      }
      const next = this.targets(sim, f).tss;
      let moved = 0;
      for (const k of AIR_NODES) {
        moved = Math.max(moved, Math.abs(next[k] - this.state.temps[k]));
        this.state.temps[k] = next[k];
      }
      if (moved < 1e-9) break;
    }
    this.reading = this.read(sim, f);
    this.rackHeat = this.computeRackHeat(sim);
    if (sim.thermal.readout) sim.thermal.readout.rackInlets = this.rackHeat.racks;
  }

  /** Chilled water the coils see: from the v2 hydronic model when it is switched in, else v1 thermal. */
  chw: { supplyC: number; flowFrac: number } | null = null;

  private chwIn(sim: Simulation): { supplyC: number; flowFrac: number } {
    return this.chw ?? { supplyC: sim.thermal.state.chwSupplyC, flowFrac: sim.thermal.readout?.chwFlowFraction ?? 1 };
  }

  // --- Inputs from the plant ---------------------------------------------------------------------

  /** Heat the air side has to carry: powered, running racks; GPU racks send most heat to liquid. */
  itHeatKw(sim: Simulation): number {
    let kw = 0;
    for (const r of sim.graph.byKind('rack')) {
      if (!sim.solution.energized.has(r.id) || r.state.thermalTrip) continue;
      const heat = r.state.demandKw ?? 0;
      kw += r.highDensity ? heat * (1 - PHYSICS.gpuLiquidFraction) : heat;
    }
    return kw;
  }

  private crahsRunning(sim: Simulation): number {
    return sim.graph
      .byKind('crah')
      .filter((n) => (n.status === 'online' || n.status === 'standby') && sim.solution.energized.has(n.id)).length;
  }

  /** Airflows for this tick (fixed for the tick; temperatures don't change them). */
  private flows(sim: Simulation): Flows {
    const st = this.state;
    const heat = this.itHeatKw(sim);
    const it = massFlowForKw(heat, AIR.cpKj, AIR.itDeltaTK);
    const n = this.crahsRunning(sim);
    const { recirc, bypass } = airPaths(st.containment, st.blankingMissing, st.tileRatio);
    // Fans hold the cold-aisle pressure (supply what the IT draws plus a margin, plus what bypasses),
    // or run faster when the coils need more air to carry the heat (valve-then-fan), whichever is higher.
    const want = (it * (1 + AIR.airflowMargin)) / (1 - bypass);
    const speed = n > 0 ? Math.min(1, Math.max(AIR.crahMinSpeed, want / (n * AIR.crahDesignKgS), st.coolSpeed)) : 0;
    const crah = n * AIR.crahDesignKgS * affinity(speed).flow;
    const fanKw = n * AIR.crahFanKw * affinity(speed).power;
    // Cold air that reaches rack fronts: limited by bypass and by the tiles' open area.
    const tileCap = st.tileRatio * st.itDesignKgS * (1 + AIR.airflowMargin);
    const delivered = Math.min(crah * (1 - bypass), tileCap);
    const rack = Math.max(it, crah > 0 ? Math.min(crah, AIR.idleRackFlow * st.itDesignKgS) : 0);
    const leak = recirc * rack;
    const starve = Math.max(0, rack - leak - delivered);
    const coldUsed = Math.max(0, rack - leak - starve);
    const byp = Math.max(0, crah - coldUsed);
    const hotToRoom = rack - leak;
    return { heat, it, rack, crah, leak, starve, coldUsed, byp, roomIn: hotToRoom + byp, hotToRoom, fanKw, speed, n };
  }

  /** Coil duty and each node's steady state for the present temperatures. */
  private targets(sim: Simulation, f: Flows): { tss: Record<AirNode, number>; coil: number; coilMax: number; supply: number } {
    const T = this.state.temps;
    const cp = AIR.cpKj;
    const { supplyC: chws, flowFrac: chwFlow } = this.chwIn(sim);
    const water = chwFlow;
    const ret = T.room;
    let coil = 0;
    let coilMax = 0;
    let supply = ret;
    let fanRise = 0;
    if (f.crah > 0) {
      fanRise = f.fanKw / heatFlowKw(f.crah, cp, 1);
      coilMax = coilMaxKw(coilEffectiveness(f.speed), f.crah, ret, chws) * Math.min(1, Math.max(0, water));
      // Valve holds the rack inlet at setpoint: supply cold enough to offset the hot air mixed in.
      let coldTarget = AIR.inletSetpointC;
      if (f.coldUsed > 1e-9) coldTarget = (AIR.inletSetpointC * f.rack - f.leak * T.hot - f.starve * T.room) / f.coldUsed;
      const supplyTarget = Math.max(chws + AIR.coilApproachK, coldTarget - fanRise);
      const wanted = Math.max(0, heatFlowKw(f.crah, cp, ret - supplyTarget));
      coil = Math.min(coilMax, wanted);
      supply = ret - coil / heatFlowKw(f.crah, cp, 1);
    }
    const tss: Record<AirNode, number> = { ...T };
    if (f.crah > 0) tss.cold = supply + fanRise;
    if (f.rack > 0) {
      tss.rackIn = (f.coldUsed * T.cold + f.leak * T.hot + f.starve * T.room) / f.rack;
      tss.rackOut = T.rackIn + f.heat / heatFlowKw(f.rack, AIR.cpKj, 1);
      tss.hot = T.rackOut;
    }
    if (f.roomIn > 1e-9) tss.room = (f.hotToRoom * T.hot + f.byp * T.cold) / f.roomIn;
    return { tss, coil, coilMax, supply };
  }

  private taus(f: Flows): Record<AirNode, number> {
    const m = AIR.massKjPerK;
    return {
      cold: nodeTauS(m.cold, f.crah),
      rackIn: nodeTauS(m.rackIn, f.rack),
      rackOut: nodeTauS(m.rackOut, f.rack),
      hot: nodeTauS(m.hot, f.rack),
      room: nodeTauS(m.room, f.roomIn),
    };
  }

  // --- Tick ----------------------------------------------------------------------------------------

  /**
   * Lowest fan speed whose coil capacity covers the heat load (IT + fans) with a margin, at the
   * present return air and chilled water (bisection; capacity rises with speed).
   */
  private coolingSpeed(sim: Simulation): number {
    const n = this.crahsRunning(sim);
    if (n === 0) return 0;
    const { supplyC: chws, flowFrac: chwFlow } = this.chwIn(sim);
    const water = Math.min(1, Math.max(0, chwFlow));
    const ret = this.state.temps.room;
    // Fan heat at the present cooling call (from state only, so a restored snapshot gives the same answer).
    const fanKw = n * AIR.crahFanKw * affinity(Math.max(AIR.crahMinSpeed, this.state.coolSpeed)).power;
    const need = (this.itHeatKw(sim) + fanKw) * (1 + AIR.coilMargin);
    const cap = (s: number) => coilMaxKw(coilEffectiveness(s), n * AIR.crahDesignKgS * s, ret, chws) * water;
    if (cap(1) <= need) return 1;
    let lo: number = AIR.crahMinSpeed;
    if (cap(lo) >= need) return lo;
    let hi = 1;
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2;
      if (cap(mid) >= need) hi = mid;
      else lo = mid;
    }
    return hi;
  }

  step(sim: Simulation, dt: number): void {
    sim.thermal.hallTripExternal = true;
    if (!(dt > 0)) return;
    this.state.coolSpeed = relaxExact(this.state.coolSpeed, this.coolingSpeed(sim), dt, AIR.fanRampTauS);
    const f = this.flows(sim);
    const tau = this.taus(f);
    const minTau = Math.min(...AIR_NODES.map((k) => tau[k]));
    const n = Math.min(MAX_SUBSTEPS, Math.max(1, Math.ceil(dt / minTau)));
    const h = dt / n;
    this.lastSubsteps = n;
    this.lastMaxDtOverTau = Number.isFinite(minTau) ? h / minTau : 0;
    for (let i = 0; i < n; i++) {
      const { tss } = this.targets(sim, f);
      for (const k of AIR_NODES) this.state.temps[k] = relaxExact(this.state.temps[k], tss[k], h, tau[k]);
    }
    this.reading = this.read(sim, f);
    this.trips(sim);
    this.publish(sim);
  }

  private read(sim: Simulation, f: Flows): AirReading {
    const { coil, coilMax, supply } = this.targets(sim, f);
    const T = { ...this.state.temps };
    return {
      temps: T,
      itHeatKw: f.heat,
      fanKw: f.fanKw,
      coilKw: coil,
      coilMaxKw: coilMax,
      coilWaterKgS: massFlowForKw(coil, AIR.waterCpKj, AIR.coilWaterDeltaTK),
      itAirKgS: f.it,
      crahAirKgS: f.crah,
      crahsRunning: f.n,
      fanSpeed: f.speed,
      recirc: f.rack > 0 ? (f.leak + f.starve) / f.rack : 0,
      bypass: f.crah > 0 ? f.byp / f.crah : 0,
      supplyC: supply,
      inletBand: inletClassBand(T.rackIn, this.state.cls),
      tripped: this.state.tripped,
    };
  }

  /** Rack-inlet over-temperature: same thresholds and messages as v1 (server shutdown 40 °C, clear below 27 °C). */
  private trips(sim: Simulation): void {
    const st = this.state;
    const inlet = st.temps.rackIn;
    if (!st.tripped && inlet > PHYSICS.serverShutdownC) {
      st.tripped = true;
      st.tripAt = sim.t;
      sim.thermal.state.hallTripped = true;
      for (const r of sim.graph.byKind('rack')) {
        if (!r.state.thermalTrip && sim.solution.energized.has(r.id)) {
          r.state.thermalTrip = true;
          sim.log('critical', r.tag, `${r.tag} thermal shutdown (inlet ${Math.round((inlet * 9) / 5 + 32)} °F).`);
        }
      }
    } else if (st.tripped && inlet < PHYSICS.ashraeRecommendedC[1]) {
      st.tripped = false;
      st.clearAt = sim.t;
      sim.thermal.state.hallTripped = false;
      const gpuTripped = (rackNum: number) => sim.thermal.state.gpu[Math.ceil(rackNum / 4)]?.tripped;
      for (const r of sim.graph.byKind('rack')) {
        if (r.state.thermalTrip && !(r.highDensity && gpuTripped(Number(r.id.slice(2))))) r.state.thermalTrip = false;
      }
      sim.log('info', 'BMS', 'Hall inlet temperatures back in range. Air-cooled IT can be restarted.');
    }
  }

  // --- Scenario switches (typed actions) --------------------------------------------------------

  setContainment(mode: ContainmentMode): ActionResult {
    if (!(mode in AIR.containment)) return { ok: false, reason: 'Unknown containment state.' };
    this.state.containment = mode;
    return { ok: true };
  }

  setBlanking(missing: number): ActionResult {
    if (!(Number.isFinite(missing) && missing >= 0 && missing <= 1)) return { ok: false, reason: 'Missing blanking share must be 0–1.' };
    this.state.blankingMissing = missing;
    return { ok: true };
  }

  setTiles(ratio: number): ActionResult {
    if (!(Number.isFinite(ratio) && ratio >= 0.2 && ratio <= 3)) return { ok: false, reason: 'Tile open-area ratio must be 0.2–3.' };
    this.state.tileRatio = ratio;
    return { ok: true };
  }

  /** Per-rack inlets from the last tick (Phase 8b). */
  rackHeat: RackHeat = { racks: {}, hottest: null };

  /** When v2 owns trips, the hall inlet every screen reads (v1 readout) is the v2 rack inlet. */
  private publish(sim: Simulation): void {
    const inlet = this.state.temps.rackIn;
    sim.thermal.state.hallInletC = inlet;
    this.rackHeat = this.computeRackHeat(sim);
    if (sim.thermal.readout) {
      sim.thermal.readout.hallInletC = inlet;
      sim.thermal.readout.rackInlets = this.rackHeat.racks;
    }
  }

  /** Rack layout and CRAH placement, built once; gap racks rebuilt only when the blanking share changes. */
  private layout: { spots: (RackSpot & { id: string; num: number })[]; crahIds: string[]; crahs: CrahSpot[]; gapFor: number; key: string } | null = null;

  /** Spread the lumped rack inlet over the racks (weights average 1; see physics rackRecircWeights). */
  private computeRackHeat(sim: Simulation): RackHeat {
    const g = sim.graph;
    if (!this.layout) {
      const pad = (n: number) => String(n).padStart(2, '0');
      const spots: (RackSpot & { id: string; num: number })[] = [];
      ROWS.forEach((row, ri) => {
        const list = [...row.dual, ...row.single];
        list.forEach((num, slot) => {
          const id = `R-${pad(num)}`;
          if (g.nodes.has(id)) spots.push({ id, num, row: ri, slot, perRow: list.length, rows: ROWS.length, gap: false });
        });
      });
      const crahIds = g.byKind('crah').map((c) => c.id).sort((a, b) => a.localeCompare(b));
      const perSide = Math.max(1, Math.ceil(crahIds.length / 2));
      const crahs: CrahSpot[] = crahIds.map((_, i) => ({ side: i % 2 === 0 ? -1 : 1, pos: perSide > 1 ? Math.floor(i / 2) / (perSide - 1) : 0.5, down: false }));
      this.layout = { spots, crahIds, crahs, gapFor: -1, key: '' };
    }
    const L = this.layout;
    if (L.gapFor !== this.state.blankingMissing) {
      const gaps = gapRacks(L.spots.map((x) => x.num), this.state.blankingMissing);
      for (const x of L.spots) x.gap = gaps.has(x.num);
      L.gapFor = this.state.blankingMissing;
      L.key = '';
    }
    let key = `${this.state.containment}|${L.gapFor}|`;
    L.crahIds.forEach((id, i) => {
      const c = g.get(id);
      const down = !(c.status === 'online' && sim.solution.energized.has(id));
      L.crahs[i]!.down = down;
      key += down ? '1' : '0';
    });
    // Weights only change with containment, blanking or CRAH status: reuse them otherwise.
    if (key !== L.key) {
      this.weights = rackRecircWeights(L.spots, L.crahs, this.state.containment);
      L.key = key;
    }
    const racks: RackHeat['racks'] = {};
    let hottest: RackHeat['hottest'] = null;
    const cold = this.state.temps.cold;
    const lumped = this.state.temps.rackIn;
    L.spots.forEach((r, i) => {
      const t = rackInletC(cold, lumped, this.weights[i]!);
      racks[r.id] = t;
      if (!hottest || t.top > hottest.topC) hottest = { id: r.id, topC: t.top };
    });
    return { racks, hottest };
  }
  private weights: number[] = [];

  /** Recompute per-rack heat now (after a restore, before the next tick). */
  refreshRackHeat(sim: Simulation): void {
    // After a restore the reading still comes from the freshly built plant: work it out from the restored state.
    this.reading = this.read(sim, this.flows(sim));
    this.rackHeat = this.computeRackHeat(sim);
    if (sim.thermal.readout) sim.thermal.readout.rackInlets = this.rackHeat.racks;
  }

  /** Hot-spot check for the alarm list: hottest rack top above the recommended maximum. */
  get hotspot(): { id: string; topC: number } | null {
    const h = this.rackHeat.hottest;
    return h && h.topC > RACKHEAT.hotspotC ? h : null;
  }

  snapshot(): AirState {
    return JSON.parse(JSON.stringify(this.state)) as AirState;
  }

  restore(s: AirState): void {
    this.state = JSON.parse(JSON.stringify(s)) as AirState;
  }
}
