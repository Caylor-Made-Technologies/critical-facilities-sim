/**
 * power.ts — electrical solver.
 *
 * Given the plant graph in its current state (breaker positions, ATS
 * selections, failures, battery charge), work out:
 *   1. which components are energized, and by what;
 *   2. how much load flows through each component;
 *   3. which UPS modules are on battery or static bypass;
 *   4. whether any two independent sources are being paralleled.
 *
 * The solver is a pure function of the graph — it never mutates it — so it
 * is easy to unit test and safe to call speculatively ("what if I close
 * this breaker?").
 */

import type { PlantGraph } from './graph';
import type { Component, Edge } from './types';
import { PHYSICS, upsInputKw } from './physics';

export type UpsOperatingMode = 'normal' | 'battery' | 'static-bypass' | 'off';

export interface PowerSolution {
  energized: Set<string>;
  /** Kilowatts flowing out of each energized component toward its loads. */
  loadKw: Map<string, number>;
  /** Which upstream components actually carry each component's load. */
  feeders: Map<string, string[]>;
  upsMode: Map<string, UpsOperatingMode>;
  /** Discharge rate of each BESS that is currently supporting the bus. */
  bessDischargeKw: Map<string, number>;
  /** Output of each primary source (utility, generator). */
  sourceKw: Map<string, number>;
  /** Independent source groups reaching each node. More than one = paralleling. */
  origins: Map<string, Set<string>>;
  /** Nodes fed by two or more unsynchronized sources. */
  paralleled: string[];
  /** Total IT demand that is powered (kW). */
  itPoweredKw: number;
  /** Total IT demand in the plant (kW), powered or not. */
  itDemandKw: number;
}

/** A component can carry power only in these statuses. */
function isAvailable(n: Component): boolean {
  return n.status === 'online' || n.status === 'standby';
}

/** Is this node itself a primary (non-storage) source right now? */
function isPrimarySource(n: Component): boolean {
  if (!isAvailable(n)) return false;
  if (n.kind === 'utility') return true;
  if (n.kind === 'generator') return n.state.genState === 'running' && (n.state.fuelL ?? 1) > 0;
  return false;
}

/**
 * Origin key for paralleling detection. Generators on the same paralleling
 * bus are synchronized by their switchgear, so they count as one source.
 */
function originKey(g: PlantGraph, n: Component): string {
  if (n.kind === 'generator') {
    const bus = g.downstream(n.id, 'power').find((d) => d.kind === 'paralleling-bus');
    return bus ? `gens:${bus.id}` : n.id;
  }
  return n.id;
}

/**
 * Which input edges may carry power into a node, given its own state.
 * `upsModes` lets the solver pin a UPS to static bypass after an overload.
 */
function conductingInputs(g: PlantGraph, n: Component, forcedBypass: Set<string>): Edge[] {
  if (!isAvailable(n)) return [];
  const inputs = g.inEdges(n.id, 'power');
  switch (n.kind) {
    case 'utility':
    case 'generator':
    case 'bess':
      return []; // sources have no power inputs
    case 'breaker':
      return n.state.closed ? inputs : [];
    case 'ats':
      return inputs.filter((e) => e.port === n.state.selected);
    case 'ups': {
      if (n.state.upsMode === 'off') return [];
      const bypass = n.state.upsMode === 'static-bypass' || forcedBypass.has(n.id);
      return inputs.filter((e) => e.port === (bypass ? 'bypass' : 'input'));
    }
    default:
      // STS: both inputs conduct for energization; the selection is applied to load flow.
      return inputs;
  }
}

interface Walk {
  energized: Set<string>;
  rank: Map<string, number>;
  next: number;
}

/** Breadth-first spread of energization from a set of new sources. */
function spread(g: PlantGraph, walk: Walk, seeds: Component[], forcedBypass: Set<string>): void {
  const queue: string[] = [];
  for (const s of seeds) {
    if (walk.energized.has(s.id)) continue;
    walk.energized.add(s.id);
    walk.rank.set(s.id, walk.next++);
    queue.push(s.id);
  }
  while (queue.length) {
    const id = queue.shift()!;
    for (const edge of g.outEdges(id, 'power')) {
      if (walk.energized.has(edge.to)) continue;
      const target = g.get(edge.to);
      const ok = conductingInputs(g, target, forcedBypass).some((e) => e === edge);
      if (!ok) continue;
      walk.energized.add(target.id);
      walk.rank.set(target.id, walk.next++);
      queue.push(target.id);
    }
  }
}

/** Every energized node reachable downstream from `start` through conducting edges. */
function reachableFrom(g: PlantGraph, start: string, energized: Set<string>, forcedBypass: Set<string>): Set<string> {
  const seen = new Set<string>();
  const stack = [start];
  while (stack.length) {
    const id = stack.pop()!;
    for (const e of g.outEdges(id, 'power')) {
      if (seen.has(e.to) || !energized.has(e.to)) continue;
      if (!conductingInputs(g, g.get(e.to), forcedBypass).includes(e)) continue;
      seen.add(e.to);
      stack.push(e.to);
    }
  }
  return seen;
}

/** Fixpoint propagation of source identities, used to spot paralleling. */
function propagateOrigins(g: PlantGraph, energized: Set<string>, forcedBypass: Set<string>): Map<string, Set<string>> {
  const origins = new Map<string, Set<string>>();
  for (const id of energized) origins.set(id, new Set());
  for (const n of g.nodes.values()) {
    if (energized.has(n.id) && isPrimarySource(n)) origins.get(n.id)!.add(originKey(g, n));
  }
  let changed = true;
  while (changed) {
    changed = false;
    for (const n of g.nodes.values()) {
      if (!energized.has(n.id)) continue;
      const mine = origins.get(n.id)!;
      let inputs = conductingInputs(g, n, forcedBypass).filter((e) => energized.has(e.from));
      // An STS connects only one source at a time (break-before-make).
      if (n.kind === 'sts') {
        const pref = inputs.find((e) => e.port === 'preferred');
        inputs = pref ? [pref] : inputs.slice(0, 1);
      }
      for (const e of inputs) {
        const theirs = origins.get(e.from);
        if (!theirs) continue;
        for (const o of theirs) {
          if (!mine.has(o)) {
            mine.add(o);
            changed = true;
          }
        }
      }
    }
  }
  return origins;
}

function solveOnce(g: PlantGraph, forcedBypass: Set<string>): PowerSolution {
  const walk: Walk = { energized: new Set(), rank: new Map(), next: 0 };

  // Pass 1: utilities and running generators.
  spread(g, walk, [...g.nodes.values()].filter(isPrimarySource), forcedBypass);

  // Pass 2: BESS discharges only onto a bus that lost its normal source.
  const bessSources = g.byKind('bess').filter((b) => {
    if (!isAvailable(b) || (b.state.soc ?? 0) <= 0) return false;
    return g.downstream(b.id, 'power').some((d) => !walk.energized.has(d.id));
  });
  spread(g, walk, bessSources, forcedBypass);

  // Pass 3: UPS modules whose input is dead ride on their batteries.
  const onBattery = g.byKind('ups').filter((u) => {
    if (walk.energized.has(u.id) || !isAvailable(u)) return false;
    if (u.state.upsMode !== 'auto' && u.state.upsMode !== undefined) return false;
    if (forcedBypass.has(u.id)) return false;
    return (u.state.soc ?? 0) > 0;
  });
  spread(g, walk, onBattery, forcedBypass);
  const batterySet = new Set(onBattery.filter((u) => walk.energized.has(u.id)).map((u) => u.id));
  const bessSet = new Set(bessSources.map((b) => b.id));

  // --- Which upstream components actually carry each node's load?
  const feeders = new Map<string, string[]>();
  const live = (e: Edge) => walk.energized.has(e.from);
  for (const id of walk.energized) {
    const n = g.get(id);
    // Primary and storage sources terminate the load path.
    if (isPrimarySource(n) || batterySet.has(id) || bessSet.has(id)) {
      feeders.set(id, []);
      continue;
    }
    const inputs = conductingInputs(g, n, forcedBypass).filter(live);
    // A feeder must not itself be downstream of this node. That rule removes
    // the loop a closed tie breaker creates between two switchboard buses.
    const downstreamOfMe = reachableFrom(g, id, walk.energized, forcedBypass);
    let chosen = inputs.filter((e) => !downstreamOfMe.has(e.from));
    // A bus fed only through a tie is in a loop; fall back to whichever side was energized first.
    if (!chosen.length) {
      const myRank = walk.rank.get(id)!;
      chosen = inputs.filter((e) => walk.rank.get(e.from)! < myRank);
    }
    // An STS carries load from one input only: preferred if live, else alternate.
    if (n.kind === 'sts') {
      const pref = chosen.find((e) => e.port === 'preferred');
      chosen = pref ? [pref] : chosen.filter((e) => e.port === 'alternate').slice(0, 1);
    }
    feeders.set(id, chosen.map((e) => e.from));
  }

  // --- Load flow: accumulate from the loads up toward the sources (Kahn's algorithm).
  const loadKw = new Map<string, number>();
  const pending = new Map<string, number>(); // number of dependents not yet processed
  for (const id of walk.energized) {
    loadKw.set(id, 0);
    pending.set(id, 0);
  }
  for (const fs of feeders.values()) for (const f of fs) pending.set(f, (pending.get(f) ?? 0) + 1);

  const ready = [...walk.energized].filter((id) => pending.get(id) === 0);
  const done = new Set<string>();
  const process = (id: string) => {
    done.add(id);
    const n = g.get(id);
    const through = (loadKw.get(id) ?? 0) + (n.state.demandKw ?? 0);
    loadKw.set(id, through);
    const fs = feeders.get(id) ?? [];
    if (!fs.length) return;
    // Conversion losses on the way up.
    let draw = through;
    if (n.kind === 'ups' && !forcedBypass.has(id) && n.state.upsMode !== 'static-bypass') draw = upsInputKw(through);
    if (n.kind === 'transformer') draw = through * (1 + PHYSICS.transformerLoss);
    for (const f of fs) {
      loadKw.set(f, (loadKw.get(f) ?? 0) + draw / fs.length);
      const left = pending.get(f)! - 1;
      pending.set(f, left);
      if (left === 0) ready.push(f);
    }
  };
  while (ready.length) process(ready.pop()!);
  // Safety net for any unexpected loop: finish the rest in reverse energization order.
  const leftovers = [...walk.energized]
    .filter((id) => !done.has(id))
    .sort((a, b) => walk.rank.get(b)! - walk.rank.get(a)!);
  for (const id of leftovers) process(id);

  // --- UPS modes
  const upsMode = new Map<string, UpsOperatingMode>();
  for (const u of g.byKind('ups')) {
    if (!walk.energized.has(u.id)) upsMode.set(u.id, 'off');
    else if (batterySet.has(u.id)) upsMode.set(u.id, 'battery');
    else if (forcedBypass.has(u.id) || u.state.upsMode === 'static-bypass') upsMode.set(u.id, 'static-bypass');
    else upsMode.set(u.id, 'normal');
  }

  const bessDischargeKw = new Map<string, number>();
  for (const id of bessSet) {
    if (walk.energized.has(id)) bessDischargeKw.set(id, loadKw.get(id) ?? 0);
  }

  const sourceKw = new Map<string, number>();
  for (const n of g.nodes.values()) {
    if (walk.energized.has(n.id) && isPrimarySource(n)) sourceKw.set(n.id, loadKw.get(n.id) ?? 0);
  }

  const origins = propagateOrigins(g, walk.energized, forcedBypass);
  // Dual-corded loads draw from two sources by design: their power supplies
  // keep the cords isolated, so that is not paralleling.
  const isolatedLoad = (id: string) => ['rack', 'cdu'].includes(g.get(id).kind);
  const paralleled = [...origins.entries()]
    .filter(([id, o]) => o.size > 1 && !isolatedLoad(id))
    .map(([id]) => id);

  let itDemandKw = 0;
  let itPoweredKw = 0;
  for (const r of g.byKind('rack')) {
    const d = r.state.demandKw ?? 0;
    itDemandKw += d;
    if (walk.energized.has(r.id)) itPoweredKw += d;
  }

  return {
    energized: walk.energized,
    loadKw,
    feeders,
    upsMode,
    bessDischargeKw,
    sourceKw,
    origins,
    paralleled,
    itPoweredKw,
    itDemandKw,
  };
}

/**
 * Solve the electrical network.
 *
 * Runs up to a few iterations: if a UPS module ends up above its overload
 * threshold, it transfers to static bypass (as a real UPS would) and the
 * network is solved again with that module bypassed.
 */
export function solvePower(g: PlantGraph): PowerSolution {
  const forcedBypass = new Set<string>();
  let sol = solveOnce(g, forcedBypass);
  for (let i = 0; i < 4; i++) {
    let changed = false;
    for (const u of g.byKind('ups')) {
      if (forcedBypass.has(u.id) || sol.upsMode.get(u.id) !== 'normal') continue;
      if ((sol.loadKw.get(u.id) ?? 0) / u.ratedKw > PHYSICS.upsOverloadTransfer) {
        forcedBypass.add(u.id);
        changed = true;
      }
    }
    if (!changed) break;
    sol = solveOnce(g, forcedBypass);
  }
  return sol;
}

/** Load as a fraction of rating (0 when the component has no rating). */
export function loadFraction(g: PlantGraph, sol: PowerSolution, id: string): number {
  const n = g.get(id);
  if (!n.ratedKw) return 0;
  return (sol.loadKw.get(id) ?? 0) / n.ratedKw;
}
