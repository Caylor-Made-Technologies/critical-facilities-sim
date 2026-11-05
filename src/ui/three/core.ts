/**
 * Shared 3D stage: renderer, camera, lights, orbit controls, theme colors,
 * and the house rules every scene follows:
 *   - pixel ratio capped for phones
 *   - resizes with its box
 *   - stops rendering when scrolled off screen or the tab is hidden
 *   - reduced motion: no animation loop, renders only when you drag
 *   - everything is disposed on unmount (no leaked WebGL contexts)
 */
import {
  ACESFilmicToneMapping,
  EdgesGeometry,
  LineBasicMaterial,
  LineSegments,
  PMREMGenerator,
  Color,
  DirectionalLight,
  Fog,
  HemisphereLight,
  Mesh,
  PCFShadowMap,
  PerspectiveCamera,
  SRGBColorSpace,
  Scene,
  Vector3,
  WebGLRenderer,
  type Material,
  type Object3D,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { demote, getTier, type Tier } from './quality';

export interface ThemeColors {
  bg: Color;
  surface: Color;
  floor: Color;
  line: Color;
  blue: Color;
  cyan: Color;
  ok: Color;
  warn: Color;
  alarm: Color;
  muted: Color;
  sideA: Color;
  sideB: Color;
  dark: boolean;
}

export function readTheme(): ThemeColors {
  const cs = getComputedStyle(document.documentElement);
  const v = (name: string, fallback: string) => new Color((cs.getPropertyValue(name).trim() || fallback).replace(/\s+/g, ''));
  const dark = document.documentElement.dataset.theme !== 'light';
  return {
    bg: v('--bg', '#0b0f14'),
    surface: v('--surface', '#121821'),
    floor: v('--surface-sunk', '#0e131a'),
    line: v('--border-strong', '#34425a'),
    blue: v('--blue-glow', '#3d8bff'),
    cyan: v('--cyan', '#22d3ee'),
    ok: v('--ok', '#3ddc97'),
    warn: v('--warn', '#ffb547'),
    alarm: v('--alarm', '#ff6b6b'),
    muted: v('--text-muted', '#9aa7b8'),
    sideA: v('--side-a', '#3d8bff'),
    sideB: v('--side-b', '#b48cff'),
    dark,
  };
}

export function webglAvailable(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

export const prefersCalm = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export interface StageOptions {
  camera: [number, number, number];
  target?: [number, number, number];
  fov?: number;
  /** Let people drag to rotate and pinch to zoom. */
  interactive?: boolean;
  autoRotate?: number;
  minDistance?: number;
  maxDistance?: number;
  /** Transparent background (sits on the page's own background). */
  transparent?: boolean;
  fog?: [number, number];
  /** Highest pixel ratio to render at (lower = faster). */
  maxDpr?: number;
  /** Frame cap for decorative scenes. */
  fps?: number;
  /** Soft real-time shadows (used only on the High tier). */
  shadows?: boolean;
}

export interface FrameStats {
  /** Median and 95th percentile of the time our own frame work takes (ms). */
  workMedian: number;
  workP95: number;
  /** Median time between drawn frames (ms). */
  gapMedian: number;
  samples: number;
}

export interface Stage {
  scene: Scene;
  camera: PerspectiveCamera;
  renderer: WebGLRenderer;
  controls: OrbitControls | null;
  theme: ThemeColors;
  calm: boolean;
  /** Called every frame with seconds since the last frame and total time. */
  onFrame: (fn: (dt: number, t: number) => void) => void;
  /** Called right before every draw, animated or not (labels, culling). */
  onRender: (fn: () => void) => void;
  /** Called when the light/dark theme changes. */
  onTheme: (fn: (t: ThemeColors) => void) => void;
  /** Ask for one render (used in reduced-motion mode after changes). */
  invalidate: () => void;
  frames: () => number;
  /** True while the canvas is on screen and the tab is visible (frames are being drawn). */
  onScreen: () => boolean;
  /** Quality tier this stage was built for. */
  tier: Tier;
  /** Whether real-time shadows are on (High tier and the scene asked for them). */
  shadows: boolean;
  /** Point the shadow camera at an area of the floor. */
  fitShadow: (cx: number, cz: number, radius: number) => void;
  frameStats: () => FrameStats;
  dispose: () => void;
}

export function createStage(canvas: HTMLCanvasElement, o: StageOptions): Stage {
  seedState = 0x9e3779b9; // fixed decoration per scene under ?still (no effect otherwise)
  const calm = prefersCalm();
  const tier = getTier();
  const cap = tier === 'low' ? 1 : tier === 'medium' ? Math.min(1.5, o.maxDpr ?? 1.75) : o.maxDpr ?? 1.75;
  const dpr = Math.min(window.devicePixelRatio || 1, cap);
  const shadows = tier === 'high' && !!o.shadows;
  // High-density screens are sharp enough without antialiasing, which is costly on phones.
  const renderer = new WebGLRenderer({ canvas, antialias: dpr < 1.5, alpha: !!o.transparent, powerPreference: 'high-performance' });
  renderer.setPixelRatio(dpr);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  let theme = readTheme();
  const scene = new Scene();
  if (!o.transparent) scene.background = theme.bg.clone();
  if (o.fog) scene.fog = new Fog(theme.bg.clone(), o.fog[0], o.fog[1]);

  const camera = new PerspectiveCamera(o.fov ?? 42, 1, 0.1, 400);
  camera.position.set(...o.camera);
  const target = new Vector3(...(o.target ?? [0, 0, 0]));
  camera.lookAt(target);

  // Soft studio reflections so painted metal reads as metal, not black.
  const pmrem = new PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;
  scene.environmentIntensity = theme.dark ? 0.55 : 0.8;
  const hemi = new HemisphereLight(0xcfe3ff, 0x1a2230, theme.dark ? 1.1 : 1.5);
  const sun = new DirectionalLight(0xffffff, theme.dark ? 2 : 2.4);
  sun.position.set(8, 14, 10);
  scene.add(hemi, sun);
  if (shadows) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFShadowMap;
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.bias = -0.0005;
    sun.shadow.radius = 4;
    sun.shadow.normalBias = 0.02;
    scene.add(sun.target);
  }
  const fitShadow = (cx: number, cz: number, radius: number) => {
    if (!shadows) return;
    sun.position.set(cx + 8, 14, cz + 10);
    sun.target.position.set(cx, 0, cz);
    const c = sun.shadow.camera;
    c.left = c.bottom = -radius;
    c.right = c.top = radius;
    c.near = 1;
    c.far = 60;
    c.updateProjectionMatrix();
    sun.shadow.needsUpdate = true;
  };

  let controls: OrbitControls | null = null;
  if (o.interactive) {
    controls = new OrbitControls(camera, canvas);
    controls.target.copy(target);
    controls.enableDamping = !calm;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = o.minDistance ?? 4;
    controls.maxDistance = o.maxDistance ?? 60;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.autoRotate = !calm && !!o.autoRotate;
    controls.autoRotateSpeed = o.autoRotate ?? 0;
    controls.update();
  }

  const frameFns: ((dt: number, t: number) => void)[] = [];
  const themeFns: ((t: ThemeColors) => void)[] = [];
  const renderFns: (() => void)[] = [];
  let frames = 0;
  let raf = 0;
  let last = performance.now();
  let t = 0;
  let visible = true;
  let disposed = false;
  let dirty = true;

  const size = () => {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    dirty = true;
    if (calm) render();
  };
  // Frame-time stats (our own work per frame), and an auto step-down when a scene can't keep up.
  const work: number[] = [];
  const gaps: number[] = [];
  let lastDrawn = 0;
  let demoted = false;
  const pct = (a: number[], p: number) => {
    if (!a.length) return 0;
    const s = [...a].sort((x, y) => x - y);
    return s[Math.min(s.length - 1, Math.floor(s.length * p))]!;
  };
  const record = (t0: number) => {
    const t1 = performance.now();
    work.push(t1 - t0);
    if (lastDrawn) gaps.push(t1 - lastDrawn);
    lastDrawn = t1;
    if (work.length > 240) work.shift();
    if (gaps.length > 240) gaps.shift();
    // Two seconds of frames slower than ~20 fps of our own work: ask for a lighter tier next time.
    if (!demoted && tier !== 'low' && work.length >= 60 && pct(work, 0.5) > 50) {
      demoted = true;
      demote();
    }
  };
  const render = () => {
    const t0 = performance.now();
    controls?.update();
    for (const fn of renderFns) fn();
    renderer.render(scene, camera);
    frames++;
    dirty = false;
    record(t0);
  };
  const minGap = o.fps ? 1000 / o.fps - 2 : 0;
  const loop = (now: number) => {
    raf = 0;
    if (disposed) return;
    if (minGap && now - last < minGap) {
      raf = requestAnimationFrame(loop);
      return;
    }
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (visible && !document.hidden) {
      if (!calm) {
        t += dt;
        for (const fn of frameFns) fn(dt, t);
        render();
      } else if (dirty) render();
    }
    raf = requestAnimationFrame(loop);
  };

  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(size) : null;
  ro?.observe(canvas);
  const io =
    typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver(([e]) => {
          visible = !!e?.isIntersecting;
          if (visible) last = performance.now();
        })
      : null;
  io?.observe(canvas);
  const mo = new MutationObserver(() => {
    theme = readTheme();
    if (!o.transparent) scene.background = theme.bg.clone();
    if (scene.fog) (scene.fog as Fog).color = theme.bg.clone();
    hemi.intensity = theme.dark ? 1.1 : 1.5;
    sun.intensity = theme.dark ? 2 : 2.4;
    scene.environmentIntensity = theme.dark ? 0.55 : 0.8;
    for (const fn of themeFns) fn(theme);
    dirty = true;
  });
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  controls?.addEventListener('change', () => {
    dirty = true;
  });

  size();
  raf = requestAnimationFrame(loop);

  return {
    scene,
    camera,
    renderer,
    controls,
    get theme() {
      return theme;
    },
    calm,
    onFrame: (fn) => frameFns.push(fn),
    onTheme: (fn) => themeFns.push(fn),
    onRender: (fn) => renderFns.push(fn),
    invalidate: () => {
      dirty = true;
    },
    frames: () => frames,
    onScreen: () => visible && !document.hidden,
    tier,
    shadows,
    fitShadow,
    frameStats: () => ({ workMedian: pct(work, 0.5), workP95: pct(work, 0.95), gapMedian: pct(gaps, 0.5), samples: work.length }),
    dispose: () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro?.disconnect();
      io?.disconnect();
      mo.disconnect();
      controls?.dispose();
      disposeTree(scene);
      envTex.dispose();
      pmrem.dispose();
      renderer.dispose();
      // Free the GPU context now (unless the browser already took it back).
      if (!renderer.getContext().isContextLost()) renderer.forceContextLoss();
    },
  } as Stage;
}

/** Free every geometry and material under an object. */
export function disposeTree(root: Object3D): void {
  root.traverse((o) => {
    const m = o as Mesh;
    m.geometry?.dispose?.();
    const mat = m.material as Material | Material[] | undefined;
    if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
    else mat?.dispose?.();
  });
}

/** Thin glowing outline on a mesh's hard edges: the blueprint look. */
export function addEdges(mesh: Mesh, mat: LineBasicMaterial): LineSegments {
  const lines = new LineSegments(new EdgesGeometry(mesh.geometry, 30), mat);
  mesh.add(lines);
  return lines;
}

export function edgeMaterial(theme: ThemeColors, opacity = 0.55): LineBasicMaterial {
  return new LineBasicMaterial({ color: theme.cyan.clone(), transparent: true, opacity });
}

// ---------------------------------------------------------------------------
// Labels that never overlap: each frame, project every label to the screen,
// keep the most important ones that fit, and fade the rest out. Labels also
// fade with distance and hide when too small to read.

export interface Tag {
  sprite: import('three').Sprite;
  /** Higher wins a spot first (selected > failed > big > the rest). */
  priority: number;
}

const tmpV = new Vector3();
export function declutter(tags: Tag[], camera: PerspectiveCamera, canvas: HTMLCanvasElement, o: { fadeNear: number; fadeFar: number; minPx?: number; snap?: boolean }): void {
  camera.updateMatrixWorld();
  const W = canvas.clientWidth || 1;
  const H = canvas.clientHeight || 1;
  const k = H / (2 * Math.tan((camera.fov * Math.PI) / 360));
  const cand: { t: Tag; x0: number; y0: number; x1: number; y1: number; d: number; a: number }[] = [];
  for (const t of tags) {
    const s = t.sprite;
    if (!s.parent || !s.parent.visible) continue;
    s.getWorldPosition(tmpV);
    const d = tmpV.distanceTo(camera.position);
    tmpV.project(camera);
    const behind = tmpV.z > 1 || tmpV.z < -1;
    const px = k / Math.max(d, 0.001);
    const w = s.scale.x * px;
    const h = s.scale.y * px;
    const fade = 1 - Math.min(1, Math.max(0, (d - o.fadeNear) / Math.max(0.001, o.fadeFar - o.fadeNear)));
    const a = behind || h < (o.minPx ?? 9) ? 0 : fade;
    const x = ((tmpV.x + 1) / 2) * W;
    const y = ((1 - tmpV.y) / 2) * H;
    // Sprites are centred on their position (center 0.5, 0.5).
    cand.push({ t, x0: x - w / 2, y0: y - h / 2, x1: x + w / 2, y1: y + h / 2, d, a });
  }
  cand.sort((p, q) => q.t.priority - p.t.priority || p.d - q.d);
  const kept: typeof cand = [];
  const pad = 3;
  for (const c of cand) {
    let target = c.a;
    if (target > 0.02) {
      const hit = kept.some((q) => c.x0 < q.x1 + pad && c.x1 > q.x0 - pad && c.y0 < q.y1 + pad && c.y1 > q.y0 - pad);
      if (hit) target = 0;
      else kept.push(c);
    }
    const m = c.t.sprite.material;
    // Make way at once (two tags never show on top of each other, at any frame rate); appear with a short fade.
    m.opacity = o.snap || target < m.opacity ? target : m.opacity + (target - m.opacity) * 0.25;
    c.t.sprite.visible = m.opacity > 0.02;
    c.t.sprite.userData.rect = [c.x0, c.y0, c.x1, c.y1];
  }
}

/**
 * Random numbers for decoration (particles, drops). Under ?debug3d&still the
 * sequence is fixed, so screenshot checks see the same picture every run.
 */
let seedState = 0x9e3779b9;
const still = typeof location !== 'undefined' && /[?&]still\b/.test(location.search) && location.search.includes('debug3d');
export function rand(): number {
  if (!still) return Math.random();
  seedState = (seedState + 0x6d2b79f5) | 0;
  let t = seedState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
