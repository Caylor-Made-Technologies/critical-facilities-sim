/**
 * Plant actions as plain data, and how each one is done on the plant (v1 `Simulation`).
 *
 * Engine v2 logs, queues and replays these (`EngineV2.apply`); the UI sends every operator action as one
 * of these (Phase 4d), so v1 and v2 share a single dispatch. Actions that only exist in v2 models
 * (scenario switches, chiller reset) return null here and are handled by `EngineV2`.
 */
import type { Simulation } from './engine';
import type { BatteryAge, ContainmentMode, PqKind } from './physics';
import type { WeatherId } from './thermal';
import type { ActionResult } from './types';

export type Action =
  | { a: 'open' | 'close' | 'fail' | 'restore' | 'maint'; id: string }
  | { a: 'upsMode'; system: string; mode: 'static-bypass' | 'auto' }
  | { a: 'removeKey'; lock: string }
  | { a: 'insertKey'; key: string; lock: string }
  | { a: 'genTest'; id: string; on: boolean }
  | { a: 'epo' }
  | { a: 'weather'; w: WeatherId }
  | { a: 'batteryAge'; age: BatteryAge }
  /** Scenario switches (Phase 4b part 2). */
  | { a: 'blockHeater'; id: string; on: boolean }
  | { a: 'failToStart'; p: number }
  | { a: 'eco'; system: string; on: boolean }
  /** Air-side scenario switches (Phase 4c part 1). */
  | { a: 'containment'; mode: ContainmentMode }
  | { a: 'blanking'; missing: number }
  | { a: 'tiles'; ratio: number }
  /** Reset a chiller after a v2 protection trip (Phase 4c part 2). */
  | { a: 'chillerReset'; id: string }
  /** Alarm handling (Phase 4d): acknowledge, shelve for a time, unshelve, acknowledge all. */
  | { a: 'ack'; alarm: string }
  | { a: 'ackAll' }
  | { a: 'shelve'; alarm: string; s: number }
  | { a: 'unshelve'; alarm: string }
  /** Utility power quality event (Phase 8a): pct = remaining/peak voltage % (sag/swell) or imbalance %; s = duration. */
  | { a: 'utilityEvent'; id: string; kind: PqKind; pct: number; s: number }
  /** Let time pass in one go (used by "skip ahead" and by replays of it). */
  | { a: 'skip'; s: number };

/** Do an action on the v1 plant. Returns null for actions that need engine v2 (except 'skip', handled here). */
export function applyToSim(s: Simulation, x: Action): ActionResult | null {
  switch (x.a) {
    case 'open':
      return s.openBreaker(x.id);
    case 'close':
      return s.closeBreaker(x.id);
    case 'fail':
      return s.fail(x.id);
    case 'restore':
      return s.restore(x.id);
    case 'maint':
      return s.setMaintenance(x.id);
    case 'upsMode':
      return s.setUpsSystemMode(x.system, x.mode);
    case 'removeKey':
      return s.removeKey(x.lock);
    case 'insertKey':
      return s.insertKey(x.key, x.lock);
    case 'genTest':
      return s.testGenerator(x.id, x.on);
    case 'epo':
      return s.emergencyPowerOff();
    case 'weather':
      return s.setWeather(x.w);
    case 'batteryAge':
      return s.setBatteryAge(x.age);
    case 'skip':
      if (!(Number.isFinite(x.s) && x.s > 0)) return { ok: false, reason: 'Skip needs a positive time.' };
      s.advance(x.s);
      return { ok: true };
    default:
      return null;
  }
}
