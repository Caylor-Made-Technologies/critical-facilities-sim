/**
 * 3D campus for "Life of a Data Center": one generic site that changes with
 * the stage (empty field → site → design → construction → built → commissioning
 * → operations → growth → incident → decommissioning). Tour stops show as
 * numbered dots; the camera flies to each. Everything drawn in code.
 */
import {
  BoxGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DoubleSide,
  EdgesGeometry,
  Group,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  RingGeometry,
  SRGBColorSpace,
  Sprite,
  SpriteMaterial,
  Vector3,
  type BufferGeometry,
  type Material,
} from 'three';
import type { Anchor, SceneState } from '../../../content/lifecycleTypes';
import { createStage, type FrameStats, type ThemeColors } from '../core';
import type { Tier } from '../quality';

export interface CampusApi {
  setState: (s: SceneState) => void;
  /** Numbered dots on these tour stops (in order); the title shows when a stop is active. */
  setStops: (stops: { anchor: Anchor; title: string }[]) => void;
  /** Fly to a stop and name it (null: whole campus). */
  goTo: (a: Anchor | null) => void;
  state: () => SceneState;
  /** Anchors showing in the current state (for automated checks). */
  present: () => Anchor[];
  flying: () => boolean;
  project: (a: Anchor) => { x: number; y: number } | null;
  frames: () => number;
  stats: () => FrameStats & { tier: Tier; shadows: boolean };
  dispose: () => void;
}

/** Where each stop is, and how far to stand back from it. */
const SPOT: Record<Anchor, { at: [number, number, number]; dist: number }> = {
  field: { at: [-24, 0, 14], dist: 22 },
  substation: { at: [-27, 1, -14], dist: 13 },
  powerline: { at: [-18, 3, -16], dist: 20 },
  fiber: { at: [4, 0, -13], dist: 15 },
  water: { at: [24, 1.5, 12], dist: 12 },
  flood: { at: [-30, 0, 18], dist: 16 },
  road: { at: [0, 0, -21], dist: 22 },
  foundation: { at: [-9, 0.2, -5], dist: 18 },
  shell: { at: [0, 2, 0], dist: 26 },
  crane: { at: [13, 6, -9], dist: 20 },
  genyard: { at: [18, 1, -2], dist: 14 },
  fuel: { at: [20, 0.8, 5], dist: 10 },
  switchgear: { at: [6, 1, -4.5], dist: 9 },
  ups: { at: [6, 1, 0], dist: 9 },
  batteries: { at: [6, 1, 4.5], dist: 9 },
  chillers: { at: [-4, 1, 11], dist: 13 },
  towers: { at: [6, 2, 11], dist: 12 },
  hall: { at: [-5, 1, 0], dist: 15 },
  racks: { at: [-5, 1, -2], dist: 9 },
  floor: { at: [-10, 0.3, 5], dist: 7 },
  mmr: { at: [-11, 1, -4.5], dist: 7 },
  noc: { at: [-11, 1, 4.5], dist: 7 },
  dock: { at: [1, 1, -8.5], dist: 10 },
  fence: { at: [-14, 1, -18], dist: 18 },
  loadbank: { at: [-5, 1, 0], dist: 12 },
  growth: { at: [-14, 0.2, 14], dist: 14 },
  incident: { at: [6, 1, 0], dist: 8 },
  truck: { at: [1, 1.2, -12], dist: 11 },
};

/** Which anchors exist in which states. */
const IN: Record<Anchor, SceneState[] | 'all'> = {
  field: 'all',
  road: 'all',
  flood: 'all',
  substation: ['site', 'design', 'construction', 'built', 'commission', 'ops', 'growth', 'incident', 'decom'],
  powerline: ['site', 'design', 'construction', 'built', 'commission', 'ops', 'growth', 'incident', 'decom'],
  fiber: ['site', 'design', 'construction', 'built', 'commission', 'ops', 'growth', 'incident', 'decom'],
  water: ['site', 'design', 'construction', 'built', 'commission', 'ops', 'growth', 'incident', 'decom'],
  foundation: ['construction'],
  crane: ['construction'],
  shell: ['design', 'construction', 'built', 'commission', 'ops', 'growth', 'incident', 'decom'],
  genyard: ['design', 'construction', 'built', 'commission', 'ops', 'growth', 'incident', 'decom'],
  fuel: ['design', 'construction', 'built', 'commission', 'ops', 'growth', 'incident', 'decom'],
  switchgear: ['design', 'construction', 'built', 'commission', 'ops', 'growth', 'incident', 'decom'],
  ups: ['design', 'built', 'commission', 'ops', 'growth', 'incident', 'decom'],
  batteries: ['design', 'built', 'commission', 'ops', 'growth', 'incident', 'decom'],
  chillers: ['design', 'construction', 'built', 'commission', 'ops', 'growth', 'incident', 'decom'],
  towers: ['design', 'construction', 'built', 'commission', 'ops', 'growth', 'incident', 'decom'],
  hall: ['design', 'built', 'commission', 'ops', 'growth', 'incident', 'decom'],
  racks: ['built', 'ops', 'growth', 'incident', 'decom'],
  floor: ['design', 'built', 'commission', 'ops', 'growth', 'incident', 'decom'],
  mmr: ['built', 'commission', 'ops', 'growth', 'incident', 'decom'],
  noc: ['built', 'commission', 'ops', 'growth', 'incident', 'decom'],
  dock: ['built', 'commission', 'ops', 'growth', 'incident', 'decom'],
  fence: ['built', 'commission', 'ops', 'growth', 'incident', 'decom'],
  loadbank: ['commission'],
  growth: ['growth'],
  incident: ['incident'],
  truck: ['decom'],
};
const has = (a: Anchor, s: SceneState) => IN[a] === 'all' || (IN[a] as SceneState[]).includes(s);

export function mountCampus(canvas: HTMLCanvasElement): CampusApi {
  const stage = createStage(canvas, { camera: [30, 34, 42], target: [0, 0, 0], fov: 40, interactive: true, minDistance: 5, maxDistance: 110, maxDpr: 1.5, fps: 30, fog: [80, 190], shadows: true });
  const { scene, camera, controls } = stage;
  if (controls) {
    controls.enablePan = true;
    controls.screenSpacePanning = false;
    controls.maxPolarAngle = Math.PI * 0.45;
  }

  // --- Materials (theme-aware ones are repainted in onTheme) ---
  const std = (c: number, m = 0.25, r = 0.6) => new MeshStandardMaterial({ color: c, metalness: m, roughness: r });
  const M = {
    grass: std(0x5c7a4a, 0, 0.95),
    dirt: std(0x8a6f4d, 0, 0.95),
    road: std(0x30353d, 0.05, 0.9),
    concrete: std(0x9aa3ad, 0.05, 0.85),
    wall: std(0xc9d2dc, 0.05, 0.7),
    roof: std(0x6b7787, 0.2, 0.6),
    steel: std(0x8796a8, 0.7, 0.35),
    cab: std(0x3d4f6b, 0.35, 0.5),
    gen: std(0xd9a441, 0.3, 0.5),
    tank: std(0xb3bfcf, 0.6, 0.35),
    chiller: std(0x5677a8, 0.4, 0.45),
    tower: std(0x9aa7b8, 0.3, 0.5),
    rack: std(0x1f2836, 0.3, 0.6),
    battery: std(0x3f8a64, 0.2, 0.55),
    loadbank: std(0xe07b39, 0.3, 0.5),
    green: std(0x3f8a64, 0.2, 0.6),
    truck: std(0xe5e7eb, 0.3, 0.5),
    crane: std(0xf2b705, 0.3, 0.5),
    water: new MeshStandardMaterial({ color: 0x3a8ed6, metalness: 0.1, roughness: 0.2, transparent: true, opacity: 0.7 }),
    flood: new MeshBasicMaterial({ color: 0x3a8ed6, transparent: true, opacity: 0.22, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }),
    fiber: new MeshBasicMaterial({ color: 0xff9f43 }),
    wire: new MeshBasicMaterial({ color: 0x2b2f36 }),
    glowOk: new MeshBasicMaterial({ color: 0x3ddc97 }),
    glowRed: new MeshBasicMaterial({ color: 0xff6b6b }),
    screen: new MeshBasicMaterial({ color: 0x22d3ee }),
    ghost: new MeshBasicMaterial({ color: 0x3d8bff, transparent: true, opacity: 0.14, depthWrite: false }),
    ring: new MeshBasicMaterial({ color: 0x3d8bff, transparent: true, opacity: 0.85, side: DoubleSide, depthWrite: false }),
    blue: new LineBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.9 }),
    edge: new LineBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.25 }),
  };
  const geos = new Map<string, BufferGeometry>();
  const G = <T extends BufferGeometry>(k: string, make: () => T): T => {
    let g = geos.get(k) as T | undefined;
    if (!g) geos.set(k, (g = make()));
    return g;
  };
  const boxG = (w: number, h: number, d: number) => G(`b${w},${h},${d}`, () => new BoxGeometry(w, h, d));
  const cylG = (r: number, h: number, s = 16) => G(`c${r},${h},${s}`, () => new CylinderGeometry(r, r, h, s));

  /** Groups switched on/off by state. */
  const groups: Partial<Record<string, Group>> = {};
  const grp = (k: string) => {
    let g = groups[k];
    if (!g) {
      g = new Group();
      g.name = k;
      scene.add(g);
      groups[k] = g;
    }
    return g;
  };
  const box = (g: Group, w: number, h: number, d: number, mat: Material, x: number, y: number, z: number, shadow = true) => {
    const m = new Mesh(boxG(w, h, d), mat);
    m.position.set(x, y + h / 2, z);
    if (stage.shadows && shadow) {
      m.castShadow = true;
      m.receiveShadow = true;
    }
    g.add(m);
    return m;
  };
  const cyl = (g: Group, r: number, h: number, mat: Material, x: number, y: number, z: number, rotZ = 0) => {
    const m = new Mesh(cylG(r, h), mat);
    m.position.set(x, y, z);
    m.rotation.z = rotZ;
    if (stage.shadows) m.castShadow = true;
    g.add(m);
    return m;
  };
  /** A line along the ground (cable, fiber), made of thin boxes. */
  const run = (g: Group, pts: [number, number][], y: number, w: number, mat: Material) => {
    for (let i = 0; i + 1 < pts.length; i++) {
      const [x0, z0] = pts[i]!;
      const [x1, z1] = pts[i + 1]!;
      const len = Math.hypot(x1 - x0, z1 - z0);
      const m = new Mesh(boxG(1, 1, 1), mat);
      m.scale.set(len, w, w);
      m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2);
      m.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
      g.add(m);
    }
  };

  // --- Ground (always) ---
  const ground = new Mesh(new PlaneGeometry(110, 80), M.grass);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = stage.shadows;
  scene.add(ground);
  const always = grp('always');
  box(always, 100, 0.04, 4, M.road, 0, 0, -21, false);
  // River and flood zone in the low corner.
  box(always, 40, 0.06, 3, M.water, -30, 0, 24, false);
  const flood = new Mesh(new PlaneGeometry(26, 12), M.flood);
  flood.rotation.x = -Math.PI / 2;
  flood.position.set(-30, 0.05, 18);
  always.add(flood);

  // --- Site: utility, fiber, water ---
  const site = grp('site');
  // Substation: transformers inside a fence.
  for (let i = 0; i < 3; i++) box(site, 1.6, 1.8, 1.4, M.green, -29 + i * 2.2, 0, -14);
  box(site, 8, 0.05, 6, M.concrete, -27, 0, -14, false);
  for (const [x, z, w, d] of [[-27, -17, 8, 0.08], [-27, -11, 8, 0.08], [-31, -14, 0.08, 6], [-23, -14, 0.08, 6]] as const) box(site, w, 1.6, d, M.steel, x, 0, z, false);
  // Two utility lines on poles: one from the west, one from the south.
  const poles = (pts: [number, number][]) => {
    for (const [x, z] of pts) cyl(site, 0.15, 6, M.steel, x, 3, z);
    run(site, pts, 5.6, 0.05, M.wire);
  };
  poles([[-48, -14], [-40, -14], [-32, -14]]);
  poles([[-26, -10], [-20, -9], [-14, -8.5]]);
  poles([[-26, -30], [-24, -24], [-22, -18], [-14, -9.5]]);
  // Two fiber routes entering on different sides.
  run(site, [[-48, -19], [-16, -19], [-13, -8]], 0.05, 0.18, M.fiber);
  run(site, [[48, 9], [30, 9], [13, 7]], 0.05, 0.18, M.fiber);
  // Water tank and main.
  cyl(site, 1.6, 3, M.tank, 24, 1.5, 12);
  run(site, [[24, 12], [24, 18], [48, 18]], 0.05, 0.25, M.water);
  // Survey stakes for the building footprint (site/design only).
  const stakes = grp('stakes');
  for (const [x, z] of <[number, number][]>[[-12, -7], [12, -7], [-12, 7], [12, 7]]) box(stakes, 0.15, 0.8, 0.15, M.crane, x, 0, z, false);

  // --- The building ---
  const slab = grp('slab');
  box(slab, 25, 0.25, 15, M.concrete, 0, 0, 0);
  for (const x of [17, 20]) for (const z of [-5, -2, 1]) box(slab, 2.4, 0.2, 1.6, M.concrete, x, 0, z, false);
  box(slab, 12, 0.2, 5, M.concrete, 1, 0, 11, false);
  const steel = grp('steel');
  for (let x = -12; x <= 12; x += 4) for (const z of [-7, 7]) box(steel, 0.3, 5, 0.3, M.steel, x, 0.25, z);
  for (const z of [-7, 7]) box(steel, 24.3, 0.3, 0.3, M.steel, 0, 5.1, z);
  const crane = grp('crane');
  box(crane, 0.6, 14, 0.6, M.crane, 14, 0, -9);
  box(crane, 14, 0.5, 0.5, M.crane, 9, 14, -9);
  cyl(crane, 0.05, 6, M.wire, 4, 11, -9);
  box(crane, 1.4, 0.8, 1, M.gen, 4, 7.6, -9);
  // Walls: low "dollhouse" walls so the inside stays visible from above.
  const walls = grp('walls');
  box(walls, 25, 2.2, 0.3, M.wall, 0, 0.25, -7.5);
  box(walls, 25, 2.2, 0.3, M.wall, 0, 0.25, 7.5);
  box(walls, 0.3, 2.2, 15, M.wall, -12.5, 0.25, 0);
  box(walls, 0.3, 2.2, 15, M.wall, 12.5, 0.25, 0);
  box(walls, 0.2, 1.6, 15, M.wall, 2.5, 0.25, 0); // white | gray space
  box(walls, 0.2, 1.6, 4, M.wall, -9, 0.25, -5.5); // MMR
  box(walls, 0.2, 1.6, 4, M.wall, -9, 0.25, 5.5); // NOC
  const dock = grp('dock');
  for (let k = 0; k < 2; k++) box(dock, 2, 1.8, 0.2, M.roof, -0.2 + k * 2.4, 0.25, -7.7, false);

  // Gray space: switchgear, UPS, batteries.
  const gear = grp('gear');
  for (let k = 0; k < 5; k++) box(gear, 1.2, 1.8, 0.8, M.cab, 4.5 + k * 1.4, 0.25, -5);
  const ups = grp('ups');
  for (let k = 0; k < 4; k++) box(ups, 1.2, 1.6, 0.9, M.cab, 4.5 + k * 1.6, 0.25, 0);
  for (let k = 0; k < 4; k++) box(ups, 0.5, 0.1, 0.02, M.screen, 4.5 + k * 1.6, 1.55, 0.46, false);
  const bats = grp('bats');
  for (let r = 0; r < 2; r++) for (let k = 0; k < 6; k++) box(bats, 0.8, 1.2, 0.5, M.battery, 4 + k * 1.1, 0.25, 4 + r * 1.3);
  // Rooms in the white-space corners.
  const rooms = grp('rooms');
  for (let k = 0; k < 3; k++) box(rooms, 0.6, 1.6, 0.8, M.rack, -11.6 + k * 0.8, 0.25, -6.2);
  box(rooms, 2.2, 0.8, 0.8, M.roof, -11, 0.25, 6.4);
  for (let k = 0; k < 3; k++) box(rooms, 0.6, 0.4, 0.04, M.screen, -11.7 + k * 0.7, 1.15, 6, false);
  // Raised floor cutaway in the hall corner: tiles on pedestals.
  const floor = grp('floor');
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) {
    box(floor, 0.58, 0.04, 0.58, M.concrete, -11.2 + i * 0.6, 0.65, 3.4 + j * 0.6, false);
    box(floor, 0.06, 0.4, 0.06, M.steel, -11.2 + i * 0.6, 0.25, 3.4 + j * 0.6, false);
  }

  // Racks: instanced (one draw call), 6 rows x 12.
  const RACK_ROWS = 6;
  const PER_ROW = 12;
  const rackPos: [number, number][] = [];
  for (let r = 0; r < RACK_ROWS; r++) for (let k = 0; k < PER_ROW; k++) rackPos.push([-8.6 + k * 0.85, -4.8 + r * 1.9 + (r % 2) * 0.1]);
  const rackG = boxG(0.7, 1.9, 1);
  const racks = new InstancedMesh(rackG, M.rack, rackPos.length);
  const loadbanks = new InstancedMesh(boxG(0.9, 1.1, 1), M.loadbank, rackPos.length);
  const lights = new InstancedMesh(boxG(0.05, 1.4, 0.02), M.glowOk, rackPos.length);
  const ghostRacks = new InstancedMesh(rackG, M.ghost, rackPos.length);
  const mtx = new Matrix4();
  rackPos.forEach(([x, z], i) => {
    racks.setMatrixAt(i, mtx.makeTranslation(x, 0.25 + 0.95, z));
    loadbanks.setMatrixAt(i, mtx.makeTranslation(x, 0.25 + 0.55, z));
    lights.setMatrixAt(i, mtx.makeTranslation(x + 0.2, 0.25 + 1, z + 0.51));
    ghostRacks.setMatrixAt(i, mtx.makeTranslation(x, 0.25 + 0.95, z));
  });
  if (stage.shadows) racks.castShadow = true;
  const hall = grp('hall');
  hall.add(racks, lights);
  const lb = grp('loadbanks');
  lb.add(loadbanks);
  const ghosts = grp('ghosts');
  ghosts.add(ghostRacks);
  // Growth: an expansion pad in the field.
  const growth = grp('growthpad');
  box(growth, 18, 0.08, 10, M.dirt, -14, 0, 14, false);
  for (const [x, z] of <[number, number][]>[[-23, 9], [-5, 9], [-23, 19], [-5, 19]]) box(growth, 0.15, 0.8, 0.15, M.crane, x, 0, z, false);

  // Generator yard and fuel.
  const gens = grp('gens');
  for (let k = 0; k < 4; k++) box(gens, 2.2, 1.6, 1.4, M.gen, 17 + (k % 2) * 3, 0.2, -5 + Math.floor(k / 2) * 3);
  const fuel = grp('fuel');
  for (let k = 0; k < 2; k++) cyl(fuel, 0.7, 2.6, M.tank, 19 + k * 2, 0.9, 5, Math.PI / 2);
  // Chillers and towers behind the building.
  const mech = grp('mech');
  for (let k = 0; k < 3; k++) box(mech, 2.6, 1.4, 1.4, M.chiller, -7 + k * 3, 0.2, 11);
  for (let k = 0; k < 3; k++) {
    box(mech, 2.2, 2.2, 2.2, M.tower, 3 + k * 2.6, 0.2, 11);
    cyl(mech, 0.8, 0.5, M.roof, 3 + k * 2.6, 2.65, 11);
  }
  // Perimeter fence.
  const fence = grp('fence');
  for (const [x, z, w, d] of [[0, -18, 56, 0.08], [0, 20, 56, 0.08], [-28, 1, 0.08, 38], [28, 1, 0.08, 38]] as const) box(fence, w, 1.8, d, M.steel, x, 0, z, false);
  // Decommissioning truck with pallets.
  const truck = grp('truck');
  box(truck, 2.4, 2.2, 6, M.truck, 1, 0.2, -12.5);
  box(truck, 2.4, 1.4, 1.8, M.cab, 1, 0.2, -16.5);
  for (let k = 0; k < 3; k++) box(truck, 1, 0.8, 1, M.battery, -1.6, 0, -9.5 - k * 1.2);

  // Design state: a blueprint of the whole site as glowing outlines.
  const blueprint = grp('blueprint');
  const outline = (w: number, h: number, d: number, x: number, y: number, z: number) => {
    const l = new LineSegments(G(`e${w},${h},${d}`, () => new EdgesGeometry(new BoxGeometry(w, h, d))), M.blue);
    l.position.set(x, y + h / 2, z);
    blueprint.add(l);
  };
  outline(25, 2.4, 15, 0, 0, 0);
  outline(9.5, 2, 14, 7.5, 0, 0);
  outline(14, 2, 12, -5, 0, 0);
  outline(6, 1.6, 6, 18.5, 0, -2);
  outline(9, 2, 3, -4, 0, 11);
  outline(8, 2.4, 3, 5.6, 0, 11);
  for (let r = 0; r < RACK_ROWS; r++) outline(10.2, 1.9, 1, -3.9, 0, -4.8 + r * 1.9);

  // Incident marker: a pulsing red ring at the UPS room.
  const incident = grp('incident');
  const ring = new Mesh(new RingGeometry(1.6, 1.9, 48), M.glowRed);
  ring.rotation.x = -Math.PI / 2;
  // Float the ring above the cabinets, with a red glow over the failed room, so it reads from far away.
  ring.position.set(6.8, 2.1, 0);
  incident.add(ring);
  const glow = new Mesh(boxG(7, 1.9, 2.4), new MeshBasicMaterial({ color: 0xff6b6b, transparent: true, opacity: 0.22, depthWrite: false }));
  glow.position.set(6.8, 1.2, 0);
  incident.add(glow);

  // --- Tour dots and the selection ring ---
  const sel = new Mesh(new RingGeometry(1.1, 1.3, 48), M.ring);
  sel.rotation.x = -Math.PI / 2;
  sel.visible = false;
  scene.add(sel);
  const dots: { a: Anchor; spr: Sprite; n: number }[] = [];
  let names: Partial<Record<Anchor, string>> = {};
  const drawDot = (spr: Sprite, n: number, name: string | null) => {
    const c = (spr.material.map as CanvasTexture).image as HTMLCanvasElement;
    const ctx = c.getContext('2d')!;
    const th = stage.theme;
    ctx.clearRect(0, 0, c.width, c.height);
    const w = name ? Math.min(c.width - 6, 84 + ctx.measureText(name).width * 1.15) : 66;
    ctx.fillStyle = th.dark ? 'rgba(11,15,20,0.9)' : 'rgba(255,255,255,0.95)';
    ctx.beginPath();
    ctx.roundRect(3, 3, w, c.height - 6, 33);
    ctx.fill();
    ctx.strokeStyle = '#' + th.blue.getHexString();
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#' + th.blue.getHexString();
    ctx.beginPath();
    ctx.arc(36, 36, 25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 30px Montserrat, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(n), 36, 47);
    if (name) {
      ctx.textAlign = 'left';
      ctx.fillStyle = th.dark ? '#ffffff' : '#0b1220';
      ctx.font = '700 32px Montserrat, system-ui, sans-serif';
      ctx.fillText(name, 74, 48);
    }
    spr.material.map!.needsUpdate = true;
    spr.center.set(36 / c.width, 0.5);
  };
  const makeDot = (n: number) => {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 72;
    const tex = new CanvasTexture(c);
    tex.colorSpace = SRGBColorSpace;
    // Same size on screen at any distance, so stops stay readable when zoomed out.
    const spr = new Sprite(new SpriteMaterial({ map: tex, transparent: true, depthTest: false, toneMapped: false, sizeAttenuation: false }));
    spr.renderOrder = 10;
    drawDot(spr, n, null);
    return spr;
  };

  // --- State ---
  let state: SceneState = 'field';
  let active: Anchor | null = null;
  const VIS: Record<string, SceneState[] | 'all'> = {
    always: 'all',
    site: ['site', 'design', 'construction', 'built', 'commission', 'ops', 'growth', 'incident', 'decom'],
    stakes: ['site'],
    blueprint: ['design'],
    slab: ['construction', 'built', 'commission', 'ops', 'growth', 'incident', 'decom'],
    steel: ['construction'],
    crane: ['construction'],
    walls: ['built', 'commission', 'ops', 'growth', 'incident', 'decom'],
    dock: ['built', 'commission', 'ops', 'growth', 'incident', 'decom'],
    gear: ['construction', 'built', 'commission', 'ops', 'growth', 'incident', 'decom'],
    ups: ['built', 'commission', 'ops', 'growth', 'incident', 'decom'],
    bats: ['built', 'commission', 'ops', 'growth', 'incident'],
    rooms: ['built', 'commission', 'ops', 'growth', 'incident', 'decom'],
    floor: ['built', 'commission', 'ops', 'growth', 'incident', 'decom'],
    hall: ['built', 'ops', 'growth', 'incident'],
    loadbanks: ['commission'],
    ghosts: ['growth'],
    growthpad: ['growth'],
    gens: ['construction', 'built', 'commission', 'ops', 'growth', 'incident', 'decom'],
    fuel: ['built', 'commission', 'ops', 'growth', 'incident', 'decom'],
    mech: ['construction', 'built', 'commission', 'ops', 'growth', 'incident', 'decom'],
    fence: ['built', 'commission', 'ops', 'growth', 'incident', 'decom'],
    truck: ['decom'],
    incident: ['incident'],
  };
  function apply() {
    for (const [k, g] of Object.entries(groups)) {
      const v = VIS[k];
      g!.visible = v === 'all' || (!!v && v.includes(state));
    }
    // Growth: only the first half of the rows are filled; the rest show as outlines.
    const half = state === 'growth' ? (RACK_ROWS / 2) * PER_ROW : rackPos.length;
    racks.count = half;
    lights.count = half;
    ghostRacks.count = rackPos.length;
    ground.material = state === 'construction' ? M.dirt : M.grass;
    for (const d of dots) d.spr.visible = has(d.a, state);
    stage.invalidate();
  }

  // --- Camera ---
  let fly: { from: Vector3; to: Vector3; tFrom: Vector3; tTo: Vector3; t: number } | null = null;
  const OVERVIEW = { pos: new Vector3(26, 30, 40), tgt: new Vector3(-2, 0, 2) };
  function poseFor(a: Anchor | null) {
    if (!a) {
      // Fit the overview to the screen shape: stand further back on tall screens.
      const k = Math.max(1, 1.25 / Math.max(0.4, camera.aspect || 1));
      return { pos: OVERVIEW.tgt.clone().add(OVERVIEW.pos.clone().sub(OVERVIEW.tgt).multiplyScalar(k)), tgt: OVERVIEW.tgt.clone() };
    }
    const s = SPOT[a];
    // Aim between the spot and its tag (which floats 2.2 m above it), so both stay in view.
    const tgt = new Vector3(s.at[0], s.at[1] + 1.1, s.at[2]);
    const dir = new Vector3(0.55, 0.75, 0.95).normalize();
    const k = Math.max(1, 1.1 / Math.max(0.4, camera.aspect || 1));
    return { pos: tgt.clone().addScaledVector(dir, s.dist * k), tgt };
  }
  function flyTo(p: { pos: Vector3; tgt: Vector3 }) {
    if (!controls) return;
    if (stage.calm || !stage.onScreen()) {
      fly = null;
      camera.position.copy(p.pos);
      controls.target.copy(p.tgt);
      controls.update();
      stage.invalidate();
      return;
    }
    fly = { from: camera.position.clone(), to: p.pos, tFrom: controls.target.clone(), tTo: p.tgt, t: 0 };
  }
  // Keep the camera over the site and above the ground.
  controls?.addEventListener('change', () => {
    if (!controls) return;
    const t = controls.target;
    const cx = Math.min(40, Math.max(-40, t.x));
    const cz = Math.min(28, Math.max(-28, t.z));
    if (cx !== t.x || cz !== t.z || t.y < 0 || t.y > 8) {
      const d = new Vector3(cx - t.x, Math.min(8, Math.max(0, t.y)) - t.y, cz - t.z);
      t.add(d);
      camera.position.add(d);
    }
    if (camera.position.y < 1) camera.position.y = 1;
  });

  // --- Theme ---
  const paintTheme = (th: ThemeColors) => {
    M.edge.color.copy(th.cyan);
    M.blue.color.copy(th.cyan);
    M.ring.color.copy(th.blue);
    M.glowOk.color.copy(th.ok);
    M.glowRed.color.copy(th.alarm);
    M.screen.color.copy(th.cyan);
    M.ghost.color.copy(th.blue);
    M.grass.color.set(th.dark ? 0x34452c : 0x7f9e68);
    M.dirt.color.set(th.dark ? 0x5a4934 : 0xa88b63);
    for (const d of dots) drawDot(d.spr, d.n, d.a === active ? (names[d.a] ?? null) : null);
    stage.invalidate();
  };
  stage.onTheme(paintTheme);
  paintTheme(stage.theme);
  stage.fitShadow(0, 0, 32);

  stage.onFrame((dt, t) => {
    if (fly && controls) {
      fly.t = Math.min(1, fly.t + dt / 1.1);
      const e = 1 - Math.pow(1 - fly.t, 3);
      camera.position.lerpVectors(fly.from, fly.to, e);
      controls.target.lerpVectors(fly.tFrom, fly.tTo, e);
      if (fly.t >= 1) fly = null;
    }
    if (sel.visible) sel.scale.setScalar(1 + Math.sin(t * 4) * 0.06);
    if (incident.visible) ring.scale.setScalar(1 + Math.sin(t * 5) * 0.12);
    lights.visible = state !== 'decom';
    if (state === 'ops' || state === 'incident') M.glowOk.color.copy(stage.theme.ok).multiplyScalar(0.75 + 0.25 * Math.sin(t * 3));
  });

  // First frame: overview of the empty field.
  apply();
  const first = poseFor(null);
  camera.position.copy(first.pos);
  controls?.target.copy(first.tgt);
  controls?.update();

  const v = new Vector3();
  const disposeDots = () => {
    for (const d of dots) {
      scene.remove(d.spr);
      d.spr.material.map?.dispose();
      d.spr.material.dispose();
    }
    dots.length = 0;
  };
  return {
    setState(s) {
      if (s === state) return;
      state = s;
      apply();
    },
    setStops(stops) {
      disposeDots();
      names = {};
      stops.forEach(({ anchor: a, title }, i) => {
        names[a] = names[a] ?? title;
        const spr = makeDot(i + 1);
        // Fraction of the screen height (canvas is 512 x 72).
        const hgt = 0.055;
        spr.scale.set((hgt * 512) / 72, hgt, 1);
        const s = SPOT[a];
        spr.position.set(s.at[0], s.at[1] + 2.2, s.at[2]);
        // Two stops can share a spot: lift the later one so both stay readable.
        const twin = dots.find((d) => d.spr.position.distanceTo(spr.position) < 0.5);
        if (twin) spr.position.y += 0.8;
        scene.add(spr);
        dots.push({ a, spr, n: i + 1 });
      });
      apply();
    },
    goTo(a) {
      active = a;
      for (const d of dots) drawDot(d.spr, d.n, d.a === a ? (names[d.a] ?? null) : null);
      sel.visible = !!a;
      if (a) sel.position.set(SPOT[a].at[0], 0.08, SPOT[a].at[2]);
      flyTo(poseFor(a));
    },
    state: () => state,
    present: () => (Object.keys(SPOT) as Anchor[]).filter((a) => has(a, state)),
    flying: () => !!fly,
    project(a) {
      const s = SPOT[a];
      v.set(...s.at);
      camera.updateMatrixWorld();
      v.project(camera);
      const r = canvas.getBoundingClientRect();
      return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
    },
    frames: stage.frames,
    stats: () => ({ ...stage.frameStats(), tier: stage.tier, shadows: stage.shadows }),
    dispose() {
      disposeDots();
      for (const g of geos.values()) g.dispose();
      for (const m of Object.values(M)) (m as Material).dispose();
      stage.dispose();
    },
  };
}
