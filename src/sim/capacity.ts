/**
 * capacity.ts — redundancy and capacity math.
 *
 * Answers the question operators ask before every switching step:
 * "If I lose (or remove) this unit, does what's left still carry the load?"
 */

export type RedundancyLabel = 'N-short' | 'N' | 'N+1' | 'N+2' | 'N+3+';

export interface GroupCapacity {
  /** Label for the group, e.g. "UPS-A modules". */
  name: string;
  unitKw: number;
  unitsTotal: number;
  /** Units available to carry load (online or standby, not failed/maintenance). */
  unitsAvailable: number;
  loadKw: number;
  /** Minimum units needed to carry the load: ⌈load ÷ unit rating⌉. */
  unitsRequired: number;
  /** Spare units beyond N. Negative means overloaded. */
  spare: number;
  label: RedundancyLabel;
  availableKw: number;
  /** Load as a fraction of available capacity. */
  utilization: number;
  holds: boolean;
}

export function unitsRequired(loadKw: number, unitKw: number): number {
  if (loadKw <= 0) return 0;
  return Math.ceil(loadKw / unitKw - 1e-9);
}

export function redundancyLabel(spare: number): RedundancyLabel {
  if (spare < 0) return 'N-short';
  if (spare === 0) return 'N';
  if (spare === 1) return 'N+1';
  if (spare === 2) return 'N+2';
  return 'N+3+';
}

export function groupCapacity(name: string, unitKw: number, unitsTotal: number, unitsAvailable: number, loadKw: number): GroupCapacity {
  const req = unitsRequired(loadKw, unitKw);
  const spare = unitsAvailable - req;
  const availableKw = unitsAvailable * unitKw;
  return {
    name,
    unitKw,
    unitsTotal,
    unitsAvailable,
    loadKw,
    unitsRequired: req,
    spare,
    label: redundancyLabel(spare),
    availableKw,
    utilization: availableKw > 0 ? loadKw / availableKw : Infinity,
    holds: spare >= 0,
  };
}

const kw = (n: number) => `${Math.round(n).toLocaleString('en-US')} kW`;

/**
 * Plain-English capacity statement, e.g.
 * "4 × 750 kW UPS modules, 2,100 kW load → N+1 holds (70% of available)".
 */
export function describeCapacity(c: GroupCapacity, unitNoun = 'units'): string {
  const head = `${c.unitsAvailable} × ${kw(c.unitKw)} ${unitNoun}, ${kw(c.loadKw)} load`;
  if (!c.holds) {
    const short = c.loadKw - c.availableKw;
    return `${head} → OVERLOAD: ${kw(short)} short (${Math.round(c.utilization * 100)}% of available)`;
  }
  return `${head} → ${c.label} holds (${Math.round(c.utilization * 100)}% of available)`;
}

/**
 * What happens if `lose` more units drop out? Used for "lose 2 modules →
 * overload" style what-ifs in the UI.
 */
export function whatIfLose(c: GroupCapacity, lose: number): GroupCapacity {
  return groupCapacity(c.name, c.unitKw, c.unitsTotal, Math.max(0, c.unitsAvailable - lose), c.loadKw);
}

/**
 * For 2N-style systems: can one side carry the whole load if the other side
 * is lost? Each side is checked against the *total* load.
 */
export function sideCanCarryAll(sideKw: number, totalLoadKw: number): boolean {
  return sideKw >= totalLoadKw;
}
