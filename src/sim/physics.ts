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

// ---------------------------------------------------------------------------
// Life of a data center (planning math for the Learn track). Teaching
// simplifications: real decisions use the site's engineering studies.
// ---------------------------------------------------------------------------

export const MINUTES_PER_YEAR = 365 * 24 * 60;

/** Expected downtime per year for an availability (0.999 = "three nines" ≈ 525.6 min). */
export function downtimeMinutesPerYear(availability: number): number {
  const a = Math.min(1, Math.max(0, availability));
  return (1 - a) * MINUTES_PER_YEAR;
}

/**
 * Weighted site score, 0–100: each factor is rated 0–5 for a site, and each
 * weight (0–5) says how much that factor matters to this project.
 */
export function siteScore(weights: Record<string, number>, ratings: Record<string, number>): number {
  let sum = 0;
  let max = 0;
  for (const [k, w] of Object.entries(weights)) {
    const ww = Math.max(0, w);
    sum += ww * Math.min(5, Math.max(0, ratings[k] ?? 0));
    max += ww * 5;
  }
  return max > 0 ? (sum / max) * 100 : 0;
}

export type Redundancy = 'N' | 'N+1' | '2N';

/** UPS modules to buy for a load: N covers the load; N+1 adds one spare; 2N doubles the whole set. */
export function upsModulesNeeded(loadKw: number, moduleKw: number, r: Redundancy): number {
  if (loadKw <= 0 || moduleKw <= 0) return 0;
  const n = Math.ceil(loadKw / moduleKw);
  return r === 'N' ? n : r === 'N+1' ? n + 1 : n * 2;
}

/** IT load from rack count and average density. */
export const itLoadKw = (racks: number, kwPerRack: number): number => Math.max(0, racks) * Math.max(0, kwPerRack);

export interface CapacityLimits {
  /** Racks each resource could support at this density. */
  byPower: number;
  byCooling: number;
  bySpace: number;
  /** The resource that runs out first, and the racks you can actually fill. */
  limit: 'power' | 'cooling' | 'space';
  racks: number;
  /** Capacity paid for but unusable because another resource ran out first. */
  strandedPowerKw: number;
  strandedCoolingKw: number;
  strandedRacks: number;
}

/** Stranded capacity: power, cooling and floor space each cap the room; the smallest wins. */
export function capacityLimits(powerKw: number, coolingKw: number, rackSpaces: number, kwPerRack: number): CapacityLimits {
  const d = Math.max(0.1, kwPerRack);
  const byPower = Math.floor(Math.max(0, powerKw) / d);
  const byCooling = Math.floor(Math.max(0, coolingKw) / d);
  const bySpace = Math.max(0, Math.floor(rackSpaces));
  const racks = Math.min(byPower, byCooling, bySpace);
  const limit = racks === bySpace ? 'space' : racks === byPower ? 'power' : 'cooling';
  return {
    byPower,
    byCooling,
    bySpace,
    limit,
    racks,
    strandedPowerKw: Math.max(0, powerKw - racks * d),
    strandedCoolingKw: Math.max(0, coolingKw - racks * d),
    strandedRacks: bySpace - racks,
  };
}

// ---------------------------------------------------------------------------
// Electrical load flow and protection (engine v2, Phase 4b). Simplified teaching models,
// not a load-flow study or a coordination study. Every number here is a typical example.
// ---------------------------------------------------------------------------

export const ELEC = {
  /** Example voltages (line to line). MV service is a common US example; LV distribution 480 V; rack level 415 V. */
  mvVolts: 12_470,
  lvVolts: 480,
  rackVolts: 415,
  /** Typical power factors: modern server power supplies, VFD-driven motors, a double-conversion UPS input. */
  pfIt: 0.98,
  pfMotorVfd: 0.95,
  pfUpsInput: 0.99,
  /** Largest per-rack phase skew used to seed realistic small imbalance (±fraction of the rack's load). */
  rackPhaseSkew: 0.06,
  /** Transformer: example rated winding temperature rise at full load (°C), ambient, exponent, time constant. */
  txRatedRiseC: 80,
  txAmbientC: 30,
  txRiseExponent: 1.6,
  txTauS: 3600,
  /** Breaker trip unit (LSI concept): long-time pickup, long-time band (s at 6× pickup), short-time pickup and delay, instantaneous pickup and clearing time. */
  ltPickup: 1.0,
  ltBandS: 10,
  stPickup: 6,
  stDelayS: 0.3,
  instPickup: 10,
  instClearS: 0.05,
  /** Thermal memory cools off with this time constant once the overload is gone. */
  ltCoolTauS: 600,
} as const;

/**
 * Apparent power: S = P ÷ PF.
 * Units: kW → kVA. Assumes sinusoidal power factor (ignores harmonic distortion).
 * Valid: P ≥ 0; PF clamped to 0.05–1, so a bad PF never gives Infinity or NaN.
 * Source type: standard textbook relation.
 */
export function kvaOf(kw: number, pf: number): number {
  const p = Number.isFinite(kw) ? Math.max(0, kw) : 0;
  const f = Number.isFinite(pf) ? Math.min(1, Math.max(0.05, pf)) : 1;
  return p / f;
}

/**
 * Reactive power: Q = P × tan(acos PF).
 * Units: kW → kvar. Example: 100 kW at PF 0.8 → 100 × 0.75 = 75 kvar.
 * Source type: standard textbook relation.
 */
export function kvarOf(kw: number, pf: number): number {
  const f = Number.isFinite(pf) ? Math.min(1, Math.max(0.05, pf)) : 1;
  return Math.max(0, kw) * Math.tan(Math.acos(f));
}

/**
 * Three-phase line current: I = S × 1000 ÷ (√3 × V_LL).
 * Units: kVA, V → A. Balanced load assumed. V ≤ 0 → 0.
 * Source type: standard textbook relation.
 */
export function lineAmps(kva: number, vLL: number): number {
  return vLL > 0 && kva > 0 ? (kva * 1000) / (Math.sqrt(3) * vLL) : 0;
}

/**
 * Phase imbalance: largest deviation from the average phase value, as % of the average
 * (the usual motor-standard definition). Works for currents or voltages.
 * Example: 100, 104, 96 A → avg 100, max deviation 4 → 4 %.
 * Zero or invalid average → 0. Source type: standard industry definition.
 */
export function phaseImbalancePct(a: number, b: number, c: number): number {
  const avg = (a + b + c) / 3;
  if (!(avg > 0)) return 0;
  return (Math.max(Math.abs(a - avg), Math.abs(b - avg), Math.abs(c - avg)) / avg) * 100;
}

/**
 * Transformer steady-state temperature rise (simplified): rise = ratedRise × loading^n.
 * Units: loading as a fraction of nameplate kVA (clamped 0–2); °C out.
 * Assumes rise scales with losses (mostly I²R); n ≈ 1.6 lumps winding and cooling behavior.
 * Not a thermal model of a real unit: use the manufacturer's data and loading guide.
 * Example: 80 °C rated rise at 50 % load → 80 × 0.5^1.6 = 80 × 0.3299 = 26.4 °C.
 * Source type: simplified textbook relation (loss-proportional rise).
 */
export function transformerRiseC(loading: number, ratedRiseC: number = ELEC.txRatedRiseC, n: number = ELEC.txRiseExponent): number {
  const l = Number.isFinite(loading) ? Math.min(2, Math.max(0, loading)) : 0;
  return ratedRiseC * Math.pow(l, n);
}

/**
 * First-order approach to a target: x + (target − x) × (1 − e^(−dt/τ)).
 * Units: any; dt and τ in seconds. τ ≤ 0 jumps straight to the target.
 * Source type: standard first-order (lumped) response.
 */
export function approach(x: number, target: number, dtS: number, tauS: number): number {
  if (!(tauS > 0)) return target;
  return x + (target - x) * (1 - Math.exp(-Math.max(0, dtS) / tauS));
}

/**
 * Breaker trip time for a current at `multiple` × the long-time pickup (simplified LSI trip unit).
 *   - below the long-time pickup: never (Infinity);
 *   - long time (overload): I²t curve through the band time at 6×: t = band × (6 / M)²;
 *   - short time (≥ stPickup): fixed delay;
 *   - instantaneous (≥ instPickup): clearing time.
 * Units: multiple (unitless) → seconds. Example: band 10 s at 1.5× → 10 × (6/1.5)² = 160 s.
 * Simplified for training: real trip units have tolerance bands, I²t ramps and settings from a
 * coordination study. Source type: simplified textbook inverse-time characteristic.
 */
export function breakerTripTimeS(multiple: number, e: typeof ELEC = ELEC): number {
  if (!Number.isFinite(multiple) || multiple <= e.ltPickup) return Infinity;
  if (multiple >= e.instPickup) return e.instClearS;
  if (multiple >= e.stPickup) return e.stDelayS;
  return e.ltBandS * (6 / multiple) ** 2;
}

// ---------------------------------------------------------------------------
// Sources detail (engine v2, Phase 4b part 2): generator start stages, load-step dip, UPS modes,
// battery temperature derating, ATS in-phase window. Simplified teaching values (see REVIEW-QUEUE).
// ---------------------------------------------------------------------------

export const SOURCES = {
  /** Start sequence inside the existing start delay (genStartDelayS = 10 s): crank, build voltage and frequency, ready to close. */
  crankS: 3,
  buildVfS: 5,
  /** Extra seconds a cold engine needs when its block heater is off. */
  coldStartExtraS: 15,
  /** A generator that will not start is declared failed (overcrank) after this long. */
  overcrankS: 45,
  /** Load-step frequency dip: % of nominal per 100% load step, and recovery time constant. */
  dipPctPerFullStep: 10,
  dipRecoverTauS: 2,
  nominalHz: 60,
  /** Example efficiencies: double conversion, eco (on bypass, inverter on standby), static bypass. */
  effDoubleConversion: 0.96,
  effEco: 0.99,
  effBypass: 0.995,
  /** Battery capacity loss per °C below 25 °C (about 1%/°C), floored. Heat does not add runtime; it shortens life. */
  battCapPerDegC: 0.01,
  battCapFloor: 0.5,
  /** Example generator frequency slip against the returning utility, and the in-phase window (±°). */
  slipHz: 0.1,
  inPhaseWindowDeg: 10,
} as const;

export type GenStage = 'off' | 'crank' | 'build-vf' | 'ready' | 'online';

/**
 * Generator start stage from seconds since the start signal (simplified, within a 10 s start):
 * 0–3 s crank, 3–8 s build voltage and frequency, 8 s+ ready to close. Negative/NaN → crank.
 * Source type: generic description of a standby generator start sequence.
 */
export function genStage(elapsedS: number, s: typeof SOURCES = SOURCES): Exclude<GenStage, 'off' | 'online'> {
  const e = Number.isFinite(elapsedS) ? elapsedS : 0;
  if (e < s.crankS) return 'crank';
  if (e < s.crankS + s.buildVfS) return 'build-vf';
  return 'ready';
}

/**
 * Frequency during a load step (simplified first-order recovery):
 * f(t) = nominal × (1 − dip × e^(−t/τ)), dip = dipPctPerFullStep% × step fraction (0–1, clamped).
 * Example: 50% step → 5% dip → 57 Hz at the step, 60 − 3 × e^(−1) = 58.9 Hz after 2 s.
 * Real dips depend on engine, governor, alternator and load type; check the manufacturer's data.
 * Source type: simplified textbook first-order response.
 */
export function stepFrequencyHz(stepFrac: number, sinceS: number, s: typeof SOURCES = SOURCES): number {
  const f = Number.isFinite(stepFrac) ? Math.min(1, Math.max(0, stepFrac)) : 0;
  const t = Number.isFinite(sinceS) ? Math.max(0, sinceS) : Infinity;
  return s.nominalHz * (1 - (s.dipPctPerFullStep / 100) * f * Math.exp(-t / s.dipRecoverTauS));
}

/**
 * Battery capacity factor from temperature: 1 at or above 25 °C, −1% per °C below, floored at 0.5.
 * Example: 15 °C → 1 − 0.01 × 10 = 0.90. Heat is not rewarded: it shortens battery life instead
 * (see batteryLifeYears). Source type: common lead-acid rule of thumb.
 */
export function batteryTempFactor(tempC: number, s: typeof SOURCES = SOURCES): number {
  if (!Number.isFinite(tempC) || tempC >= 25) return 1;
  return Math.max(s.battCapFloor, 1 - s.battCapPerDegC * (25 - tempC));
}

/**
 * Phase angle between a generator and the returning utility, −180…180°, from the slip frequency:
 * angle = 360 × slip × t (wrapped). Example: 0.1 Hz slip → one full turn every 10 s.
 * Source type: standard relation for two sources at slightly different frequencies.
 */
export function slipAngleDeg(tS: number, slipHz: number = SOURCES.slipHz): number {
  if (!Number.isFinite(tS) || !Number.isFinite(slipHz)) return 0;
  const a = (((360 * slipHz * tS) % 360) + 360) % 360;
  return a > 180 ? a - 360 : a;
}

// ---------------------------------------------------------------------------
// Thermal v2, air side (engine v2, Phase 4c part 1): lumped air nodes, coil, fans, containment.
// Simplified teaching values (see REVIEW-QUEUE). Not a CFD model.
// ---------------------------------------------------------------------------

export const AIR = {
  /** Specific heat of air, kJ/(kg·K), and density at about 20 °C at sea level, kg/m³. */
  cpKj: 1.006,
  densityKgM3: 1.2,
  /** Specific heat of water, kJ/(kg·K) (same value as PHYSICS.waterCpKj). */
  waterCpKj: 4.186,
  /** Temperature rise of air through a server at full load (K), about 22 °F. */
  itDeltaTK: 12,
  /** One CRAH at 100% fan: air mass flow (kg/s, ≈ 22,000 CFM) and fan power (kW). */
  crahDesignKgS: 12.4,
  crahFanKw: 8,
  /** Lowest CRAH fan speed (fraction of full). */
  crahMinSpeed: 0.3,
  /**
   * Coil effectiveness at full fan speed: share of (return air − chilled water) the coil can take
   * out of the air. 0.75 gives one CRAH 0.75 × 12.4 × 1.006 × 18 = 168 kW at 36 °C return air and
   * 18 °C water at full fan, about 12% over its 150 kW nameplate (nameplates are rated at fixed test
   * conditions; Verify against the unit's selection data). It rises at lower airflow: see coilEffectiveness().
   */
  coilEffectivenessDesign: 0.75,
  /** Coil capacity the fans keep in hand above the heat load before ramping up (valve-then-fan sequence). */
  coilMargin: 0,
  /** Time constant for the CRAH fans to follow a cooling call (s). */
  fanRampTauS: 30,
  /** Chilled water rise across a CRAH coil at design (K). */
  coilWaterDeltaTK: 8,
  /** Rack inlet (cold aisle) setpoint the CRAH valves hold (°C). Same as PHYSICS.supplyAirC. */
  inletSetpointC: 24,
  /** Supply air can't get closer than this to the chilled water supply (K). */
  coilApproachK: 1,
  /** Air pushed through idle or off racks by cold-aisle pressure, as a share of design IT airflow. */
  idleRackFlow: 0.1,
  /** Cold air the fans push beyond what the IT draws, at the pressure setpoint (fraction). */
  airflowMargin: 0.05,
  /**
   * Thermal mass of each air node (kJ/K): air plus the metal it touches. They add up to the v1
   * hall mass (PHYSICS.hallThermalMassKjPerC = 20,000) so the hall heats at the same rate.
   */
  massKjPerK: { cold: 1500, rackIn: 500, rackOut: 12_000, hot: 3000, room: 3000 },
  /**
   * Recirculation (hot air back into rack inlets) and bypass (cold air back to the CRAHs without
   * passing through IT), by containment state. Example values, not measurements.
   */
  containment: {
    full: { recirc: 0.03, bypass: 0.05 },
    'door-open': { recirc: 0.15, bypass: 0.15 },
    none: { recirc: 0.25, bypass: 0.3 },
  },
  /** Extra recirculation when every blanking panel is missing (scales with the missing share). */
  blankingRecirc: 0.1,
  /** Extra bypass per unit of perforated-tile open area above what the IT needs (ratio − 1). */
  tileBypassPerExcess: 0.2,
  /** Largest bypass fraction allowed (keeps the airflow balance sensible). */
  maxBypass: 0.6,
  /**
   * ASHRAE TC 9.9 inlet ranges (°C), values only. Recommended applies to all classes;
   * allowable by equipment class A1–A4.
   */
  recommendedC: [18, 27] as const,
  allowableC: { A1: [15, 32], A2: [10, 35], A3: [5, 40], A4: [5, 45] } as const,
} as const;

export type AshraeClass = keyof typeof AIR.allowableC;
export type ContainmentMode = keyof typeof AIR.containment;

/**
 * Heat carried by a fluid stream: Q = ṁ × cp × ΔT.
 * Units: kg/s × kJ/(kg·K) × K → kW. Example: 10 kg/s of air warmed 12 K → 10 × 1.006 × 12 = 120.7 kW.
 * Source type: standard sensible-heat relation.
 */
export function heatFlowKw(massKgS: number, cpKj: number, deltaTK: number): number {
  return massKgS * cpKj * deltaTK;
}

/** Mass flow (kg/s) that carries `kw` with a rise of `deltaTK`: ṁ = Q / (cp × ΔT). Zero for ΔT ≤ 0. */
export function massFlowForKw(kw: number, cpKj: number, deltaTK: number): number {
  return deltaTK > 0 ? Math.max(0, kw) / (cpKj * deltaTK) : 0;
}

/** Volume flow (m³/s) of an air mass flow: V = ṁ / ρ. Example: 12 kg/s ÷ 1.2 = 10 m³/s (≈ 21,190 CFM). */
export function airVolumeM3s(massKgS: number, a: typeof AIR = AIR): number {
  return massKgS / a.densityKgM3;
}

/**
 * Fan and pump affinity laws, at speed fraction N (1 = full speed):
 *   flow ∝ N, head (pressure) ∝ N², power ∝ N³.
 * Example: 80% speed → 80% flow, 64% head, 51.2% power.
 * Source type: standard affinity laws (same machine, same fluid, ignoring efficiency changes).
 */
export function affinity(speed: number): { flow: number; head: number; power: number } {
  const n = Number.isFinite(speed) ? Math.max(0, speed) : 0;
  return { flow: n, head: n * n, power: n * n * n };
}

/**
 * Exact step of a lumped first-order node toward its steady state:
 *   T ← T + (Tss − T) × (1 − e^(−dt/τ)).
 * Stable for any dt (it can never overshoot Tss). τ = ∞ (no flow) leaves T unchanged; τ ≤ 0 jumps.
 * Example: T 20, Tss 30, dt 10, τ 10 → 20 + 10 × (1 − e^(−1)) = 26.32.
 * Source type: exact solution of dT/dt = (Tss − T)/τ over one step.
 */
export function relaxExact(t: number, tss: number, dtS: number, tauS: number): number {
  if (tauS === Infinity || !(dtS > 0)) return t;
  if (!(tauS > 0)) return tss;
  return t + (tss - t) * (1 - Math.exp(-dtS / tauS));
}

/**
 * Time constant of a mixed node: τ = C / (ṁ × cp). Units: kJ/K ÷ (kg/s × kJ/(kg·K)) → s.
 * Example: 3000 kJ/K with 75 kg/s of air → 3000 / (75 × 1.006) = 39.8 s. No flow → ∞.
 */
export function nodeTauS(massKjPerK: number, flowKgS: number, cpKj: number = AIR.cpKj): number {
  return flowKgS > 1e-9 ? massKjPerK / (flowKgS * cpKj) : Infinity;
}

/**
 * Coil effectiveness at fan speed N: ε = 1 − e^(−NTU), NTU = NTU_design × N^(−0.4)
 * (air-side UA grows about as airflow^0.6, so NTU = UA/(ṁ·cp) grows as airflow drops).
 * NTU_design = −ln(1 − ε_design). Example: ε_design 0.8 → NTU 1.609; at N = 0.5,
 * NTU = 1.609 × 0.5^(−0.4) = 2.123 → ε = 1 − e^(−2.123) = 0.880 (pass ε_design to test other values).
 * Source type: ε-NTU method with a textbook airflow exponent; simplified.
 */
export function coilEffectiveness(speed: number, design: number = AIR.coilEffectivenessDesign): number {
  const n = Number.isFinite(speed) ? Math.min(1, Math.max(0.05, speed)) : 1;
  const ntu = -Math.log(1 - design) * n ** -0.4;
  return 1 - Math.exp(-ntu);
}

/**
 * Most heat a coil can take out of the air: Q = ε × ṁ × cp × (T_air,in − T_water,in), never negative.
 * Example: ε 0.8, 12.4 kg/s, air 36 °C, water 18 °C → 0.8 × 12.4 × 1.006 × 18 = 179.6 kW.
 * Source type: effectiveness (ε-NTU) form with air as the smaller capacity stream.
 */
export function coilMaxKw(effectiveness: number, airKgS: number, airInC: number, waterInC: number, a: typeof AIR = AIR): number {
  return Math.max(0, effectiveness * heatFlowKw(airKgS, a.cpKj, airInC - waterInC));
}

/**
 * Mix of two air streams by mass: T = (1 − f) × A + f × B. Example: 3% of 36 °C into 24 °C → 24.36 °C.
 */
export function mixC(a: number, b: number, fracB: number): number {
  const f = Math.min(1, Math.max(0, fracB));
  return (1 - f) * a + f * b;
}

export type InletClassBand = 'below' | 'recommended' | 'allowable' | 'over';

/**
 * Where an inlet temperature sits against the ASHRAE TC 9.9 ranges for an equipment class.
 * Example: 30 °C on A1 → 'allowable'; 33 °C on A1 → 'over'; 33 °C on A2 → 'allowable'.
 */
export function inletClassBand(c: number, cls: AshraeClass = 'A1', a: typeof AIR = AIR): InletClassBand {
  const [rLo, rHi] = a.recommendedC;
  const [aLo, aHi] = a.allowableC[cls];
  if (!Number.isFinite(c)) return 'over';
  if (c >= rLo && c <= rHi) return 'recommended';
  if (c >= aLo && c <= aHi) return 'allowable';
  return c < aLo ? 'below' : 'over';
}

/** Recirculation and bypass fractions from containment, blanking panels (share missing) and tile open area. */
export function airPaths(mode: ContainmentMode, blankingMissing: number, tileRatio: number, a: typeof AIR = AIR): { recirc: number; bypass: number } {
  const base = a.containment[mode] ?? a.containment.full;
  const miss = Number.isFinite(blankingMissing) ? Math.min(1, Math.max(0, blankingMissing)) : 0;
  const tiles = Number.isFinite(tileRatio) ? Math.max(0, tileRatio) : 1;
  return {
    recirc: Math.min(1, base.recirc + a.blankingRecirc * miss),
    bypass: Math.min(a.maxBypass, base.bypass + a.tileBypassPerExcess * Math.max(0, tiles - 1)),
  };
}

// ---------------------------------------------------------------------------
// Thermal v2, hydronic (engine v2, Phase 4c part 2): chilled water and condenser loops, VFD pumps on a
// system curve, chiller lift and part-load, stratified chilled-water storage. Simplified teaching values.
// ---------------------------------------------------------------------------

export const HYD = {
  /** Water density (kg/m³) and gravity (m/s²). */
  waterDensity: 998,
  gravity: 9.81,
  /** Chilled water design ΔT (K) and supply setpoint (°C): same as PHYSICS.chwDeltaTC / chwSupplyC. */
  chwDeltaTK: 8,
  chwSetpointC: 18,
  /** One CHW pump at design: flow (kg/s, carries 1,400 kWt at 8 K ≈ 660 gpm) and head (kPa ≈ 84 ft). */
  pumpDesignKgS: 41.8,
  pumpDesignHeadKpa: 250,
  /** Shutoff head as a multiple of design head (pump curve shape). */
  pumpShutoffRatio: 1.25,
  /** Pump + motor + VFD efficiency (wire to water). */
  pumpEff: 0.75,
  pumpMinSpeed: 0.3,
  /** Differential pressure setpoint held at the remote coil (kPa ≈ 15 psi). */
  dpSetpointKpa: 100,
  /** Thermal mass of the CHW supply and return sides (kJ/K): together PHYSICS.chwLoopMassKjPerC. */
  chwSupplyMassKjPerK: 85_000,
  chwReturnMassKjPerK: 85_000,
  /** Condenser water loop: mass (kJ/K), flow per running pump (kg/s, 1,800 kWt over 5.5 K), heat of compression share. */
  cwMassKjPerK: 40_000,
  cwPumpKgS: 78.2,
  heatOfCompression: 1.17,
  /** Water-cooled chiller design lift: condenser leaving − CHW supply (K), and capacity change per K of extra lift. */
  designLiftK: 17,
  capPerLiftK: 0.012,
  capFactorRange: [0.7, 1.1] as const,
  /** Smallest lift a chiller runs at (K): head pressure control keeps the condenser this far above CHW. */
  minLiftK: 10,
  /** Lowest tower leaving water (°C): fans cycle and bypass valves open to keep it from freezing. */
  towerMinLeavingC: 5,
  /** Part-load power curve: kW fraction = a + b·PLR + c·PLR² (1 at full load). DOE-2-style example. */
  plr: [0.17, 0.32, 0.51] as const,
  /** Evaporator minimum flow (fraction of one chiller's design flow) and how long it may sit below it. */
  minFlowFrac: 0.4,
  minFlowDelayS: 10,
  /** Anti-short-cycle: minimum time between normal starts, and minimum run time before staging off (s). */
  startToStartS: 600,
  minRunS: 600,
  /** Stratified tank: below this charge the thermocline reaches the outlet and supply warms. */
  thermoclineFrac: 0.1,
  /** Most the tank's piping can discharge (kWt). */
  tesMaxDischargeKw: 2500,
} as const;

/**
 * Pump head at flow q and speed N (affinity-scaled quadratic curve): H = H0·N² − a·q²,
 * H0 = shutoff head, a = (H0 − H_design) / q_design². Units kPa, kg/s.
 * Example (design pump): H0 = 312.5, a = 62.5/41.8² = 0.03577; at N 1, q 41.8 → 250 kPa; at N 0.8, q 20 → 200 − 14.31 = 185.7 kPa.
 */
export function pumpHeadKpa(qKgS: number, speed: number, h: typeof HYD = HYD): number {
  const h0 = h.pumpDesignHeadKpa * h.pumpShutoffRatio;
  const a = (h0 - h.pumpDesignHeadKpa) / h.pumpDesignKgS ** 2;
  return h0 * speed * speed - a * qKgS * qKgS;
}

/**
 * System curve with a DP setpoint at the remote coil: H = DPsp + k·Q², k fixed by the design point
 * (two pumps' design flow at design head). Example: k = 150 / 83.6² = 0.02146; Q 50 kg/s → 100 + 53.66 = 153.7 kPa.
 */
export function systemHeadKpa(qTotalKgS: number, h: typeof HYD = HYD): number {
  const k = (h.pumpDesignHeadKpa - h.dpSetpointKpa) / (2 * h.pumpDesignKgS) ** 2;
  return h.dpSetpointKpa + k * qTotalKgS * qTotalKgS;
}

/**
 * Speed n pumps in parallel need to deliver qTotal against the system curve (clamped to min speed),
 * or, if full speed isn't enough, the flow they reach at full speed.
 * Solves H0·N² − a·(Q/n)² = DPsp + k·Q². Example: 2 pumps, 50 kg/s → N = √((153.66 + 0.03577·625)/312.5) = 0.7505.
 */
export function pumpOperatingPoint(qTotalKgS: number, n: number, h: typeof HYD = HYD): { speed: number; flowKgS: number; headKpa: number } {
  if (n <= 0 || !(qTotalKgS > 0)) return { speed: 0, flowKgS: 0, headKpa: 0 };
  const h0 = h.pumpDesignHeadKpa * h.pumpShutoffRatio;
  const a = (h0 - h.pumpDesignHeadKpa) / h.pumpDesignKgS ** 2;
  const k = (h.pumpDesignHeadKpa - h.dpSetpointKpa) / (2 * h.pumpDesignKgS) ** 2;
  const need = Math.sqrt((systemHeadKpa(qTotalKgS, h) + a * (qTotalKgS / n) ** 2) / h0);
  if (need <= 1) {
    const speed = Math.max(h.pumpMinSpeed, need);
    // At min speed the valves throttle: flow stays at demand, head rises along the pump curve.
    return { speed, flowKgS: qTotalKgS, headKpa: pumpHeadKpa(qTotalKgS / n, speed, h) };
  }
  const q = Math.sqrt((h0 - h.dpSetpointKpa) / (a / (n * n) + k));
  return { speed: 1, flowKgS: q, headKpa: systemHeadKpa(q, h) };
}

/**
 * Hydraulic power of a water flow: P = V̇ × ΔP / η, V̇ = ṁ / ρ. Units: m³/s × kPa → kW.
 * Example: 41.8 kg/s at 250 kPa, η 0.75 → (41.8/998) × 250 / 0.75 = 13.96 kW (≈ 18.7 hp).
 */
export function pumpKw(flowKgS: number, headKpa: number, h: typeof HYD = HYD): number {
  return Math.max(0, ((flowKgS / h.waterDensity) * headKpa) / h.pumpEff);
}

/**
 * Water-cooled chiller capacity factor from lift (condenser leaving − CHW supply):
 * 1 − 0.012 × (lift − 17), clamped 0.7–1.1. Example: lift 22 K → 1 − 0.06 = 0.94.
 */
export function chillerLiftFactor(liftK: number, h: typeof HYD = HYD): number {
  const f = 1 - h.capPerLiftK * (liftK - h.designLiftK);
  return Math.min(h.capFactorRange[1], Math.max(h.capFactorRange[0], Number.isFinite(f) ? f : 1));
}

/**
 * Part-load power fraction: a + b·PLR + c·PLR² (= 1 at full load). Example: PLR 0.5 → 0.17 + 0.16 + 0.1275 = 0.4575,
 * so half load takes 46% of full-load kW (better kW/ton at part load).
 */
export function partLoadPowerFrac(plr: number, h: typeof HYD = HYD): number {
  const x = Math.min(1, Math.max(0, Number.isFinite(plr) ? plr : 0));
  const [a, b, c] = h.plr;
  return a + b * x + c * x * x;
}

/** kW per ton of cooling: kW ÷ (kWt / 3.517). Example: 250 kW making 1,400 kWt → 0.628 kW/ton. */
export function kwPerTon(kw: number, kwt: number): number {
  return kwt > 0 ? kw / (kwt / 3.517) : 0;
}

/**
 * Share of a stratified tank's discharge rate still available at charge `soc`:
 * 1 above the thermocline fraction, falling linearly to 0 as the warm layer reaches the outlet.
 * Example: soc 0.05 with thermocline 0.1 → 0.5.
 */
export function tesDeliverable(soc: number, h: typeof HYD = HYD): number {
  const s = Number.isFinite(soc) ? Math.max(0, soc) : 0;
  return s >= h.thermoclineFrac ? 1 : s / h.thermoclineFrac;
}

// ---------------------------------------------------------------------------
// Thermal v2, efficiency (engine v2, Phase 4c part 3): economizer modes, psychrometrics, live PUE.
// Simplified teaching values (see REVIEW-QUEUE). Psychrometric values are marked Verify in the app.
// ---------------------------------------------------------------------------

export const EFF = {
  /** Sea-level atmospheric pressure (kPa). */
  atmKpa: 101.325,
  /**
   * Water-side economizer (towers + plate HX) changes mode on wet bulb with a deadband and a minimum
   * time in a mode, so it doesn't cycle on a day that hovers at a threshold.
   *   full when the tower + HX can make CHW setpoint: wb ≤ 18 − 4 − 1.5 = 12.5 °C;
   *   partial while they can still pre-cool the return: wb ≤ 26 − 4 − 1.5 = 20.5 °C.
   */
  econFullWbC: 12.5,
  econPartialWbC: 20.5,
  econDeadbandK: 1,
  econMinDwellS: 900,
  /** Condenser water pump at design (kPa head; flow is HYD.cwPumpKgS) and tower fan at full speed (kW). */
  cwPumpHeadKpa: 200,
  towerFanKw: 15,
  /** Transformer losses: no-load (core) and full-load (winding) as a share of the rating. */
  txNoLoadFrac: 0.003,
  txLoadLossFrac: 0.01,
} as const;

/**
 * Saturation vapor pressure over water, kPa (Magnus form): 0.61094 × e^(17.625·T / (T + 243.04)).
 * Example: 20 °C → 0.61094 × e^1.34009 = 2.333 kPa (steam tables: 2.339). Verify: approximation, within ~0.4% from 0 to 50 °C.
 */
export function saturationKpa(tC: number): number {
  return 0.61094 * Math.exp((17.625 * tC) / (tC + 243.04));
}

/**
 * Humidity ratio (kg water per kg dry air) from dry bulb and RH: W = 0.622 × pv / (P − pv), pv = RH × psat.
 * Example: 24 °C, 50% → psat 2.978, pv 1.489 kPa → W = 0.622 × 1.489 / 99.836 = 0.00928. Verify.
 */
export function humidityRatio(dryBulbC: number, rhPct: number, pKpa: number = EFF.atmKpa): number {
  const pv = (Math.min(100, Math.max(0, rhPct)) / 100) * saturationKpa(dryBulbC);
  return (0.622 * pv) / (pKpa - pv);
}

/**
 * Moist-air enthalpy, kJ per kg dry air: h = 1.006·T + W × (2501 + 1.86·T).
 * Example: 24 °C, W 0.00928 → 24.14 + 0.00928 × 2545.6 = 47.76 kJ/kg. Verify.
 */
export function enthalpyKjKg(dryBulbC: number, w: number): number {
  return AIR.cpKj * dryBulbC + w * (2501 + 1.86 * dryBulbC);
}

export type EconMode = 'off' | 'partial' | 'full';

/**
 * Next economizer mode from wet bulb, with deadband and minimum dwell.
 * Moves one step at a time (off ↔ partial ↔ full), only after `sinceS` ≥ the dwell:
 *   into a cooler mode when wb is the deadband below its threshold, back out when wb is the deadband above.
 * Example: in 'partial', wb 11.4 °C (< 12.5 − 1), 20 min in mode → 'full'; wb 12.0 → stays 'partial'.
 */
export function econModeNext(prev: EconMode, wbC: number, sinceS: number, e: typeof EFF = EFF): EconMode {
  if (sinceS < e.econMinDwellS || !Number.isFinite(wbC)) return prev;
  const d = e.econDeadbandK;
  if (prev === 'off') return wbC < e.econPartialWbC - d ? 'partial' : 'off';
  if (prev === 'partial') {
    if (wbC < e.econFullWbC - d) return 'full';
    if (wbC > e.econPartialWbC + d) return 'off';
    return 'partial';
  }
  return wbC > e.econFullWbC + d ? 'partial' : 'full';
}

/** Mode with no history (start-up): straight from the thresholds, no deadband. */
export function econModeFor(wbC: number, e: typeof EFF = EFF): EconMode {
  return wbC <= e.econFullWbC ? 'full' : wbC <= e.econPartialWbC ? 'partial' : 'off';
}

/**
 * Share of the load the economizer carries in a mode: full → 1; off → 0; partial → how far the tower +
 * HX water is below CHW return: (return − achievable) / ΔT, using economizerFraction, clamped 0–1.
 */
export function econShare(mode: EconMode, wbC: number): number {
  if (mode === 'off') return 0;
  if (mode === 'full') return 1;
  return Math.min(1, Math.max(0, economizerFraction(wbC)));
}

/**
 * UPS losses: input − output = output × (1/η − 1). Example: 1,000 kW at 96% → 41.7 kW.
 */
export function upsLossKw(outputKw: number, efficiency: number): number {
  return efficiency > 0 && outputKw > 0 ? outputKw * (1 / efficiency - 1) : 0;
}

/**
 * Transformer losses: no-load + load loss × loading². Example: 3,500 kVA at 60% →
 * 3,500 × (0.003 + 0.01 × 0.36) = 23.1 kW. A de-energized transformer loses nothing.
 */
export function transformerLossKw(ratingKva: number, loading: number, energized = true, e: typeof EFF = EFF): number {
  if (!energized || !(ratingKva > 0)) return 0;
  const l = Math.max(0, Number.isFinite(loading) ? loading : 0);
  return ratingKva * (e.txNoLoadFrac + e.txLoadLossFrac * l * l);
}

// ---------------------------------------------------------------------------
// Alarm system (engine v2, Phase 4d): example setpoints and alarm-management numbers.
// ---------------------------------------------------------------------------

export const ALARM = {
  upsLowSocPct: 25,
  fuelLowPct: 25,
  /** CHW supply alarm: this far above setpoint (K). */
  chwHighK: 2,
  chwFlowLowPct: 90,
  tesLowPct: 20,
  /** Condenser leaving water alarm (°C): 3 K below the 40 °C head pressure trip. */
  condHighC: 37,
  upsRoomHighC: 30,
  /** Chattering: this many activations of one alarm inside the window (s). */
  chatterCount: 3,
  chatterWindowS: 60,
  /** Flood: more than this many new alarms inside the window (a common benchmark is 10 per 10 min per operator). */
  floodCount: 10,
  floodWindowS: 600,
  /** Shelving is always time-limited (s). */
  maxShelveS: 8 * 3600,
} as const;
