/**
 * physics.ts — every formula and tunable constant in one place.
 *
 * These are simplified teaching models: believable, not engineering grade.
 * Each formula notes what it ignores so nobody mistakes it for a design tool.
 *
 * Internal units: kW, kWt (thermal kW), °C, seconds, litres.
 */

// ---------------------------------------------------------------------------
// Tunable constants
// ---------------------------------------------------------------------------

export const PHYSICS = {
  // --- Generators -----------------------------------------------------------
  /** Seconds from start signal until a generator can accept load (crank, sync, close). */
  genStartDelayS: 10,
  /** Diesel use at full load, litres per kWh. ~0.27 L/kWh is typical of large gensets. */
  genFuelLPerKwh: 0.27,
  /** Fraction of full-load fuel burned at no load (engines burn fuel while idling). */
  genFuelIdleFraction: 0.1,

  // --- Transfer switches -----------------------------------------------------
  /** ATS waits this long after losing normal power before starting generators (rides through blips). */
  atsStartDelayS: 2,
  /** ATS transfer time once the emergency source is available. */
  atsTransferDelayS: 1,
  /** Normal source must be stable this long before the ATS retransfers back. Real sites use ~5–30 min. */
  atsRetransferDelayS: 300,

  // --- UPS ------------------------------------------------------------------
  /** Double-conversion efficiency (rectifier + inverter losses). */
  upsEfficiency: 0.96,
  /** Battery runtime at 100% load, in seconds. */
  upsRatedRuntimeS: 300,
  /** Peukert-style exponent: batteries last disproportionately longer at light load. */
  upsPeukert: 1.2,
  /** Cap on runtime at very light load so the curve doesn't explode. */
  upsMaxRuntimeS: 3600,
  /** A UPS above this load fraction transfers to static bypass. */
  upsOverloadTransfer: 1.25,

  // --- BESS -----------------------------------------------------------------
  /** Round-trip losses are folded into a single discharge efficiency. */
  bessDischargeEfficiency: 0.95,

  // --- Distribution ---------------------------------------------------------
  /** Transformer losses as a fraction of throughput. */
  transformerLoss: 0.015,

  // --- Thermal --------------------------------------------------------------
  /**
   * Effective thermal mass of a rack's air path, kJ per °C.
   * Small on purpose: without cooling, inlet temperatures climb within minutes.
   */
  rackThermalMassKjPerC: 900,
  /** Inlet temperature with cooling exactly matching load. */
  supplyAirC: 24,
  /** ASHRAE recommended inlet range for class A1–A4 equipment (°C). */
  ashraeRecommendedC: [18, 27] as const,
  /** ASHRAE A1 allowable inlet range (°C) — beyond this, equipment may throttle or shut down. */
  ashraeAllowableC: [15, 32] as const,
  /** ASHRAE recommended dew point band (°C) for the data hall. */
  ashraeDewPointC: [-9, 15] as const,
  /** Maximum recommended relative humidity (%). */
  ashraeMaxRh: 70,

  // --- Chillers and economizer ---------------------------------------------
  /** Chilled water supply setpoint (°C). ~18 °C (65 °F) is typical of warm-water data center plants. */
  chwSupplyC: 18,
  /** Design chilled water delta-T (°C). */
  chwDeltaTC: 8,
  /** Cooling tower approach to wet bulb (°C). */
  towerApproachC: 4,
  /** Plate heat exchanger approach used in water-side economizer mode (°C). */
  hxApproachC: 1.5,
  /** Ideal Carnot efficiency fraction actually achieved by a real chiller. */
  chillerCarnotFraction: 0.5,
  /** Condenser water leaving temperature (≈104 °F) above which a water-cooled chiller trips on high head pressure (°C). */
  chillerHighHeadTripC: 40,

  // --- Water ----------------------------------------------------------------
  /** Specific heat of water, kJ/(kg·°C). 1 L ≈ 1 kg. */
  waterCpKj: 4.186,

  // --- Mechanical plant (Phase 4) -----------------------------------------
  /** Seconds for a standby chiller to start and load once the BMS calls for it. */
  chillerStartS: 120,
  /** Seconds a chiller needs to restart after losing power (oil, controls, purge). */
  chillerRestartS: 180,
  /** Condenser water range: rise across the condenser (°C). */
  condenserRangeC: 5.5,
  /** Air-cooled condensing temperature above outdoor dry bulb (°C). */
  airCooledCondenserLiftC: 12,
  /** Air-cooled chiller high head trip (condensing °C). */
  airCooledHighHeadTripC: 58,
  /** Dry bulb above which air-cooled chillers start losing capacity (°C). */
  airCooledDerateStartC: 35,
  /** Hot aisle / CRAH return air temperature (°C). CRAH capacity hits zero when chilled water reaches it. */
  hotAisleC: 35,
  /** Chilled water storage tank volume (L). ~21,000 gal. */
  tesLitres: 80_000,
  /** Max TES recharge rate (kWt) when the chillers have spare capacity. */
  tesRechargeKw: 300,
  /** Effective thermal mass of the chilled water loop (kJ/°C): pipes + ~40,000 L of water. */
  chwLoopMassKjPerC: 170_000,
  /** Effective thermal mass of the data hall air path (kJ/°C). */
  hallThermalMassKjPerC: 20_000,
  /** Server inlet temperature at which air-cooled IT shuts itself down (°C). */
  serverShutdownC: 40,
  /** Share of a GPU rack's heat removed by liquid (the rest goes to air). */
  gpuLiquidFraction: 0.8,
  /** Normal GPU (cold plate) temperature with healthy flow (°C). */
  gpuNormalC: 65,
  /** GPUs throttle (cut power ~50%) above this (°C). */
  gpuThrottleC: 85,
  /** GPUs trip offline above this (°C). */
  gpuShutdownC: 95,
  /** Cold plate + coolant thermal mass per GPU row (kJ/°C). Small on purpose: seconds, not minutes. */
  gpuRowMassKjPerC: 620,
  /** Chilled-water coil leaving air temperature in the DOAS (°C) ≈ supply dew point. */
  doasCoilLeavingC: 10,
  /** Time constant for hall dew point drift with the DOAS running / off (s). */
  doasTauOnS: 900,
  doasTauOffS: 3600,
  /** Hall pressure with DOAS running / off (Pa, relative to outdoors). */
  hallPressureOnPa: 5,
  hallPressureOffPa: -2,
  /** UPS room thermal mass (kJ/°C) and heat from UPS losses (kW). */
  upsRoomMassKjPerC: 20_000,
  upsRoomHeatKw: 60,
} as const;

// ---------------------------------------------------------------------------
// Unit helpers
// ---------------------------------------------------------------------------

export const cToF = (c: number): number => (c * 9) / 5 + 32;
export const fToC = (f: number): number => ((f - 32) * 5) / 9;
/** A temperature *difference* in °C → °F (no 32 offset). */
export const deltaCToF = (dc: number): number => (dc * 9) / 5;
export const kwToTons = (kw: number): number => kw / 3.517;
export const litresToGallons = (l: number): number => l / 3.785;

// ---------------------------------------------------------------------------
// Electrical
// ---------------------------------------------------------------------------

/**
 * UPS battery runtime at a given load (seconds).
 *
 *   runtime = ratedRuntime × (1 / loadFraction)^k × SOC
 *
 * k > 1 models the Peukert effect: halve the load and runtime more than
 * doubles. Ignores temperature, battery age and end-of-discharge voltage.
 */
export function upsRuntimeS(loadFraction: number, soc = 1, p = PHYSICS): number {
  if (soc <= 0) return 0;
  if (loadFraction <= 0) return p.upsMaxRuntimeS * soc;
  const full = p.upsRatedRuntimeS * Math.pow(1 / loadFraction, p.upsPeukert);
  return Math.min(full, p.upsMaxRuntimeS) * soc;
}

/**
 * How much state of charge a UPS battery loses in `dtS` seconds at a load.
 * Derived from the runtime curve so the countdown is consistent with it.
 */
export function upsSocDrop(loadFraction: number, dtS: number, p = PHYSICS, health = 1): number {
  if (loadFraction <= 0) return 0;
  return dtS / (upsRuntimeS(loadFraction, 1, p) * Math.max(0.05, health));
}

/**
 * Battery age presets. "Health" is usable capacity as a fraction of new.
 * VRLA strings are commonly replaced at 80% capacity (end of life); past
 * that, capacity falls off quickly. Teaching values.
 */
export type BatteryAge = 'new' | 'mid' | 'eol' | 'overdue';
export const BATTERY_AGES: Record<BatteryAge, { label: string; health: number; note: string }> = {
  new: { label: 'New (year 1)', health: 1, note: 'Full rated runtime.' },
  mid: { label: 'Mid-life (year 3)', health: 0.92, note: 'Small capacity loss. Trend it on every PM.' },
  eol: { label: 'End of life (80%)', health: 0.8, note: 'The usual replacement point. Plan the swap now.' },
  overdue: { label: 'Overdue (60%)', health: 0.6, note: 'Runtime is badly short, and failure can come suddenly.' },
};

/**
 * Expected battery service life at an average room temperature.
 *   life = designLife × 0.5^((T − 25 °C) / 8.3)   (for T above 25 °C)
 * The common rule of thumb: every ~8 °C (15 °F) above 25 °C (77 °F) halves
 * the life of a lead-acid battery. Cooler than 25 °C doesn't extend it.
 */
export function batteryLifeYears(designYears: number, avgTempC: number): number {
  if (avgTempC <= 25) return designYears;
  return designYears * Math.pow(0.5, (avgTempC - 25) / 8.3);
}

// --- Field calculators (Field Tools tab) ------------------------------------

/** Three-phase current: I = P / (√3 × V × PF). */
export function threePhaseAmps(kw: number, volts: number, pf: number): number {
  if (volts <= 0 || pf <= 0) return 0;
  return (kw * 1000) / (Math.sqrt(3) * volts * pf);
}

/** Single-phase current: I = P / (V × PF). */
export function singlePhaseAmps(kw: number, volts: number, pf: number): number {
  if (volts <= 0 || pf <= 0) return 0;
  return (kw * 1000) / (volts * pf);
}

/** Apparent power: kVA = kW / PF. */
export const kva = (kw: number, pf: number): number => (pf > 0 ? kw / pf : 0);

/** Chilled water flow in US gpm: gpm = tons × 24 / ΔT(°F)  (from Q = 500 × gpm × ΔT). */
export function chwGpm(tons: number, deltaTF: number): number {
  return deltaTF > 0 ? (tons * 24) / deltaTF : 0;
}

/** Airflow needed to carry a heat load: CFM = kW × 3412 / (1.08 × ΔT(°F)). */
export function airflowCfm(kw: number, deltaTF: number): number {
  return deltaTF > 0 ? (kw * 3412) / (1.08 * deltaTF) : 0;
}

/** UPS runtime in minutes for any battery: same Peukert curve, scaled to its own full-load runtime and health. */
export function upsRuntimeMinFor(loadFraction: number, ratedFullLoadMin: number, health = 1, p = PHYSICS): number {
  if (loadFraction <= 0 || ratedFullLoadMin <= 0) return 0;
  const minutes = ratedFullLoadMin * Math.pow(1 / loadFraction, p.upsPeukert);
  return Math.min(minutes, ratedFullLoadMin * (p.upsMaxRuntimeS / p.upsRatedRuntimeS)) * health;
}

/** Tons back to kW (1 ton of refrigeration = 3.517 kW). */
export const tonsToKw = (tons: number): number => tons * 3.517;

/** Power a UPS draws from its input to deliver `outputKw` (double conversion). */
export function upsInputKw(outputKw: number, p = PHYSICS): number {
  return outputKw / p.upsEfficiency;
}

/**
 * BESS state-of-charge drop while discharging.
 *   ΔSOC = (kW × Δt / 3600) / (capacity kWh × efficiency)
 */
export function bessSocDrop(dischargeKw: number, dtS: number, capacityKwh: number, p = PHYSICS): number {
  if (capacityKwh <= 0) return 1;
  return (dischargeKw * dtS) / 3600 / (capacityKwh * p.bessDischargeEfficiency);
}

/** Seconds a BESS can sustain a discharge rate from its current SOC. */
export function bessRuntimeS(dischargeKw: number, soc: number, capacityKwh: number, p = PHYSICS): number {
  if (dischargeKw <= 0) return Infinity;
  return ((soc * capacityKwh * p.bessDischargeEfficiency) / dischargeKw) * 3600;
}

/**
 * Generator fuel burn (litres per second). Linear between an idle floor
 * and full load, which is close enough to real fuel curves for teaching.
 */
export function genFuelLPerS(loadKw: number, ratedKw: number, p = PHYSICS): number {
  const fullLph = ratedKw * p.genFuelLPerKwh;
  const frac = Math.max(0, Math.min(1, loadKw / ratedKw));
  const lph = fullLph * (p.genFuelIdleFraction + (1 - p.genFuelIdleFraction) * frac);
  return lph / 3600;
}

/** Day-tank runtime in seconds at a constant load. */
export function genRuntimeS(fuelL: number, loadKw: number, ratedKw: number, p = PHYSICS): number {
  return fuelL / genFuelLPerS(loadKw, ratedKw, p);
}

// ---------------------------------------------------------------------------
// Thermal
// ---------------------------------------------------------------------------

/**
 * Rack inlet temperature after `dtS` seconds.
 *
 * When cooling ≥ heat, the inlet relaxes back toward the supply air
 * temperature. When cooling < heat, the unremoved heat warms the
 * recirculating air:  dT = (heat − cooling) × Δt / thermalMass.
 *
 * Ignores airflow paths, containment leakage and server fan ramp-up.
 */
export function stepInletTemp(
  inletC: number,
  heatKw: number,
  coolingKw: number,
  dtS: number,
  p = PHYSICS,
): number {
  const deficit = heatKw - coolingKw;
  if (deficit > 0) {
    return inletC + (deficit * dtS) / p.rackThermalMassKjPerC;
  }
  // Recover toward supply air with a simple first-order lag (time constant 60 s).
  const tau = 60;
  const alpha = 1 - Math.exp(-dtS / tau);
  return inletC + (p.supplyAirC - inletC) * alpha;
}

export type InletBand = 'recommended' | 'allowable' | 'out-of-range';

export function classifyInlet(c: number, p = PHYSICS): InletBand {
  const [rLo, rHi] = p.ashraeRecommendedC;
  const [aLo, aHi] = p.ashraeAllowableC;
  if (c >= rLo && c <= rHi) return 'recommended';
  if (c >= aLo && c <= aHi) return 'allowable';
  return 'out-of-range';
}

/**
 * Seconds of cooling stored in a chilled-water (TES) tank.
 *   energy (kJ) = litres × cp × usable ΔT
 *   seconds     = energy / load kWt
 * Assumes a perfectly stratified tank and ignores pumping heat.
 */
export function tesRideThroughS(litres: number, loadKwt: number, deltaTC = PHYSICS.chwDeltaTC, p = PHYSICS): number {
  if (loadKwt <= 0) return Infinity;
  return (litres * p.waterCpKj * deltaTC) / loadKwt;
}

/** Chilled water flow (L/s) needed to move a heat load at a delta-T. */
export function chwFlowLps(loadKwt: number, deltaTC = PHYSICS.chwDeltaTC, p = PHYSICS): number {
  return loadKwt / (p.waterCpKj * deltaTC);
}

/**
 * Chiller coefficient of performance from "lift".
 * COP = carnotFraction × T_evap / (T_cond − T_evap), temperatures in kelvin.
 * Hotter condenser water (a 105 °F day) → bigger lift → lower COP → more kW.
 */
export function chillerCop(chwSupplyC: number, condLeavingC: number, p = PHYSICS): number {
  const tEvap = chwSupplyC - 2 + 273.15; // refrigerant evaporates a bit below the water temp
  const tCond = condLeavingC + 2 + 273.15; // and condenses a bit above it
  const lift = Math.max(tCond - tEvap, 5);
  return p.chillerCarnotFraction * (tEvap / lift);
}

/** Electrical kW a chiller compressor draws to remove `loadKwt`. */
export function chillerKw(loadKwt: number, chwSupplyC: number, condLeavingC: number, p = PHYSICS): number {
  return loadKwt / chillerCop(chwSupplyC, condLeavingC, p);
}

/** Condenser water leaving the tower: wet bulb + approach. Dry coolers track dry bulb instead. */
export function towerLeavingC(wetBulbC: number, p = PHYSICS): number {
  return wetBulbC + p.towerApproachC;
}

export type EconomizerMode = 'full' | 'partial' | 'off';

/**
 * Water-side economizer decision.
 * Full free cooling when tower water + HX approach can make the CHW setpoint.
 * Partial when it can pre-cool the return water. Otherwise chillers only.
 */
export function economizerMode(wetBulbC: number, p = PHYSICS): EconomizerMode {
  const achievable = towerLeavingC(wetBulbC, p) + p.hxApproachC;
  if (achievable <= p.chwSupplyC) return 'full';
  if (achievable < p.chwSupplyC + p.chwDeltaTC) return 'partial';
  return 'off';
}

/** Fraction of the heat load the economizer can carry (0..1). */
export function economizerFraction(wetBulbC: number, p = PHYSICS): number {
  const achievable = towerLeavingC(wetBulbC, p) + p.hxApproachC;
  const returnC = p.chwSupplyC + p.chwDeltaTC;
  if (achievable <= p.chwSupplyC) return 1;
  if (achievable >= returnC) return 0;
  return (returnC - achievable) / p.chwDeltaTC;
}

/**
 * First-order relaxation toward a resting value when cooling keeps up,
 * linear heating when it doesn't. Shared by the hall, loop and GPU models.
 */
export function stepTemp(
  tempC: number,
  heatKw: number,
  coolingKw: number,
  dtS: number,
  massKjPerC: number,
  restC: number,
  tauS = 60,
): number {
  const deficit = heatKw - coolingKw;
  if (deficit > 0) return tempC + (deficit * dtS) / massKjPerC;
  const alpha = 1 - Math.exp(-dtS / tauS);
  return tempC + (restC - tempC) * alpha;
}

/**
 * Cooling tower leaving water when the towers are loaded to `loadFraction`
 * of their capacity. Approach grows quickly once towers are overloaded.
 */
export function towerLeavingLoadedC(wetBulbC: number, loadFraction: number, p = PHYSICS): number {
  const f = Math.max(0.5, loadFraction);
  return wetBulbC + p.towerApproachC * f * f;
}

/** Air-cooled chiller capacity factor: derates on very hot days. */
export function airCooledDerate(dryBulbC: number, p = PHYSICS): number {
  if (dryBulbC <= p.airCooledDerateStartC) return 1;
  return Math.max(0.5, 1 - (dryBulbC - p.airCooledDerateStartC) * 0.03);
}

/**
 * CRAH coil capacity factor vs. chilled water supply temperature.
 * Full capacity at setpoint; zero when chilled water is as warm as the hot aisle.
 */
export function crahCapacityFactor(chwSupplyC: number, p = PHYSICS): number {
  const span = p.hotAisleC - p.chwSupplyC;
  return Math.max(0, Math.min(1, (p.hotAisleC - chwSupplyC) / span));
}

// ---------------------------------------------------------------------------
// Psychrometrics (for the DOAS)
// ---------------------------------------------------------------------------

/**
 * Dew point from dry bulb and relative humidity (Magnus formula).
 * Accurate to ~0.4 °C between −40 and 50 °C.
 */
export function dewPointC(dryBulbC: number, rhPct: number): number {
  const a = 17.62;
  const b = 243.12;
  const rh = Math.max(1, Math.min(100, rhPct)) / 100;
  const gamma = Math.log(rh) + (a * dryBulbC) / (b + dryBulbC);
  return (b * gamma) / (a - gamma);
}

/**
 * Wet-bulb temperature from dry bulb and RH (Stull 2011 empirical fit,
 * valid ~5–99% RH and −20…50 °C at sea level).
 */
export function wetBulbC(dryBulbC: number, rhPct: number): number {
  const T = dryBulbC;
  const RH = Math.max(5, Math.min(99, rhPct));
  return (
    T * Math.atan(0.151977 * Math.sqrt(RH + 8.313659)) +
    Math.atan(T + RH) -
    Math.atan(RH - 1.676331) +
    0.00391838 * Math.pow(RH, 1.5) * Math.atan(0.023101 * RH) -
    4.686035
  );
}

/** Relative humidity (%) from dry bulb and dew point (inverse Magnus). */
export function relativeHumidity(dryBulbC: number, dewC: number): number {
  const a = 17.62;
  const b = 243.12;
  const e = (t: number) => Math.exp((a * t) / (b + t));
  return Math.min(100, (100 * e(dewC)) / e(dryBulbC));
}

export type HumidityBand = 'ok' | 'too-dry' | 'too-humid';

/** Where a data-hall air condition sits against the ASHRAE recommended envelope. */
export function classifyHumidity(dryBulbC: number, dewC: number, p = PHYSICS): HumidityBand {
  const [lo, hi] = p.ashraeDewPointC;
  if (dewC < lo) return 'too-dry';
  if (dewC > hi || relativeHumidity(dryBulbC, dewC) > p.ashraeMaxRh) return 'too-humid';
  return 'ok';
}

/**
 * DOAS dehumidifying coil: air leaving a chilled-water coil is roughly
 * saturated at coil leaving temperature, so its dew point ≈ coil leaving temp.
 * If the outdoor dew point is already below that, the coil just cools.
 */
export function doasLeavingDewPointC(outdoorDewC: number, coilLeavingC: number): number {
  return Math.min(outdoorDewC, coilLeavingC);
}

/**
 * Energy recovery wheel: leaving temp moves toward the exhaust temp by the
 * wheel's effectiveness (sensible only — a simplification).
 */
export function wheelLeavingC(outdoorC: number, exhaustC: number, effectiveness = 0.7): number {
  return outdoorC + effectiveness * (exhaustC - outdoorC);
}

// ---------------------------------------------------------------------------
// Efficiency
// ---------------------------------------------------------------------------

/** Power Usage Effectiveness = total facility power ÷ IT power. 1.0 is perfect. */
export function pue(totalFacilityKw: number, itKw: number): number {
  if (itKw <= 0) return NaN;
  return totalFacilityKw / itKw;
}
