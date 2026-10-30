/**
 * Viewer preferences (theme, units). Kept only in this browser's
 * localStorage, never sent anywhere. Every access is guarded because
 * storage can be blocked (private mode, strict settings).
 */
import { useCallback, useEffect, useState } from 'react';

export type ThemePref = 'system' | 'light' | 'dark';
export type Units = 'F' | 'C';

const KEY = 'cfs-prefs-v1';

interface Prefs {
  theme: ThemePref;
  units: Units;
}

const DEFAULTS: Prefs = { theme: 'system', units: 'F' };

function load(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const p = JSON.parse(raw) as Partial<Prefs>;
    return {
      theme: p.theme === 'light' || p.theme === 'dark' ? p.theme : 'system',
      units: p.units === 'C' ? 'C' : 'F',
    };
  } catch {
    return DEFAULTS;
  }
}

function save(p: Prefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable: preferences just won't persist */
  }
}

/** Remove everything this site stored (checklist point 20). */
export function clearPrefs(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing to clear */
  }
}

function systemTheme(): 'light' | 'dark' {
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function usePrefs() {
  const [prefs, setPrefs] = useState<Prefs>(load);
  const [sys, setSys] = useState<'light' | 'dark'>(systemTheme);

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: light)');
    if (!mq) return;
    const on = () => setSys(mq.matches ? 'light' : 'dark');
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  const resolved = prefs.theme === 'system' ? sys : prefs.theme;
  useEffect(() => {
    document.documentElement.dataset.theme = resolved;
  }, [resolved]);

  const update = useCallback((patch: Partial<Prefs>) => {
    setPrefs((p) => {
      const next = { ...p, ...patch };
      save(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    clearPrefs();
    setPrefs(DEFAULTS);
  }, []);

  return { prefs, resolvedTheme: resolved, update, reset };
}
