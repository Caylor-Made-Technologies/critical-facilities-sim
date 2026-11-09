/** Display helpers. The engine works in °C; the UI shows °F by default. */
import type { Units } from './prefs';

export function fmtTemp(c: number, units: Units, digits = 0): string {
  if (!isFinite(c)) return '—';
  return units === 'F' ? `${((c * 9) / 5 + 32).toFixed(digits)} °F` : `${c.toFixed(digits)} °C`;
}

export function fmtKw(kw: number): string {
  return `${Math.round(kw).toLocaleString('en-US')} kW`;
}

/** Temperature → color: blue (cold) → cyan → amber → red (hot). */
export function tempColor(c: number): string {
  const stops: [number, [number, number, number]][] = [
    [12, [56, 140, 255]],
    [20, [34, 211, 238]],
    [28, [255, 181, 71]],
    [38, [255, 90, 90]],
  ];
  if (c <= stops[0]![0]) return `rgb(${stops[0]![1].join(',')})`;
  for (let i = 1; i < stops.length; i++) {
    const [t1, c1] = stops[i]!;
    const [t0, c0] = stops[i - 1]!;
    if (c <= t1) {
      const f = (c - t0) / (t1 - t0);
      return `rgb(${c0.map((v, k) => Math.round(v + (c1[k]! - v) * f)).join(',')})`;
    }
  }
  return `rgb(${stops[stops.length - 1]![1].join(',')})`;
}

/** Pressure for a floor tech: psi with °F (US plants), kPa with °C. 1 kPa = 0.1450377 psi. */
export function fmtPress(kpa: number, units: Units): string {
  if (!isFinite(kpa)) return '—';
  return units === 'F' ? `${(kpa * 0.1450377).toFixed(1)} psi` : `${Math.round(kpa)} kPa`;
}
