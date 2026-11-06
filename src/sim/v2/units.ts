/**
 * Typed units for engine v2 (Phase 4a).
 *
 * Each quantity is a plain number at runtime, "branded" with its unit at compile time, so
 * passing kVA where kW is expected, or °F where °C is expected, fails `npm run typecheck`.
 * Zero runtime cost: the helpers below are identity functions or simple conversions.
 *
 * Internal units are SI-style and match physics.ts: kW (electrical), kWt (thermal kW), kVA,
 * V, A, °C, s, L, kJ, kPa, L/s. Display units (°F, gal, gpm, tons, psi) are converted only
 * at the edge (UI), with the functions at the bottom of this file.
 *
 * Source type for every conversion: standard textbook relation / exact definition.
 */

declare const unit: unique symbol;
/** A number tagged with a unit name at compile time only. */
export type Q<U extends string> = number & { readonly [unit]: U };

export type Kw = Q<'kW'>;
export type Kwt = Q<'kWt'>;
export type Kva = Q<'kVA'>;
export type Volts = Q<'V'>;
export type Amps = Q<'A'>;
export type DegC = Q<'°C'>;
export type DegF = Q<'°F'>;
export type Seconds = Q<'s'>;
export type Litres = Q<'L'>;
export type Kj = Q<'kJ'>;
export type Kpa = Q<'kPa'>;
export type LitresPerS = Q<'L/s'>;
/** 0–1 fraction (load, state of charge, valve position). */
export type Frac = Q<'frac'>;

// Constructors (identity; they only attach the unit).
export const kw = (n: number) => n as Kw;
export const kwt = (n: number) => n as Kwt;
export const kva = (n: number) => n as Kva;
export const volts = (n: number) => n as Volts;
export const amps = (n: number) => n as Amps;
export const degC = (n: number) => n as DegC;
export const degF = (n: number) => n as DegF;
export const seconds = (n: number) => n as Seconds;
export const litres = (n: number) => n as Litres;
export const kj = (n: number) => n as Kj;
export const kpa = (n: number) => n as Kpa;
export const lps = (n: number) => n as LitresPerS;

/** Clamp to 0–1. NaN becomes 0, never NaN. */
export function frac(n: number): Frac {
  return (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : n === Infinity ? 1 : 0) as Frac;
}

/** Same-unit arithmetic that keeps the unit. */
export const add = <U extends string>(a: Q<U>, b: Q<NoInfer<U>>) => (a + b) as Q<U>;
export const sub = <U extends string>(a: Q<U>, b: Q<NoInfer<U>>) => (a - b) as Q<U>;
export const scale = <U extends string>(a: Q<U>, k: number) => (a * k) as Q<U>;
/** Ratio of two same-unit quantities is unitless. Division by zero gives 0, never NaN/Infinity. */
export const ratio = <U extends string>(a: Q<U>, b: Q<NoInfer<U>>) => (b === 0 ? 0 : a / b);

// ---------------------------------------------------------------------------
// Electrical relations
// ---------------------------------------------------------------------------

/**
 * Real power from apparent power: P = S × PF.
 * Units: kVA × (unitless 0–1) → kW. PF is clamped to 0–1.
 */
export const kwFromKva = (s: Kva, pf: number) => (s * frac(pf)) as Kw;

/**
 * Apparent power from real power: S = P ÷ PF.
 * Units: kW → kVA. PF clamped to 0.01–1 so a zero PF can't give Infinity.
 */
export const kvaFromKw = (p: Kw, pf: number) => (p / Math.max(0.01, frac(pf))) as Kva;

/**
 * Three-phase line current: I = S × 1000 ÷ (√3 × V_LL).
 * Units: kVA, line-to-line V → A. Balanced load assumed. V ≤ 0 → 0 A.
 */
export const amps3ph = (s: Kva, vLL: Volts) => (vLL > 0 ? (s * 1000) / (Math.sqrt(3) * vLL) : 0) as Amps;

// ---------------------------------------------------------------------------
// Display conversions (UI edge only)
// ---------------------------------------------------------------------------

/** °F = °C × 9/5 + 32 (exact). */
export const toF = (c: DegC) => ((c * 9) / 5 + 32) as DegF;
/** °C = (°F − 32) × 5/9 (exact). */
export const toC = (f: DegF) => (((f - 32) * 5) / 9) as DegC;
/** Temperature difference: 1 K = 1.8 °F (exact). Use for ΔT, never for absolute temperatures. */
export const deltaToF = (dc: number) => dc * 1.8;
/** US gallons: 1 gal = 3.785411784 L (exact). */
export const toGal = (l: Litres) => l / 3.785411784;
/** gpm: 1 L/s = 15.850323 US gal/min. */
export const toGpm = (q: LitresPerS) => q * 15.850323;
/** Refrigeration tons: 1 ton = 3.516853 kWt (12,000 BTU/h). */
export const toTons = (q: Kwt) => q / 3.516853;
/** psi: 1 kPa = 0.1450377 psi. */
export const toPsi = (p: Kpa) => p * 0.1450377;
