/** Equipment tab: searchable guide to every component family. */
import { useEffect, useMemo, useState } from 'react';
import { EQUIPMENT } from '../../content/equipment';
import { Icon } from '../icons';

interface Props {
  /** Guide to open (set when coming from a component card). */
  openId: string | null;
  onShowInSim: (kind: string) => void;
}

export function EquipmentTab({ openId, onShowInSim }: Props) {
  const [q, setQ] = useState('');
  const [current, setCurrent] = useState(openId ?? EQUIPMENT[0]!.id);
  useEffect(() => {
    if (openId) setCurrent(openId);
  }, [openId]);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return EQUIPMENT;
    return EQUIPMENT.filter((g) =>
      [g.title, g.summary, ...g.kinds, ...g.howItWorks, ...g.rounds, ...g.neverDo, ...g.troubleshooting.map((t) => t.symptom)]
        .join(' ')
        .toLowerCase()
        .includes(needle),
    );
  }, [q]);
  const guide = EQUIPMENT.find((g) => g.id === current) ?? EQUIPMENT[0]!;
  const groups = ['Electrical', 'Mechanical', 'Life safety'] as const;

  return (
    <div className="tab-panel">
      <div className="page-head">
        <div className="eyebrow">Equipment guide</div>
        <h1>Every component, in the field</h1>
        <p>
          What it does, what to check on rounds, preventive maintenance, troubleshooting, and the things you must never
          do. Intervals are typical starting points. Your manufacturer manuals and site program come first.
        </p>
      </div>
      <div className="content-layout">
        <div>
          <label className="visually-hidden" htmlFor="eq-search">
            Search equipment
          </label>
          <div style={{ position: 'relative', marginBottom: 8 }}>
            <input id="eq-search" type="search" placeholder="Search: e.g. head pressure" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <nav className="toc" aria-label="Equipment">
            {groups.map((grp) => {
              const items = list.filter((g) => g.group === grp);
              if (!items.length) return null;
              return (
                <div key={grp} style={{ display: 'contents' }}>
                  <div className="toc-group">{grp}</div>
                  {items.map((g) => (
                    <button key={g.id} type="button" aria-current={g.id === current} onClick={() => setCurrent(g.id)}>
                      {g.title}
                    </button>
                  ))}
                </div>
              );
            })}
            {!list.length && <p style={{ color: 'var(--text-muted)', padding: 12 }}>No matches.</p>}
          </nav>
        </div>

        <article className="card article" key={guide.id} aria-labelledby="eq-h">
          <div className="eyebrow">{guide.group}</div>
          <h2 id="eq-h">{guide.title}</h2>
          <p>{guide.summary}</p>
          <div className="card-actions" style={{ marginTop: 0 }}>
            <button className="btn" type="button" onClick={() => onShowInSim(guide.kinds[0]!)}>
              <Icon name="bolt" /> Find it in the simulator
            </button>
          </div>

          <section>
            <h3>
              <span className="dot" aria-hidden="true" />
              How it works
            </h3>
            {guide.howItWorks.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </section>

          <section>
            <h3>
              <span className="dot" aria-hidden="true" />
              On your rounds
            </h3>
            <ul>
              {guide.rounds.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </section>

          <section>
            <h3>
              <span className="dot" aria-hidden="true" />
              Preventive maintenance
            </h3>
            <div className="table-wrap" tabIndex={0} role="region" aria-label="Table (scrolls sideways)">
              <table className="t">
                <thead>
                  <tr>
                    <th scope="col">Interval (typical)</th>
                    <th scope="col">Task</th>
                  </tr>
                </thead>
                <tbody>
                  {guide.pm.map((p) => (
                    <tr key={p.task}>
                      <th scope="row">{p.interval}</th>
                      <td>{p.task}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h3>
              <span className="dot" aria-hidden="true" />
              Diagnose & troubleshoot
            </h3>
            {guide.troubleshooting.map((t) => (
              <details className="acc" key={t.symptom}>
                <summary>{t.symptom}</summary>
                <div>
                  <strong>Likely causes</strong>
                  <ul>
                    {t.causes.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                  <strong>What to check, in order</strong>
                  <ol>
                    {t.checks.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ol>
                </div>
              </details>
            ))}
          </section>

          <section>
            <div className="callout callout-danger">
              <strong>Never do this</strong>
              <ul style={{ marginTop: 6, marginBottom: 0 }}>
                {guide.neverDo.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </div>
            <div className="callout callout-warn">
              <strong>Hazards</strong>
              <ul style={{ marginTop: 6, marginBottom: 0 }}>
                {guide.hazards.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </div>
            <div className="callout">
              <strong>Needs a change record (MOC) when…</strong>
              <ul style={{ marginTop: 6, marginBottom: 0 }}>
                {guide.changeTriggers.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </div>
          </section>
        </article>
      </div>
    </div>
  );
}
