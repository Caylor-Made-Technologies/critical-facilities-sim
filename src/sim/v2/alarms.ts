/**
 * Engine v2 alarm system (Phase 4d), named after the alarm-management lifecycle in ISA-18.2
 * (by name only; no text from the standard). Simplified for training.
 *
 *   - Priority: critical / high / medium / low (one meaning each, see ALARM.priorities).
 *   - Analog alarms have a setpoint and a deadband (clear only after the value comes back past it).
 *   - On-delay (must stay true this long to annunciate) and off-delay (must stay clear this long to clear).
 *   - States: normal → unacknowledged active → acknowledged active → normal; or active → returned to
 *     normal unacknowledged (RTN unack) → normal on acknowledge.
 *   - Shelving: the operator hides an alarm for a set time (never forever; it comes back by itself).
 *   - Suppressed by design: an alarm on equipment that is out of service (maintenance) is not annunciated.
 *   - First-out: the first alarm to come in for a group while the group was quiet is marked, so the
 *     cause stands out from the alarms that follow it.
 *   - Nuisance: an alarm that comes in 3+ times in 60 s is flagged chattering.
 *   - Flood: more than 10 new alarms in 10 minutes (a common per-operator benchmark) raises a flood flag.
 *
 * Definitions are built from the plant at start (one per piece of equipment where it applies).
 * Conditions read the engine's models; nothing here changes the plant.
 */
import type { Simulation } from '../engine';
import { AIR, ALARM, HYD, RACKHEAT } from '../physics';
import { DESIGN } from '../plant/builder';
import type { ActionResult, Component } from '../types';
import type { AirsideModel } from './airside';
import type { HydronicModel } from './hydronic';
import type { SourcesModel } from './sources';
import type { PowerQualityModel } from './quality';

export type AlarmPriority = 'critical' | 'high' | 'medium' | 'low';
export type AlarmGroup = 'electrical' | 'cooling' | 'hall';
export type AlarmStateName = 'normal' | 'unack' | 'ack' | 'rtn-unack';

export interface AlarmCtx {
  sim: Simulation;
  air: AirsideModel;
  hyd: HydronicModel;
  sources: SourcesModel;
  /** Utility power quality events (Phase 8a); optional so older callers still work. */
  pq?: PowerQualityModel;
}

export interface AlarmDef {
  id: string;
  source: string;
  text: string;
  priority: AlarmPriority;
  group: AlarmGroup;
  /** Equipment whose maintenance status suppresses this alarm (suppressed by design). */
  equipment?: string;
  onDelayS: number;
  offDelayS: number;
  /** Digital condition... */
  active?: (c: AlarmCtx) => boolean;
  /** ...or analog: value above (or below) a setpoint, with a deadband to clear. */
  analog?: { value: (c: AlarmCtx) => number; setpoint: number; deadband: number; low?: boolean; unit: string };
  /** Fault-library entry that explains the likely causes (content/faults.ts). */
  fault?: string;
}

export interface AlarmRecord {
  state: AlarmStateName;
  /** Raw condition currently true (after the analog deadband, before delays). */
  raw: boolean;
  /** Sim time the raw condition last changed, for on/off delays. */
  rawSince: number;
  activeSince: number | null;
  ackAt: number | null;
  shelvedUntil: number | null;
  firstOut: boolean;
  /** Recent activation times (for chattering). */
  hits: number[];
}

export interface AlarmsState {
  rec: Record<string, AlarmRecord>;
  /** Recent activation times across all alarms (for flood). */
  recent: number[];
  /** Total activations so far. */
  total: number;
}

export interface AnnunciatedAlarm {
  id: string;
  source: string;
  text: string;
  priority: AlarmPriority;
  group: AlarmGroup;
  state: Exclude<AlarmStateName, 'normal'>;
  since: number;
  firstOut: boolean;
  chattering: boolean;
  value?: string;
  fault?: string;
  /** Plant component the alarm belongs to (for graphics overlays), when it has one. */
  equipment?: string;
}

export interface AlarmSummary {
  list: AnnunciatedAlarm[];
  unacked: number;
  shelved: string[];
  suppressed: string[];
  flood: boolean;
  /** New alarms in the last 10 minutes. */
  rate10min: number;
}

const PRI_ORDER: Record<AlarmPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const fresh = (t: number): AlarmRecord => ({ state: 'normal', raw: false, rawSince: t, activeSince: null, ackAt: null, shelvedUntil: null, firstOut: false, hits: [] });

/** Build the alarm list for a plant (deterministic order). */
export function buildAlarmDefs(sim: Simulation): AlarmDef[] {
  const g = sim.graph;
  const defs: AlarmDef[] = [];
  const of = (k: Component['kind']) => g.byKind(k);
  const failed = (id: string) => (c: AlarmCtx) => c.sim.graph.get(id).status === 'failed';

  // --- Electrical -------------------------------------------------------------------------------
  for (const u of of('utility'))
    defs.push({ id: `${u.id}.LOSS`, source: u.tag, text: 'Utility source lost', priority: 'high', group: 'electrical', equipment: u.id, onDelayS: 0, offDelayS: 5, active: failed(u.id), fault: 'utility-loss' });
  for (const u of of('utility')) {
    const pqOn = (c: AlarmCtx) => !!c.pq?.active.some((e) => e.util === u.id && e.kind !== 'imbalance');
    defs.push({ id: `${u.id}.PQ`, source: u.tag, text: 'Power quality event (sag / swell / lost phase)', priority: 'medium', group: 'electrical', equipment: u.id, onDelayS: 0, offDelayS: 10, active: pqOn, fault: 'utility-sag' });
    defs.push({ id: `${u.id}.IMB`, source: u.tag, text: 'Utility voltage imbalance', priority: 'medium', group: 'electrical', equipment: u.id, onDelayS: 5, offDelayS: 10, active: (c) => !!c.pq?.response(u.id).imbalance, fault: 'utility-imbalance' });
  }
  for (const sys of sim.meta.upsSystems) {
    const mods = g.byKind('ups').filter((u) => g.downstream(`UIB-${sys.id}`).some((n) => n.id === u.id));
    defs.push({
      id: `UPS-${sys.id}.BATT`,
      source: `UPS ${sys.id}`,
      text: 'UPS on battery',
      priority: 'high',
      group: 'electrical',
      onDelayS: 0,
      offDelayS: 5,
      active: (c) => mods.some((m) => c.sim.solution.upsMode.get(m.id) === 'battery'),
      fault: 'utility-loss',
    });
    defs.push({
      id: `UPS-${sys.id}.LOWBATT`,
      source: `UPS ${sys.id}`,
      text: 'UPS battery low',
      priority: 'critical',
      group: 'electrical',
      onDelayS: 0,
      offDelayS: 30,
      analog: { value: (c) => Math.min(...mods.map((m) => (c.sim.graph.get(m.id).state.soc ?? 1) * 100)), setpoint: ALARM.upsLowSocPct, deadband: 5, low: true, unit: '%' },
      fault: 'ups-eod',
    });
    defs.push({
      id: `UPS-${sys.id}.BYP`,
      source: `UPS ${sys.id}`,
      text: 'UPS on static bypass (load unprotected)',
      priority: 'medium',
      group: 'electrical',
      onDelayS: 5,
      offDelayS: 5,
      active: (c) => mods.some((m) => c.sim.solution.upsMode.get(m.id) === 'static-bypass'),
    });
  }
  for (const gen of of('generator')) {
    defs.push({ id: `${gen.id}.FAIL`, source: gen.tag, text: 'Generator failed / fail to start', priority: 'critical', group: 'electrical', equipment: gen.id, onDelayS: 0, offDelayS: 5, active: failed(gen.id), fault: 'gen-fail-start' });
    defs.push({
      id: `${gen.id}.FUEL`,
      source: gen.tag,
      text: 'Day tank fuel low',
      priority: 'high',
      group: 'electrical',
      equipment: gen.id,
      onDelayS: 30,
      offDelayS: 30,
      analog: { value: (c) => ((c.sim.graph.get(gen.id).state.fuelL ?? DESIGN.generatorDayTankL) / DESIGN.generatorDayTankL) * 100, setpoint: ALARM.fuelLowPct, deadband: 5, low: true, unit: '%' },
      fault: 'fuel-low',
    });
  }
  for (const b of of('breaker'))
    defs.push({ id: `${b.id}.TRIP`, source: b.tag, text: 'Breaker tripped', priority: 'high', group: 'electrical', equipment: b.id, onDelayS: 0, offDelayS: 0, active: failed(b.id), fault: 'breaker-trip' });

  // --- Cooling ----------------------------------------------------------------------------------
  for (const ch of [...of('chiller-water-cooled'), ...of('chiller-air-cooled')])
    defs.push({ id: `${ch.id}.TRIP`, source: ch.tag, text: 'Chiller tripped / failed', priority: 'high', group: 'cooling', equipment: ch.id, onDelayS: 0, offDelayS: 0, active: failed(ch.id), fault: 'chiller-trip' });
  defs.push({
    id: 'CHW.SUPPLY-HI',
    source: 'CHW plant',
    text: 'Chilled water supply temperature high',
    priority: 'high',
    group: 'cooling',
    onDelayS: 60,
    offDelayS: 60,
    analog: { value: (c) => c.hyd.reading.chwsC, setpoint: HYD.chwSetpointC + ALARM.chwHighK, deadband: 1, unit: '°C' },
    fault: 'cooling-shortfall',
  });
  defs.push({
    id: 'CHW.FLOW-LO',
    source: 'CHW plant',
    text: 'Chilled water flow low',
    priority: 'critical',
    group: 'cooling',
    onDelayS: 10,
    offDelayS: 10,
    analog: { value: (c) => c.hyd.reading.flowFrac * 100, setpoint: ALARM.chwFlowLowPct, deadband: 5, low: true, unit: '%' },
    fault: 'chw-pump-loss',
  });
  defs.push({ id: 'TES.DISCH', source: 'TES-01', text: 'Storage tank discharging', priority: 'low', group: 'cooling', onDelayS: 10, offDelayS: 60, active: (c) => c.hyd.reading.tesKwt > 1, fault: 'cooling-shortfall' });
  defs.push({
    id: 'TES.LOW',
    source: 'TES-01',
    text: 'Storage tank charge low',
    priority: 'high',
    group: 'cooling',
    onDelayS: 0,
    offDelayS: 60,
    analog: { value: (c) => c.hyd.reading.tesSoc * 100, setpoint: ALARM.tesLowPct, deadband: 5, low: true, unit: '%' },
    fault: 'cooling-shortfall',
  });
  defs.push({
    id: 'CW.HI',
    source: 'Condenser water',
    text: 'Condenser water temperature high (head pressure trip near)',
    priority: 'medium',
    group: 'cooling',
    onDelayS: 30,
    offDelayS: 60,
    analog: { value: (c) => c.hyd.reading.condLeavingC, setpoint: ALARM.condHighC, deadband: 1, unit: '°C' },
    fault: 'tower-loss',
  });
  for (const k of ['pump-chw', 'pump-cw', 'cooling-tower', 'crah', 'cdu', 'doas', 'crac'] as const)
    for (const n of of(k))
      defs.push({ id: `${n.id}.FAIL`, source: n.tag, text: 'Equipment failed', priority: k === 'cdu' ? 'high' : 'medium', group: k === 'crah' || k === 'doas' ? 'hall' : 'cooling', equipment: n.id, onDelayS: 0, offDelayS: 0, active: failed(n.id), fault: k === 'cdu' ? 'cdu-loss' : k === 'crac' ? 'ups-room-cooling' : k === 'cooling-tower' ? 'tower-loss' : k === 'pump-chw' ? 'chw-pump-loss' : k === 'doas' ? 'doas-loss' : 'crah-loss' });

  // --- Hall -------------------------------------------------------------------------------------
  defs.push({
    id: 'HALL.INLET-HI',
    source: 'Data hall',
    text: 'Rack inlet above recommended range',
    priority: 'medium',
    group: 'hall',
    onDelayS: 60,
    offDelayS: 120,
    analog: { value: (c) => c.air.state.temps.rackIn, setpoint: AIR.recommendedC[1], deadband: 0.5, unit: '°C' },
    fault: 'hot-aisle-recirc',
  });
  defs.push({
    id: 'HALL.HOTSPOT',
    source: 'Data hall',
    text: 'Hot spot: a rack top inlet above recommended (see the hall view)',
    priority: 'low',
    group: 'hall',
    onDelayS: 60,
    offDelayS: 120,
    analog: { value: (c) => c.air.rackHeat.hottest?.topC ?? c.air.state.temps.rackIn, setpoint: RACKHEAT.hotspotC, deadband: 0.5, unit: '°C' },
    fault: 'hot-aisle-recirc',
  });
  defs.push({
    id: 'HALL.INLET-HIHI',
    source: 'Data hall',
    text: 'Rack inlet above allowable range',
    priority: 'high',
    group: 'hall',
    onDelayS: 30,
    offDelayS: 120,
    analog: { value: (c) => c.air.state.temps.rackIn, setpoint: AIR.allowableC.A1[1], deadband: 1, unit: '°C' },
    fault: 'cooling-shortfall',
  });
  defs.push({ id: 'HALL.IT-DOWN', source: 'Data hall', text: 'IT racks down', priority: 'critical', group: 'hall', onDelayS: 0, offDelayS: 0, active: (c) => c.sim.itDownRacks().length > 0 });
  defs.push({ id: 'HALL.DOOR', source: 'Containment', text: 'Containment door open', priority: 'low', group: 'hall', onDelayS: 120, offDelayS: 0, active: (c) => c.air.state.containment === 'door-open', fault: 'containment-door' });
  defs.push({ id: 'HALL.HUMID', source: 'Data hall', text: 'Hall humidity out of range', priority: 'low', group: 'hall', onDelayS: 300, offDelayS: 300, active: (c) => c.sim.thermal.readout.hallHumidity !== 'ok', fault: 'doas-loss' });
  defs.push({
    id: 'UPSROOM.HI',
    source: 'UPS room',
    text: 'UPS room temperature high',
    priority: 'medium',
    group: 'electrical',
    onDelayS: 60,
    offDelayS: 120,
    analog: { value: (c) => c.sim.thermal.state.upsRoomC, setpoint: ALARM.upsRoomHighC, deadband: 1, unit: '°C' },
    fault: 'ups-room-cooling',
  });
  for (const r of [1, 2, 3])
    defs.push({ id: `GPU-${r}.THROTTLE`, source: `Row ${r}`, text: 'GPUs throttling (liquid cooling)', priority: 'high', group: 'hall', onDelayS: 0, offDelayS: 30, active: (c) => !!c.sim.thermal.state.gpu[r]?.throttled, fault: 'cdu-loss' });
  return defs;
}

export class AlarmSystem {
  defs: AlarmDef[] = [];
  private byId = new Map<string, AlarmDef>();
  state: AlarmsState = { rec: {}, recent: [], total: 0 };

  /** Build the alarm list for this plant (tests may pass their own definitions). */
  init(sim: Simulation, defs: AlarmDef[] = buildAlarmDefs(sim)): void {
    this.defs = defs;
    this.byId = new Map(this.defs.map((d) => [d.id, d]));
    for (const d of this.defs) this.state.rec[d.id] ??= fresh(sim.t);
  }

  private suppressed(c: AlarmCtx, d: AlarmDef): boolean {
    return !!d.equipment && c.sim.graph.nodes.has(d.equipment) && c.sim.graph.get(d.equipment).status === 'maintenance';
  }

  /** Raw condition with the analog deadband applied (uses the previous raw state). */
  private raw(c: AlarmCtx, d: AlarmDef, was: boolean): boolean {
    if (d.active) return d.active(c);
    const a = d.analog!;
    const v = a.value(c);
    if (!Number.isFinite(v)) return was;
    if (a.low) return was ? v < a.setpoint + a.deadband : v < a.setpoint;
    return was ? v > a.setpoint - a.deadband : v > a.setpoint;
  }

  step(c: AlarmCtx): void {
    const t = c.sim.t;
    const st = this.state;
    const groupQuiet = (g: AlarmGroup) => this.defs.every((d) => d.group !== g || st.rec[d.id]!.state === 'normal' || st.rec[d.id]!.activeSince === null);
    for (const d of this.defs) {
      const r = (st.rec[d.id] ??= fresh(t));
      if (r.shelvedUntil !== null && t >= r.shelvedUntil) r.shelvedUntil = null; // shelving always times out
      const raw = this.suppressed(c, d) ? false : this.raw(c, d, r.raw);
      if (raw !== r.raw) Object.assign(r, { raw, rawSince: t });
      const held = t - r.rawSince;
      const isActive = r.activeSince !== null;
      if (raw && !isActive && held >= d.onDelayS) {
        r.firstOut = groupQuiet(d.group);
        Object.assign(r, { activeSince: t, ackAt: null, state: 'unack' as AlarmStateName });
        r.hits = [...r.hits.filter((x) => t - x < ALARM.chatterWindowS), t];
        st.recent = [...st.recent.filter((x) => t - x < ALARM.floodWindowS), t];
        st.total++;
      } else if (!raw && isActive && held >= d.offDelayS) {
        r.activeSince = null;
        r.state = r.state === 'ack' ? 'normal' : 'rtn-unack';
        if (r.state === 'normal') r.firstOut = false;
      }
    }
    st.recent = st.recent.filter((x) => t - x < ALARM.floodWindowS);
  }

  ack(id: string, t: number): ActionResult {
    const r = this.state.rec[id];
    if (!r || !this.byId.has(id)) return { ok: false, reason: `No alarm ${id}.` };
    if (r.state === 'unack') Object.assign(r, { state: 'ack', ackAt: t });
    else if (r.state === 'rtn-unack') Object.assign(r, { state: 'normal', ackAt: t, firstOut: false });
    return { ok: true };
  }

  ackAll(t: number): ActionResult {
    for (const id of Object.keys(this.state.rec)) this.ack(id, t);
    return { ok: true };
  }

  shelve(id: string, s: number, t: number): ActionResult {
    const r = this.state.rec[id];
    if (!r || !this.byId.has(id)) return { ok: false, reason: `No alarm ${id}.` };
    if (!(Number.isFinite(s) && s > 0 && s <= ALARM.maxShelveS)) return { ok: false, reason: `Shelve for 1 s to ${ALARM.maxShelveS / 3600} h.` };
    r.shelvedUntil = t + s;
    return { ok: true };
  }

  unshelve(id: string): ActionResult {
    const r = this.state.rec[id];
    if (!r) return { ok: false, reason: `No alarm ${id}.` };
    r.shelvedUntil = null;
    return { ok: true };
  }

  /** What the alarm list shows now. */
  summary(c: AlarmCtx): AlarmSummary {
    const t = c.sim.t;
    const list: AnnunciatedAlarm[] = [];
    const shelved: string[] = [];
    const suppressed: string[] = [];
    for (const d of this.defs) {
      const r = this.state.rec[d.id]!;
      if (this.suppressed(c, d)) suppressed.push(d.id);
      if (r.state === 'normal') continue;
      if (r.shelvedUntil !== null) {
        shelved.push(d.id);
        continue;
      }
      const v = d.analog ? d.analog.value(c) : undefined;
      list.push({
        id: d.id,
        source: d.source,
        text: d.text,
        priority: d.priority,
        group: d.group,
        state: r.state,
        since: r.activeSince ?? r.rawSince,
        firstOut: r.firstOut,
        chattering: r.hits.filter((x) => t - x < ALARM.chatterWindowS).length >= ALARM.chatterCount,
        value: v !== undefined && Number.isFinite(v) ? `${v.toFixed(1)} ${d.analog!.unit}` : undefined,
        fault: d.fault,
        equipment: d.equipment,
      });
    }
    list.sort((a, b) => PRI_ORDER[a.priority] - PRI_ORDER[b.priority] || a.since - b.since || a.id.localeCompare(b.id));
    const rate10min = this.state.recent.filter((x) => t - x < ALARM.floodWindowS).length;
    return { list, unacked: list.filter((a) => a.state === 'unack' || a.state === 'rtn-unack').length, shelved, suppressed, flood: rate10min > ALARM.floodCount, rate10min };
  }

  snapshot(): AlarmsState {
    return JSON.parse(JSON.stringify(this.state)) as AlarmsState;
  }

  restore(s: AlarmsState): void {
    this.state = JSON.parse(JSON.stringify(s)) as AlarmsState;
  }
}
