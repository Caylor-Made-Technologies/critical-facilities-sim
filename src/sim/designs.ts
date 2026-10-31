/**
 * Side-by-side comparison of the redundancy designs, computed by actually
 * building and breaking each plant rather than from a lookup table.
 */
import { Simulation } from './engine';
import { buildPlant, TOPOLOGIES, type Topology } from './plant/builder';

export interface DesignRow {
  topology: Topology;
  label: string;
  upsModules: number;
  upsSystems: number;
  generators: number;
  /** Installed UPS capacity ÷ IT load. */
  upsRatio: number;
  /** Highest normal load on any UPS system, as a fraction of its capacity. */
  peakUpsLoad: number;
  /** Losing one UPS module drops no racks. */
  survivesModule: boolean;
  /** Losing a whole UPS system (or taking it down for maintenance) drops no racks. */
  survivesSystem: boolean;
  /** Racks lost in the worst single-system failure. */
  worstSystemDrop: number;
  /** The closest idea from the common four-level tier scheme, for the power path only. Educational, not a rating. */
  tierIdea: 'I' | 'II' | 'III–IV';
}

const ORDER: Topology[] = ['N', 'N+1', 'N+2', '2N', '2N+1', 'DR', 'BLOCK'];

export function compareDesign(t: Topology): DesignRow {
  const sim = new Simulation(buildPlant(t));
  const ups = sim.graph.byKind('ups');
  const it = sim.solution.itDemandKw;
  const caps = sim.capacityReport().filter((c) => c.name.startsWith('UPS'));
  const fo = sim.failoverCheck();
  const worst = Math.max(0, ...fo.map((f) => f.dropped.length));
  const survivesSystem = fo.every((f) => f.dropped.length === 0 && f.overloaded.length === 0);
  const mod = sim.whatIfFail([ups[0]!.id], 30);
  const survivesModule = mod.dropped.length === 0 && mod.overloaded.length === 0;
  // Two independent paths → maintainable/fault tolerant (III–IV); spare modules on one path → II; nothing spare → I.
  const tierIdea: DesignRow['tierIdea'] = survivesSystem ? 'III–IV' : survivesModule ? 'II' : 'I';
  return {
    topology: t,
    label: TOPOLOGIES[t].label,
    upsModules: ups.length,
    upsSystems: caps.length,
    generators: sim.graph.byKind('generator').length,
    upsRatio: ups.reduce((s, u) => s + (u.ratedKw ?? 0), 0) / it,
    peakUpsLoad: Math.max(...caps.map((c) => c.loadKw / (c.unitKw * c.unitsTotal))),
    survivesModule,
    survivesSystem,
    worstSystemDrop: worst,
    tierIdea,
  };
}

let cache: DesignRow[] | null = null;

/** Every design, built and tested. Cached: the plants never change. */
export function compareDesigns(): DesignRow[] {
  cache ??= ORDER.map(compareDesign);
  return cache;
}

/** Where the facility's power goes right now. */
export interface PowerBreakdown {
  itKw: number;
  coolingKw: number;
  lossesKw: number;
  totalKw: number;
  /** Cooling split by equipment group. */
  cooling: { group: string; kw: number }[];
}

const COOLING_GROUPS: [string, string[]][] = [
  ['Chillers', ['chiller-water-cooled', 'chiller-air-cooled']],
  ['Towers and dry coolers', ['cooling-tower', 'dry-cooler']],
  ['Pumps', ['pump-chw', 'pump-cw']],
  ['Air handlers and CRACs', ['crah', 'crac']],
  ['Outdoor air (DOAS)', ['doas']],
];

export function powerBreakdown(sim: Simulation): PowerBreakdown {
  const totalKw = sim.facilityKw();
  const itKw = sim.solution.itPoweredKw;
  const cooling = COOLING_GROUPS.map(([group, kinds]) => ({
    group,
    kw: sim.graph
      .byKind(...(kinds as Parameters<typeof sim.graph.byKind>))
      .filter((n) => sim.solution.energized.has(n.id))
      .reduce((s, n) => s + (n.state.demandKw ?? 0), 0),
  }));
  const coolingKw = cooling.reduce((s, c) => s + c.kw, 0);
  return { itKw, coolingKw, lossesKw: Math.max(0, totalKw - itKw - coolingKw), totalKw, cooling };
}
