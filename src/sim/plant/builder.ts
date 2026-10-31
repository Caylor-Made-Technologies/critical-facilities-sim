/**
 * builder.ts — builds the reference plant for a chosen redundancy topology.
 *
 * The IT load is the same in every topology (36 racks, 2,100 kW). Only the
 * UPS / generator / distribution architecture changes, so users can watch
 * the same failure play out differently.
 *
 * Every tag is invented and generic (UPS-A1, CH-02, CRAH-104).
 */

import { PlantGraph } from '../graph';
import { InterlockSystem } from '../interlocks';
import type { Component, ComponentKind, Domain, Side, Status } from '../types';
import { EXPLAINERS } from './explainers';

export type Topology = 'N' | 'N+1' | 'N+2' | '2N' | '2N+1' | 'DR' | 'BLOCK';

export const TOPOLOGIES: Record<Topology, { label: string; summary: string }> = {
  N: {
    label: 'N',
    summary: 'Exactly enough capacity. Any single failure or maintenance outage drops load.',
  },
  'N+1': {
    label: 'N+1',
    summary: 'One spare component per group. Survives one component failure, but there is still a single distribution path.',
  },
  'N+2': {
    label: 'N+2',
    summary: 'Two spares per group. Survives a failure while another unit is out for maintenance, but there is still one path.',
  },
  '2N': {
    label: '2N',
    summary: 'Two fully independent A and B systems, each able to carry the whole load. Dual-corded racks survive losing an entire side.',
  },
  '2N+1': {
    label: '2N+1',
    summary: 'Two independent systems, each with a spare module. A side can be in maintenance and the other side still has N+1.',
  },
  DR: {
    label: 'Distributed redundant',
    summary: 'Three UPS systems, each normally about 2/3 loaded. Racks are spread across pairs (A/B, B/C, C/A), so losing any one system shifts its load onto the other two. Same resilience as 2N with fewer modules.',
  },
  BLOCK: {
    label: 'Block redundant ("catcher")',
    summary: 'Three active UPS blocks plus one reserve "catcher" block. Static transfer switches move a block\'s load to the catcher if its UPS fails.',
  },
};

// --- Design constants -----------------------------------------------------------

export const DESIGN = {
  upsModuleKw: 750,
  /** DR systems use larger modules sized for 1.5× their normal share. */
  drModuleKw: 1100,
  generatorKw: 1250,
  generatorDayTankL: 1000,
  bessKw: 2000,
  bessKwh: 1000,
  gpuRackKw: 130,
  generalRackKw: 25,
  singleCordRackKw: 15,
  cduKw: 30,
  busKw: 4000,
  busway: 1000,
  pduKw: 300,
  rppKw: 100,
} as const;

/** One row of racks on the data hall floor. */
interface RowSpec {
  row: number;
  kind: 'gpu' | 'general';
  /** Rack numbers that are dual-corded. */
  dual: number[];
  /** Rack numbers that are single-corded (fed through an STS). */
  single: number[];
}

/** Six rows: three GPU rows and three general rows, each general row with two single-corded racks. */
export const ROWS: RowSpec[] = [
  { row: 1, kind: 'gpu', dual: [1, 2, 3, 4], single: [] },
  { row: 2, kind: 'gpu', dual: [5, 6, 7, 8], single: [] },
  { row: 3, kind: 'gpu', dual: [9, 10, 11, 12], single: [] },
  { row: 4, kind: 'general', dual: [13, 14, 15, 16, 17, 18], single: [19, 20] },
  { row: 5, kind: 'general', dual: [21, 22, 23, 24, 25, 26], single: [27, 28] },
  { row: 6, kind: 'general', dual: [29, 30, 31, 32, 33, 34], single: [35, 36] },
];

/** A UPS system: a group of paralleled modules feeding one critical bus. */
export interface UpsSystemSpec {
  id: string; // 'A', 'B', 'C', 'CATCHER'
  side: Side;
  modules: number;
  moduleKw: number;
  /** Which switchboard feeds it. */
  msb: 'A' | 'B';
}

export interface PlantMeta {
  topology: Topology;
  upsSystems: UpsSystemSpec[];
  /** Generator groups (one per paralleling bus) with their unit ids. */
  generatorGroups: { busId: string; units: string[] }[];
  /** Critical bus ids feeding each row's A and B cords. */
  rowFeeds: Record<number, { A: string; B: string }>;
  /** Design facility load the generators must carry (kW, approximate). */
  designFacilityKw: number;
}

export interface Plant {
  graph: PlantGraph;
  interlocks: InterlockSystem;
  meta: PlantMeta;
}

// --- Helpers --------------------------------------------------------------------

const DOMAIN_OF: Partial<Record<ComponentKind, Domain>> = {
  'chiller-water-cooled': 'mechanical',
  'chiller-air-cooled': 'mechanical',
  'cooling-tower': 'mechanical',
  'dry-cooler': 'mechanical',
  'pump-chw': 'mechanical',
  'pump-cw': 'mechanical',
  'tes-tank': 'mechanical',
  crah: 'mechanical',
  crac: 'mechanical',
  cdu: 'mechanical',
  doas: 'mechanical',
  'fire-alarm': 'life-safety',
  preaction: 'life-safety',
  'clean-agent': 'life-safety',
  epo: 'life-safety',
};

interface NodeOpts {
  side?: Side;
  status?: Status;
  ratedKw?: number;
  state?: Component['state'];
  highDensity?: boolean;
}

function makeNode(id: string, name: string, kind: ComponentKind, o: NodeOpts = {}): Component {
  return {
    id,
    tag: id,
    name,
    kind,
    domain: DOMAIN_OF[kind] ?? 'electrical',
    side: o.side ?? 'COMMON',
    status: o.status ?? 'online',
    ratedKw: o.ratedKw ?? 0,
    highDensity: o.highDensity,
    state: { ...(o.state ?? {}) },
    explainer: EXPLAINERS[kind],
  };
}

const pad = (n: number) => String(n).padStart(2, '0');

// --- Topology specs ---------------------------------------------------------------

function upsSystemsFor(t: Topology): UpsSystemSpec[] {
  const M = DESIGN.upsModuleKw;
  switch (t) {
    case 'N':
      return [{ id: 'A', side: 'A', modules: 3, moduleKw: M, msb: 'A' }];
    case 'N+1':
      return [{ id: 'A', side: 'A', modules: 4, moduleKw: M, msb: 'A' }];
    case 'N+2':
      return [{ id: 'A', side: 'A', modules: 5, moduleKw: M, msb: 'A' }];
    case '2N':
      return [
        { id: 'A', side: 'A', modules: 3, moduleKw: M, msb: 'A' },
        { id: 'B', side: 'B', modules: 3, moduleKw: M, msb: 'B' },
      ];
    case '2N+1':
      return [
        { id: 'A', side: 'A', modules: 4, moduleKw: M, msb: 'A' },
        { id: 'B', side: 'B', modules: 4, moduleKw: M, msb: 'B' },
      ];
    case 'DR':
      return [
        { id: 'A', side: 'A', modules: 1, moduleKw: DESIGN.drModuleKw, msb: 'A' },
        { id: 'B', side: 'B', modules: 1, moduleKw: DESIGN.drModuleKw, msb: 'B' },
        { id: 'C', side: 'C', modules: 1, moduleKw: DESIGN.drModuleKw, msb: 'A' },
      ];
    case 'BLOCK':
      return [
        { id: 'A', side: 'A', modules: 1, moduleKw: M, msb: 'A' },
        { id: 'B', side: 'B', modules: 1, moduleKw: M, msb: 'B' },
        { id: 'C', side: 'C', modules: 1, moduleKw: M, msb: 'A' },
        { id: 'CATCHER', side: 'CATCHER', modules: 1, moduleKw: M, msb: 'B' },
      ];
  }
}

/** Which critical buses feed each row's A and B cords. */
function rowFeedsFor(t: Topology): Record<number, { A: string; B: string }> {
  const both = (x: string) => ({ A: x, B: x });
  switch (t) {
    case 'N':
    case 'N+1':
    case 'N+2':
      // Single distribution path: both cords land on the same critical bus.
      return Object.fromEntries(ROWS.map((r) => [r.row, both('CB-A')]));
    case '2N':
    case '2N+1':
      return Object.fromEntries(ROWS.map((r) => [r.row, { A: 'CB-A', B: 'CB-B' }]));
    case 'DR': {
      // Rows rotate through system pairs so each system carries ~1/3 of the load.
      const pairs = [
        { A: 'CB-A', B: 'CB-B' },
        { A: 'CB-B', B: 'CB-C' },
        { A: 'CB-C', B: 'CB-A' },
      ];
      return Object.fromEntries(ROWS.map((r, i) => [r.row, pairs[i % 3]!]));
    }
    case 'BLOCK': {
      const blocks = ['CB-A', 'CB-B', 'CB-C'];
      return Object.fromEntries(ROWS.map((r, i) => [r.row, both(blocks[i % 3]!)]));
    }
  }
}

/** Generator counts. Paired topologies get a generator plant per side. */
function generatorPlanFor(t: Topology): { perSide: boolean; count: number } {
  switch (t) {
    case 'N':
      return { perSide: false, count: 3 };
    case 'N+1':
      return { perSide: false, count: 4 };
    case 'N+2':
      return { perSide: false, count: 5 };
    case '2N':
      return { perSide: true, count: 3 };
    case '2N+1':
      return { perSide: true, count: 4 };
    case 'DR':
    case 'BLOCK':
      return { perSide: false, count: 4 };
  }
}

// --- Builder ----------------------------------------------------------------------

export function buildPlant(topology: Topology = '2N'): Plant {
  const g = new PlantGraph();
  const ilk = new InterlockSystem();
  const add = (id: string, name: string, kind: ComponentKind, o?: NodeOpts) => g.add(makeNode(id, name, kind, o));
  const breaker = (id: string, name: string, closed: boolean, side: Side = 'COMMON', ratedKw: number = DESIGN.busKw) =>
    add(id, name, 'breaker', { side, ratedKw, state: { closed } });

  // --- Utility, MV, transformers, main-tie-main switchboards --------------------
  for (const s of ['A', 'B'] as const) {
    add(`UTIL-${s}`, `Utility ${s}`, 'utility', { side: s, ratedKw: 5000 });
    add(`MVS-${s}`, `MV switchgear ${s}`, 'mv-switchgear', { side: s, ratedKw: 5000 });
    add(`TX-${s}`, `Transformer ${s}`, 'transformer', { side: s, ratedKw: 3500 });
    add(`ATS-${s}`, `Automatic transfer switch ${s}`, 'ats', { side: s, ratedKw: DESIGN.busKw, state: { selected: 'normal' } });
    breaker(`MB-${s}`, `Main breaker ${s}`, true, s);
    add(`MSB-${s}`, `Main switchboard ${s}`, 'bus', { side: s, ratedKw: DESIGN.busKw });
    g.connect(`UTIL-${s}`, `MVS-${s}`);
    g.connect(`MVS-${s}`, `TX-${s}`);
    g.connect(`TX-${s}`, `ATS-${s}`, 'power', 'normal');
    g.connect(`ATS-${s}`, `MB-${s}`);
    g.connect(`MB-${s}`, `MSB-${s}`);

    // BESS on each switchboard: rides through sags and bridges to generator.
    add(`BESS-${s}`, `Battery energy storage ${s}`, 'bess', {
      side: s,
      ratedKw: DESIGN.bessKw,
      state: { soc: 0.9, capacityKwh: DESIGN.bessKwh },
    });
    g.connect(`BESS-${s}`, `MSB-${s}`);
  }
  // Tie breaker: normally open. Power can flow either way through it.
  breaker('TIE-AB', 'Tie breaker A–B', false);
  g.connect('MSB-A', 'TIE-AB');
  g.connect('TIE-AB', 'MSB-B');
  g.connect('MSB-B', 'TIE-AB');
  g.connect('TIE-AB', 'MSB-A');

  // --- Generators -----------------------------------------------------------------
  const gp = generatorPlanFor(topology);
  const generatorGroups: PlantMeta['generatorGroups'] = [];
  const genState = { genState: 'off' as const, genTimer: 0, fuelL: DESIGN.generatorDayTankL };
  if (gp.perSide) {
    for (const s of ['A', 'B'] as const) {
      const bus = `PB-${s}`;
      add(bus, `Generator paralleling bus ${s}`, 'paralleling-bus', { side: s, ratedKw: DESIGN.busKw });
      const units: string[] = [];
      for (let i = 1; i <= gp.count; i++) {
        const id = `GEN-${s}${i}`;
        add(id, `Generator ${s}${i}`, 'generator', { side: s, status: 'standby', ratedKw: DESIGN.generatorKw, state: { ...genState } });
        g.connect(id, bus);
        units.push(id);
      }
      g.connect(bus, `ATS-${s}`, 'power', 'emergency');
      generatorGroups.push({ busId: bus, units });
    }
  } else {
    add('PB-1', 'Generator paralleling bus', 'paralleling-bus', { ratedKw: DESIGN.busKw });
    const units: string[] = [];
    for (let i = 1; i <= gp.count; i++) {
      const id = `GEN-${pad(i)}`;
      add(id, `Generator ${pad(i)}`, 'generator', { status: 'standby', ratedKw: DESIGN.generatorKw, state: { ...genState } });
      g.connect(id, 'PB-1');
      units.push(id);
    }
    g.connect('PB-1', 'ATS-A', 'power', 'emergency');
    g.connect('PB-1', 'ATS-B', 'power', 'emergency');
    generatorGroups.push({ busId: 'PB-1', units });
  }

  // --- Main-tie-main Kirk-key scheme: three locks, two keys --------------------------
  ilk.addScheme({
    id: 'MTM',
    title: 'Main-tie-main interlock',
    purpose:
      'Two keys for three breakers (Main A, Main B, Tie). At most two can be closed, so the two sources can never be paralleled through the tie, and a dead bus can never be back-fed into a utility service that line crews think is de-energized.',
    locks: [
      { id: 'L-MB-A', breakerId: 'MB-A', code: 'MTM' },
      { id: 'L-MB-B', breakerId: 'MB-B', code: 'MTM' },
      { id: 'L-TIE-AB', breakerId: 'TIE-AB', code: 'MTM' },
    ],
    keys: [
      { id: 'K-MTM-1', code: 'MTM', inLock: 'L-MB-A' },
      { id: 'K-MTM-2', code: 'MTM', inLock: 'L-MB-B' },
    ],
  });

  // --- UPS systems --------------------------------------------------------------------
  const upsSystems = upsSystemsFor(topology);
  for (const sys of upsSystems) {
    const x = sys.id;
    const msb = `MSB-${sys.msb}`;
    const sysKw = sys.modules * sys.moduleKw;
    breaker(`UIB-${x}`, `UPS ${x} input breaker`, true, sys.side, sysKw * 1.2);
    breaker(`SBB-${x}`, `UPS ${x} static bypass input breaker`, true, sys.side, sysKw * 1.2);
    breaker(`UOB-${x}`, `UPS ${x} output breaker`, true, sys.side, sysKw * 1.2);
    breaker(`MBB-${x}`, `UPS ${x} maintenance bypass breaker`, false, sys.side, sysKw * 1.2);
    add(`CB-${x}`, `Critical bus ${x}`, 'bus', { side: sys.side, ratedKw: sysKw });
    g.connect(msb, `UIB-${x}`);
    g.connect(msb, `SBB-${x}`);
    for (let m = 1; m <= sys.modules; m++) {
      const id = x === 'CATCHER' ? `UPS-R${m}` : `UPS-${x}${m}`;
      add(id, `UPS module ${id.slice(4)}`, 'ups', {
        side: sys.side,
        ratedKw: sys.moduleKw,
        state: { upsMode: 'auto', soc: 1 },
      });
      g.connect(`UIB-${x}`, id, 'power', 'input');
      g.connect(`SBB-${x}`, id, 'power', 'bypass');
      g.connect(id, `UOB-${x}`);
    }
    g.connect(`UOB-${x}`, `CB-${x}`);
    g.connect(msb, `MBB-${x}`);
    g.connect(`MBB-${x}`, `CB-${x}`);

    // Maintenance bypass interlock: the key release unit (SKRU) frees the
    // MBB key only once the UPS is on static bypass, so closing MBB never
    // parallels the inverter output with raw bypass power.
    const moduleIds = g.downstream(`UIB-${x}`).map((n) => n.id);
    ilk.addScheme({
      id: `MBP-${x}`,
      title: `UPS ${x} maintenance bypass interlock`,
      purpose:
        'Prevents closing the maintenance bypass breaker while the UPS inverter is carrying the load. The key release unit only frees the key once the UPS is on static bypass, so both paths are fed from the same source when MBB closes (make-before-break, no outage).',
      locks: [
        {
          id: `L-SKRU-${x}`,
          breakerId: null,
          code: `MBP-${x}`,
          permissive: {
            label: `UPS ${x} on static bypass`,
            check: (graph) => {
              const notOnBypass = moduleIds.filter((id) => graph.get(id).state.upsMode !== 'static-bypass');
              return notOnBypass.length
                ? { ok: false, why: `Transfer ${notOnBypass.join(', ')} to static bypass first.` }
                : { ok: true, why: '' };
            },
          },
        },
        { id: `L-MBB-${x}`, breakerId: `MBB-${x}`, code: `MBP-${x}` },
      ],
      keys: [{ id: `K-MBP-${x}`, code: `MBP-${x}`, inLock: `L-SKRU-${x}` }],
    });
  }

  // Block-redundant: each block's critical bus is fed through an STS whose
  // alternate source is the catcher block.
  const isBlock = topology === 'BLOCK';
  const distBus = (cb: string) => (isBlock ? `${cb}-OUT` : cb);
  if (isBlock) {
    for (const x of ['A', 'B', 'C']) {
      add(`STS-${x}`, `Block ${x} static transfer switch`, 'sts', { side: x as Side, ratedKw: 1000, state: { selected: 'preferred' } });
      add(`CB-${x}-OUT`, `Block ${x} distribution bus`, 'bus', { side: x as Side, ratedKw: 1000 });
      g.connect(`CB-${x}`, `STS-${x}`, 'power', 'preferred');
      g.connect('CB-CATCHER', `STS-${x}`, 'power', 'alternate');
      g.connect(`STS-${x}`, `CB-${x}-OUT`);
    }
  }

  // --- Data hall distribution and racks ---------------------------------------------------
  const rowFeeds = rowFeedsFor(topology);
  for (const r of ROWS) {
    const feeds = rowFeeds[r.row]!;
    const dist: Record<'A' | 'B', string> = { A: '', B: '' };
    for (const cord of ['A', 'B'] as const) {
      const id = r.kind === 'gpu' ? `BW-${r.row}${cord}` : `PDU-${r.row}${cord}`;
      add(id, r.kind === 'gpu' ? `Busway row ${r.row} ${cord}` : `PDU row ${r.row} ${cord}`, r.kind === 'gpu' ? 'busway' : 'pdu', {
        side: cord,
        ratedKw: r.kind === 'gpu' ? DESIGN.busway : DESIGN.pduKw,
      });
      g.connect(distBus(feeds[cord]), id);
      dist[cord] = id;
    }
    for (const n of r.dual) {
      const id = `R-${pad(n)}`;
      const kw = r.kind === 'gpu' ? DESIGN.gpuRackKw : DESIGN.generalRackKw;
      add(id, r.kind === 'gpu' ? `GPU rack ${pad(n)}` : `Rack ${pad(n)}`, 'rack', {
        ratedKw: kw * 1.2,
        highDensity: r.kind === 'gpu',
        state: { demandKw: kw, baseKw: kw },
      });
      g.connect(dist.A, id, 'power', 'A');
      g.connect(dist.B, id, 'power', 'B');
    }
    if (r.kind === 'gpu') {
      // Each GPU row has a dual-fed CDU for direct-to-chip liquid cooling.
      const cdu = `CDU-${r.row}`;
      add(cdu, `Coolant distribution unit row ${r.row}`, 'cdu', { ratedKw: 700, state: { demandKw: DESIGN.cduKw } });
      g.connect(dist.A, cdu, 'power', 'A');
      g.connect(dist.B, cdu, 'power', 'B');
    }
    if (r.single.length) {
      const sts = `STS-${r.row}`;
      const rpp = `RPP-${r.row}`;
      add(sts, `Static transfer switch row ${r.row}`, 'sts', { ratedKw: DESIGN.rppKw, state: { selected: 'preferred' } });
      add(rpp, `Remote power panel row ${r.row}`, 'rpp', { ratedKw: DESIGN.rppKw });
      g.connect(dist.A, sts, 'power', 'preferred');
      g.connect(dist.B, sts, 'power', 'alternate');
      g.connect(sts, rpp);
      for (const n of r.single) {
        const id = `R-${pad(n)}`;
        add(id, `Single-corded rack ${pad(n)}`, 'rack', {
          ratedKw: DESIGN.singleCordRackKw * 1.2,
          state: { demandKw: DESIGN.singleCordRackKw, baseKw: DESIGN.singleCordRackKw },
        });
        g.connect(rpp, id, 'power', 'A');
      }
    }
  }

  // --- Mechanical plant as electrical loads (thermal behavior comes in a later phase) ------
  for (const s of ['A', 'B'] as const) {
    breaker(`FDR-MCC-${s}`, `Mechanical feeder ${s}`, true, s, 1500);
    add(`MCC-${s}`, `Mechanical motor control center ${s}`, 'bus', { side: s, ratedKw: 1500 });
    g.connect(`MSB-${s}`, `FDR-MCC-${s}`);
    g.connect(`FDR-MCC-${s}`, `MCC-${s}`);
  }
  const mech: [id: string, name: string, kind: ComponentKind, mcc: 'A' | 'B', ratedKwt: number, kw: number, status: Status][] = [
    ['CH-01', 'Water-cooled chiller 01', 'chiller-water-cooled', 'A', 1400, 190, 'online'],
    ['CH-02', 'Water-cooled chiller 02', 'chiller-water-cooled', 'B', 1400, 190, 'online'],
    ['CH-03', 'Water-cooled chiller 03', 'chiller-water-cooled', 'A', 1400, 0, 'standby'],
    ['ACH-04', 'Air-cooled chiller 04', 'chiller-air-cooled', 'B', 900, 0, 'standby'],
    ['CT-01', 'Cooling tower 01', 'cooling-tower', 'A', 1800, 15, 'online'],
    ['CT-02', 'Cooling tower 02', 'cooling-tower', 'B', 1800, 15, 'online'],
    ['CT-03', 'Cooling tower 03', 'cooling-tower', 'A', 1800, 0, 'standby'],
    ['CWP-01', 'Condenser water pump 01', 'pump-cw', 'A', 1800, 30, 'online'],
    ['CWP-02', 'Condenser water pump 02', 'pump-cw', 'B', 1800, 30, 'online'],
    ['CWP-03', 'Condenser water pump 03', 'pump-cw', 'A', 1800, 0, 'standby'],
    ['CHWP-01', 'Chilled water pump 01', 'pump-chw', 'A', 1400, 30, 'online'],
    ['CHWP-02', 'Chilled water pump 02', 'pump-chw', 'B', 1400, 30, 'online'],
    ['CHWP-03', 'Chilled water pump 03', 'pump-chw', 'A', 1400, 0, 'standby'],
    ['DOAS-01', 'Dedicated outdoor air unit 01', 'doas', 'A', 120, 45, 'online'],
    ['DOAS-02', 'Dedicated outdoor air unit 02', 'doas', 'B', 120, 0, 'standby'],
    ['CRAC-201', 'DX air conditioner, UPS room', 'crac', 'B', 70, 25, 'online'],
  ];
  for (let i = 1; i <= 8; i++) {
    mech.push([`CRAH-${100 + i}`, `Air handler ${100 + i}`, 'crah', i % 2 ? 'A' : 'B', 150, 8, 'online']);
  }
  for (const [id, name, kind, mcc, ratedKw, kw, status] of mech) {
    add(id, name, kind, { side: mcc, status, ratedKw, state: { demandKw: kw } });
    g.connect(`MCC-${mcc}`, id);
  }
  add('TES-01', 'Chilled water storage tank', 'tes-tank', { ratedKw: 2500 });

  // --- Life safety (status nodes) ---------------------------------------------------------------
  add('FACP-01', 'Fire alarm control panel', 'fire-alarm');
  add('PAS-101', 'Pre-action sprinkler zone, data hall', 'preaction');
  add('CA-201', 'Clean-agent zone, UPS room', 'clean-agent');
  add('EPO-01', 'Emergency power off, data hall', 'epo');

  return {
    graph: g,
    interlocks: ilk,
    meta: { topology, upsSystems, generatorGroups, rowFeeds, designFacilityKw: 3000 },
  };
}
