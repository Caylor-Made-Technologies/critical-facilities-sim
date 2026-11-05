/**
 * 3D quality tiers, chosen per device and remembered on this device only.
 *   low:    pixel ratio 1, no real-time shadows, decorative scenes (Home hero) stay still art
 *   medium: pixel ratio up to 1.5, contact shadows only
 *   high:   full pixel ratio, soft real-time shadows, glowing status lights
 * "Auto" picks a tier from a quick look at the GPU, and steps down by itself
 * if a scene can't hold its frame rate. People can override it in About → Display.
 * No three.js here, so the UI can read it without loading 3D code.
 */
import { useEffect, useState } from 'react';

export type Tier = 'low' | 'medium' | 'high';
export type QualityPref = 'auto' | Tier;

const PREF_KEY = 'cfs-3d-quality';
const AUTO_KEY = 'cfs-3d-auto-tier';
const EVT = 'cfs-3d-quality-change';
const ORDER: Tier[] = ['low', 'medium', 'high'];

let memoPref: QualityPref | null = null;
let memoAuto: Tier | null = null;

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, v: string): void {
  try {
    localStorage.setItem(key, v);
  } catch {
    /* storage blocked: lasts for this visit */
  }
}

/** Software renderers draw on the CPU: everything 3D is slow there. */
export const SOFTWARE_GPU = /swiftshader|llvmpipe|softpipe|software|basic render/i;

/** Pick a tier from the GPU name, screen and device hints. Runs once per device. */
export function probeTier(): Tier {
  let renderer = '';
  try {
    const c = document.createElement('canvas');
    const gl = (c.getContext('webgl2') || c.getContext('webgl')) as WebGLRenderingContext | null;
    if (!gl) return 'low';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    renderer = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    return 'low';
  }
  if (SOFTWARE_GPU.test(renderer)) return 'low';
  const nav = navigator as Navigator & { deviceMemory?: number };
  const cores = nav.hardwareConcurrency ?? 4;
  const mem = nav.deviceMemory ?? 4;
  if (cores <= 2 || mem <= 2) return 'low';
  const phone = window.matchMedia?.('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 600;
  return phone ? 'medium' : 'high';
}

export function getPref(): QualityPref {
  if (memoPref) return memoPref;
  const v = read(PREF_KEY);
  return v === 'low' || v === 'medium' || v === 'high' ? v : 'auto';
}

function autoTier(): Tier {
  if (memoAuto) return memoAuto;
  const v = read(AUTO_KEY);
  memoAuto = v === 'low' || v === 'medium' || v === 'high' ? v : probeTier();
  write(AUTO_KEY, memoAuto);
  return memoAuto;
}

/** The tier scenes should use right now. */
export function getTier(): Tier {
  const p = getPref();
  return p === 'auto' ? autoTier() : p;
}

export function setPref(p: QualityPref): void {
  memoPref = p;
  write(PREF_KEY, p);
  window.dispatchEvent(new CustomEvent(EVT));
}

/** Called by a scene that can't keep up: auto mode steps down one tier (never below low). */
export function demote(): Tier {
  const cur = autoTier();
  if (getPref() !== 'auto') return getTier();
  const next = ORDER[Math.max(0, ORDER.indexOf(cur) - 1)]!;
  if (next !== cur) {
    memoAuto = next;
    write(AUTO_KEY, next);
    window.dispatchEvent(new CustomEvent(EVT));
  }
  return next;
}

/** Forget the auto pick (used by "Clear my saved settings"). */
export function resetQuality(): void {
  memoPref = null;
  memoAuto = null;
  try {
    localStorage.removeItem(PREF_KEY);
    localStorage.removeItem(AUTO_KEY);
  } catch {
    /* nothing stored */
  }
}

/** React hook: current preference, the tier in use, and a setter. */
export function useQuality(): { pref: QualityPref; tier: Tier; set: (p: QualityPref) => void } {
  const [, bump] = useState(0);
  useEffect(() => {
    const h = () => bump((n) => n + 1);
    window.addEventListener(EVT, h);
    return () => window.removeEventListener(EVT, h);
  }, []);
  return { pref: getPref(), tier: getTier(), set: setPref };
}
