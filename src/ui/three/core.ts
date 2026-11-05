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
  /** Called when the light/dark theme changes. */
  onTheme: (fn: (t: ThemeColors) => void) => void;
  /** Ask for one render (used in reduced-motion mode after changes). */
  invalidate: () => void;
  frames: () => number;
  dispose: () => void;
}

export function createStage(canvas: HTMLCanvasElement, o: StageOptions): Stage {
  const calm = prefersCalm();
  const dpr = Math.min(window.devicePixelRatio || 1, o.maxDpr ?? 1.75);
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
  const render = () => {
    controls?.update();
    renderer.render(scene, camera);
    frames++;
    dirty = false;
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
    invalidate: () => {
      dirty = true;
    },
    frames: () => frames,
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
      renderer.forceContextLoss();
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
