/**
 * What the 3D plant shows, worked out from the live simulation. Pure (no
 * three.js) so it's unit tested, and built from the same layouts as the 2D
 * diagrams so both views always agree and practice steps read the same.
 */
import { loadFraction, type Component, type Simulation } from '../../sim';
import { computeLayout, onOneLine } from '../sim/layout';
import { subLine } from '../sim/subline';

export type Side3D = 'a' | 'b' | 'c' | 'r' | 'common';
export type NodeState = 'ok' | 'off' | 'failed' | 'maint' | 'standby';
export type Temp = 'chws' | 'chwr' | 'cwc' | 'cwh';

export interface Node3D {
  id: string;
  tag: string;
  kind: Component['kind'] | 'hx';
  x: number;
  z: number;
  state: NodeState;
  /** Energized (electrical) or running (mechanical). */
  live: boolean;
  side: Side3D;
  /** Breakers: closed? */
  closed?: boolean;
  /** Short live status text, same as the 2D diagram. */
  sub: string;
  /** 0..1.2 load (for glow/speed). */
  load: number;
}

export interface Link3D {
  id: string;
  /** Polyline points [x, z] in scene units. */
  pts: [number, number][];
  live: boolean;
  /** Power links: which side's color. Water links: temperature class. */
  side?: Side3D;
  temp?: Temp;
  width: number;
  /** 0..1.2: drives pulse speed. */
  load: number;
}

export interface Plant3D {
  domain: 'electrical' | 'mechanical';
  nodes: Node3D[];
  links: Link3D[];
  /** Scene bounds [minX, minZ, maxX, maxZ]. */
  bounds: [number, number, number, number];
  zones: { label: string; z: number }[];
}

/** 2D diagram pixels to 3D units. */
export const PX = 1 / 40;

const SIDE: Record<string, Side3D> = { A: 'a', B: 'b', C: 'c', CATCHER: 'r', COMMON: 'common' };
const stateOf = (n: Component, live: boolean): NodeState =>
  n.status === 'failed' ? 'failed' : n.status === 'maintenance' ? 'maint' : n.status === 'standby' && !live ? 'standby' : live ? 'ok' : 'off';

export function electricalModel(sim: Simulation): Plant3D {
  const g = sim.graph;
  const sol = sim.solution;
  const layout = computeLayout(g);
  const nodes: Node3D[] = [];
  for (const n of g.nodes.values()) {
    if (!onOneLine(n)) continue;
    const b = layout.nodes.get(n.id)!;
    // A generator on a test run is running even though it isn't on the bus yet.
    const live = sol.energized.has(n.id) || (n.kind === 'generator' && n.state.genState === 'running');
    nodes.push({
      id: n.id,
      tag: n.tag,
      kind: n.kind,
      x: b.x * PX,
      z: b.y * PX,
      state: stateOf(n, live),
      live,
      side: SIDE[n.side] ?? 'common',
      closed: n.kind === 'breaker' ? !!n.state.closed : undefined,
      sub: subLine(sim, n),
      load: n.ratedKw ? Math.min(1.2, loadFraction(g, sol, n.id)) : 0,
    });
  }
  const seen = new Set<string>();
  const links: Link3D[] = [];
  for (const e of g.edges) {
    if (e.kind !== 'power' || !layout.nodes.has(e.from) || !layout.nodes.has(e.to)) continue;
    const k = [e.from, e.to].sort().join('|');
    if (seen.has(k)) continue;
    seen.add(k);
    const a = layout.nodes.get(e.from)!;
    const bb = layout.nodes.get(e.to)!;
    const from = g.get(e.from);
    const to = g.get(e.to);
    const carrying = (sol.feeders.get(e.to)?.includes(e.from) ?? false) || (sol.feeders.get(e.from)?.includes(e.to) ?? false);
    const live = sol.energized.has(e.from) && sol.energized.has(e.to) && carrying;
    // Same route as the 2D one-line: down, across, down.
    let pts: [number, number][];
    if (Math.abs(a.y - bb.y) < 1) pts = [[a.x * PX, a.y * PX], [bb.x * PX, bb.y * PX]];
    else {
      const [top, bot] = a.y < bb.y ? [a, bb] : [bb, a];
      const mid = bot.y - bot.h / 2 - 16;
      pts = [[top.x * PX, top.y * PX], [top.x * PX, mid * PX], [bot.x * PX, mid * PX], [bot.x * PX, bot.y * PX]];
    }
    links.push({
      id: e.id,
      pts,
      live,
      side: SIDE[(to.side === 'COMMON' ? from : to).side] ?? 'common',
      width: 1,
      load: Math.min(1.2, loadFraction(g, sol, to.ratedKw ? to.id : from.id)),
    });
  }
  const xs = nodes.map((n) => n.x);
  const zs = nodes.map((n) => n.z);
  return {
    domain: 'electrical',
    nodes,
    links,
    bounds: [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)],
    zones: layout.zones.map((z) => ({ label: z.label, z: (z.y + 20) * PX })),
  };
}

// --- Mechanical: same positions as the 2D plant diagram (MechPlant.tsx) ---
export const MECH = {
  COLS: [110, 250, 390],
  Y: { tower: 70, cwp: 175, chiller: 270, hdrS: 350, hdrR: 372, chwp: 430, dist: 500, hall: 565 },
  CRAH_X: [70, 140, 210, 280, 350, 420, 490, 560],
  CDU_X: [660, 735, 810],
} as const;

export function mechanicalModel(sim: Simulation): Plant3D {
  const g = sim.graph;
  const r = sim.thermal.readout;
  const { COLS, Y, CRAH_X, CDU_X } = MECH;
  const running = new Set(r.running);
  const flowing = r.chwFlowFraction > 0;
  const econ = r.economizer !== 'off';
  const nodes: Node3D[] = [];
  const add = (id: string, x: number, y: number, kind?: Node3D['kind'], sub?: string) => {
    const n = g.nodes.get(id);
    const live = id === 'HX' ? econ : running.has(id);
    nodes.push({
      id,
      tag: n?.tag ?? id,
      kind: kind ?? n?.kind ?? 'hx',
      x: x * PX,
      z: y * PX,
      state: n ? stateOf(n, live) : live ? 'ok' : 'off',
      live,
      side: 'common',
      sub: sub ?? (n ? (n.status === 'failed' ? 'FAILED' : n.status === 'maintenance' ? 'MAINT' : live ? 'running' : n.status === 'standby' ? 'standby' : 'off') : econ ? r.economizer : 'off'),
      load: live ? 1 : 0,
    });
  };
  COLS.forEach((x, i) => {
    add(`CT-0${i + 1}`, x, Y.tower);
    add(`CWP-0${i + 1}`, x, Y.cwp);
    add(`CH-0${i + 1}`, x, Y.chiller, undefined, r.chillers[`CH-0${i + 1}`] ?? undefined);
    add(`CHWP-0${i + 1}`, x, Y.chwp);
  });
  add('HX', 560, Y.chiller, 'hx', `free cooling · ${r.economizer}`);
  add('ACH-04', 700, Y.chiller, undefined, r.chillers['ACH-04'] ?? undefined);
  add('TES-01', 560, Y.chwp, undefined, `${Math.round(r.tesSoc * 100)}% · ${isFinite(r.tesMinutes) ? Math.round(r.tesMinutes) : '—'} min`);
  add('DOAS-01', 700, Y.chwp);
  add('DOAS-02', 795, Y.chwp);
  add('CRAC-201', 895, Y.chwp - 120);
  CRAH_X.forEach((x, i) => add(`CRAH-${101 + i}`, x, Y.hall));
  CDU_X.forEach((x, i) => {
    const row = r.gpuRows[i]!;
    add(`CDU-${i + 1}`, x, Y.hall, undefined, `GPU ${Math.round(row.tempC)} °C${row.tripped ? ' TRIP' : row.throttled ? ' THROTTLE' : ''}`);
  });
  // Only keep nodes that exist in this plant (HX is a drawing-only unit).
  const kept = nodes.filter((n) => n.id === 'HX' || g.nodes.has(n.id));

  const links: Link3D[] = [];
  const pipe = (id: string, pts: [number, number][], temp: Temp, live: boolean, width = 1) =>
    links.push({ id, pts: pts.map(([x, y]) => [x * PX, y * PX] as [number, number]), temp, live, width, load: live ? 1 : 0 });
  COLS.forEach((x, i) => {
    const live = running.has(`CWP-0${i + 1}`) || running.has(`CT-0${i + 1}`);
    pipe(`cw-s-${i}`, [[x - 14, Y.tower + 24], [x - 14, Y.chiller - 28]], 'cwc', live);
    pipe(`cw-r-${i}`, [[x + 14, Y.chiller - 28], [x + 14, Y.tower + 24]], 'cwh', live && running.has(`CH-0${i + 1}`));
  });
  pipe('hx-tie', [[COLS[2] + 14, 215], [560, 215], [560, Y.chiller - 24]], 'cwc', econ);
  [...COLS, 560, 700].forEach((x, i) => {
    const id = ['CH-01', 'CH-02', 'CH-03', 'HX', 'ACH-04'][i]!;
    const live = id === 'HX' ? econ && flowing : r.chillers[id] === 'running' && flowing;
    pipe(`chw-s-${id}`, [[x - 10, Y.chiller + 28], [x - 10, Y.hdrS]], 'chws', live);
    pipe(`chw-r-${id}`, [[x + 10, Y.hdrR], [x + 10, Y.chiller + 28]], 'chwr', live);
  });
  pipe('hdr-s', [[40, Y.hdrS], [930, Y.hdrS]], 'chws', flowing, 1.6);
  pipe('hdr-r', [[930, Y.hdrR], [40, Y.hdrR]], 'chwr', flowing, 1.6);
  COLS.forEach((x, i) => pipe(`pump-${i}`, [[x, Y.hdrS], [x, Y.dist]], 'chws', running.has(`CHWP-0${i + 1}`)));
  pipe('tes', [[560, Y.hdrS], [560, Y.chwp - 36]], 'chws', r.tesDischargeKwt > 0 || flowing);
  pipe('dist', [[40, Y.dist], [880, Y.dist]], 'chws', flowing, 1.3);
  [...CRAH_X, ...CDU_X, 880].forEach((x) => pipe(`drop-${x}`, [[x, Y.dist], [x, Y.hall - 26]], 'chws', flowing, 0.8));

  const xs = kept.map((n) => n.x);
  const zs = kept.map((n) => n.z);
  return {
    domain: 'mechanical',
    nodes: kept,
    links,
    bounds: [Math.min(...xs, 40 * PX), Math.min(...zs), Math.max(...xs, 930 * PX), Math.max(...zs)],
    zones: [
      { label: 'Heat rejection', z: 22 * PX },
      { label: 'Chillers & storage', z: 235 * PX },
      { label: 'Data hall cooling', z: 470 * PX },
    ],
  };
}

export function plantModel(sim: Simulation, domain: 'electrical' | 'mechanical'): Plant3D {
  return domain === 'electrical' ? electricalModel(sim) : mechanicalModel(sim);
}
