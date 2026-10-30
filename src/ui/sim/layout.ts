/**
 * Automatic layout for the electrical one-line diagram.
 *
 * Components are placed in horizontal "stages" (utility at the top, PDUs
 * at the bottom), and within a stage ordered by the average x of the things
 * feeding them, which keeps most lines short and uncrossed.
 */
import type { Component, PlantGraph } from '../../sim';

export interface NodeBox {
  id: string;
  x: number; // center
  y: number; // center
  w: number;
  h: number;
  shape: 'breaker' | 'bus' | 'gen' | 'tx' | 'box';
}

export interface Layout {
  nodes: Map<string, NodeBox>;
  width: number;
  height: number;
  zones: { label: string; y: number }[];
}

const STAGE_GAP = 92;
const MIN_GAP = 112;

/** Kinds drawn on the one-line. Mechanical loads, racks and life safety have their own views. */
export function onOneLine(n: Component): boolean {
  if (n.domain !== 'electrical' && n.kind !== 'cdu') return false;
  return n.kind !== 'rack';
}

export function stageOf(n: Component): number {
  const id = n.id;
  switch (n.kind) {
    case 'utility':
    case 'generator':
      return 0;
    case 'mv-switchgear':
    case 'paralleling-bus':
      return 1;
    case 'transformer':
      return 2;
    case 'ats':
      return 3;
    case 'bess':
      return 4;
    case 'ups':
      return 7;
    case 'busway':
    case 'pdu':
      return 12;
    case 'cdu':
      return 13;
    case 'rpp':
      return 14;
    case 'sts':
      return /^STS-\d/.test(id) ? 13 : 10;
    case 'breaker':
      if (id.startsWith('MB-')) return 4;
      if (id === 'TIE-AB') return 5;
      if (id.startsWith('UOB-')) return 8;
      return 6; // UIB, SBB, MBB, FDR-MCC
    case 'bus':
      if (id.startsWith('MSB-')) return 5;
      if (id.startsWith('MCC-')) return 7;
      if (id.endsWith('-OUT')) return 11;
      return 9; // critical bus
    default:
      return 15;
  }
}

function shapeOf(n: Component): NodeBox['shape'] {
  if (n.kind === 'breaker') return 'breaker';
  if (n.kind === 'bus') return 'bus';
  if (n.kind === 'generator') return 'gen';
  if (n.kind === 'transformer') return 'tx';
  return 'box';
}

function sizeOf(shape: NodeBox['shape']): { w: number; h: number } {
  switch (shape) {
    case 'breaker':
      return { w: 26, h: 26 };
    case 'bus':
      return { w: 120, h: 12 };
    case 'gen':
      return { w: 40, h: 40 };
    case 'tx':
      return { w: 30, h: 44 };
    default:
      return { w: 84, h: 36 };
  }
}

const LANE: Record<string, number> = { A: 0, COMMON: 1, CATCHER: 1.5, B: 2, C: 3, D: 4 };

export function computeLayout(g: PlantGraph): Layout {
  const nodes = [...g.nodes.values()].filter(onOneLine);
  const byStage = new Map<number, Component[]>();
  for (const n of nodes) {
    const s = stageOf(n);
    if (!byStage.has(s)) byStage.set(s, []);
    byStage.get(s)!.push(n);
  }
  const stages = [...byStage.keys()].sort((a, b) => a - b);
  const pos = new Map<string, number>(); // x centers

  for (const s of stages) {
    const list = byStage.get(s)!;
    const bary = new Map<string, number>();
    const parentX = (n: Component) => {
      const xs = g
        .upstream(n.id, 'power')
        .map((p) => pos.get(p.id))
        .filter((x): x is number => x !== undefined);
      return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : undefined;
    };

    if (s === 0) {
      // Seed order: Utility A, A-side gens, shared gens, B-side gens, Utility B.
      const key = (n: Component) => (LANE[n.side] ?? 1) * 10 + (n.kind === 'utility' ? (n.side === 'B' ? 5 : -5) : 0);
      list.sort((a, b) => key(a) - key(b) || a.id.localeCompare(b.id, 'en', { numeric: true }));
      list.forEach((n, i) => bary.set(n.id, i * MIN_GAP));
    } else {
      for (const n of list) {
        let x = parentX(n);
        if (x === undefined && n.kind === 'bess') x = (pos.get(`MB-${n.side}`) ?? 0) + (n.side === 'A' ? -MIN_GAP : MIN_GAP);
        if (x === undefined) {
          // Same-stage neighbors (the tie breaker sits between the two switchboards).
          const xs = [...g.upstream(n.id, 'power'), ...g.downstream(n.id, 'power')]
            .map((p) => pos.get(p.id))
            .filter((v): v is number => v !== undefined);
          x = xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
        }
        bary.set(n.id, x);
      }
      list.sort(
        (a, b) =>
          bary.get(a.id)! - bary.get(b.id)! ||
          (LANE[a.side] ?? 1) - (LANE[b.side] ?? 1) ||
          a.id.localeCompare(b.id, 'en', { numeric: true }),
      );
    }

    // Resolve overlaps left-to-right, then shift the row back toward its targets.
    const xs: number[] = [];
    list.forEach((n, i) => {
      const want = bary.get(n.id)!;
      const w = sizeOf(shapeOf(n)).w;
      const gap = Math.max(MIN_GAP, w + 28);
      xs.push(i === 0 ? want : Math.max(want, xs[i - 1]! + gap));
    });
    const shift = list.reduce((acc, n, i) => acc + (bary.get(n.id)! - xs[i]!), 0) / Math.max(1, list.length);
    list.forEach((n, i) => pos.set(n.id, xs[i]! + shift));

    // Place the tie breaker after both switchboards are positioned.
    if (s === 5) {
      const a = pos.get('MSB-A');
      const b = pos.get('MSB-B');
      if (a !== undefined && b !== undefined) pos.set('TIE-AB', (a + b) / 2);
    }
  }

  // Normalize to a margin and build boxes.
  const minX = Math.min(...pos.values());
  const maxX = Math.max(...pos.values());
  const margin = 90;
  const out = new Map<string, NodeBox>();
  const stageIndex = new Map(stages.map((s, i) => [s, i]));
  for (const n of nodes) {
    const shape = shapeOf(n);
    const { w, h } = sizeOf(shape);
    out.set(n.id, {
      id: n.id,
      x: pos.get(n.id)! - minX + margin,
      y: 60 + stageIndex.get(stageOf(n))! * STAGE_GAP,
      w,
      h,
      shape,
    });
  }
  const zoneY = (stage: number) => 60 + (stageIndex.get(stage) ?? 0) * STAGE_GAP - 40;
  return {
    nodes: out,
    width: maxX - minX + margin * 2,
    height: 60 + stages.length * STAGE_GAP + 20,
    zones: [
      { label: 'Utility & generation', y: zoneY(0) },
      { label: 'Switchboards & storage', y: zoneY(4) },
      { label: 'UPS', y: zoneY(6) },
      { label: 'Critical distribution', y: zoneY(9) },
      { label: 'Data hall', y: zoneY(12) },
    ],
  };
}
