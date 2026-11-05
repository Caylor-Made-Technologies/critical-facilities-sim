/** Remembers whether the Simulator (and practice) runs in 2D or 3D, on this device only. */
import { useEffect, useState } from 'react';

const KEY = 'cfs-sim-3d';
const EVT = 'cfs-sim-3d-change';

export function get3d(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function set3d(on: boolean): void {
  try {
    localStorage.setItem(KEY, on ? '1' : '0');
  } catch {
    /* storage blocked: lasts for this visit */
  }
  window.dispatchEvent(new CustomEvent(EVT, { detail: on }));
}

export function use3d(): [boolean, (on: boolean) => void] {
  const [on, setOn] = useState(get3d);
  useEffect(() => {
    const h = (e: Event) => setOn(!!(e as CustomEvent).detail);
    window.addEventListener(EVT, h);
    return () => window.removeEventListener(EVT, h);
  }, []);
  return [on, (v) => {
    setOn(v);
    set3d(v);
  }];
}
