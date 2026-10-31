/**
 * thermal.ts: mechanical plant and thermal model.
 *
 * Runs once per simulation step, after the electrical solve. It acts like
 * a simplified BMS: stages chillers and pumps, uses free cooling when the
 * weather allows, discharges the chilled water tank when the plant falls
 * short, and tracks how hot the data hall, the GPU rows, and the UPS room
 * get. It also writes each mechanical unit's live kW back onto the graph,
 * so the next electrical solve (and PUE) sees the real mechanical load.
 *
 * Every formula and constant lives in physics.ts.
 */

import type { PlantGraph } from './graph';
import {
  airCooledDerate,
  chillerCop,
  classifyHumidity,
  crahCapacityFactor,
  dewPointC,
  doasLeavingDewPointC,
  economizerFraction,
  PHYSICS,
  relativeHumidity,
  stepTemp,
  towerLeavingLoadedC,
  wetBulbC,
} from './physics';
import type { PowerSolution } from './power';
import type { Component, Severity } from './types';

// ---------------------------------------------------------------------------
// Weather presets
// ---------------------------------------------------------------------------

export type WeatherId = 'winter' | 'mild' | 'hot-dry' | 'hot-humid';

export const WEATHER: Record<WeatherId, { label: string; dryBulbC: number; rh: number }> = {
  winter: { label: 'Cold winter night', dryBulbC: 0, rh: 70 },
  mild: { label: 'Mild 75 °F day', dryBulbC: 24, rh: 50 },
  'hot-dry': { label: '105 °F afternoon', dryBulbC: 40.6, rh: 35 },
  'hot-humid': { label: '97 °F humid day', dryBulbC: 36, rh: 55 },
};

// ---------------------------------------------------------------------------
// Fixed plant ratings (kWt). Unit tags come from the plant builder.
// ---------------------------------------------------------------------------

const CHILLER_ORDER = ['CH-01', 'CH-02', 'CH-03', 'ACH-04'];
const WC_CHILLER_KWT = 1400;
const AC_CHILLER_KWT = 900;
const CHWP_KWT = 1400; // heat a CHW pump's flow can carry at design delta-T
const TOWER_KWT = 1800;
const CRAH_KWT = 150;
const CDU_KWT = 700;
const CRAC_KWT = 70;
const DOAS_COIL_KWT = 60;
const GPU_ROWS = [1, 2, 3];

type ChillerMode = 'off' | 'starting' | 'running';

/** Snapshot the UI reads after every step. */
export interface ThermalReadout {
  weatherLabel: string;
  dryBulbC: number;
  wetBulbC: number;
  outdoorDewC: number;
  economizer: 'full' | 'partial' | 'off';
  economizerKwt: number;
  loadKwt: number;
  chillerKwt: number;
  chillerCapacityKwt: number;
  chillers: Record<string, ChillerMode>;
  chillerTimers: Record<string, number>;
  condenserC: number;
  towerLoad: number;
  chwSupplyC: number;
  chwReturnC: number;
  chwFlowFraction: number;
  tesSoc: number;
  tesMinutes: number;
  tesDischargeKwt: number;
  airHeatKwt: number;
  airCoolingKwt: number;
  hallInletC: number;
  hallDewC: number;
  hallRh: number;
  hallHumidity: 'ok' | 'too-dry' | 'too-humid';
  hallPressurePa: number;
  doasOn: boolean;
  upsRoomC: number;
  gpuRows: { row: number; cduOk: boolean; tempC: number; throttled: boolean; tripped: boolean }[];
  mechanicalKw: number;
  /** Mechanical units that are running right now (for diagram animation). */
  running: string[];
  history: { t: number; inletC: number; chwC: number }[];
}

interface State {
  weather: WeatherId;
  chillers: Record<string, { mode: ChillerMode; timer: number }>;
  chwSupplyC: number;
  tesKj: number;
  hallInletC: number;
  hallTripped: boolean;
  gpu: Record<number, { tempC: number; throttled: boolean; tripped: boolean }>;
  hallDewC: number;
  upsRoomC: number;
  history: { t: number; inletC: number; chwC: number }[];
  flags: Record<string, boolean>;
  lastSample: number;
}

/** What the thermal model needs from the simulation. */
export interface ThermalHost {
  graph: PlantGraph;
  solution: PowerSolution;
  t: number;
  log(severity: Severity, source: string, message: string): void;
}

const TES_FULL_KJ = PHYSICS.tesLitres * PHYSICS.waterCpKj * PHYSICS.chwDeltaTC;

const fmtF = (c: number) => `${Math.round((c * 9) / 5 + 32)} °F`;

export class ThermalPlant {
  state: State;
  readout!: ThermalReadout;

  constructor(private host: ThermalHost, weather: WeatherId = 'mild') {
    const outDew = dewPointC(WEATHER[weather].dryBulbC, WEATHER[weather].rh);
    this.state = {
      weather,
      chillers: Object.fromEntries(CHILLER_ORDER.map((id) => [id, { mode: 'off' as ChillerMode, timer: 0 }])),
      chwSupplyC: PHYSICS.chwSupplyC,
      tesKj: TES_FULL_KJ,
      hallInletC: PHYSICS.supplyAirC,
      hallTripped: false,
      gpu: Object.fromEntries(GPU_ROWS.map((r) => [r, { tempC: PHYSICS.gpuNormalC, throttled: false, tripped: false }])),
      hallDewC: doasLeavingDewPointC(outDew, PHYSICS.doasCoilLeavingC),
      upsRoomC: 24,
      history: [],
      flags: {},
      lastSample: -Infinity,
    };
  }

  /** Bring the plant to a steady running state at t=0 (no start delays). */
  init(): void {
    this.step(0, true);
  }

  /** Deep copy of the state, for what-if clones. */
  snapshot(): State {
    return JSON.parse(JSON.stringify({ ...this.state, lastSample: this.state.lastSample === -Infinity ? null : this.state.lastSample })) as State;
  }

  restore(s: State): void {
    this.state = { ...s, lastSample: s.lastSample ?? -Infinity };
  }

  setWeather(w: WeatherId): void {
    this.state.weather = w;
    this.host.log('info', 'BMS', `Outdoor conditions now: ${WEATHER[w].label}.`);
  }

  // -------------------------------------------------------------------------

  private avail(id: string): boolean {
    const g = this.host.graph;
    if (!g.nodes.has(id)) return false;
    const n = g.get(id);
    return (n.status === 'online' || n.status === 'standby') && this.host.solution.energized.has(id);
  }

  /** Log once per condition until it clears. */
  private once(flag: string, active: boolean, severity: Severity, source: string, message: string, clearMsg?: string): void {
    const was = !!this.state.flags[flag];
    if (active && !was) this.host.log(severity, source, message);
    if (!active && was && clearMsg) this.host.log('info', source, clearMsg);
    this.state.flags[flag] = active;
  }

  private trip(n: Component, why: string): void {
    n.status = 'failed';
    this.state.chillers[n.id] = { mode: 'off', timer: 0 };
    this.host.log('critical', n.tag, `${n.tag} TRIPPED: ${why}. Needs investigation and a manual reset (Restore).`);
  }

  step(dt: number, initial = false): void {
    const st = this.state;
    const g = this.host.graph;
    const t = this.host.t;
    const P = PHYSICS;
    const w = WEATHER[st.weather];
    const wb = wetBulbC(w.dryBulbC, w.rh);
    const outDew = dewPointC(w.dryBulbC, w.rh);
    const ids = (kind: Component['kind']) => g.byKind(kind).map((n) => n.id);
    const okList = (kind: Component['kind']) => ids(kind).filter((id) => this.avail(id));

    // --- Heat from IT -------------------------------------------------------
    let airHeat = 0;
    const liqHeat: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
    const rowOf = (rackNum: number) => Math.ceil(rackNum / 4); // GPU racks R-01..R-12 → rows 1..3
    for (const r of g.byKind('rack')) {
      const powered = this.host.solution.energized.has(r.id) && !r.state.thermalTrip;
      const heat = powered ? r.state.demandKw ?? 0 : 0;
      if (r.highDensity) {
        liqHeat[rowOf(Number(r.id.slice(2)))]! += heat * P.gpuLiquidFraction;
        airHeat += heat * (1 - P.gpuLiquidFraction);
      } else {
        airHeat += heat;
      }
    }

    // --- Chilled water distribution ----------------------------------------
    const chwps = okList('pump-chw');
    const designLoad = airHeat + Object.values(liqHeat).reduce((a, b) => a + b, 0) + DOAS_COIL_KWT;
    const flowFrac = chwps.length === 0 ? 0 : Math.min(1, (chwps.length * CHWP_KWT) / Math.max(1, designLoad));
    const coilF = crahCapacityFactor(st.chwSupplyC) * flowFrac;

    // Air side (CRAHs) and liquid side (CDUs)
    const crahs = okList('crah');
    const airCap = crahs.length * CRAH_KWT * coilF;
    const airCool = Math.min(airHeat, airCap);
    const liqCap: Record<number, number> = {};
    let liqCool = 0;
    for (const r of GPU_ROWS) {
      liqCap[r] = this.avail(`CDU-${r}`) ? CDU_KWT * coilF : 0;
      liqCool += Math.min(liqHeat[r]!, liqCap[r]!);
    }
    const doasUnits = ['DOAS-01', 'DOAS-02'].filter((id) => this.avail(id));
    const doasOn = doasUnits.length > 0;
    const doasCoil = doasOn ? DOAS_COIL_KWT * coilF : 0;
    const loopLoad = airCool + liqCool + doasCoil;

    // --- Heat rejection equipment and free cooling ----------------------------
    const towers = okList('cooling-tower');
    const cwps = okList('pump-cw');
    const econFrac = towers.length && cwps.length ? economizerFraction(wb) : 0;
    const econKwt = econFrac * loopLoad;
    const chillerNeed = Math.max(0, loopLoad - econKwt);

    // --- Chiller staging (BMS lead/lag) -------------------------------------
    const capOf = (id: string) => (g.get(id).kind === 'chiller-air-cooled' ? AC_CHILLER_KWT * airCooledDerate(w.dryBulbC) : WC_CHILLER_KWT);
    const isWc = (id: string) => g.get(id).kind === 'chiller-water-cooled';
    const canRun = (id: string) => this.avail(id) && chwps.length > 0 && (!isWc(id) || (towers.length > 0 && cwps.length > 0));

    for (const id of CHILLER_ORDER) {
      const c = st.chillers[id]!;
      if (c.mode !== 'off' && !canRun(id)) {
        const n = g.get(id);
        const why =
          n.status === 'failed' ? 'failed' : !this.host.solution.energized.has(id) ? 'lost power' : chwps.length === 0 ? 'no chilled water flow' : 'no condenser water flow';
        if (n.status !== 'failed') this.host.log('alarm', n.tag, `${n.tag} stopped: ${why}. It will need ${P.chillerRestartS / 60} minutes to restart.`);
        st.chillers[id] = { mode: 'off', timer: 0 };
        st.flags[`restart-${id}`] = true;
      }
    }
    const onIds = () => CHILLER_ORDER.filter((id) => st.chillers[id]!.mode !== 'off');
    const onCap = () => onIds().reduce((s, id) => s + capOf(id), 0);
    for (const id of CHILLER_ORDER) {
      if (onCap() >= chillerNeed * 1.05 || chillerNeed <= 0) break;
      if (st.chillers[id]!.mode !== 'off' || !canRun(id)) continue;
      const restart = !!st.flags[`restart-${id}`];
      st.chillers[id] = { mode: initial ? 'running' : 'starting', timer: restart ? P.chillerRestartS : P.chillerStartS };
      if (!initial) this.host.log('info', id, `BMS called ${id} to ${restart ? 'restart' : 'start'} (${Math.round((restart ? P.chillerRestartS : P.chillerStartS) / 60)} min to load).`);
      st.flags[`restart-${id}`] = false;
    }
    // Stage off the last chiller if the rest comfortably carry the load.
    const on = onIds();
    const last = on[on.length - 1];
    if (last && onCap() - capOf(last) >= chillerNeed * 1.25 && st.chillers[last]!.mode === 'running') {
      st.chillers[last] = { mode: 'off', timer: 0 };
      if (!initial) this.host.log('info', last, `BMS staged ${last} off (${econFrac > 0 ? 'free cooling is carrying more load' : 'load dropped'}).`);
    }
    for (const id of CHILLER_ORDER) {
      const c = st.chillers[id]!;
      if (c.mode === 'starting') {
        c.timer -= dt;
        if (c.timer <= 0) {
          c.mode = 'running';
          this.host.log('info', id, `${id} running and loaded.`);
        }
      }
    }

    // --- Condenser side checks: flow, tower capacity, head pressure -----------
    let running = CHILLER_ORDER.filter((id) => st.chillers[id]!.mode === 'running');
    const wcRunning = running.filter(isWc);
    const cwpNeeded = wcRunning.length + (econKwt > 0 ? 1 : 0);
    if (cwps.length < wcRunning.length) {
      for (const id of wcRunning.slice(cwps.length)) this.trip(g.get(id), 'loss of condenser water flow');
      running = CHILLER_ORDER.filter((id) => st.chillers[id]!.mode === 'running');
    }
    let chillerCap = running.reduce((s, id) => s + capOf(id), 0);
    let chillerOut = Math.min(chillerNeed, chillerCap);
    const wcShare = (id: string) => (chillerCap > 0 ? (chillerOut * capOf(id)) / chillerCap : 0);
    const wcOut = running.filter(isWc).reduce((s, id) => s + wcShare(id), 0);
    const towerLoad = towers.length ? (wcOut * 1.17 + econKwt) / (towers.length * TOWER_KWT) : 0;
    const condC = towerLeavingLoadedC(wb, towerLoad) + P.condenserRangeC;
    if (condC > P.chillerHighHeadTripC) {
      for (const id of running.filter(isWc)) this.trip(g.get(id), `high head pressure (condenser water ${fmtF(condC)} on a ${fmtF(w.dryBulbC)} day)`);
    }
    const acCond = w.dryBulbC + P.airCooledCondenserLiftC;
    if (acCond > P.airCooledHighHeadTripC) {
      for (const id of running.filter((x) => !isWc(x))) this.trip(g.get(id), `high head pressure (condensing ${fmtF(acCond)})`);
    }
    running = CHILLER_ORDER.filter((id) => st.chillers[id]!.mode === 'running');
    chillerCap = running.reduce((s, id) => s + capOf(id), 0);
    chillerOut = Math.min(chillerNeed, chillerCap);

    // --- Thermal storage ------------------------------------------------------
    let deficit = Math.max(0, loopLoad - econKwt - chillerOut);
    let tesOut = 0;
    let tesIn = 0;
    if (deficit > 1 && chwps.length > 0 && st.tesKj > 0) {
      tesOut = dt > 0 ? Math.min(deficit, st.tesKj / dt) : deficit;
      st.tesKj -= tesOut * dt;
      deficit -= tesOut;
    } else if (chillerCap > chillerOut && st.tesKj < TES_FULL_KJ) {
      tesIn = Math.min(P.tesRechargeKw, chillerCap - chillerOut, dt > 0 ? (TES_FULL_KJ - st.tesKj) / dt : 0);
      st.tesKj += tesIn * dt;
    }
    this.once('tes', tesOut > 1, 'warning', 'TES-01', 'Chilled water storage tank discharging to cover the cooling shortfall.', 'Chilled water storage tank no longer discharging.');
    this.once('tes-empty', st.tesKj <= 0 && deficit > 1, 'critical', 'TES-01', 'Chilled water storage tank is EMPTY. Nothing is left to bridge the cooling shortfall.');

    // --- Loop, hall, GPU rows, DOAS, UPS room --------------------------------
    st.chwSupplyC = stepTemp(st.chwSupplyC, deficit, 0, dt, P.chwLoopMassKjPerC, P.chwSupplyC, 120);
    st.hallInletC = stepTemp(st.hallInletC, airHeat, airCap, dt, P.hallThermalMassKjPerC, P.supplyAirC, 90);

    // Hall over-temperature: air-cooled servers protect themselves.
    if (!st.hallTripped && st.hallInletC > P.serverShutdownC) {
      st.hallTripped = true;
      for (const r of g.byKind('rack')) {
        if (!r.state.thermalTrip && this.host.solution.energized.has(r.id)) {
          r.state.thermalTrip = true;
          this.host.log('critical', r.tag, `${r.tag} thermal shutdown (inlet ${fmtF(st.hallInletC)}).`);
        }
      }
    } else if (st.hallTripped && st.hallInletC < P.ashraeRecommendedC[1]) {
      st.hallTripped = false;
      for (const r of g.byKind('rack')) {
        const row = r.highDensity ? st.gpu[rowOf(Number(r.id.slice(2)))]! : null;
        if (r.state.thermalTrip && !row?.tripped) r.state.thermalTrip = false;
      }
      this.host.log('info', 'BMS', 'Hall inlet temperatures back in range. Air-cooled IT can be restarted.');
    }
    this.once('inlet-hi', st.hallInletC > P.ashraeRecommendedC[1], 'alarm', 'BMS', `Rack inlet temperature above the ASHRAE recommended range (${fmtF(P.ashraeRecommendedC[1])}).`, 'Rack inlet temperature back within the recommended range.');

    for (const r of GPU_ROWS) {
      const s = st.gpu[r]!;
      const cduOk = this.avail(`CDU-${r}`);
      // A tripped row makes no heat but has no flow either: it just sits there until cooling returns.
      const rest = cduOk && liqCap[r]! > 0 ? P.gpuNormalC : s.tempC;
      s.tempC = stepTemp(s.tempC, liqHeat[r]!, liqCap[r]!, dt, P.gpuRowMassKjPerC, rest, 20);
      if (!s.throttled && s.tempC > P.gpuThrottleC) {
        s.throttled = true;
        this.host.log('alarm', `CDU-${r}`, `Row ${r} GPUs THROTTLING at ${Math.round(s.tempC)} °C. Cold plate cooling lost.`);
      }
      if (!s.tripped && s.tempC > P.gpuShutdownC) {
        s.tripped = true;
        for (const rack of g.byKind('rack').filter((x) => x.highDensity && rowOf(Number(x.id.slice(2))) === r)) {
          if (!rack.state.thermalTrip) {
            rack.state.thermalTrip = true;
            this.host.log('critical', rack.tag, `${rack.tag} thermal shutdown (GPU over-temperature) at T+${Math.round(t)}s.`);
          }
        }
      }
      const cooled = cduOk && liqCap[r]! > 0;
      if (s.throttled && s.tempC < P.gpuThrottleC - 10 && cooled) {
        s.throttled = false;
        this.host.log('info', `CDU-${r}`, `Row ${r} GPUs back to full speed.`);
      }
      if (s.tripped && cooled && s.tempC < P.gpuNormalC + 5) {
        s.tripped = false;
        for (const rack of g.byKind('rack').filter((x) => x.highDensity && rowOf(Number(x.id.slice(2))) === r)) {
          if (!st.hallTripped) rack.state.thermalTrip = false;
        }
        this.host.log('info', `CDU-${r}`, `Row ${r} liquid cooling restored. GPU racks can be restarted.`);
      }
    }
    // Throttled GPUs draw about half power.
    for (const rack of g.byKind('rack')) {
      const base = rack.state.baseKw ?? rack.state.demandKw ?? 0;
      const throttled = rack.highDensity && st.gpu[rowOf(Number(rack.id.slice(2)))]!.throttled;
      rack.state.demandKw = rack.state.thermalTrip ? 0 : throttled ? base * 0.5 : base;
    }

    const supplyDew = doasLeavingDewPointC(outDew, coilF > 0 ? P.doasCoilLeavingC : outDew);
    const dewTarget = doasOn ? supplyDew : outDew;
    const tau = doasOn ? P.doasTauOnS : P.doasTauOffS;
    st.hallDewC += (dewTarget - st.hallDewC) * (1 - Math.exp(-dt / tau));
    const humidity = classifyHumidity(st.hallInletC, st.hallDewC);
    this.once('humid', humidity !== 'ok', 'warning', 'BMS', `Data hall humidity out of the ASHRAE band (${humidity === 'too-humid' ? 'too humid' : 'too dry'}).`, 'Data hall humidity back in range.');
    this.once('doas', !doasOn, 'warning', 'DOAS', 'No DOAS running: ventilation and pressurization lost. Humidity will drift slowly.', 'DOAS running again.');

    const cracOk = this.avail('CRAC-201');
    st.upsRoomC = stepTemp(st.upsRoomC, P.upsRoomHeatKw, cracOk ? CRAC_KWT : 0, dt, P.upsRoomMassKjPerC, 24, 300);
    this.once('upsroom', st.upsRoomC > 30, 'alarm', 'CRAC-201', 'UPS room above 86 °F. Hot batteries lose life fast.', 'UPS room temperature normal.');

    // --- Mechanical electrical load -----------------------------------------
    const runningIds = new Set<string>();
    const setKw = (id: string, kw: number) => {
      if (!g.nodes.has(id)) return;
      g.get(id).state.demandKw = kw;
      if (kw > 0) runningIds.add(id);
    };
    for (const id of CHILLER_ORDER) {
      const mode = st.chillers[id]!.mode;
      if (mode !== 'running') {
        setKw(id, mode === 'starting' ? 15 : 0);
        if (mode === 'starting') runningIds.add(id);
        continue;
      }
      const share = chillerCap > 0 ? ((chillerOut + tesIn) * capOf(id)) / chillerCap : 0;
      const cop = isWc(id) ? chillerCop(P.chwSupplyC, condC) : chillerCop(P.chwSupplyC, acCond - 2);
      setKw(id, Math.max(20, share / cop));
    }
    const nChwp = Math.min(chwps.length, Math.max(1, Math.ceil(designLoad / CHWP_KWT)));
    for (const id of ids('pump-chw')) setKw(id, chwps.slice(0, nChwp).includes(id) ? 10 + 20 * Math.min(1, designLoad / (nChwp * CHWP_KWT)) : 0);
    const nCwp = Math.min(cwps.length, cwpNeeded);
    for (const id of ids('pump-cw')) setKw(id, cwps.slice(0, nCwp).includes(id) ? 30 : 0);
    const nTower = Math.min(towers.length, cwpNeeded > 0 ? Math.max(1, Math.ceil((wcOut * 1.17 + econKwt) / TOWER_KWT)) : 0);
    const fanFrac = nTower ? Math.min(1, (wcOut * 1.17 + econKwt) / (nTower * TOWER_KWT)) : 0;
    for (const id of ids('cooling-tower')) setKw(id, towers.slice(0, nTower).includes(id) ? 3 + 12 * fanFrac ** 3 : 0);
    for (const id of ids('crah')) setKw(id, crahs.includes(id) ? 8 : 0);
    for (const r of GPU_ROWS) setKw(`CDU-${r}`, this.avail(`CDU-${r}`) ? 30 : 0);
    for (const id of ['DOAS-01', 'DOAS-02']) setKw(id, doasUnits[0] === id ? 45 : 0);
    setKw('CRAC-201', cracOk ? 25 : 0);
    if (chwps.length) runningIds.add('TES-01');

    let mechKw = 0;
    for (const n of g.nodes.values()) if (n.domain === 'mechanical') mechKw += n.state.demandKw ?? 0;

    // --- History & readout -----------------------------------------------------
    if (t - st.lastSample >= 5 || initial) {
      st.history.push({ t, inletC: st.hallInletC, chwC: st.chwSupplyC });
      if (st.history.length > 240) st.history.shift();
      st.lastSample = t;
    }
    const loopReturn = st.chwSupplyC + (flowFrac > 0 ? (loopLoad / Math.max(1, designLoad)) * P.chwDeltaTC : 0);
    this.readout = {
      weatherLabel: w.label,
      dryBulbC: w.dryBulbC,
      wetBulbC: wb,
      outdoorDewC: outDew,
      economizer: econFrac >= 1 ? 'full' : econFrac > 0 ? 'partial' : 'off',
      economizerKwt: econKwt,
      loadKwt: loopLoad,
      chillerKwt: chillerOut,
      chillerCapacityKwt: chillerCap,
      chillers: Object.fromEntries(CHILLER_ORDER.map((id) => [id, st.chillers[id]!.mode])),
      chillerTimers: Object.fromEntries(CHILLER_ORDER.map((id) => [id, st.chillers[id]!.timer])),
      condenserC: condC,
      towerLoad,
      chwSupplyC: st.chwSupplyC,
      chwReturnC: loopReturn,
      chwFlowFraction: flowFrac,
      tesSoc: st.tesKj / TES_FULL_KJ,
      tesMinutes: loopLoad > 0 ? st.tesKj / loopLoad / 60 : Infinity,
      tesDischargeKwt: tesOut,
      airHeatKwt: airHeat,
      airCoolingKwt: airCool,
      hallInletC: st.hallInletC,
      hallDewC: st.hallDewC,
      hallRh: relativeHumidity(st.hallInletC, st.hallDewC),
      hallHumidity: humidity,
      hallPressurePa: doasOn ? P.hallPressureOnPa : P.hallPressureOffPa,
      doasOn,
      upsRoomC: st.upsRoomC,
      gpuRows: GPU_ROWS.map((r) => ({ row: r, cduOk: this.avail(`CDU-${r}`), ...st.gpu[r]! })),
      mechanicalKw: mechKw,
      running: [...runningIds],
      history: st.history,
    };
  }
}
