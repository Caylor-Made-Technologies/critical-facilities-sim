/**
 * Engine v2 sources detail (Phase 4b part 2): generator start stages, fail-to-start and block heater,
 * load-step frequency dip, UPS mode efficiency and battery state with temperature/age derating, and
 * the ATS in-phase window. Simplified teaching models; every formula is in physics.ts.
 *
 * Parity rule: by default nothing here changes what the scoring reads (generator state, UPS mode,
 * ATS position). Fail-to-start (chance 0 by default) and block heater off (on by default) are
 * scenario switches that change behavior on purpose.
 */
import type { Simulation } from '../engine';
import {
  BATTERY_AGES,
  batteryTempFactor,
  genStage,
  PHYSICS,
  slipAngleDeg,
  SOURCES,
  stepFrequencyHz,
  type GenStage,
} from '../physics';
import type { Rng } from './rng';

export interface SourcesState {
  /** Generator id → block heater on (default true). */
  heater: Record<string, boolean>;
  /** Chance (0–1) that a generator fails to start when signaled. 0 = never (default). */
  failToStart: number;
  /** Generator id → sim time its current start began. */
  startAt: Record<string, number>;
  /** Generators that will not start this attempt (seeded roll). */
  noStart: string[];
  /** Paralleling bus id → last load step: time, fraction of online generator capacity; and last kW. */
  step: Record<string, { at: number; frac: number; lastKw: number }>;
  /** UPS system id → eco mode on. */
  eco: Record<string, boolean>;
}

export type BatteryState = 'float' | 'discharge' | 'recharge' | 'off';

export interface UpsReading {
  id: string;
  mode: 'double-conversion' | 'eco' | 'battery' | 'static-bypass' | 'off';
  battery: BatteryState;
  soc: number;
  /** Runtime at present load, derated for battery age and room temperature (s; Infinity at no load). */
  runtimeS: number;
  /** Capacity factors applied. */
  ageFactor: number;
  tempFactor: number;
  efficiency: number;
}

export interface AtsReading {
  id: string;
  position: 'normal' | 'emergency' | 'none';
  normalAvailable: boolean;
  /** Phase angle between the generator bus and the utility while both are live (°), else null. */
  angleDeg: number | null;
  inPhase: boolean;
}

/** System letter for a UPS module (UPS-A1 → A), from its input breaker. */
function upsSystemOf(sim: Simulation, upsId: string): string | undefined {
  return sim.graph.upstream(upsId, 'power').find((u) => u.id.startsWith('UIB-'))?.id.slice(4);
}

export class SourcesModel {
  state: SourcesState = { heater: {}, failToStart: 0, startAt: {}, noStart: [], step: {}, eco: {} };

  init(sim: Simulation): void {
    for (const g of sim.graph.byKind('generator')) this.state.heater[g.id] = true;
    for (const b of sim.graph.byKind('paralleling-bus')) this.state.step[b.id] = { at: -Infinity, frac: 0, lastKw: sim.solution.loadKw.get(b.id) ?? 0 };
  }

  setHeater(sim: Simulation, id: string, on: boolean): { ok: true } | { ok: false; reason: string } {
    const g = sim.graph.get(id);
    if (g.kind !== 'generator') return { ok: false, reason: `${g.tag} is not a generator.` };
    this.state.heater[id] = on;
    sim.log(on ? 'info' : 'warning', g.tag, `${g.tag} block heater ${on ? 'ON' : 'OFF: a cold engine starts slower'}.`);
    return { ok: true };
  }

  setFailToStart(p: number): { ok: true } | { ok: false; reason: string } {
    if (!(Number.isFinite(p) && p >= 0 && p <= 1)) return { ok: false, reason: 'Chance must be between 0 and 1.' };
    this.state.failToStart = p;
    return { ok: true };
  }

  setEco(sim: Simulation, system: string, on: boolean): { ok: true } | { ok: false; reason: string } {
    if (!sim.graph.byKind('ups').some((u) => upsSystemOf(sim, u.id) === system)) return { ok: false, reason: `No UPS system ${system}.` };
    this.state.eco[system] = on;
    sim.log('info', `UPS ${system}`, `UPS ${system} eco mode ${on ? 'ON: load runs on bypass, inverter on standby (higher efficiency, a short transfer on a utility event)' : 'OFF: double conversion'}.`);
    return { ok: true };
  }

  /** One tick, after the plant advanced. */
  step(sim: Simulation, rng: Rng): void {
    const t = sim.t;
    for (const g of sim.graph.byKind('generator')) {
      const st = g.state;
      if (st.genState !== 'cranking') {
        delete this.state.startAt[g.id];
        this.state.noStart = this.state.noStart.filter((x) => x !== g.id);
        continue;
      }
      if (this.state.startAt[g.id] === undefined) {
        // A new start (it began during this tick).
        this.state.startAt[g.id] = t - Math.max(0, PHYSICS.genStartDelayS - (st.genTimer ?? 0));
        if (this.state.failToStart > 0 && rng.chance(this.state.failToStart)) {
          this.state.noStart.push(g.id);
          sim.log('alarm', g.tag, `${g.tag} cranking but not firing.`);
        }
        if (this.state.heater[g.id] === false) {
          st.genTimer = (st.genTimer ?? 0) + SOURCES.coldStartExtraS;
          sim.log('warning', g.tag, `${g.tag} cold start (block heater off): slow to build speed.`);
        }
      }
      if (this.state.noStart.includes(g.id)) {
        if (t - this.state.startAt[g.id]! >= SOURCES.overcrankS) {
          this.state.noStart = this.state.noStart.filter((x) => x !== g.id);
          delete this.state.startAt[g.id];
          sim.fail(g.id);
          sim.log('critical', g.tag, `${g.tag} FAILED TO START (overcrank). Check fuel, starting batteries and the controller.`);
        } else st.genTimer = Math.max(st.genTimer ?? 0, 2); // > one tick, so the next tick can't finish the start
      }
    }
    for (const b of sim.graph.byKind('paralleling-bus')) {
      const kw = sim.solution.energized.has(b.id) ? sim.solution.loadKw.get(b.id) ?? 0 : 0;
      const rec = (this.state.step[b.id] ??= { at: -Infinity, frac: 0, lastKw: kw });
      const cap = sim.graph
        .upstream(b.id, 'power')
        .filter((g) => g.kind === 'generator' && g.state.genState === 'running')
        .reduce((s, g) => s + g.ratedKw, 0);
      const jump = kw - rec.lastKw;
      if (cap > 0 && jump > 0.05 * cap) {
        rec.at = t;
        rec.frac = Math.min(1, jump / cap);
      }
      rec.lastKw = kw;
    }
  }

  /** Start stage of one generator. */
  genStage(sim: Simulation, id: string): GenStage {
    const g = sim.graph.get(id);
    if (g.state.genState === 'running') return 'online';
    if (g.state.genState !== 'cranking') return 'off';
    if (this.state.noStart.includes(id)) return 'crank';
    const start = this.state.startAt[id];
    return genStage(start === undefined ? 0 : sim.t - start);
  }

  /** Paralleling-bus frequency (Hz) after the last load step. */
  busFrequencyHz(sim: Simulation, busId: string): number {
    const r = this.state.step[busId];
    if (!r || !sim.solution.energized.has(busId)) return SOURCES.nominalHz;
    return stepFrequencyHz(r.frac, sim.t - r.at);
  }

  ups(sim: Simulation, id: string): UpsReading {
    const u = sim.graph.get(id);
    const mode = sim.solution.upsMode.get(id) ?? 'off';
    const sys = upsSystemOf(sim, id);
    const eco = !!(sys && this.state.eco[sys]);
    const soc = u.state.soc ?? 0;
    const ageFactor = BATTERY_AGES[sim.batteryAge].health;
    const tempFactor = batteryTempFactor(sim.thermal.state.upsRoomC);
    const base = sim.upsRuntimeS(id); // already includes age
    const runtimeS = Number.isFinite(base) ? base * tempFactor : Infinity;
    const shown: UpsReading['mode'] = mode === 'normal' ? (eco ? 'eco' : 'double-conversion') : mode;
    const battery: BatteryState = mode === 'off' ? 'off' : mode === 'battery' ? 'discharge' : soc < 0.999 ? 'recharge' : 'float';
    const efficiency = shown === 'eco' ? SOURCES.effEco : shown === 'static-bypass' ? SOURCES.effBypass : shown === 'off' ? 0 : SOURCES.effDoubleConversion;
    return { id, mode: shown, battery, soc, runtimeS, ageFactor, tempFactor, efficiency };
  }

  ats(sim: Simulation, id: string): AtsReading {
    const a = sim.graph.get(id);
    const sel = a.state.selected;
    const position = sel === 'normal' ? 'normal' : sel === 'emergency' ? 'emergency' : 'none';
    const normalSrc = sim.graph.inEdges(id, 'power').find((e) => e.port === 'normal');
    const emerg = sim.graph.inEdges(id, 'power').find((e) => e.port === 'emergency');
    const normalAvailable = !!normalSrc && sim.solution.energized.has(normalSrc.from);
    const bothLive = normalAvailable && !!emerg && sim.solution.energized.has(emerg.from);
    const angleDeg = bothLive ? slipAngleDeg(sim.t) : null;
    return { id, position, normalAvailable, angleDeg, inPhase: angleDeg !== null && Math.abs(angleDeg) <= SOURCES.inPhaseWindowDeg };
  }

  snapshot(): SourcesState {
    return JSON.parse(JSON.stringify(this.state, (_k, v) => (v === -Infinity ? null : v))) as SourcesState;
  }

  restore(s: SourcesState): void {
    const c = JSON.parse(JSON.stringify(s)) as SourcesState;
    for (const r of Object.values(c.step)) if (r.at === null) r.at = -Infinity;
    this.state = c;
  }
}
