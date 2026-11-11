/**
 * Engine v2 utility power quality (Phase 8a): sags, swells, single-phasing and voltage imbalance on a
 * utility service, and how the plant responds. Simplified teaching model; windows are in physics.ts (PQ).
 *
 *   - UPS: a rectifier sees its input outside its window and the UPS carries the load on battery for the
 *     event; it goes back to double conversion (and recharges) when the voltage returns.
 *   - ATS: an out-of-window normal source counts as lost. Its start delay rides through short events; a
 *     longer one starts the generators and transfers. If normal returns first, the generators cool down
 *     unloaded and stop (Simulation.runTransferSwitches).
 *   - Chillers: on a deep sag or a lost phase their starters/drives drop out and restart on their restart
 *     timer once the voltage is back (not a latched trip).
 *   - Imbalance: alarm only (motors run hotter).
 *
 * Only the gear actually fed from that utility right now is affected (power solution origins), so a bus
 * already on generator rides through. Events shorter than one tick last one tick.
 */
import type { Simulation } from '../engine';
import { pqInvalid, pqResponse, type PqKind, type PqResponse } from '../physics';
import type { ActionResult } from '../types';
import type { HydronicModel } from './hydronic';

export interface PqEvent {
  util: string;
  kind: PqKind;
  pct: number;
  start: number;
  end: number;
}

export interface PqState {
  events: PqEvent[];
}

const NONE: PqResponse = { upsBattery: false, atsReject: false, motorsDrop: false, imbalance: false };

export function pqLabel(e: Pick<PqEvent, 'kind' | 'pct'>): string {
  if (e.kind === 'sag') return `voltage sag to ${e.pct}%`;
  if (e.kind === 'swell') return `voltage swell to ${e.pct}%`;
  if (e.kind === 'imbalance') return `${e.pct}% voltage imbalance`;
  return 'single-phasing (one phase lost)';
}

export class PowerQualityModel {
  state: PqState = { events: [] };

  /** Start an event on a utility service now. */
  add(sim: Simulation, hyd: HydronicModel, util: string, kind: PqKind, pct: number, s: number): ActionResult {
    if (!sim.graph.nodes.has(util) || sim.graph.get(util).kind !== 'utility') return { ok: false, reason: `${util} is not a utility service.` };
    const bad = pqInvalid(kind, pct, s);
    if (bad) return { ok: false, reason: bad };
    const ev: PqEvent = { util, kind, pct: kind === 'single-phase' ? 0 : pct, start: sim.t, end: sim.t + s };
    this.state.events.push(ev);
    const tag = sim.graph.get(util).tag;
    const dur = s < 1 ? `${Math.round(s * 1000)} ms` : `${Math.round(s)} s`;
    sim.log(kind === 'imbalance' ? 'warning' : 'alarm', tag, `${tag} power quality event: ${pqLabel(ev)} for ${dur} (EPMS capture).`);
    this.apply(sim, hyd);
    return { ok: true };
  }

  /** Combined response on one utility right now. */
  response(util: string): PqResponse {
    let r = NONE;
    for (const e of this.state.events) {
      if (e.util !== util) continue;
      const x = pqResponse(e.kind, e.pct);
      r = { upsBattery: r.upsBattery || x.upsBattery, atsReject: r.atsReject || x.atsReject, motorsDrop: r.motorsDrop || x.motorsDrop, imbalance: r.imbalance || x.imbalance };
    }
    return r;
  }

  /** Active events (read-only). */
  get active(): readonly PqEvent[] {
    return this.state.events;
  }

  /** Each tick before the plant advances: end finished events, then push the response into the plant. */
  apply(sim: Simulation, hyd: HydronicModel): void {
    const t = sim.t;
    const done = this.state.events.filter((e) => e.end <= t + 1e-9 && e.start < t);
    if (done.length) {
      this.state.events = this.state.events.filter((e) => !done.includes(e));
      for (const e of done) {
        const tag = sim.graph.get(e.util).tag;
        sim.log('info', tag, `${tag} voltage back to normal after the ${pqLabel(e)}.`);
      }
    }
    this.sync(sim, hyd);
  }

  /** Push the current response into the plant (also after a restore). */
  sync(sim: Simulation, hyd?: HydronicModel): void {
    const g = sim.graph;
    const fedBy = (id: string) => sim.solution.origins.get(id) ?? new Set<string>();
    const utils = g.byKind('utility').map((u) => u.id);
    const resp = new Map(utils.map((u) => [u, this.response(u)]));
    sim.pqRejected = new Set(utils.filter((u) => resp.get(u)!.atsReject));
    let changed = false;
    for (const u of g.byKind('ups')) {
      // Judge by what feeds the rectifier input (that stays on the utility while the UPS is on battery).
      const inEdge = g.inEdges(u.id, 'power').find((e) => e.port === 'input');
      const reject = !!inEdge && [...fedBy(inEdge.from)].some((k) => resp.get(k)?.upsBattery);
      if (!!u.state.inputRejected !== reject) {
        if (reject) u.state.inputRejected = true;
        else delete u.state.inputRejected;
        changed = true;
        sim.log(reject ? 'warning' : 'info', u.tag, reject ? `${u.tag} input out of tolerance: carrying the load on battery.` : `${u.tag} input back in tolerance: back to double conversion, recharging.`);
      }
    }
    if (changed) sim.resolve();
    if (!hyd) return;
    for (const ch of [...g.byKind('chiller-water-cooled'), ...g.byKind('chiller-air-cooled')]) {
      if (![...fedBy(ch.id)].some((k) => resp.get(k)?.motorsDrop)) continue;
      if (hyd.powerDip(ch.id)) sim.log('warning', ch.tag, `${ch.tag} dropped offline on the voltage dip; it restarts on its restart timer once voltage is back.`);
    }
  }

  snapshot(): PqState {
    return JSON.parse(JSON.stringify(this.state)) as PqState;
  }

  restore(s: PqState): void {
    this.state = JSON.parse(JSON.stringify(s)) as PqState;
  }
}
