/**
 * 3D plant: the electrical one-line or the mechanical plant, laid out like
 * the 2D diagrams but as real-looking equipment on a floor. Status lights,
 * floating tags, glowing cables with power pulses, colored pipes with water
 * flow. Tap to inspect or fail (same as 2D); the camera flies to whatever
 * is selected, so practice steps lead you around the plant.
 */
import {
  BoxGeometry,
  BufferGeometry,
  EdgesGeometry,
  LineSegments,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DoubleSide,
  DynamicDrawUsage,
  Group,
  InstancedMesh,
  LineBasicMaterial,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  Quaternion,
  Raycaster,
  RingGeometry,
  SphereGeometry,
  SRGBColorSpace,
  Sprite,
  SpriteMaterial,
  TorusGeometry,
  Vector2,
  Vector3,
  GridHelper,
  type Material,
  type Object3D,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { createStage, edgeMaterial, type ThemeColors } from '../core';
import type { Link3D, Node3D, Plant3D } from '../plantModel';

export interface PlantApi {
  update: (m: Plant3D, selected: string | null, failureMode: boolean) => void;
  focus: (id: string | null) => void;
  pick: (clientX: number, clientY: number) => string | null;
  project: (id: string) => { x: number; y: number } | null;
  nodeState: (id: string) => { state: string; light: string } | null;
  liveLinks: () => number;
  frames: () => number;
  /** GPU memory counters and where the camera is looking (for automated checks). */
  info: () => { geometries: number; textures: number; programs: number; calls: number; triangles: number; target: [number, number, number]; flying: boolean };
  dispose: () => void;
}

interface NodeObj {
  n: Node3D;
  group: Group;
  hit: Mesh;
  light: Mesh;
  body: Mesh[];
  label: Sprite;
  labelText: string;
  lever?: Mesh;
  lock?: Group;
  spinner?: Object3D;
}

const UP = new Vector3(0, 1, 0);

export function mountPlant(canvas: HTMLCanvasElement, opts: { onActivate: (id: string) => void }): PlantApi {
  const stage = createStage(canvas, { camera: [0, 30, 30], target: [0, 0, 0], fov: 42, interactive: true, minDistance: 3, maxDistance: 120, maxDpr: 1.5, fps: 30, fog: [60, 160] });
  const { scene, camera, controls } = stage;
  if (controls) {
    controls.enablePan = true;
    controls.screenSpacePanning = false;
    controls.maxPolarAngle = Math.PI * 0.46;
  }
  const root = new Group();
  scene.add(root);

  // --- Materials ---
  const std = (c: number, m = 0.35, r = 0.48) => new MeshStandardMaterial({ color: c, metalness: m, roughness: r });
  const M = {
    cab: std(0x3d4f6b),
    cabLight: std(0x52688a),
    dark: std(0x1f2836, 0.3, 0.65),
    steel: std(0xb3bfcf, 0.75, 0.3),
    copper: std(0xc07a3f, 0.85, 0.3),
    green: std(0x3f8a64, 0.3, 0.5),
    blue: std(0x2d5fae, 0.4, 0.45),
    failed: std(0x7a2630, 0.25, 0.55),
    yellow: std(0xf2b705, 0.3, 0.5),
    floor: new MeshStandardMaterial({ color: 0x0e131a, roughness: 0.95 }),
    // Generous tap targets: drawn fully transparent (an invisible material is skipped by hit-testing).
    hit: new MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }),
    ring: new MeshBasicMaterial({ color: 0x3d8bff, transparent: true, opacity: 0.9, side: DoubleSide, depthWrite: false }),
    glow: new MeshBasicMaterial({ color: 0x22d3ee }),
  };
  const edge = edgeMaterial(stage.theme, 0.35);
  // Equipment shares geometry (same size = same buffer), and every outline is merged
  // into one line mesh per layout: far fewer draw calls on phones.
  const geoCache = new Map<string, BufferGeometry>();
  const geo = <T extends BufferGeometry>(key: string, make: () => T): T => {
    let g = geoCache.get(key) as T | undefined;
    if (!g) geoCache.set(key, (g = make()));
    return g;
  };
  let edgeSrc: { key: string; mesh: Mesh }[] = [];
  let edgeLines: LineSegments | null = null;
  // Tap targets live on their own layer: hit-tested, never drawn.
  const HIT_LAYER = 1;
  const lightMats = new Map<string, MeshBasicMaterial>();
  const lightMat = (key: string, c: Color) => {
    let m = lightMats.get(key);
    if (!m) lightMats.set(key, (m = new MeshBasicMaterial({ color: c.clone() })));
    return m;
  };
  const linkMats = new Map<string, MeshStandardMaterial>();
  const linkMat = (key: string, c: Color, live: boolean) => {
    const k = `${key}:${live}`;
    let m = linkMats.get(k);
    if (!m) {
      m = new MeshStandardMaterial({ color: c.clone(), emissive: live ? c.clone() : new Color(0x000000), emissiveIntensity: live ? 0.55 : 0, metalness: 0.3, roughness: 0.5 });
      linkMats.set(k, m);
    }
    return m;
  };

  // --- Floor, grid, selection ring ---
  const floor = new Mesh(new PlaneGeometry(1, 1), M.floor);
  floor.rotation.x = -Math.PI / 2;
  root.add(floor);
  let grid: GridHelper | null = null;
  const sel = new Mesh(new RingGeometry(0.9, 1.05, 48), M.ring);
  sel.rotation.x = -Math.PI / 2;
  sel.position.y = 0.03;
  sel.visible = false;
  root.add(sel);

  let nodes = new Map<string, NodeObj>();
  let linkGroup = new Group();
  root.add(linkGroup);
  let zoneSprites: Sprite[] = [];
  let model: Plant3D | null = null;
  let layoutKey = '';
  let failureMode = false;
  let selectedId: string | null = null;

  // Pulses travel along live links
  const PULSES = 420;
  const pulseGeo = new SphereGeometry(0.07, 8, 6);
  const pulseMat = new MeshBasicMaterial({ color: 0xffffff });
  const pulses = new InstancedMesh(pulseGeo, pulseMat, PULSES);
  pulses.instanceMatrix.setUsage(DynamicDrawUsage);
  pulses.count = 0;
  root.add(pulses);
  let pulseTracks: { link: Link3D; len: number; segs: number[]; t: number; speed: number; color: Color }[] = [];

  // --- Text labels (canvas sprites) ---
  const makeLabel = (tag: string, sub: string, big: boolean) => {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 96;
    const tex = new CanvasTexture(c);
    tex.colorSpace = SRGBColorSpace;
    const spr = new Sprite(new SpriteMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
    spr.scale.set(big ? 2.2 : 1.5, big ? 0.82 : 0.56, 1);
    drawLabel(spr, tag, sub);
    return spr;
  };
  function drawLabel(spr: Sprite, tag: string, sub: string) {
    const tex = (spr.material as SpriteMaterial).map as CanvasTexture;
    const c = tex.image as HTMLCanvasElement;
    const ctx = c.getContext('2d')!;
    const th = stage.theme;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = th.dark ? 'rgba(11,15,20,0.78)' : 'rgba(255,255,255,0.88)';
    const r = 18;
    ctx.beginPath();
    ctx.roundRect(4, 4, c.width - 8, c.height - 8, r);
    ctx.fill();
    ctx.strokeStyle = '#' + th.blue.getHexString();
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = th.dark ? '#ffffff' : '#0b1220';
    ctx.font = '700 34px Montserrat, Inter, system-ui, sans-serif';
    ctx.fillText(tag, c.width / 2, 44);
    ctx.fillStyle = th.dark ? '#9aa7b8' : '#556274';
    ctx.font = '600 24px Inter, system-ui, sans-serif';
    ctx.fillText(sub.slice(0, 22), c.width / 2, 78);
    tex.needsUpdate = true;
  }
  const makeZone = (label: string) => {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 64;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#' + stage.theme.cyan.getHexString();
    ctx.font = '800 34px Montserrat, system-ui, sans-serif';
    ctx.fillText(label.toUpperCase(), 8, 44);
    const tex = new CanvasTexture(c);
    tex.colorSpace = SRGBColorSpace;
    const spr = new Sprite(new SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.85, toneMapped: false }));
    spr.scale.set(6, 0.75, 1);
    return spr;
  };

  // --- Equipment builders (simple, readable shapes) ---
  const box = (g: Group, w: number, h: number, d: number, mat: Material, x = 0, y = h / 2, z = 0, edges = true) => {
    const key = `box:${w},${h},${d}`;
    const m = new Mesh(geo(key, () => new BoxGeometry(w, h, d)), mat);
    m.position.set(x, y, z);
    if (edges && w * h * d > 0.05) edgeSrc.push({ key, mesh: m });
    g.add(m);
    return m;
  };
  const cyl = (g: Group, r: number, h: number, mat: Material, x = 0, y = h / 2, z = 0, rotZ = 0) => {
    const m = new Mesh(geo(`cyl:${r},${h}`, () => new CylinderGeometry(r, r, h, 20)), mat);
    m.position.set(x, y, z);
    m.rotation.z = rotZ;
    g.add(m);
    return m;
  };
  const fanOn = (g: Group, r: number, y: number) => {
    const f = new Group();
    f.position.y = y;
    for (let k = 0; k < 4; k++) {
      const blade = new Mesh(geo(`blade:${r}`, () => new BoxGeometry(r * 1.8, 0.02, r * 0.35)), M.steel);
      blade.rotation.y = (k / 4) * Math.PI;
      f.add(blade);
    }
    g.add(f);
    return f;
  };

  function buildNode(n: Node3D): NodeObj {
    const g = new Group();
    g.position.set(n.x, 0, n.z);
    const body: Mesh[] = [];
    let lever: Mesh | undefined;
    let spinner: Object3D | undefined;
    let h = 1;
    switch (n.kind) {
      case 'utility': {
        body.push(box(g, 0.12, 1.6, 0.12, M.steel, -0.3), box(g, 0.12, 1.6, 0.12, M.steel, 0.3), box(g, 1, 0.08, 0.1, M.steel, 0, 1.45));
        h = 1.6;
        break;
      }
      case 'mv-switchgear':
        body.push(box(g, 1.8, 1.1, 0.7, M.cab));
        h = 1.1;
        break;
      case 'paralleling-bus':
      case 'bus':
        body.push(box(g, n.kind === 'bus' ? 2.6 : 2.2, 0.12, 0.22, M.copper, 0, 0.2));
        h = 0.3;
        break;
      case 'busway':
        body.push(box(g, 1.8, 0.12, 0.2, M.steel, 0, 0.6), box(g, 0.08, 0.6, 0.08, M.dark, 0, 0.3, 0, false));
        h = 0.7;
        break;
      case 'generator': {
        body.push(box(g, 1.4, 0.75, 0.7, M.cab), box(g, 0.08, 0.5, 0.08, M.steel, 0.45, 0.95, -0.15));
        const f = fanOn(g, 0.25, 0.4);
        f.rotation.z = Math.PI / 2;
        f.position.x = -0.73;
        spinner = f;
        h = 1.2;
        break;
      }
      case 'transformer':
        body.push(box(g, 0.8, 0.8, 0.7, M.green));
        for (let k = 0; k < 3; k++) cyl(g, 0.04, 0.25, M.steel, -0.25 + k * 0.25, 0.92);
        h = 1.05;
        break;
      case 'breaker': {
        body.push(box(g, 0.5, 0.5, 0.45, M.cabLight));
        lever = new Mesh(geo('lever', () => new BoxGeometry(0.08, 0.3, 0.08)), M.glow);
        lever.position.set(0, 0.6, 0.12);
        g.add(lever);
        h = 0.75;
        break;
      }
      case 'ups':
        body.push(box(g, 1.3, 1.2, 0.6, M.cab), box(g, 0.45, 0.14, 0.01, M.glow, -0.2, 0.95, 0.31, false));
        h = 1.2;
        break;
      case 'bess':
        body.push(box(g, 1.6, 0.8, 0.7, M.steel));
        h = 0.8;
        break;
      case 'chiller-water-cooled':
        body.push(cyl(g, 0.28, 2, M.blue, 0, 0.35, 0.22, Math.PI / 2), cyl(g, 0.28, 2, M.cab, 0, 0.35, -0.3, Math.PI / 2), box(g, 0.5, 0.4, 0.4, M.cab, 0.3, 0.9, -0.05));
        h = 1.1;
        break;
      case 'chiller-air-cooled': {
        body.push(box(g, 2, 0.8, 1, M.steel));
        const f = fanOn(g, 0.3, 0.85);
        f.position.x = -0.5;
        spinner = f;
        h = 0.9;
        break;
      }
      case 'hx':
        for (let k = 0; k < 9; k++) body.push(box(g, 0.06, 0.9, 0.7, M.steel, -0.3 + k * 0.075, 0.45, 0, false));
        h = 0.9;
        break;
      case 'cooling-tower': {
        body.push(box(g, 1.4, 1, 1.4, M.steel), cyl(g, 0.55, 0.3, M.cab, 0, 1.15));
        spinner = fanOn(g, 0.48, 1.32);
        h = 1.35;
        break;
      }
      case 'pump-chw':
      case 'pump-cw': {
        body.push(cyl(g, 0.18, 0.5, M.blue, 0.15, 0.25, 0, Math.PI / 2), cyl(g, 0.22, 0.22, M.cab, -0.2, 0.25, 0, Math.PI / 2));
        const shaft = cyl(g, 0.03, 0.2, M.steel, 0, 0.25, 0, Math.PI / 2);
        spinner = shaft;
        h = 0.5;
        break;
      }
      case 'tes-tank':
        body.push(cyl(g, 0.7, 2.2, M.steel));
        h = 2.2;
        break;
      case 'doas': {
        body.push(box(g, 1.6, 0.8, 0.8, M.steel));
        const f = fanOn(g, 0.25, 0.85);
        spinner = f;
        h = 0.9;
        break;
      }
      case 'crah':
      case 'crac':
        body.push(box(g, 0.9, 1.4, 0.6, M.cab), box(g, 0.7, 0.3, 0.01, M.dark, 0, 0.4, 0.31, false));
        h = 1.4;
        break;
      case 'cdu':
        body.push(box(g, 0.7, 1.2, 0.6, M.cab), cyl(g, 0.05, 0.5, M.blue, -0.15, 1.45), cyl(g, 0.05, 0.5, M.copper, 0.15, 1.45));
        h = 1.7;
        break;
      default:
        body.push(box(g, 1.1, 1, 0.6, M.cab));
        h = 1;
    }
    const light = new Mesh(geo('light', () => new SphereGeometry(0.09, 12, 10)), lightMat('ok', stage.theme.ok));
    light.position.set(0, h + 0.18, 0);
    g.add(light);
    // Invisible, generous tap target
    const hw = Math.max(1.1, n.kind === 'bus' ? 2.6 : 1.2);
    const hit = new Mesh(geo(`hit:${hw},${h}`, () => new BoxGeometry(hw, h + 0.6, 1.1)), M.hit);
    hit.layers.set(HIT_LAYER);
    hit.position.y = (h + 0.6) / 2;
    hit.userData.id = n.id;
    g.add(hit);
    const label = makeLabel(n.tag, n.sub, n.kind !== 'breaker' && n.kind !== 'bus');
    label.position.set(0, h + 0.75, 0);
    g.add(label);
    root.add(g);
    return { n, group: g, hit, light, body, label, labelText: `${n.tag}|${n.sub}`, lever, spinner };
  }

  /** One line mesh for every equipment outline in this layout. */
  function buildEdges() {
    if (edgeLines) {
      root.remove(edgeLines);
      edgeLines.geometry.dispose();
      edgeLines = null;
    }
    root.updateMatrixWorld(true);
    const parts = edgeSrc.map(({ key, mesh }) => {
      const e = geo(`edges:${key}`, () => new EdgesGeometry(geoCache.get(key)!, 30)).clone();
      return e.applyMatrix4(mesh.matrixWorld);
    });
    edgeSrc = [];
    if (!parts.length) return;
    const merged = mergeGeometries(parts, false);
    parts.forEach((p) => p.dispose());
    if (!merged) return;
    edgeLines = new LineSegments(merged, edge);
    root.add(edgeLines);
  }

  function lockFor(o: NodeObj) {
    if (o.lock) return o.lock;
    const g = new Group();
    const shackle = new Mesh(geo('shackle', () => new TorusGeometry(0.09, 0.025, 8, 16, Math.PI)), M.steel);
    shackle.position.y = 0.1;
    const lbody = new Mesh(geo('lockbody', () => new BoxGeometry(0.2, 0.16, 0.08)), M.yellow);
    g.add(shackle, lbody);
    g.position.set(0.35, (o.light.position.y ?? 1) - 0.05, 0.35);
    o.group.add(g);
    o.lock = g;
    return g;
  }

  // Cables and pipes: one unit cylinder, drawn instanced per color group.
  const unitCyl = new CylinderGeometry(1, 1, 1, 10);
  let linkSegs: { link: string; mtx: Matrix4 }[] = [];
  let linkSig = '';
  function buildLinks(m: Plant3D) {
    linkSegs = [];
    linkSig = '';
    const q = new Quaternion();
    for (const l of m.links) {
      const isPipe = !!l.temp;
      const y = isPipe ? 0.35 : 0.06;
      const r = isPipe ? 0.07 * l.width : 0.045 * l.width;
      for (let i = 0; i + 1 < l.pts.length; i++) {
        const a = new Vector3(l.pts[i]![0], y, l.pts[i]![1]);
        const b = new Vector3(l.pts[i + 1]![0], y, l.pts[i + 1]![1]);
        const len = a.distanceTo(b);
        if (len < 0.01) continue;
        q.setFromUnitVectors(UP, b.clone().sub(a).normalize());
        linkSegs.push({ link: l.id, mtx: new Matrix4().compose(a.add(b).multiplyScalar(0.5), q, new Vector3(r, len, r)) });
      }
    }
  }
  function paintLinks(byId: Map<string, Link3D>, th: ThemeColors) {
    const groups = new Map<string, { mat: MeshStandardMaterial; mtx: Matrix4[] }>();
    for (const sg of linkSegs) {
      const l = byId.get(sg.link);
      if (!l) continue;
      const key = l.live ? `${l.temp ?? l.side ?? 'x'}` : 'dead';
      let g = groups.get(key);
      if (!g) groups.set(key, (g = { mat: l.live ? linkMat(key, linkColor(l, th), true) : linkMat('dead', th.line, false), mtx: [] }));
      g.mtx.push(sg.mtx);
    }
    const sig = [...groups].map(([k, g]) => `${k}:${g.mtx.length}:${g.mat.uuid}`).join('|') + '#' + linkSegs.length;
    // Same groups as last time: nothing to rebuild.
    if (sig === linkSig) return;
    linkSig = sig;
    for (const c of linkGroup.children) (c as InstancedMesh).dispose();
    linkGroup.clear();
    for (const g of groups.values()) {
      const im = new InstancedMesh(unitCyl, g.mat, g.mtx.length);
      g.mtx.forEach((m, i) => im.setMatrixAt(i, m));
      im.computeBoundingSphere();
      linkGroup.add(im);
    }
  }


  const linkColor = (l: Link3D, th: ThemeColors): Color => {
    if (l.temp) return l.temp === 'chws' ? th.cyan : l.temp === 'chwr' ? th.blue : l.temp === 'cwc' ? th.ok : th.warn;
    return l.side === 'a' ? th.sideA : l.side === 'b' ? th.sideB : l.side === 'c' ? th.ok : th.muted;
  };

  function paint() {
    if (!model) return;
    const th = stage.theme;
    // Nodes
    for (const o of nodes.values()) {
      const n = o.n;
      const key = n.state === 'failed' ? 'alarm' : n.state === 'maint' ? 'warn' : n.state === 'ok' ? 'ok' : 'muted';
      o.light.material = lightMat(key, th[key]);
      o.light.userData.key = key;
      const base = n.state === 'failed' ? M.failed : null;
      for (const b of o.body) {
        if (!b.userData.orig) b.userData.orig = b.material;
        b.material = base ?? (b.userData.orig as Material);
      }
      if (o.lever) {
        o.lever.position.y = n.closed ? 0.6 : 0.5;
        o.lever.rotation.z = n.closed ? 0 : 0.9;
        o.lever.material = lightMat(n.closed ? (n.live ? 'ok' : 'muted') : 'alarm', n.closed ? (n.live ? th.ok : th.muted) : th.alarm);
      }
      if (n.state === 'maint') lockFor(o).visible = true;
      else if (o.lock) o.lock.visible = false;
      const text = `${n.tag}|${n.sub}`;
      if (text !== o.labelText) {
        drawLabel(o.label, n.tag, n.sub);
        o.labelText = text;
      }
    }
    // Links: color by state, rebuild pulse tracks
    const byId = new Map(model.links.map((l) => [l.id, l]));
    paintLinks(byId, th);
    pulseTracks = [];
    for (const l of model.links) {
      if (!l.live) continue;
      const segs: number[] = [];
      let len = 0;
      for (let i = 0; i + 1 < l.pts.length; i++) {
        const d = Math.hypot(l.pts[i + 1]![0] - l.pts[i]![0], l.pts[i + 1]![1] - l.pts[i]![1]);
        segs.push(d);
        len += d;
      }
      if (len < 0.05) continue;
      const nPulse = Math.min(3, Math.max(1, Math.round(len / 3)));
      for (let k = 0; k < nPulse && pulseTracks.length < PULSES; k++)
        pulseTracks.push({ link: l, len, segs, t: k / nPulse, speed: (0.6 + Math.min(1, l.load) * 1.4) / Math.max(1, len), color: linkColor(l, th) });
    }
    pulses.count = pulseTracks.length;
    pulseTracks.forEach((p, i) => pulses.setColorAt(i, p.color.clone().lerp(new Color(0xffffff), 0.45)));
    if (pulses.instanceColor) pulses.instanceColor.needsUpdate = true;
    // Selection
    const s = selectedId ? nodes.get(selectedId) : undefined;
    sel.visible = !!s;
    if (s) sel.position.set(s.group.position.x, 0.03, s.group.position.z);
    M.ring.color.copy(failureMode ? th.alarm : th.blue);
    stage.invalidate();
  }

  // --- Camera: fit and fly-to ---
  let fly: { from: Vector3; to: Vector3; tFrom: Vector3; tTo: Vector3; t: number } | null = null;
  function fitAll() {
    if (!model) return;
    const [x0, z0, x1, z1] = model.bounds;
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;
    const span = Math.max(x1 - x0, (z1 - z0) * 1.4, 8);
    const aspect = camera.aspect || 1;
    const dist = (span / Math.min(aspect, 1.6)) * 0.95 + 6;
    const tgt = new Vector3(cx, 0, cz);
    const pos = new Vector3(cx, dist * 0.78, cz + dist * 0.62);
    camera.position.copy(pos);
    controls?.target.copy(tgt);
    controls?.update();
  }
  function focus(id: string | null) {
    const o = id ? nodes.get(id) : undefined;
    if (!o || !controls) return;
    const to = new Vector3(o.group.position.x, 0.4, o.group.position.z);
    const offset = camera.position.clone().sub(controls.target);
    const dist = Math.min(14, Math.max(6, offset.length()));
    offset.setLength(dist);
    // Off screen nothing is drawn, so a fly would freeze halfway: jump straight there instead.
    if (stage.calm || !stage.onScreen()) {
      fly = null;
      controls.target.copy(to);
      camera.position.copy(to.clone().add(offset));
      controls.update();
      stage.invalidate();
      return;
    }
    fly = { from: camera.position.clone(), to: to.clone().add(offset), tFrom: controls.target.clone(), tTo: to, t: 0 };
  }

  stage.onTheme((th) => {
    edge.color.copy(th.cyan);
    M.floor.color.copy(th.floor);
    for (const [k, m] of lightMats) {
      const c = th[k as 'ok' | 'warn' | 'alarm' | 'muted'];
      if (c) m.color.copy(c);
    }
    for (const m of linkMats.values()) m.dispose();
    linkMats.clear();
    for (const o of nodes.values()) {
      drawLabel(o.label, o.n.tag, o.n.sub);
    }
    if (grid) (grid.material as LineBasicMaterial).color = th.line.clone();
    paint();
  });
  M.floor.color.copy(stage.theme.floor);

  // --- Animation ---
  const mtx = new Matrix4();
  const pv = new Vector3();
  stage.onFrame((dt, t) => {
    if (fly && controls) {
      fly.t = Math.min(1, fly.t + dt / 0.9);
      const e = 1 - Math.pow(1 - fly.t, 3);
      camera.position.lerpVectors(fly.from, fly.to, e);
      controls.target.lerpVectors(fly.tFrom, fly.tTo, e);
      if (fly.t >= 1) fly = null;
    }
    const blink = Math.sin(t * 6) > 0;
    for (const o of nodes.values()) {
      if (o.n.state === 'failed') o.light.visible = blink;
      else o.light.visible = true;
      if (o.spinner && o.n.live && o.n.state !== 'failed') o.spinner.rotation[o.n.kind.startsWith('pump') ? 'x' : 'y'] += dt * 9;
    }
    if (sel.visible) sel.scale.setScalar(1 + Math.sin(t * 4) * 0.07);
    pulseTracks.forEach((p, i) => {
      p.t = (p.t + dt * p.speed) % 1;
      let d = p.t * p.len;
      let k = 0;
      while (k < p.segs.length - 1 && d > p.segs[k]!) d -= p.segs[k++]!;
      const a = p.link.pts[k]!;
      const b = p.link.pts[k + 1]!;
      const f = p.segs[k]! > 0 ? d / p.segs[k]! : 0;
      pv.set(a[0] + (b[0] - a[0]) * f, p.link.temp ? 0.35 : 0.08, a[1] + (b[1] - a[1]) * f);
      mtx.makeTranslation(pv.x, pv.y, pv.z);
      pulses.setMatrixAt(i, mtx);
    });
    pulses.instanceMatrix.needsUpdate = true;
  });

  // --- Picking ---
  const ray = new Raycaster();
  ray.layers.set(HIT_LAYER);
  const ndc = new Vector2();
  const pick = (clientX: number, clientY: number): string | null => {
    const rect = canvas.getBoundingClientRect();
    ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    // Make sure positions are current even if this view hasn't drawn a frame yet.
    scene.updateMatrixWorld();
    camera.updateMatrixWorld();
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects([...nodes.values()].map((o) => o.hit), false)[0];
    return (hit?.object.userData.id as string) ?? null;
  };
  let down: { x: number; y: number } | null = null;
  const onDown = (e: PointerEvent) => {
    down = { x: e.clientX, y: e.clientY };
  };
  const onUp = (e: PointerEvent) => {
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    down = null;
    if (moved > 6) return;
    const id = pick(e.clientX, e.clientY);
    if (id) opts.onActivate(id);
  };
  const onMove = (e: PointerEvent) => {
    if (e.buttons) return;
    canvas.style.cursor = pick(e.clientX, e.clientY) ? 'pointer' : 'grab';
  };
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointermove', onMove);

  const v3 = new Vector3();
  return {
    update(m, selected, fm) {
      const key = `${m.domain}:${m.nodes.map((n) => `${n.id}@${n.x.toFixed(2)},${n.z.toFixed(2)}`).join(',')}`;
      const first = !model || model.domain !== m.domain;
      if (key !== layoutKey) {
        for (const o of nodes.values()) {
          root.remove(o.group);
          o.group.traverse((x) => {
            const spr = x as Sprite;
            if ((spr as Sprite).isSprite) {
              (spr.material as SpriteMaterial).map?.dispose();
              spr.material.dispose();
            }
          });
        }
        nodes = new Map();
        edgeSrc = [];
        for (const n of m.nodes) nodes.set(n.id, buildNode(n));
        buildEdges();
        for (const s of zoneSprites) {
          root.remove(s);
          (s.material as SpriteMaterial).map?.dispose();
          s.material.dispose();
        }
        zoneSprites = m.zones.map((z) => {
          const s = makeZone(z.label);
          s.position.set(m.bounds[0] + 1.2, 0.4, z.z - 0.9);
          s.center.set(0, 0.5);
          root.add(s);
          return s;
        });
        buildLinks(m);
        const [x0, z0, x1, z1] = m.bounds;
        floor.scale.set(x1 - x0 + 12, z1 - z0 + 10, 1);
        floor.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2);
        if (grid) {
          root.remove(grid);
          grid.geometry.dispose();
          (grid.material as LineBasicMaterial).dispose();
        }
        const size = Math.max(x1 - x0 + 12, z1 - z0 + 10);
        grid = new GridHelper(size, Math.round(size), stage.theme.line, stage.theme.line);
        (grid.material as LineBasicMaterial).transparent = true;
        (grid.material as LineBasicMaterial).opacity = 0.22;
        grid.position.set((x0 + x1) / 2, 0.005, (z0 + z1) / 2);
        root.add(grid);
        layoutKey = key;
      }
      for (const n of m.nodes) {
        const o = nodes.get(n.id);
        if (o) o.n = n;
      }
      model = m;
      failureMode = fm;
      const changedSel = selected !== selectedId;
      selectedId = selected;
      paint();
      if (first) fitAll();
      if (changedSel && selected) focus(selected);
    },
    focus,
    pick,
    project(id) {
      const o = nodes.get(id);
      if (!o) return null;
      scene.updateMatrixWorld();
      o.group.getWorldPosition(v3);
      v3.y = o.light.position.y - 0.3;
      v3.project(camera);
      const rect = canvas.getBoundingClientRect();
      return { x: rect.left + ((v3.x + 1) / 2) * rect.width, y: rect.top + ((1 - v3.y) / 2) * rect.height };
    },
    nodeState(id) {
      const o = nodes.get(id);
      return o ? { state: o.n.state, light: String(o.light.userData.key ?? '') } : null;
    },
    liveLinks: () => pulseTracks.length,
    frames: stage.frames,
    info() {
      const r = stage.renderer.info;
      const t = controls?.target ?? new Vector3();
      return { geometries: r.memory.geometries, textures: r.memory.textures, programs: r.programs?.length ?? 0, calls: r.render.calls, triangles: r.render.triangles, target: [t.x, t.y, t.z], flying: !!fly };
    },
    dispose() {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointermove', onMove);
      for (const o of nodes.values())
        o.group.traverse((x) => {
          const spr = x as Sprite;
          if (spr.isSprite) (spr.material as SpriteMaterial).map?.dispose();
        });
      for (const s of zoneSprites) (s.material as SpriteMaterial).map?.dispose();
      for (const m of [...lightMats.values(), ...linkMats.values(), ...Object.values(M), edge, pulseMat]) m.dispose();
      pulseGeo.dispose();
      unitCyl.dispose();
      for (const g of geoCache.values()) g.dispose();
      edgeLines?.geometry.dispose();
      stage.dispose();
    },
  };
}
