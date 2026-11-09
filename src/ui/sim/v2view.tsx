/**
 * Graphics v2 (Phase 5): what the live diagrams read from engine v2, in one place.
 * Pure mapping + one small SVG badge. Imports engine types only, so it adds no engine code to the main chunk.
 */
import type { AlarmPriority, AlarmSummary } from '../../sim/v2/alarms';

export interface EquipAlarm {
  /** Highest priority of the equipment's annunciated alarms. */
  priority: AlarmPriority;
  /** Any of them not acknowledged yet (new, or cleared but not acknowledged). */
  unacked: boolean;
  /** How many alarms the equipment has showing. */
  count: number;
  /** Text of the highest-priority one (for labels). */
  text: string;
}

export type AlarmMap = ReadonlyMap<string, EquipAlarm>;

const RANK: Record<AlarmPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 };
export const PRIORITY_LABEL: Record<AlarmPriority, string> = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' };

/**
 * Annunciated alarms grouped by plant component. An alarm without an equipment link maps to its source
 * when the source is a component id (e.g. TES-01). Shelved and suppressed alarms are not in the list, so
 * they never draw on the graphics (same as the alarm list).
 */
export function alarmsByEquipment(s: AlarmSummary | null | undefined, has: (id: string) => boolean): AlarmMap {
  const m = new Map<string, EquipAlarm>();
  if (!s) return m;
  for (const a of s.list) {
    const id = a.equipment ?? (has(a.source) ? a.source : undefined);
    if (!id) continue;
    const unacked = a.state === 'unack' || a.state === 'rtn-unack';
    const cur = m.get(id);
    if (!cur) m.set(id, { priority: a.priority, unacked, count: 1, text: a.text });
    else {
      const better = RANK[a.priority] < RANK[cur.priority];
      m.set(id, { priority: better ? a.priority : cur.priority, unacked: cur.unacked || unacked, count: cur.count + 1, text: better ? a.text : cur.text });
    }
  }
  return m;
}

/** Class names for a diagram symbol with an alarm (empty string when none). */
export function alarmClass(a: EquipAlarm | undefined): string {
  return a ? `alm alm-${a.priority}${a.unacked ? ' alm-unack' : ''}` : '';
}

/** Words added to a symbol's accessible name. */
export function alarmWords(a: EquipAlarm | undefined): string {
  if (!a) return '';
  return ` In alarm: ${PRIORITY_LABEL[a.priority]}, ${a.text}${a.count > 1 ? ` (+${a.count - 1} more)` : ''}${a.unacked ? ', not acknowledged' : ''}.`;
}

/** Small priority badge drawn at a symbol's top-right corner (decorative; the label carries the words). */
export function AlarmBadge({ a, x, y }: { a: EquipAlarm | undefined; x: number; y: number }) {
  if (!a) return null;
  const glyph = a.priority === 'critical' ? '!!' : a.priority === 'high' ? '!' : a.priority === 'medium' ? '▲' : 'i';
  return (
    <g className={`alm-badge alm-${a.priority}${a.unacked ? ' alm-unack' : ''}`} transform={`translate(${x},${y})`} aria-hidden="true">
      <circle r={9} />
      <text y={3.5} textAnchor="middle">
        {glyph}
      </text>
    </g>
  );
}
