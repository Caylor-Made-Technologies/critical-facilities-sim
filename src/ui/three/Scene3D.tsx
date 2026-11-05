/**
 * React wrappers for the 3D scenes. The 3D code (and three.js) loads only
 * when a scene is on the page. If WebGL isn't available or anything fails,
 * the wrapper shows its fallback and the page keeps working.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type React from 'react';
import type { BoundaryApi, BoundaryState } from './scenes/boundary';
import type { EquipmentApi } from './scenes/equipment';
import type { HallApi } from './scenes/hall';
import type { PlantApi } from './scenes/plant';
import type { Plant3D } from './plantModel';
import type { HallVis } from './hallState';
import { MODEL_CAPTION, type ModelKey } from './models';

type Status = 'loading' | 'ready' | 'fallback';

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

function useScene<T extends { dispose: () => void }>(mount: (c: HTMLCanvasElement) => Promise<T>, name: string) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [api, setApi] = useState<T | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  useEffect(() => {
    let alive = true;
    let made: T | null = null;
    (async () => {
      if (!hasWebGL()) throw new Error('no webgl');
      if (!alive || !ref.current) return;
      made = await mount(ref.current);
      if (!alive) {
        made.dispose();
        return;
      }
      expose(name, made);
      setApi(made);
      setStatus('ready');
    })().catch(() => alive && setStatus('fallback'));
    return () => {
      alive = false;
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
export function Hall3D({ vis, selected = null, onPick, mode, label, fallback }: { vis: HallVis; selected?: string | null; onPick?: (id: string) => void; mode: 'hero' | 'live'; label: string; fallback?: ReactNode }) {
  const pickRef = useRef(onPick);
  pickRef.current = onPick;
  const { ref, api, status } = useScene<HallApi>(
    async (c) => (await import('./scenes/hall')).mountHall(c, { mode, onPick: (id) => pickRef.current?.(id) }),
    mode === 'live' ? 'hall' : 'hero',
  );
  useEffect(() => {
    api?.update(vis, selected);
  }, [api, vis, selected]);
  return <Frame status={status} label={label} className={`scene3d-hall ${mode}`} canvasRef={ref} fallback={fallback} hint={mode === 'live' ? 'Drag to turn · pinch to zoom · tap a rack' : undefined} />;
}

export function Equipment3D({ model, title }: { model: ModelKey; title: string }) {
  const { ref, api, status } = useScene<EquipmentApi>(async (c) => (await import('./scenes/equipment')).mountEquipment(c), 'equipment');
  useEffect(() => {
    api?.show(model);
  }, [api, model]);
  return (
    <Frame status={status} label={`3D model: ${title}. ${MODEL_CAPTION[model]}`} className="scene3d-equip" canvasRef={ref} hint="Drag to turn · pinch to zoom" fallback={<span className="scene3d-fallback">3D view isn't available on this device.</span>} />
  );
}

export function Boundary3D({ state, label }: { state: BoundaryState; label: string }) {
  const { ref, api, status } = useScene<BoundaryApi>(async (c) => (await import('./scenes/boundary')).mountBoundary(c), 'boundary');
  useEffect(() => {
    api?.update(state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, state.distFt, state.restrictedFt, state.limitedFt, state.arcFt, state.tone]);
  return <Frame status={status} label={label} className="scene3d-boundary" canvasRef={ref} hint="Drag to look around" fallback={<span className="scene3d-fallback">3D view isn't available on this device. Use the 2D view.</span>} />;
}

export function Plant3DView({ model, selected, failureMode, onActivate, label }: { model: Plant3D; selected: string | null; failureMode: boolean; onActivate: (id: string) => void; label: string }) {
  const actRef = useRef(onActivate);
  actRef.current = onActivate;
  const { ref, api, status } = useScene<PlantApi>(async (c) => (await import('./scenes/plant')).mountPlant(c, { onActivate: (id) => actRef.current(id) }), 'plant');
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
        hint={failureMode ? 'Tap equipment to fail or restore it · drag to turn' : 'Tap equipment for details · drag to turn · two fingers to move'}
        fallback={<span className="scene3d-fallback">3D isn't available on this device. Switch back to 2D.</span>}
      />
      {status === 'ready' && (
        <button type="button" className="btn btn-sm scene3d-fit" onClick={() => api?.focus(selected)} disabled={!selected}>
          Go to selected
        </button>
      )}
    </div>
  );
}
