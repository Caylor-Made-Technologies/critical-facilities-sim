/**
 * Alarm list for engine v2 (Phase 4d): priority, state, first-out, chattering and flood flags,
 * acknowledge and time-limited shelving, and the fault library's "what to check" for each alarm.
 * Loaded only when ?engine=v2 is on. Every button sends an action through EngineV2.apply.
 */
import { FAULTS } from '../../content/faults';
import type { ActionResult } from '../../sim';
import type { Action } from '../../sim/actions';
import type { EngineV2 } from '../../sim/v2/engine';

const PRI_LABEL = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' } as const;
const PRI_CHIP = { critical: 'chip-alarm', high: 'chip-alarm', medium: 'chip-warn', low: 'chip-info' } as const;
const STATE_LABEL = { unack: 'New (not acknowledged)', ack: 'Acknowledged', 'rtn-unack': 'Cleared, not acknowledged' } as const;
const SHELVE_S = 1800;

const ago = (s: number) => (s < 60 ? `${Math.round(s)} s` : s < 3600 ? `${Math.floor(s / 60)} min` : `${(s / 3600).toFixed(1)} h`);

export default function AlarmPanel({ engine, apply }: { engine: EngineV2; apply: (a: Action) => ActionResult }) {
  const s = engine.alarmSummary;
  const t = engine.t;
  return (
    <section className="alarm-panel" aria-labelledby="alarm-h">
      <div className="alarm-head">
        <h3 id="alarm-h" tabIndex={-1}>
          Alarms <span className="muted">({s.list.length} showing, {s.unacked} new)</span>
        </h3>
        <button className="btn" type="button" disabled={s.unacked === 0} onClick={() => apply({ a: 'ackAll' })}>
          Acknowledge all
        </button>
      </div>
      {s.flood && (
        <p className="alarm-flood" role="status">
          Alarm flood: {s.rate10min} new alarms in 10 minutes. Work the first-out and critical alarms first.
        </p>
      )}
      {s.list.length === 0 ? (
        <p className="muted">No alarms. A healthy plant has none standing.</p>
      ) : (
        <ul className="alarm-list">
          {s.list.map((a) => {
            const f = a.fault ? FAULTS.find((x) => x.id === a.fault) : undefined;
            return (
              <li key={a.id} className={`alarm-row is-${a.state}`}>
                <div className="alarm-line">
                  <span className={`chip ${PRI_CHIP[a.priority]}`}>{PRI_LABEL[a.priority]}</span>
                  {a.firstOut && <span className="chip chip-info">First out</span>}
                  {a.chattering && <span className="chip chip-warn">Chattering</span>}
                  <strong>{a.source}</strong> {a.text}
                  {a.value && <span className="muted"> · {a.value}</span>}
                </div>
                <div className="alarm-meta muted">
                  {STATE_LABEL[a.state]} · {ago(t - a.since)} ago
                </div>
                <div className="alarm-actions">
                  {a.state !== 'ack' && (
                    <button className="btn" type="button" onClick={() => apply({ a: 'ack', alarm: a.id })} aria-label={`Acknowledge ${a.source} ${a.text}`}>
                      Acknowledge
                    </button>
                  )}
                  <button className="btn" type="button" onClick={() => apply({ a: 'shelve', alarm: a.id, s: SHELVE_S })} aria-label={`Shelve ${a.source} ${a.text} for 30 minutes`}>
                    Shelve 30 min
                  </button>
                </div>
                {f && (
                  <details className="alarm-fault">
                    <summary>What to check: {f.title}</summary>
                    <p>{f.trend}</p>
                    <ol>
                      {f.response.map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ol>
                  </details>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {(s.shelved.length > 0 || s.suppressed.length > 0) && (
        <p className="muted">
          {s.shelved.length > 0 && <>Shelved (come back by themselves): {s.shelved.join(', ')}. </>}
          {s.suppressed.length > 0 && <>Suppressed (equipment out of service): {s.suppressed.join(', ')}.</>}
        </p>
      )}
      <p className="dock-note">Alarm handling follows the ideas in ISA-18.2 (priorities, delays, shelving, first-out), simplified for training. Your site&apos;s alarm philosophy comes first.</p>
    </section>
  );
}
