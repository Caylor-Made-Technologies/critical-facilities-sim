/**
 * What the 3D data hall shows, worked out from the live simulation. Pure
 * (no three.js), so it's unit tested and the 2D and 3D halls agree.
 */
import { ROWS, type Simulation } from '../../sim';

export type RackStatus = 'up' | 'throttled' | 'hot' | 'down';

export interface RackVis {
  id: string;
  num: number;
  /** Row index 0..n-1 (front to back). */
  row: number;
  /** Position within the row 0..n-1. */
  slot: number;
  gpu: boolean;
  single: boolean;
  status: RackStatus;
  cordA: boolean;
  cordB: boolean;
  kw: number;
}

export interface HallVis {
  racks: RackVis[];
  rows: number;
  perRow: number;
  /** Hall inlet temperature, °C. */
  inletC: number;
  /** 0..1: how hard the cooling is working (drives airflow speed). */
  airflow: number;
  /** Any rack down. */
  alarm: boolean;
}

const pad = (n: number) => String(n).padStart(2, '0');

export function hallVis(sim: Simulation): HallVis {
  const th = sim.thermal.readout;
  const sol = sim.solution;
  const g = sim.graph;
  const cordLive = (rackId: string, port: string) => {
    const edge = g.inEdges(rackId, 'power').find((e) => e.port === port);
    return !!edge && sol.energized.has(edge.from) && (sol.feeders.get(rackId) ?? []).includes(edge.from);
  };
  const racks: RackVis[] = [];
  let perRow = 0;
  ROWS.forEach((row, ri) => {
    const nums = [...row.dual, ...row.single];
    perRow = Math.max(perRow, nums.length);
    nums.forEach((num, slot) => {
      const id = `R-${pad(num)}`;
      const r = g.get(id);
      const powered = sol.energized.has(id);
      const hot = !!r.state.thermalTrip;
      const up = powered && !hot;
      const rowState = r.highDensity ? th.gpuRows[Math.ceil(num / 4) - 1] : undefined;
      const throttled = !!rowState?.throttled && up;
      const single = row.single.includes(num);
      racks.push({
        id,
        num,
        row: ri,
        slot,
        gpu: !!r.highDensity,
        single,
        status: !powered ? 'down' : hot ? 'hot' : throttled ? 'throttled' : 'up',
        cordA: cordLive(id, 'A'),
        cordB: !single && cordLive(id, 'B'),
        kw: r.state.demandKw ?? 0,
      });
    });
  });
  // Airflow: share of CRAH units running and powered.
  const crahs = g.byKind('crah');
  const running = crahs.filter((c) => c.status === 'online' && sol.energized.has(c.id)).length;
  return {
    racks,
    rows: ROWS.length,
    perRow,
    inletC: th.hallInletC,
    airflow: crahs.length ? running / crahs.length : 0,
    alarm: racks.some((r) => r.status === 'down' || r.status === 'hot'),
  };
}

/** A gentle, always-healthy demo hall for the Home page (no simulation needed). */
export function demoHall(rows = 6, perRow = 6): HallVis {
  const racks: RackVis[] = [];
  for (let r = 0; r < rows; r++)
    for (let s = 0; s < perRow; s++)
      racks.push({ id: `D-${r}-${s}`, num: r * perRow + s + 1, row: r, slot: s, gpu: r >= rows - 2, single: false, status: 'up', cordA: true, cordB: true, kw: r >= rows - 2 ? 130 : 30 });
  return { racks, rows, perRow, inletC: 24, airflow: 0.8, alarm: false };
}

/** Rack colors by status, as theme keys, so 2D legend and 3D agree. */
export const STATUS_COLOR: Record<RackStatus, 'ok' | 'warn' | 'alarm'> = { up: 'ok', throttled: 'warn', hot: 'alarm', down: 'alarm' };

/** Inlet temperature to a 0..1 heat value (18 °C cool … 32 °C hot). */
export const heat01 = (c: number) => Math.max(0, Math.min(1, (c - 18) / 14));
