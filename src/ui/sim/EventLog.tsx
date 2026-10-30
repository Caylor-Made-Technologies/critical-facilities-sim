import { formatT, type Simulation } from '../../sim';

/** Most-recent-first event log. A polite live region announces new alarms. */
export function EventLog({ sim }: { sim: Simulation }) {
  const events = sim.events.slice(-150).reverse();
  const latestAlarm = events.find((e) => e.severity === 'critical' || e.severity === 'alarm');
  return (
    <section className="card" aria-labelledby="log-h">
      <h2 id="log-h" className="h-card">Event log</h2>
      <div className="visually-hidden" aria-live="polite">
        {latestAlarm ? `${formatT(latestAlarm.t)} ${latestAlarm.message}` : ''}
      </div>
      {events.length === 0 ? (
        <p className="sub" style={{ color: 'var(--text-muted)' }}>
          All quiet. Fail something or start a walkthrough to see events here.
        </p>
      ) : (
        <ol className="log">
          {events.map((e, i) => (
            <li key={`${e.t}-${i}-${e.message}`}>
              <time>{formatT(e.t)}</time>
              <span className={`sev-${e.severity}`}>{e.message}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
