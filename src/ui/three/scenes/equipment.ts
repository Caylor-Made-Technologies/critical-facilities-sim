/**
 * Equipment models: low-poly, original, built from simple shapes in code.
 * Drag to turn, pinch to zoom; fans, wheels and shafts spin; status lights
 * blink. One model at a time; switching rebuilds and frames the camera.
 */
import {
  Box3,
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  RingGeometry,
  SphereGeometry,
  TorusGeometry,
  Vector3,
  DoubleSide,
  type Material,
  type Object3D,
} from 'three';
import { addEdges, createStage, disposeTree, edgeMaterial } from '../core';
import type { ModelKey } from '../models';

export interface EquipmentApi {
  show: (key: ModelKey) => void;
  current: () => ModelKey | null;
  meshCount: () => number;
  frames: () => number;
  dispose: () => void;
}

type Spinner = { obj: Object3D; axis: 'x' | 'y' | 'z'; speed: number };
type Blinker = { mesh: Mesh; phase: number };

export function mountEquipment(canvas: HTMLCanvasElement): EquipmentApi {
  const stage = createStage(canvas, { camera: [4, 3, 5], target: [0, 1, 0], fov: 36, interactive: true, autoRotate: 1.4, minDistance: 2.5, maxDistance: 16, transparent: true });
  const { scene, camera, controls } = stage;
  const holder = new Group();
  scene.add(holder);

  // Shared palette
  const metal = (c: number, m = 0.55, r = 0.45) => new MeshStandardMaterial({ color: c, metalness: m, roughness: r });
  const M = {
    cab: metal(0x3d4f6b, 0.35, 0.45),
    cabLight: metal(0x52688a, 0.35, 0.42),
    dark: metal(0x1f2836, 0.3, 0.65),
    steel: metal(0xb3bfcf, 0.75, 0.3),
    copper: metal(0xb87333, 0.9, 0.3),
    blue: metal(0x1e6fff, 0.5, 0.4),
    cyanPipe: metal(0x0e7490, 0.7, 0.35),
    hotPipe: metal(0xc2410c, 0.6, 0.4),
    red: metal(0xc62828, 0.3, 0.5),
    yellow: metal(0xf2b705, 0.3, 0.5),
    green: metal(0x3f8a64, 0.3, 0.5),
    edge: edgeMaterial(stage.theme, 0.5),
    base: new MeshStandardMaterial({ color: 0x0e131a, metalness: 0.2, roughness: 0.9 }),
    glowCyan: new MeshBasicMaterial({ color: 0x22d3ee }),
    glowGreen: new MeshBasicMaterial({ color: 0x3ddc97 }),
    glowAmber: new MeshBasicMaterial({ color: 0xffb547 }),
    glowRed: new MeshBasicMaterial({ color: 0xff6b6b }),
    water: new MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.45 }),
    ring: new MeshBasicMaterial({ color: 0x3d8bff, transparent: true, opacity: 0.5, side: DoubleSide }),
  };
  const sharedMats = new Set<Material>(Object.values(M));

  let spinners: Spinner[] = [];
  let blinkers: Blinker[] = [];
  let model: Group | null = null;
  let key: ModelKey | null = null;

  const box = (g: Group, w: number, h: number, d: number, mat: Material, x = 0, y = h / 2, z = 0) => {
    const m = new Mesh(new BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    if (w * h * d > 0.25) addEdges(m, M.edge);
    g.add(m);
    return m;
  };
  const cyl = (g: Group, r: number, h: number, mat: Material, x = 0, y = h / 2, z = 0, rot?: [number, number, number], seg = 24) => {
    const m = new Mesh(new CylinderGeometry(r, r, h, seg), mat);
    m.position.set(x, y, z);
    if (rot) m.rotation.set(...rot);
    g.add(m);
    return m;
  };
  const led = (g: Group, x: number, y: number, z: number, mat: Material, blink = true) => {
    const m = new Mesh(new SphereGeometry(0.035, 10, 8), mat);
    m.position.set(x, y, z);
    g.add(m);
    if (blink) blinkers.push({ mesh: m, phase: Math.random() * 6 });
    return m;
  };
  const fan = (g: Group, r: number, x: number, y: number, z: number, axis: 'x' | 'y' | 'z', speed: number, facing: [number, number, number] = [0, 0, 0]) => {
    const f = new Group();
    f.position.set(x, y, z);
    f.rotation.set(...facing);
    const hub = new Mesh(new CylinderGeometry(r * 0.18, r * 0.18, 0.06, 12), M.dark);
    f.add(hub);
    for (let k = 0; k < 5; k++) {
      const blade = new Mesh(new BoxGeometry(r * 0.9, 0.02, r * 0.28), M.steel);
      blade.position.x = r * 0.5;
      const arm = new Group();
      arm.rotation.y = (k / 5) * Math.PI * 2;
      blade.rotation.x = 0.35;
      arm.add(blade);
      f.add(arm);
    }
    const shroud = new Mesh(new TorusGeometry(r, 0.03, 8, 32), M.dark);
    shroud.rotation.x = Math.PI / 2;
    f.add(shroud);
    g.add(f);
    spinners.push({ obj: f, axis, speed });
    return f;
  };
  /** A typical electrical cabinet: body, door, vents, handle, display. */
  const cabinet = (g: Group, w: number, h: number, d: number, x = 0, display = true) => {
    box(g, w, h, d, M.cab, x, h / 2, 0);
    box(g, w * 0.92, h * 0.94, 0.02, M.cabLight, x, h / 2, d / 2 + 0.01);
    for (let k = 0; k < 4; k++) box(g, w * 0.6, 0.02, 0.01, M.dark, x, h * 0.12 + k * 0.05, d / 2 + 0.025);
    box(g, 0.03, 0.18, 0.04, M.steel, x + w * 0.36, h * 0.55, d / 2 + 0.04);
    if (display) box(g, w * 0.4, h * 0.1, 0.01, M.glowCyan, x, h * 0.78, d / 2 + 0.025);
  };

  const builders: Record<ModelKey, (g: Group) => void> = {
    'mv-gear': (g) => {
      for (let i = 0; i < 4; i++) {
        cabinet(g, 0.7, 2.2, 1.1, (i - 1.5) * 0.74, i === 1);
        led(g, (i - 1.5) * 0.74 - 0.15, 1.95, 0.57, i === 2 ? M.glowRed : M.glowGreen, false);
      }
      for (let k = 0; k < 3; k++) cyl(g, 0.05, 1.2, M.dark, -1.1 + k * 0.15, 2.8, -0.3);
    },
    transformer: (g) => {
      box(g, 1.6, 1.4, 1.2, M.green, 0, 0.7);
      for (let k = 0; k < 9; k++) box(g, 0.04, 1.1, 0.35, M.green, -0.7 + k * 0.175, 0.65, 0.77);
      for (let k = 0; k < 3; k++) {
        cyl(g, 0.07, 0.35, M.steel, -0.45 + k * 0.45, 1.58, -0.2);
        cyl(g, 0.11, 0.06, M.steel, -0.45 + k * 0.45, 1.78, -0.2);
      }
    },
    generator: (g) => {
      box(g, 3, 1.5, 1.2, M.cab, 0, 0.75);
      box(g, 3.1, 0.1, 1.3, M.dark, 0, 1.55);
      for (let k = 0; k < 6; k++) box(g, 0.32, 0.9, 0.02, M.dark, -1.1 + k * 0.4, 0.8, 0.61);
      cyl(g, 0.1, 0.9, M.steel, 1.1, 1.95, -0.2);
      cyl(g, 0.14, 0.12, M.dark, 1.1, 2.42, -0.2);
      box(g, 0.05, 1.1, 1.0, M.dark, -1.53, 0.8);
      fan(g, 0.45, -1.58, 0.8, 0, 'y', 9, [0, 0, Math.PI / 2]);
      led(g, 1.3, 1.2, 0.62, M.glowGreen);
    },
    ats: (g) => {
      cabinet(g, 1, 2, 0.7);
      led(g, -0.25, 1.75, 0.37, M.glowGreen, false);
      led(g, 0.25, 1.75, 0.37, M.glowAmber);
      box(g, 0.5, 0.06, 0.02, M.steel, 0, 1.1, 0.37);
    },
    switchboard: (g) => {
      for (let i = 0; i < 5; i++) {
        box(g, 0.66, 2.1, 0.9, M.cab, (i - 2) * 0.7, 1.05);
        for (let k = 0; k < 3; k++) box(g, 0.56, 0.5, 0.02, M.cabLight, (i - 2) * 0.7, 0.45 + k * 0.6, 0.46);
        led(g, (i - 2) * 0.7 + 0.2, 1.9, 0.48, i === 2 ? M.glowAmber : M.glowGreen, i === 2);
      }
      box(g, 0.06, 0.2, 0.06, M.yellow, 0, 1.55, 0.5); // the Kirk key
    },
    ups: (g) => {
      cabinet(g, 1, 2, 0.9, -0.55);
      cabinet(g, 0.8, 2, 0.9, 0.42, false);
      cabinet(g, 0.8, 2, 0.9, 1.25, false);
      for (let k = 0; k < 6; k++) box(g, 0.6, 0.18, 0.02, M.dark, 0.42 + (k % 2) * 0.83, 0.4 + Math.floor(k / 2) * 0.5, 0.47);
      led(g, -0.75, 1.75, 0.47, M.glowGreen);
    },
    bess: (g) => {
      for (let i = 0; i < 2; i++) {
        box(g, 2.4, 1.2, 1, M.steel, 0, 0.6 + i * 1.25);
        for (let k = 0; k < 5; k++) box(g, 0.02, 1, 0.02, M.dark, -1 + k * 0.5, 0.6 + i * 1.25, 0.51);
        led(g, 1.05, 1.0 + i * 1.25, 0.52, M.glowGreen);
      }
    },
    sts: (g) => {
      cabinet(g, 1.2, 2, 0.8);
      led(g, -0.3, 1.82, 0.42, M.glowGreen, false);
      led(g, 0.3, 1.82, 0.42, M.glowGreen);
    },
    pdu: (g) => {
      cabinet(g, 0.9, 1.9, 0.9);
      box(g, 4, 0.12, 0.25, M.steel, 0, 2.6);
      for (let k = 0; k < 4; k++) {
        box(g, 0.22, 0.3, 0.2, M.cabLight, -1.5 + k, 2.35);
        cyl(g, 0.02, 0.6, M.dark, -1.5 + k, 1.95);
      }
    },
    rack: (g) => {
      box(g, 0.62, 2.1, 1.1, M.dark, 0, 1.05);
      for (let k = 0; k < 16; k++) {
        box(g, 0.54, 0.09, 0.02, M.cab, 0, 0.2 + k * 0.115, 0.56);
        led(g, 0.18, 0.2 + k * 0.115, 0.575, k % 5 === 0 ? M.glowAmber : M.glowGreen);
      }
    },
    chiller: (g) => {
      cyl(g, 0.38, 2.6, M.blue, 0, 0.5, 0.35, [0, 0, Math.PI / 2]);
      cyl(g, 0.38, 2.6, M.cab, 0, 0.5, -0.45, [0, 0, Math.PI / 2]);
      cyl(g, 0.3, 0.8, M.steel, -0.3, 1.25, -0.05, [0, 0, Math.PI / 2]);
      box(g, 0.4, 0.5, 0.4, M.cab, 0.6, 1.25, -0.05);
      cyl(g, 0.09, 0.8, M.cyanPipe, -1.45, 0.5, 0.35, [0, 0, Math.PI / 2]);
      cyl(g, 0.09, 0.8, M.hotPipe, -1.45, 0.5, -0.45, [0, 0, Math.PI / 2]);
      box(g, 0.5, 0.6, 0.15, M.cabLight, 1.0, 1.1, 0.4);
      box(g, 0.3, 0.15, 0.01, M.glowCyan, 1.0, 1.2, 0.48);
    },
    tower: (g) => {
      box(g, 2.2, 1.8, 2.2, M.steel, 0, 0.9);
      for (let k = 0; k < 7; k++) box(g, 2.1, 0.03, 0.03, M.dark, 0, 0.3 + k * 0.2, 1.11);
      // Open fan stack so you can see the blades turn.
      const stack = new Mesh(new CylinderGeometry(0.9, 0.95, 0.55, 40, 1, true), new MeshStandardMaterial({ color: 0x3d4f6b, metalness: 0.35, roughness: 0.45, side: DoubleSide }));
      stack.position.set(0, 2.07, 0);
      g.add(stack);
      fan(g, 0.82, 0, 2.2, 0, 'y', 7);
      // falling water
      for (let k = 0; k < 10; k++) {
        const d = new Mesh(new BoxGeometry(0.02, 0.18, 0.02), M.water);
        d.position.set(-0.9 + (k % 5) * 0.45, 0.5 + Math.random(), 0.9 + Math.floor(k / 5) * 0.1);
        d.userData.fall = true;
        g.add(d);
      }
    },
    pump: (g) => {
      box(g, 1.6, 0.15, 0.6, M.dark, 0, 0.075);
      cyl(g, 0.25, 0.7, M.blue, 0.35, 0.45, 0, [0, 0, Math.PI / 2]);
      cyl(g, 0.3, 0.3, M.cab, -0.35, 0.45, 0, [0, 0, Math.PI / 2]);
      const shaft = cyl(g, 0.04, 0.3, M.steel, 0, 0.45, 0, [0, 0, Math.PI / 2], 8);
      spinners.push({ obj: shaft, axis: 'x', speed: 14 });
      cyl(g, 0.1, 0.6, M.cyanPipe, -0.35, 0.95, 0);
      cyl(g, 0.1, 0.5, M.cyanPipe, -0.75, 0.45, 0, [0, 0, Math.PI / 2]);
    },
    tank: (g) => {
      cyl(g, 1.1, 3.4, M.steel, 0, 1.7, 0, undefined, 40);
      cyl(g, 1.12, 0.08, M.dark, 0, 3.2);
      cyl(g, 1.12, 0.08, M.dark, 0, 0.3);
      cyl(g, 0.12, 1.2, M.cyanPipe, 1.4, 0.6, 0, [0, 0, Math.PI / 2]);
      cyl(g, 0.12, 1.2, M.hotPipe, 1.4, 2.8, 0, [0, 0, Math.PI / 2]);
    },
    crah: (g) => {
      box(g, 2, 2.1, 0.9, M.cab, 0, 1.05);
      box(g, 1.9, 0.6, 0.02, M.cabLight, 0, 1.6, 0.46);
      for (let k = 0; k < 3; k++) fan(g, 0.24, -0.6 + k * 0.6, 0.5, 0.47, 'z', 10, [Math.PI / 2, 0, 0]);
      box(g, 0.3, 0.12, 0.01, M.glowCyan, 0.7, 1.75, 0.475);
    },
    cdu: (g) => {
      cabinet(g, 0.9, 2, 0.9);
      cyl(g, 0.07, 1.2, M.cyanPipe, -0.2, 2.4);
      cyl(g, 0.07, 1.2, M.hotPipe, 0.2, 2.4);
      cyl(g, 0.07, 1.4, M.cyanPipe, 0.5, 3, 0, [0, 0, Math.PI / 2]);
      cyl(g, 0.07, 1.4, M.hotPipe, 0.9, 2.8, 0, [0, 0, Math.PI / 2]);
    },
    doas: (g) => {
      box(g, 3, 1.3, 1.3, M.steel, 0, 0.65);
      for (let k = 0; k < 4; k++) box(g, 0.02, 1.1, 0.02, M.dark, -1.2 + k * 0.8, 0.65, 0.66);
      const wheel = new Mesh(new CylinderGeometry(0.5, 0.5, 0.15, 32), M.cabLight);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(-0.6, 0.65, 0.73);
      g.add(wheel);
      const spokes = new Group();
      spokes.position.copy(wheel.position);
      spokes.position.z += 0.08;
      for (let k = 0; k < 6; k++) {
        const s = new Mesh(new BoxGeometry(0.9, 0.03, 0.01), M.dark);
        s.rotation.z = (k / 6) * Math.PI;
        spokes.add(s);
      }
      g.add(spokes);
      spinners.push({ obj: spokes, axis: 'z', speed: 1.2 });
      fan(g, 0.3, 0.8, 1.32, 0, 'y', 8);
    },
    fire: (g) => {
      for (let k = 0; k < 3; k++) {
        cyl(g, 0.18, 1.5, M.red, -0.6 + k * 0.42, 0.75);
        cyl(g, 0.08, 0.15, M.steel, -0.6 + k * 0.42, 1.57);
      }
      cyl(g, 0.04, 1.6, M.steel, 0.2, 2.2, 0, [0, 0, Math.PI / 2]);
      cyl(g, 0.04, 0.6, M.steel, -0.6, 1.9);
      for (let k = 0; k < 3; k++) {
        cyl(g, 0.05, 0.1, M.copper, -0.3 + k * 0.5, 2.1);
        led(g, -0.3 + k * 0.5, 2.03, 0, M.glowRed, false);
      }
      led(g, 0.8, 1.4, 0, M.glowAmber);
    },
    epo: (g) => {
      box(g, 0.7, 0.9, 0.2, M.yellow, 0, 1.2);
      cyl(g, 0.16, 0.12, M.red, 0, 1.2, 0.14, [Math.PI / 2, 0, 0]);
      const cover = new Mesh(new BoxGeometry(0.5, 0.5, 0.16), new MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.25, roughness: 0.1 }));
      cover.position.set(0, 1.2, 0.2);
      g.add(cover);
      led(g, 0.25, 1.55, 0.11, M.glowGreen);
    },
  };

  function frame(g: Group) {
    const b = new Box3().setFromObject(g);
    const size = b.getSize(new Vector3());
    const center = b.getCenter(new Vector3());
    g.position.sub(new Vector3(center.x, b.min.y, center.z)); // stand it on the floor, centered
    const radius = Math.max(size.x, size.y, size.z);
    const dist = radius * 1.9 + 1.2;
    camera.position.set(dist * 0.75, size.y * 0.6 + dist * 0.35, dist);
    const tgt = new Vector3(0, size.y * 0.45, 0);
    camera.lookAt(tgt);
    if (controls) {
      controls.target.copy(tgt);
      controls.minDistance = radius * 0.9;
      controls.maxDistance = radius * 5 + 4;
      controls.update();
    }
  }

  // Floor plate with a blueprint ring
  const plate = new Mesh(new CylinderGeometry(2.8, 2.8, 0.06, 64), M.base);
  plate.position.y = -0.03;
  scene.add(plate);
  const ring = new Mesh(new RingGeometry(2.6, 2.7, 64), M.ring);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.005;
  scene.add(ring);

  stage.onTheme((th) => {
    M.edge.color.copy(th.cyan);
    M.base.color.copy(th.floor);
    M.ring.color.copy(th.blue);
  });
  M.base.color.copy(stage.theme.floor);
  M.ring.color.copy(stage.theme.blue);

  stage.onFrame((dt, t) => {
    for (const s of spinners) s.obj.rotation[s.axis] += dt * s.speed;
    for (const b of blinkers) b.mesh.visible = Math.sin(t * 3 + b.phase) > -0.5;
    model?.traverse((o) => {
      if (o.userData.fall) {
        o.position.y -= dt * 1.4;
        if (o.position.y < 0.2) o.position.y = 1.6;
      }
    });
  });

  return {
    show(k) {
      if (k === key) return;
      if (model) {
        holder.remove(model);
          model.traverse((o) => {
          const m = o as Mesh;
          m.geometry?.dispose();
          const mat = m.material as Material | undefined;
          if (mat && !sharedMats.has(mat)) mat.dispose();
        });
      }
      spinners = [];
      blinkers = [];
      model = new Group();
      builders[k](model);
      holder.add(model);
      frame(model);
      key = k;
      stage.invalidate();
    },
    current: () => key,
    meshCount: () => {
      let n = 0;
      model?.traverse((o) => {
        if ((o as Mesh).isMesh) n++;
      });
      return n;
    },
    frames: stage.frames,
    dispose() {
      if (model) disposeTree(model);
      for (const m of sharedMats) m.dispose();
      stage.dispose();
    },
  };
}
