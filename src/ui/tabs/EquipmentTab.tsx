/** Equipment tab: searchable guide to every component family. */
import { useEffect, useMemo, useState } from 'react';
import { EQUIPMENT, type EquipmentGuide } from '../../content/equipment';
import { NeverList, PageHead, SectionTabs } from '../common';
import { Figure } from '../figures';
import { Icon } from '../icons';

interface Props {
  /** Guide to open (set when coming from a component card). */
  openId: string | null;
  onShowInSim: (kind: string) => void;
  onRead: (id: string) => void;
}

type Group = EquipmentGuide['group'];
const GROUPS: { id: Group; label: string }[] = [
  { id: 'Electrical', label: 'Electrical' },
  { id: 'Mechanical', label: 'Mechanical' },
  { id: 'Life safety', label: 'Life safety' },
];

export function EquipmentTab({ openId, onShowInSim, onRead }: Props) {
  const [q, setQ] = useState('');
  const [current, setCurrent] = useState(openId ?? EQUIPMENT[0]!.id);
  const [group, setGroup] = useState<Group>(EQUIPMENT.find((g) => g.id === (openId ?? ''))?.group ?? 'Electrical');
  useEffect(() => {
    if (!openId) return;
    setCurrent(openId);
    const g = EQUIPMENT.find((x) => x.id === openId);
    if (g) setGroup(g.group);
  }, [openId]);
  useEffect(() => onRead(current), [current, onRead]);

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
  const pickGroup = (g: Group) => {
    setGroup(g);
    setCurrent(EQUIPMENT.find((x) => x.group === g)!.id);
  };

  return (
    <div className="tab-panel">
      <PageHead eyebrow="Equipment guide" title="Every component, in the field">
        What it does, what to check on rounds, preventive maintenance, troubleshooting, and the things you must never do.
        Intervals are typical starting points. Your manufacturer manuals and site program come first.
      </PageHead>
      <SectionTabs label="Equipment sections" sections={GROUPS} value={group} onChange={pickGroup} />
      <div className="content-layout">
        <div className="toc-col">
          <label className="visually-hidden" htmlFor="eq-search">
            Search equipment
          </label>
          <div style={{ position: 'relative', marginBottom: 8 }}>
            <input id="eq-search" type="search" placeholder="Search: e.g. head pressure" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <nav className="toc" aria-label={`${group} equipment`}>
            {(q.trim() ? list : list.filter((g) => g.group === group)).map((g) => (
              <button
                key={g.id}
                type="button"
                aria-current={g.id === current}
                onClick={() => {
                  setCurrent(g.id);
                  setGroup(g.group);
                }}
              >
                {g.title}
              </button>
            ))}
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
            {guide.id === 'chiller' && <Figure id="refrigeration" />}
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
            <div className="never-box">
              <h3 className="never-title">
                <span aria-hidden="true">!!</span> NEVER do this <span aria-hidden="true">!!</span>
              </h3>
              <NeverList rules={guide.neverDo} compact />
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
