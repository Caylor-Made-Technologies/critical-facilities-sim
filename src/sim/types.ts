/**
 * Core types for the simulation model.
 *
 * The plant is a directed graph: nodes are pieces of equipment, edges are
 * connections (power cables, pipes, ducts). Edges point "downstream" — the
 * direction energy normally flows (utility → rack, chiller → CRAH).
 *
 * Internal units: kW (electrical), kWt (thermal), °C, seconds, litres.
 * The UI converts to °F / tons / gallons for display.
 */

/** Operating status every component reports. */
export type Status = 'online' | 'standby' | 'offline' | 'failed' | 'maintenance';

export type Domain = 'electrical' | 'mechanical' | 'life-safety';

/** Redundancy side. 'A'/'B' for 2N designs, 'C' for the third system in DR/catcher designs. */
export type Side = 'A' | 'B' | 'C' | 'D' | 'CATCHER' | 'COMMON';

export type ElectricalKind =
  | 'utility'
  | 'mv-switchgear'
  | 'transformer'
  | 'generator'
  | 'paralleling-bus'
  | 'ats'
  | 'breaker'
  | 'bus'
  | 'ups'
  | 'bess'
  | 'sts'
  | 'pdu'
  | 'rpp'
  | 'busway'
  | 'rack';

export type MechanicalKind =
  | 'chiller-water-cooled'
  | 'chiller-air-cooled'
  | 'cooling-tower'
  | 'dry-cooler'
  | 'pump-chw'
  | 'pump-cw'
  | 'tes-tank'
  | 'crah'
  | 'crac'
  | 'cdu'
  | 'doas';

export type LifeSafetyKind = 'fire-alarm' | 'preaction' | 'clean-agent' | 'epo';

export type ComponentKind = ElectricalKind | MechanicalKind | LifeSafetyKind;

/** Plain-English explainer shown on the component card. */
export interface Explainer {
  what: string;
  fails: string;
  watch: string;
}

/** Kind-specific mutable state. Only the fields relevant to a kind are used. */
export interface ComponentState {
  /** Breakers: contact position. */
  closed?: boolean;
  /** ATS / STS: which input port is currently selected. */
  selected?: string | null;
  /** Generators: engine state machine. */
  genState?: 'off' | 'cranking' | 'running';
  /** Seconds remaining until a cranking generator is ready to accept load. */
  genTimer?: number;
  /** Generators: started by an operator for a test run (not by an ATS). */
  manualRun?: boolean;
  /** Generators: fuel left in the day tank (litres). */
  fuelL?: number;
  /** UPS: operator-selected mode. 'auto' lets the UPS choose normal / battery / static bypass. */
  upsMode?: 'auto' | 'static-bypass' | 'off';
  /** UPS / BESS: battery state of charge, 0..1. */
  soc?: number;
  /** BESS: usable energy capacity (kWh). */
  capacityKwh?: number;
  /** IT racks and mechanical loads: demand in kW (changes as equipment runs, throttles or trips). */
  demandKw?: number;
  /** IT racks: design load in kW, independent of throttling or thermal trips. */
  baseKw?: number;
  /** IT racks: shut down by their own thermal protection (still energized). */
  thermalTrip?: boolean;
}

export interface Component {
  id: string;
  /** Generic tag shown to users, e.g. `UPS-A1`. Never a real site tag. */
  tag: string;
  name: string;
  kind: ComponentKind;
  domain: Domain;
  side: Side;
  status: Status;
  /** Rated capacity. kW for electrical gear, kWt for cooling gear. */
  ratedKw: number;
  /** For racks: high-density AI/GPU rack (liquid cooled). */
  highDensity?: boolean;
  state: ComponentState;
  explainer: Explainer;
}

export type EdgeKind = 'power' | 'chw' | 'cw' | 'tcs' | 'air';

export interface Edge {
  id: string;
  from: string;
  to: string;
  kind: EdgeKind;
  /**
   * Which input of the downstream node this edge lands on.
   * ATS: 'normal' | 'emergency'. STS: 'preferred' | 'alternate'.
   * UPS: 'input' | 'bypass'. Racks: 'A' | 'B' (cord).
   */
  port?: string;
}

export type Severity = 'info' | 'warning' | 'alarm' | 'critical';

export interface SimEvent {
  /** Simulation time in seconds when the event happened. */
  t: number;
  severity: Severity;
  source: string;
  message: string;
}

/** Result of an operator action such as closing a breaker. */
export type ActionResult = { ok: true; message?: string } | { ok: false; reason: string };
