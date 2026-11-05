/**
 * 3D data hall. Home uses it as a slowly orbiting demo; the Simulator uses
 * it live: rack lights follow each rack's real state, airflow follows the
 * cooling, power pulses run along the busway, and tapping a rack selects it.
 */
import {
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  Points,
  PointsMaterial,
  Raycaster,
  RingGeometry,
  SphereGeometry,
  Vector2,
  Vector3,
  GridHelper,
  DoubleSide,
  LineBasicMaterial,
} from 'three';
import { addEdges, createStage, edgeMaterial, type ThemeColors } from '../core';
import { STATUS_COLOR, heat01, type HallVis, type RackVis } from '../hallState';

export interface HallApi {
  update: (vis: HallVis, selected?: string | null) => void;
  pick: (clientX: number, clientY: number) => string | null;
  project: (id: string) => { x: number; y: number } | null;
  rackColor: (id: string) => string | null;
  frames: () => number;
  dispose: () => void;
}

const RACK_W = 0.62;
const RACK_H = 2;
const RACK_D = 1.1;
const PITCH_X = 0.7;
const ROW_PITCH = 2.5;

interface RackObj {
  group: Group;
  body: Mesh;
  strip: Mesh;
  leds: Mesh[];
  vis: RackVis;
}

export function mountHall(canvas: HTMLCanvasElement, opts: { mode: 'hero' | 'live'; onPick?: (id: string) => void }): HallApi {
  const live = opts.mode === 'live';
  const stage = createStage(canvas, {
    camera: live ? [7, 8.5, 11] : [9, 6.5, 12],
    target: [0, 0.6, 0],
    fov: live ? 40 : 38,
    interactive: live,
    minDistance: 6,
    maxDistance: 30,
    transparent: !live,
    fog: live ? [18, 46] : undefined,
    maxDpr: live ? 1.5 : 1.25,
    fps: 30,
  });
  const { scene, camera, renderer } = stage;
  const root = new Group();
  scene.add(root);

  // --- Materials (re-tinted on theme change) ---
  const mBody = new MeshStandardMaterial({ color: 0x2f3e57, metalness: 0.35, roughness: 0.48 });
  const mBodyGpu = new MeshStandardMaterial({ color: 0x2a4166, metalness: 0.4, roughness: 0.42 });
  const mDown = new MeshStandardMaterial({ color: 0x4a2228, metalness: 0.25, roughness: 0.6 });
  const mFloor = new MeshStandardMaterial({ color: 0x0e131a, metalness: 0.05, roughness: 0.92 });
  const mCrah = new MeshStandardMaterial({ color: 0x46566f, metalness: 0.35, roughness: 0.5 });
  const mBus = new MeshStandardMaterial({ color: 0x8b97a8, metalness: 0.75, roughness: 0.3 });
  const mEdge = edgeMaterial(stage.theme, live ? 0.4 : 0.55);
  const mPipe = new MeshStandardMaterial({ color: 0x0e7490, metalness: 0.7, roughness: 0.35 });
  const mPulse = new MeshBasicMaterial({ color: 0x22d3ee });
  const mSel = new MeshBasicMaterial({ color: 0x3d8bff, transparent: true, opacity: 0.85, side: DoubleSide });
  const ledMats = new Map<string, MeshBasicMaterial>();
  const ledMat = (key: string, c: Color) => {
    let m = ledMats.get(key);
    if (!m) {
      m = new MeshBasicMaterial({ color: c.clone() });
      ledMats.set(key, m);
    }
    return m;
  };

  // --- Static room ---
  let rackObjs: RackObj[] = [];
  let layoutKey = '';
  const floorGeo = new PlaneGeometry(1, 1);
  const floor = new Mesh(floorGeo, mFloor);
  floor.rotation.x = -Math.PI / 2;
  root.add(floor);
  let grid: GridHelper | null = null;
  const crahs: Mesh[] = [];
  const buses: Mesh[] = [];
  const pulses: { mesh: Mesh; row: number; t: number; len: number; x0: number }[] = [];
  const pipes: Mesh[] = [];
  const selRing = new Mesh(new RingGeometry(0.55, 0.68, 40), mSel);
  selRing.rotation.x = -Math.PI / 2;
  selRing.position.y = 0.02;
  selRing.visible = false;
  root.add(selRing);

  // --- Airflow particles (cold air rising from perforated tiles) ---
  const N = 520;
  const pos = new Float32Array(N * 3);
  const speed = new Float32Array(N);
  const pGeo = new BufferGeometry();
  pGeo.setAttribute('position', new BufferAttribute(pos, 3));
  const pMat = new PointsMaterial({ size: 0.07, color: 0x22d3ee, transparent: true, opacity: 0.75, depthWrite: false, blending: AdditiveBlending });
  const particles = new Points(pGeo, pMat);
  root.add(particles);
  let aisleZ: number[] = [0];
  let hallW = 6;
  const seed = (i: number, fresh: boolean) => {
    const z = aisleZ[i % aisleZ.length]!;
    pos[i * 3] = (Math.random() - 0.5) * hallW;
    pos[i * 3 + 1] = fresh ? Math.random() * 2.4 : 0;
    pos[i * 3 + 2] = z + (Math.random() - 0.5) * 0.9;
    speed[i] = 0.4 + Math.random() * 0.6;
  };

  let vis: HallVis | null = null;
  let selected: string | null = null;

  const rackX = (slot: number, perRow: number) => (slot - (perRow - 1) / 2) * PITCH_X;
  const rowZ = (row: number, rows: number) => (row - (rows - 1) / 2) * ROW_PITCH;

  function build(v: HallVis) {
    // Clear old racks and room pieces that depend on the layout.
    for (const r of rackObjs) root.remove(r.group);
    for (const m of [...crahs, ...buses, ...pipes, ...pulses.map((p) => p.mesh)]) root.remove(m);
    rackObjs = [];
    crahs.length = 0;
    buses.length = 0;
    pulses.length = 0;
    pipes.length = 0;
    if (grid) {
      root.remove(grid);
      grid.geometry.dispose();
      (grid.material as LineBasicMaterial).dispose();
    }

    hallW = v.perRow * PITCH_X + 1.4;
    const hallD = v.rows * ROW_PITCH + 2.2;
    floor.scale.set(hallW + 4, hallD + 2, 1);
    grid = new GridHelper(Math.max(hallW + 4, hallD + 2), Math.round(Math.max(hallW + 4, hallD + 2) / 0.6), stage.theme.line, stage.theme.line);
    (grid.material as LineBasicMaterial).transparent = true;
    (grid.material as LineBasicMaterial).opacity = 0.35;
    grid.position.y = 0.005;
    root.add(grid);

    const bodyGeo = new BoxGeometry(RACK_W, RACK_H, RACK_D);
    const stripGeo = new BoxGeometry(0.05, RACK_H * 0.82, 0.02);
    const ledGeo = new BoxGeometry(0.08, 0.04, 0.02);
    for (const r of v.racks) {
      const g = new Group();
      const facing = r.row % 2 === 0 ? 1 : -1; // fronts face the cold aisle
      g.position.set(rackX(r.slot, v.perRow), RACK_H / 2, rowZ(r.row, v.rows));
      const body = new Mesh(bodyGeo, r.gpu ? mBodyGpu : mBody);
      body.userData.id = r.id;
      addEdges(body, mEdge);
      g.add(body);
      const strip = new Mesh(stripGeo, ledMat('ok', stage.theme.ok));
      strip.position.set(-RACK_W / 2 + 0.08, 0, (facing * RACK_D) / 2 + facing * 0.012);
      g.add(strip);
      const leds: Mesh[] = [];
      for (let k = 0; k < 5; k++) {
        const led = new Mesh(ledGeo, ledMat('ok', stage.theme.ok));
        led.position.set(0.1 + (k % 2) * 0.12, -0.7 + k * 0.33, (facing * RACK_D) / 2 + facing * 0.012);
        g.add(led);
        leds.push(led);
      }
      root.add(g);
      rackObjs.push({ group: g, body, strip, leds, vis: r });
    }

    // Busway over each row, with a power pulse that runs along it.
    for (let row = 0; row < v.rows; row++) {
      const len = v.perRow * PITCH_X;
      const bus = new Mesh(new BoxGeometry(len, 0.08, 0.16), mBus);
      bus.position.set(0, RACK_H + 0.55, rowZ(row, v.rows));
      root.add(bus);
      buses.push(bus);
      const pulse = new Mesh(new SphereGeometry(0.07, 12, 10), mPulse);
      pulse.position.copy(bus.position);
      root.add(pulse);
      pulses.push({ mesh: pulse, row, t: Math.random(), len, x0: -len / 2 });
      // Liquid cooling pipes over GPU rows.
      if (v.racks.some((r) => r.row === row && r.gpu)) {
        const pipe = new Mesh(new CylinderGeometry(0.05, 0.05, len, 10), mPipe);
        pipe.rotation.z = Math.PI / 2;
        pipe.position.set(0, RACK_H + 0.25, rowZ(row, v.rows) + 0.25);
        root.add(pipe);
        pipes.push(pipe);
      }
    }

    // Air handlers along both side walls.
    const crahCount = Math.max(2, Math.ceil(v.rows / 2));
    for (let k = 0; k < crahCount; k++) {
      for (const side of [-1, 1]) {
        const c = new Mesh(new BoxGeometry(0.8, 2.2, 1.6), mCrah);
        addEdges(c, mEdge);
        c.position.set(side * (hallW / 2 + 0.9), 1.1, (k - (crahCount - 1) / 2) * (hallD / crahCount));
        root.add(c);
        crahs.push(c);
      }
    }

    // Cold aisles sit between each pair of rows.
    aisleZ = [];
    for (let row = 0; row + 1 < v.rows; row += 2) aisleZ.push((rowZ(row, v.rows) + rowZ(row + 1, v.rows)) / 2);
    if (!aisleZ.length) aisleZ = [0];
    for (let i = 0; i < N; i++) seed(i, true);
    pGeo.attributes.position!.needsUpdate = true;
  }

  function paint() {
    if (!vis) return;
    const th = stage.theme;
    for (const o of rackObjs) {
      const key = STATUS_COLOR[o.vis.status];
      const c = th[key];
      o.body.material = o.vis.status === 'down' || o.vis.status === 'hot' ? mDown : o.vis.gpu ? mBodyGpu : mBody;
      o.strip.material = ledMat(key, c);
      o.leds.forEach((l, i) => {
        const on = o.vis.status === 'up' ? true : o.vis.status === 'throttled' ? i % 2 === 0 : i === 0;
        l.material = on ? ledMat(key, c) : ledMat('off', th.line);
      });
      o.group.userData.status = o.vis.status;
    }
    const heat = heat01(vis.inletC);
    pMat.color.copy(th.cyan).lerp(th.warn, heat);
    pMat.opacity = 0.25 + 0.55 * vis.airflow;
    mPulse.color.copy(th.cyan);
    const sel = rackObjs.find((o) => o.vis.id === selected);
    selRing.visible = !!sel;
    if (sel) selRing.position.set(sel.group.position.x, 0.02, sel.group.position.z);
    stage.invalidate();
  }

  stage.onTheme((th: ThemeColors) => {
    for (const [key, m] of ledMats) {
      const c = key === 'off' ? th.line : th[key as 'ok' | 'warn' | 'alarm'];
      if (c) m.color.copy(c);
    }
    mFloor.color.copy(th.floor);
    if (grid) (grid.material as LineBasicMaterial).color = th.line.clone();
    mSel.color.copy(th.blue);
    mEdge.color.copy(th.cyan);
    paint();
  });
  mFloor.color.copy(stage.theme.floor);
  mSel.color.copy(stage.theme.blue);

  // --- Animation ---
  let heroAngle = 0.6;
  const pointer = new Vector2(0, 0);
  stage.onFrame((dt, t) => {
    if (!vis) return;
    // Air rises from the tiles, faster when more cooling runs.
    const flow = 0.3 + vis.airflow * 1.2;
    for (let i = 0; i < N; i++) {
      pos[i * 3 + 1]! += dt * speed[i]! * flow;
      if (pos[i * 3 + 1]! > 2.5) seed(i, false);
    }
    pGeo.attributes.position!.needsUpdate = true;
    // Power pulses run along busways of rows that still have power.
    for (const p of pulses) {
      const rowUp = vis.racks.some((r) => r.row === p.row && r.status !== 'down');
      p.mesh.visible = rowUp;
      p.t = (p.t + dt * 0.45) % 1;
      p.mesh.position.x = p.x0 + p.t * p.len;
    }
    // Blink alarm and throttle lights.
    const blink = Math.sin(t * 6) > 0;
    for (const o of rackObjs) {
      if (o.vis.status === 'down' || o.vis.status === 'hot') o.leds[0]!.visible = blink;
      else if (o.vis.status === 'throttled') o.strip.visible = Math.sin(t * 3) > -0.4;
      else {
        o.leds[0]!.visible = true;
        o.strip.visible = true;
        // A gentle "disk activity" twinkle on healthy racks.
        o.leds[4]!.visible = Math.sin(t * 7 + o.vis.num * 1.7) > -0.2;
      }
    }
    if (selRing.visible) selRing.scale.setScalar(1 + Math.sin(t * 4) * 0.06);
    if (!live) {
      heroAngle += dt * 0.07;
      const r = 15;
      camera.position.set(Math.sin(heroAngle) * r + pointer.x * 1.6, 6.2 + pointer.y * 1.2, Math.cos(heroAngle) * r);
      camera.lookAt(0, 0.4, 0);
    }
  });
  const onPointerMove = (e: PointerEvent) => {
    pointer.set((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1));
  };
  if (!live && !stage.calm) window.addEventListener('pointermove', onPointerMove, { passive: true });
  if (!live) {
    camera.position.set(Math.sin(heroAngle) * 15, 6.2, Math.cos(heroAngle) * 15);
    camera.lookAt(0, 0.4, 0);
  }

  // --- Picking (tap a rack) ---
  const ray = new Raycaster();
  const ndc = new Vector2();
  const pick = (clientX: number, clientY: number): string | null => {
    const rect = canvas.getBoundingClientRect();
    ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    scene.updateMatrixWorld();
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(rackObjs.map((o) => o.body), false)[0];
    return (hit?.object.userData.id as string) ?? null;
  };
  let down: { x: number; y: number } | null = null;
  const onDown = (e: PointerEvent) => {
    down = { x: e.clientX, y: e.clientY };
  };
  const onUp = (e: PointerEvent) => {
    if (!down || !opts.onPick) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    down = null;
    if (moved > 6) return; // that was a drag, not a tap
    const id = pick(e.clientX, e.clientY);
    if (id) opts.onPick(id);
  };
  if (live) {
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointerup', onUp);
  }

  const v3 = new Vector3();
  return {
    update(v, sel = null) {
      const key = `${v.rows}x${v.perRow}:${v.racks.map((r) => r.id).join(',')}`;
      if (key !== layoutKey) {
        build(v);
        layoutKey = key;
      }
      // Keep the rack objects pointing at fresh data.
      const byId = new Map(v.racks.map((r) => [r.id, r]));
      for (const o of rackObjs) o.vis = byId.get(o.vis.id) ?? o.vis;
      vis = v;
      selected = sel;
      paint();
    },
    pick,
    project(id) {
      const o = rackObjs.find((x) => x.vis.id === id);
      if (!o) return null;
      // Aim at the middle of the rack's roof: always visible from the camera above.
      o.group.getWorldPosition(v3);
      v3.y += RACK_H / 2 - 0.02;
      v3.project(camera);
      const rect = canvas.getBoundingClientRect();
      return { x: rect.left + ((v3.x + 1) / 2) * rect.width, y: rect.top + ((1 - v3.y) / 2) * rect.height };
    },
    rackColor(id) {
      const o = rackObjs.find((x) => x.vis.id === id);
      return o ? '#' + (o.strip.material as MeshBasicMaterial).color.getHexString() : null;
    },
    frames: stage.frames,
    dispose() {
      window.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointerup', onUp);
      for (const m of ledMats.values()) m.dispose();
      for (const m of [mBody, mBodyGpu, mDown, mFloor, mCrah, mBus, mPipe, mPulse, mSel, pMat, mEdge]) m.dispose();
      stage.dispose();
      void renderer;
    },
  };
}
