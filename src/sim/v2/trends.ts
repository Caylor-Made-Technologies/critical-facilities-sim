/**
 * Trend recorder for engine v2 (Phase 5): a short history of the readings a site tech watches on a BMS
 * trend screen. One sample every TREND.sampleS of sim time, kept in a fixed ring (TREND.keep samples,
 * 1 h at 10 s). Plain data, deterministic (sampled on ticks, not frames). Not saved in snapshots: a copy
 * or a restored engine starts a fresh trend, like a BMS whose trend log was cleared.
 */
import { TREND } from '../physics';

export interface TrendSample {
  /** Sim time, s. */
  t: number;
  /** Rack inlet, °C. */
  inletC: number;
  /** Chilled water supply, °C. */
  chwsC: number;
  /** Condenser water, °C. */
  cwC: number;
  /** Live PUE (NaN with no IT load). */
  pue: number;
  /** TES state of charge, 0–1. */
  tesSoc: number;
  /** CRAH fan speed, 0–1. */
  fanSpeed: number;
  /** IT load, kW. */
  itKw: number;
}

export type TrendKey = Exclude<keyof TrendSample, 't'>;

export class TrendRecorder {
  private buf: TrendSample[] = [];
  private next = 0;

  /** Record if a sample is due at time t (the first call always records). */
  maybeRecord(t: number, read: () => Omit<TrendSample, 't'>): boolean {
    if (t + 1e-9 < this.next) return false;
    this.buf.push({ t, ...read() });
    if (this.buf.length > TREND.keep) this.buf.splice(0, this.buf.length - TREND.keep);
    this.next = (Math.floor(t / TREND.sampleS + 1e-9) + 1) * TREND.sampleS;
    return true;
  }

  /** Oldest first (read-only view). */
  get samples(): readonly TrendSample[] {
    return this.buf;
  }

  clear(): void {
    this.buf = [];
    this.next = 0;
  }
}
