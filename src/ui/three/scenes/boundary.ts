/**
 * 3D approach boundaries: a 480 V switchboard with its doors open, glowing
 * floor rings for the restricted, limited and arc flash boundaries, and a
 * worker who walks in and out with the distance slider.
 */
import {
  BoxGeometry,
  CapsuleGeometry,
  CircleGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  RingGeometry,
  SphereGeometry,
  DoubleSide,
} from 'three';
import { addEdges, createStage, edgeMaterial } from '../core';

export interface BoundaryState {
  distFt: number;
  restrictedFt: number;
  limitedFt: number;
  arcFt: number;
  tone: 'ok' | 'warn' | 'alarm';
}

export interface BoundaryApi {
  update: (s: BoundaryState) => void;
  workerX: () => number;
  frames: () => number;
  dispose: () => void;
}

/** Feet to scene units with a square-root squeeze, so 1 ft and 30 ft both fit (same idea as the 2D view). */
export const ftToUnits = (ft: number) => Math.sqrt(Math.max(0, ft)) * 1.15;

export function mountBoundary(canvas: HTMLCanvasElement): BoundaryApi {
  const stage = createStage(canvas, { camera: [5.5, 5, 8.5], target: [2.6, 0.6, 0], fov: 40, interactive: true, minDistance: 5, maxDistance: 22, transparent: true, maxDpr: 1.5 });
  const { scene } = stage;
  const th = () => stage.theme;

  const floor = new Mesh(new CircleGeometry(9, 64), new MeshStandardMaterial({ color: th().floor, roughness: 0.95 }));
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  // Switchboard with open doors and glowing exposed bus
  const gear = new Group();
  const body = new Mesh(new BoxGeometry(0.9, 2.2, 2.4), new MeshStandardMaterial({ color: 0x3d4f6b, metalness: 0.35, roughness: 0.45 }));
  body.position.y = 1.1;
  const edge = edgeMaterial(stage.theme, 0.6);
  addEdges(body, edge);
  gear.add(body);
  const busMat = new MeshBasicMaterial({ color: 0xff8a5c });
  for (let k = 0; k < 3; k++) {
    const bus = new Mesh(new BoxGeometry(0.04, 1.6, 0.08), busMat);
    bus.position.set(0.47, 1.1, -0.5 + k * 0.5);
    gear.add(bus);
  }
  const doorMat = new MeshStandardMaterial({ color: 0x52688a, metalness: 0.35, roughness: 0.42 });
  const door = new Mesh(new BoxGeometry(0.04, 2, 1.1), doorMat);
  door.position.set(0.9, 1.1, -1.55);
  door.rotation.y = -1.1;
  gear.add(door);
  const label = new Mesh(new BoxGeometry(0.02, 0.3, 0.45), new MeshBasicMaterial({ color: 0xffb547 }));
  label.position.set(0.47, 1.95, 0.7);
  gear.add(label);
  scene.add(gear);

  // Rings (flat on the floor, centered on the gear face)
  const ringMat = (c: number, o: number) => new MeshBasicMaterial({ color: c, transparent: true, opacity: o, side: DoubleSide, depthWrite: false });
  const mats = { res: ringMat(0xff6b6b, 0.42), lim: ringMat(0xff8a5c, 0.28), arc: ringMat(0xffb547, 0.16) };
  const discs: Record<'res' | 'lim' | 'arc', Mesh> = {
    res: new Mesh(new RingGeometry(0.0, 1, 64, 1, -Math.PI / 2, Math.PI), mats.res),
    lim: new Mesh(new RingGeometry(0.0, 1, 64, 1, -Math.PI / 2, Math.PI), mats.lim),
    arc: new Mesh(new RingGeometry(0.0, 1, 64, 1, -Math.PI / 2, Math.PI), mats.arc),
  };
  const edges: Record<'res' | 'lim' | 'arc', Mesh> = {
    res: new Mesh(new RingGeometry(0.97, 1, 64, 1, -Math.PI / 2, Math.PI), ringMat(0xff6b6b, 0.95)),
    lim: new Mesh(new RingGeometry(0.97, 1, 64, 1, -Math.PI / 2, Math.PI), ringMat(0xff8a5c, 0.95)),
    arc: new Mesh(new RingGeometry(0.98, 1, 64, 1, -Math.PI / 2, Math.PI), ringMat(0xffb547, 0.95)),
  };
  (['arc', 'lim', 'res'] as const).forEach((k, i) => {
    for (const m of [discs[k], edges[k]]) {
      m.rotation.x = -Math.PI / 2;
      m.position.set(0.47, 0.01 + i * 0.004, 0);
      scene.add(m);
    }
  });

  // The worker
  const worker = new Group();
  const workerMat = new MeshStandardMaterial({ color: 0x3ddc97, roughness: 0.5 });
  const torso = new Mesh(new CapsuleGeometry(0.22, 0.8, 6, 12), workerMat);
  torso.position.y = 0.95;
  const head = new Mesh(new SphereGeometry(0.2, 16, 12), workerMat);
  head.position.y = 1.75;
  const hat = new Mesh(new SphereGeometry(0.22, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), new MeshStandardMaterial({ color: 0xf2b705 }));
  hat.position.y = 1.8;
  const shadow = new Mesh(new CircleGeometry(0.35, 24), new MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3 }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  worker.add(torso, head, hat, shadow);
  scene.add(worker);

  let targetX = 4;
  let tone: BoundaryState['tone'] = 'ok';
  let walkPhase = 0;
  const toneColor = () => (tone === 'ok' ? th().ok : tone === 'warn' ? th().warn : th().alarm);

  stage.onTheme((t) => {
    edge.color.copy(t.cyan);
    (floor.material as MeshStandardMaterial).color.copy(t.floor);
    workerMat.color.copy(toneColor());
  });

  stage.onFrame((dt, t) => {
    const dx = targetX - worker.position.x;
    worker.position.x += dx * Math.min(1, dt * 5);
    const walking = Math.abs(dx) > 0.02;
    walkPhase += walking ? dt * 10 : 0;
    worker.position.y = walking ? Math.abs(Math.sin(walkPhase)) * 0.06 : 0;
    worker.rotation.y = dx < 0 ? Math.PI / 2 : -Math.PI / 2;
    busMat.color.setHSL(0.05, 1, 0.6 + Math.sin(t * 5) * 0.08);
    if (tone === 'alarm') workerMat.emissive.setRGB(Math.max(0, Math.sin(t * 6)) * 0.35, 0, 0);
    else workerMat.emissive.setRGB(0, 0, 0);
  });

  return {
    update(s) {
      for (const [k, ft] of [['res', s.restrictedFt], ['lim', s.limitedFt], ['arc', s.arcFt]] as const) {
        const r = ftToUnits(ft);
        discs[k].scale.setScalar(r);
        edges[k].scale.setScalar(r);
      }
      targetX = 0.47 + 0.3 + ftToUnits(s.distFt);
      tone = s.tone;
      workerMat.color.copy(toneColor());
      if (stage.calm) {
        worker.position.x = targetX;
        stage.invalidate();
      }
    },
    workerX: () => worker.position.x,
    frames: stage.frames,
    dispose: () => stage.dispose(),
  };
}
