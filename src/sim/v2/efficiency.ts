/**
 * Engine v2 efficiency readout (Phase 4c part 3): live PUE built bottom-up from the v2 models, and
 * psychrometrics for outdoors and the data hall. Read-only: it changes nothing in the plant.
 *
 *   PUE = total facility kW / IT kW
 *   total = IT + CRAH fans (air side) + CHW pumps + chillers + CW pumps + tower fans (hydronic)
 *         + CDUs, DOAS units, UPS-room CRAC (v1 unit power until they get v2 models)
 *         + UPS losses (sources: mode efficiency) + transformer losses (electrical: loading)
 *
 * Psychrometric values use textbook approximations and are labeled Verify in the app.
 * Every formula is in physics.ts.
 */
import type { Simulation } from '../engine';
import { dewPointC, enthalpyKjKg, humidityRatio, pue, relativeHumidity, transformerLossKw, upsLossKw } from '../physics';
import { WEATHER } from '../thermal';
import type { AirsideModel } from './airside';
import type { ElectricalModel } from './electrical';
import type { HydronicModel } from './hydronic';
import type { SourcesModel } from './sources';

export interface PsychroPoint {
  dryBulbC: number;
  rhPct: number;
  dewPointC: number;
  /** kg water / kg dry air. */
  humidityRatio: number;
  /** kJ / kg dry air. */
  enthalpyKjKg: number;
}

export interface EfficiencyReading {
  itKw: number;
  /** kW by part, adding up to totalKw. */
  parts: { crahFans: number; chwPumps: number; chillers: number; cwPumps: number; towerFans: number; otherMech: number; upsLoss: number; txLoss: number };
  mechanicalKw: number;
  electricalLossKw: number;
  totalKw: number;
  pue: number;
  /** Cooling efficiency (all cooling kW per ton of heat removed). */
  coolingKwPerTon: number;
  econMode: 'off' | 'partial' | 'full';
  outdoor: PsychroPoint;
  hall: PsychroPoint;
}

const OTHER_MECH: readonly string[] = ['cdu', 'doas', 'crac'];

function point(dryBulbC: number, dewC: number, rhPct?: number): PsychroPoint {
  const rh = rhPct ?? relativeHumidity(dryBulbC, dewC);
  const w = humidityRatio(dryBulbC, rh);
  return { dryBulbC, rhPct: rh, dewPointC: dewC, humidityRatio: w, enthalpyKjKg: enthalpyKjKg(dryBulbC, w) };
}

export function readEfficiency(sim: Simulation, air: AirsideModel, hyd: HydronicModel, elec: ElectricalModel, sources: SourcesModel): EfficiencyReading {
  const sol = sim.solution;
  const itKw = sol.itPoweredKw;
  const a = air.reading;
  const h = hyd.reading;

  let otherMech = 0;
  for (const n of sim.graph.nodes.values()) {
    if (OTHER_MECH.includes(n.kind) && sol.energized.has(n.id)) otherMech += n.state.demandKw ?? 0;
  }
  let upsLoss = 0;
  for (const u of sim.graph.byKind('ups')) {
    if (!sol.energized.has(u.id)) continue;
    upsLoss += upsLossKw(sol.loadKw.get(u.id) ?? 0, sources.ups(sim, u.id).efficiency);
  }
  let txLoss = 0;
  for (const t of sim.graph.byKind('transformer')) {
    txLoss += transformerLossKw(t.ratedKw ?? 0, elec.read(sim, t.id).loading, sol.energized.has(t.id));
  }
  const chillers = Object.values(h.chillers).reduce((s, c) => s + c.kw, 0);
  const parts = {
    crahFans: a.fanKw,
    chwPumps: h.pumpKw,
    chillers,
    cwPumps: h.cwPumpKw,
    towerFans: h.towerFanKw,
    otherMech,
    upsLoss,
    txLoss,
  };
  const mechanicalKw = parts.crahFans + parts.chwPumps + parts.chillers + parts.cwPumps + parts.towerFans + parts.otherMech;
  const electricalLossKw = upsLoss + txLoss;
  const totalKw = itKw + mechanicalKw + electricalLossKw;
  const coolingTons = h.loadKwt / 3.517;

  const w = WEATHER[sim.thermal.state.weather];
  const hallDb = sim.thermal.readout?.hallInletC ?? a.temps.rackIn;
  return {
    itKw,
    parts,
    mechanicalKw,
    electricalLossKw,
    totalKw,
    pue: pue(totalKw, itKw),
    coolingKwPerTon: coolingTons > 0 ? mechanicalKw / coolingTons : 0,
    econMode: h.econMode,
    outdoor: point(w.dryBulbC, dewPointC(w.dryBulbC, w.rh), w.rh),
    hall: point(hallDb, sim.thermal.state.hallDewC),
  };
}
