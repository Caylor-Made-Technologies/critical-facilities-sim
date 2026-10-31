import { useState } from 'react';
import { formatT, type Simulation } from '../../sim';

const SEV_LABEL = { info: 'Info', warning: 'Warning', alarm: 'Alarm', critical: 'Critical' } as const;

/** Most-recent-first event log with a severity filter. A polite live region announces new alarms. */
export function EventLog({ sim }: { sim: Simulation }) {
  const [alarmsOnly, setAlarmsOnly] = useState(false);
  const all = sim.events.slice(-200).reverse();
  const events = (alarmsOnly ? all.filter((e) => e.severity !== 'info') : all).slice(0, 150);
  const latestAlarm = all.find((e) => e.severity === 'critical' || e.severity === 'alarm');
  const alarmCount = all.filter((e) => e.severity === 'critical' || e.severity === 'alarm').length;
  return (
    <section className="card" aria-labelledby="log-h">
      <div className="log-head">
        <h2 id="log-h" className="h-card">
          Event log {alarmCount > 0 && <span className="log-count">{alarmCount}</span>}
        </h2>
        <div className="seg seg-sm" role="group" aria-label="Filter events">
          <button type="button" aria-pressed={!alarmsOnly} onClick={() => setAlarmsOnly(false)}>
            All
          </button>
          <button type="button" aria-pressed={alarmsOnly} onClick={() => setAlarmsOnly(true)}>
            Alarms
          </button>
        </div>
      </div>
      <div className="visually-hidden" aria-live="polite">
        {latestAlarm ? `${formatT(latestAlarm.t)} ${latestAlarm.message}` : ''}
      </div>
      {events.length === 0 ? (
        <p className="log-empty">
          <span className="ok-dot" aria-hidden="true" /> {alarmsOnly ? 'No alarms.' : 'All quiet. Fail something or start a walkthrough to see events here.'}
        </p>
      ) : (
        <ol className="log">
          {events.map((e, i) => (
            <li key={`${e.t}-${i}-${e.message}`} className={`sev-${e.severity}`}>
              <time>{formatT(e.t)}</time>
              <span className="sev-dot" aria-hidden="true" />
              <span className="log-msg">
                <span className="visually-hidden">{SEV_LABEL[e.severity]}: </span>
                {e.message}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
