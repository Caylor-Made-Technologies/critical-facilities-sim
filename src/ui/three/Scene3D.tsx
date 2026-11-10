/**
 * React wrappers for the 3D scenes. The 3D code (and three.js) loads only
 * when a scene is on the page. If WebGL isn't available or anything fails,
 * the wrapper shows its fallback and the page keeps working.
 */
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type React from 'react';
import type { BoundaryApi, BoundaryState } from './scenes/boundary';
import type { EquipmentApi } from './scenes/equipment';
import type { HallApi } from './scenes/hall';
import type { PlantApi } from './scenes/plant';
import type { CampusApi } from './scenes/campus';
import type { Anchor, SceneState } from '../../content/lifecycleTypes';
import type { Plant3D } from './plantModel';
import type { HallVis } from './hallState';
import { MODEL_CAPTION, type ModelKey } from './models';
import { useQuality } from './quality';

type Status = 'loading' | 'ready' | 'fallback' | 'lost';
/** Rebuilds the scene on a fresh canvas (after the GPU dropped it). */
const Reload = createContext<() => void>(() => {});

/** Checked before loading any 3D code, so devices without WebGL never download it. */
let webgl: boolean | null = null;
function hasWebGL(): boolean {
  if (webgl === null) {
    try {
      const c = document.createElement('canvas');
      const gl = (c.getContext('webgl2') || c.getContext('webgl')) as WebGLRenderingContext | null;
      webgl = !!gl;
      gl?.getExtension('WEBGL_lose_context')?.loseContext();
    } catch {
      webgl = false;
    }
  }
  return webgl;
}

/** Expose scene APIs for automated checks only when the URL asks for it (?debug3d). */
function expose(name: string, api: unknown) {
  if (typeof location === 'undefined' || !location.search.includes('debug3d')) return;
  const w = window as unknown as { __cf3d?: Record<string, unknown> };
  w.__cf3d = { ...(w.__cf3d ?? {}), [name]: api };
}

/**
 * When a scene may start loading three.js:
 *  - now: right away (the scene is the main thing on screen)
 *  - visible: once its box scrolls into view
 *  - idle: after the page has loaded, the browser is idle, and the box is in view
 *    (decorative scenes, so they never slow the first paint)
 */
type When = 'now' | 'visible' | 'idle';
function waitFor(el: HTMLElement, when: When, alive: () => boolean): Promise<void> {
  if (when === 'now') return Promise.resolve();
  const inView = new Promise<void>((done) => {
    if (typeof IntersectionObserver === 'undefined') return done();
    const io = new IntersectionObserver(([e]) => {
      if (e?.isIntersecting || !alive()) {
        io.disconnect();
        done();
      }
    }, { rootMargin: '200px' });
    io.observe(el);
  });
  if (when === 'visible') return inView;
  const loaded = new Promise<void>((done) => (document.readyState === 'complete' ? done() : window.addEventListener('load', () => done(), { once: true })));
  const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
  const idle = () => new Promise<void>((done) => (w.requestIdleCallback ? w.requestIdleCallback(() => done(), { timeout: 2500 }) : window.setTimeout(done, 300)));
  return loaded.then(idle).then(() => inView);
}

function useScene<T extends { dispose: () => void }>(mount: (c: HTMLCanvasElement) => Promise<T>, name: string, when: When = 'visible') {
  const ref = useRef<HTMLCanvasElement>(null);
  const [api, setApi] = useState<T | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  useEffect(() => {
    let alive = true;
    let made: T | null = null;
    let unlisten = () => {};
    (async () => {
      if (!hasWebGL()) throw new Error('no webgl');
      if (!alive || !ref.current) return;
      await waitFor(ref.current, when, () => alive);
      if (!alive || !ref.current) return;
      made = await mount(ref.current);
      if (!alive) {
        made.dispose();
        return;
      }
      expose(name, made);
      setApi(made);
      setStatus('ready');
      // The browser can drop a WebGL context (GPU reset, too many tabs): pause and offer a reload.
      const c = ref.current;
      if (c) {
        const lost = (e: Event) => {
          e.preventDefault();
          if (alive) setStatus('lost');
        };
        c.addEventListener('webglcontextlost', lost);
        unlisten = () => c.removeEventListener('webglcontextlost', lost);
      }
    })().catch(() => alive && setStatus('fallback'));
    return () => {
      alive = false;
      unlisten();
      made?.dispose();
      expose(name, undefined);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return { ref, api, status };
}

function Frame({ status, label, className, children, fallback, canvasRef, hint }: { status: Status; label: string; className: string; children?: ReactNode; fallback?: ReactNode; canvasRef: React.RefObject<HTMLCanvasElement>; hint?: string }) {
  return (
    <div className={`scene3d ${className} is-${status}`} role="img" aria-label={label}>
      {status !== 'fallback' && <canvas ref={canvasRef} aria-hidden="true" />}
      {status === 'loading' && (
        <span className="scene3d-loading" aria-hidden="true">
          <span className="scene3d-spinner" />
        </span>
      )}
      {status === 'fallback' && fallback}
      {status === 'lost' && <LostCard />}
      {status === 'ready' && hint && (
        <span className="scene3d-hint" aria-hidden="true">
          {hint}
        </span>
      )}
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
function Hall3DInner({ vis, selected = null, onPick, mode, label, fallback }: { vis: HallVis; selected?: string | null; onPick?: (id: string) => void; mode: 'hero' | 'live'; label: string; fallback?: ReactNode }) {
  const pickRef = useRef(onPick);
  pickRef.current = onPick;
  const { ref, api, status } = useScene<HallApi>(
    async (c) => (await import('./scenes/hall')).mountHall(c, { mode, onPick: (id) => pickRef.current?.(id) }),
    mode === 'live' ? 'hall' : 'hero',
    mode === 'live' ? 'visible' : 'idle',
  );
  useEffect(() => {
    api?.update(vis, selected);
  }, [api, vis, selected]);
  return <Frame status={status} label={label} className={`scene3d-hall ${mode}`} canvasRef={ref} fallback={fallback} hint={mode === 'live' ? 'Drag to turn · pinch to zoom · tap a rack' : undefined} />;
}

function Equipment3DInner({ model, title }: { model: ModelKey; title: string }) {
  const { ref, api, status } = useScene<EquipmentApi>(async (c) => (await import('./scenes/equipment')).mountEquipment(c), 'equipment');
  const parts = api?.cutawayParts(model);
  const [inside, setInside] = useState(false);
  const [lit, setLit] = useState<string | null>(null);
  useEffect(() => {
    api?.show(model);
    setInside(false);
    setLit(null);
  }, [api, model]);
  useEffect(() => {
    api?.cutaway(inside);
    if (!inside) setLit(null);
  }, [api, inside]);
  useEffect(() => {
    api?.highlight(lit);
  }, [api, lit]);
  const label = `3D model: ${title}. ${MODEL_CAPTION[model]}${inside && parts ? ` Cutaway showing ${parts.length} inner parts: ${parts.map((p) => p.name).join(', ')}.` : ''}`;
  return (
    <div className="eq3d">
      <Frame status={status} label={label} className="scene3d-equip" canvasRef={ref} hint="Drag to turn · pinch to zoom" fallback={<span className="scene3d-fallback">3D view isn't available on this device.</span>} />
      {parts && (
        <div className="eq3d-cut">
          <button type="button" className={`btn btn-sm${inside ? ' btn-primary' : ''}`} aria-pressed={inside} onClick={() => setInside((v) => !v)}>
            {inside ? 'Hide inside' : 'See inside'}
          </button>
          {inside && (
            <ol className="eq3d-parts">
              {parts.map((p, i) => (
                <li key={p.id}>
                  <button type="button" className={`eq3d-part${lit === p.id ? ' on' : ''}`} aria-pressed={lit === p.id} onClick={() => setLit((v) => (v === p.id ? null : p.id))}>
                    <span className="eq3d-num" aria-hidden="true">
                      {i + 1}
                    </span>
                    <span>
                      <strong>{p.name}</strong>
                      <span className="eq3d-what">{p.what}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}

function Boundary3DInner({ state, label }: { state: BoundaryState; label: string }) {
  const { ref, api, status } = useScene<BoundaryApi>(async (c) => (await import('./scenes/boundary')).mountBoundary(c), 'boundary');
  useEffect(() => {
    api?.update(state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, state.distFt, state.restrictedFt, state.limitedFt, state.arcFt, state.tone]);
  return <Frame status={status} label={label} className="scene3d-boundary" canvasRef={ref} hint="Drag to look around" fallback={<span className="scene3d-fallback">3D view isn't available on this device. Use the 2D view.</span>} />;
}

function Plant3DViewInner({ model, selected, failureMode, onActivate, label }: { model: Plant3D; selected: string | null; failureMode: boolean; onActivate: (id: string) => void; label: string }) {
  const actRef = useRef(onActivate);
  actRef.current = onActivate;
  const { ref, api, status } = useScene<PlantApi>(async (c) => (await import('./scenes/plant')).mountPlant(c, { onActivate: (id) => actRef.current(id) }), 'plant', 'now');
  useEffect(() => {
    api?.update(model, selected, failureMode);
  }, [api, model, selected, failureMode]);
  return (
    <div className="plant3d-wrap">
      <Frame
        status={status}
        label={label}
        className={`scene3d-plant${failureMode ? ' failure' : ''}`}
        canvasRef={ref}
        hint={failureMode ? 'Tap equipment to fail or restore it · drag to turn' : 'Tap for details · double-tap to fly there · drag to turn · two fingers to move'}
        fallback={<span className="scene3d-fallback">3D isn't available on this device. Switch back to 2D.</span>}
      />
      {status === 'ready' && (
        <div className="scene3d-fit">
          <button type="button" className="btn btn-sm" onClick={() => api?.reset()}>
            Reset view
          </button>
          <button type="button" className="btn btn-sm" onClick={() => api?.focus(selected)} disabled={!selected}>
            Go to selected
          </button>
        </div>
      )}
    </div>
  );
}

function LostCard() {
  const reload = useContext(Reload);
  return (
    <div className="scene3d-lost">
      <p>3D paused: the device needed its graphics memory back.</p>
      <button type="button" className="btn btn-primary btn-sm" onClick={reload}>
        Tap to reload 3D
      </button>
    </div>
  );
}

/** Life of a Data Center: the campus at a stage, with numbered tour stops. */
function Campus3DInner({ state, stops, active, label }: { state: SceneState; stops: { anchor: Anchor; title: string }[]; active: number | null; label: string }) {
  const { ref, api, status } = useScene<CampusApi>(async (c) => (await import('./scenes/campus')).mountCampus(c), 'campus', 'visible');
  const key = stops.map((s) => s.anchor).join(',');
  useEffect(() => {
    api?.setState(state);
  }, [api, state]);
  useEffect(() => {
    api?.setStops(stops);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, key]);
  useEffect(() => {
    api?.goTo(active === null ? null : (stops[active]?.anchor ?? null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, active, key]);
  return <Frame status={status} label={label} className="scene3d-campus" canvasRef={ref} hint="Drag to turn · pinch to zoom · two fingers to move" fallback={<span className="scene3d-fallback">3D isn't available on this device. The tour list below has every stop.</span>} />;
}

// Each scene gets a fresh canvas when the quality tier changes or after a lost context
// (a WebGL canvas can't be reused).
type Props<F> = F extends (p: infer P) => unknown ? P : never;
function useFresh(): [string, () => void] {
  const { tier } = useQuality();
  const [gen, setGen] = useState(0);
  return [`${tier}-${gen}`, () => setGen((g) => g + 1)];
}
export function Hall3D(p: Props<typeof Hall3DInner>) {
  const { tier } = useQuality();
  const [key, reload] = useFresh();
  // The Home hero is decoration: on the Low tier the page keeps its still circuit art instead.
  if (p.mode === 'hero' && tier === 'low') return null;
  return (
    <Reload.Provider value={reload}>
      <Hall3DInner key={key} {...p} />
    </Reload.Provider>
  );
}
export function Equipment3D(p: Props<typeof Equipment3DInner>) {
  const [key, reload] = useFresh();
  return (
    <Reload.Provider value={reload}>
      <Equipment3DInner key={key} {...p} />
    </Reload.Provider>
  );
}
export function Boundary3D(p: Props<typeof Boundary3DInner>) {
  const [key, reload] = useFresh();
  return (
    <Reload.Provider value={reload}>
      <Boundary3DInner key={key} {...p} />
    </Reload.Provider>
  );
}
export function Plant3DView(p: Props<typeof Plant3DViewInner>) {
  const [key, reload] = useFresh();
  return (
    <Reload.Provider value={reload}>
      <Plant3DViewInner key={key} {...p} />
    </Reload.Provider>
  );
}
export function Campus3D(p: Props<typeof Campus3DInner>) {
  const [key, reload] = useFresh();
  return (
    <Reload.Provider value={reload}>
      <Campus3DInner key={key} {...p} />
    </Reload.Provider>
  );
}
