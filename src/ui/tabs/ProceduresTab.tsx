/** Procedures tab: MOP practice and emergency drills, each scored. */
import { useState } from 'react';
import { DRILLS, MOPS } from '../../content/procedures';
import { grade, SCORE, TOPOLOGIES, WEATHER, type Procedure } from '../../sim';
import { PageHead, SectionTabs } from '../common';
import { Icon } from '../icons';

type Section = 'mop' | 'drill';
const SECTIONS: { id: Section; label: string }[] = [
  { id: 'mop', label: 'MOP practice' },
  { id: 'drill', label: 'Emergency drills' },
];

interface Props {
  best: Record<string, number>;
  start: (p: Procedure) => void;
}

export function ProceduresTab({ best, start }: Props) {
  const [section, setSection] = useState<Section>('mop');
  const list = section === 'mop' ? MOPS : DRILLS;
  const counts = {
    mop: `${MOPS.filter((p) => p.id in best).length}/${MOPS.length}`,
    drill: `${DRILLS.filter((p) => p.id in best).length}/${DRILLS.length}`,
  };
  return (
    <div className="tab-panel">
      <PageHead eyebrow="Procedures" title="Practice the real thing, safely">
        Run a method of procedure (MOP) step by step on the live plant, or handle an emergency drill. The simulator checks
        every move and scores you. Break things here so you never break them at work.
      </PageHead>

      <div className="callout">
        <strong>How scoring works: </strong>
        start at 100. A blocked action costs {SCORE.blocked}, a hint {SCORE.hint}, a wrong call {SCORE.wrongChoice}, and dropping
        load costs {SCORE.dropped}. These are generic training sequences, not your site's procedures.
      </div>

      <SectionTabs label="Procedure types" sections={SECTIONS} value={section} onChange={setSection} counts={counts} />
      <div className="lesson-list" key={section}>
        {list.map((p) => {
          const b = best[p.id];
          return (
            <button key={p.id} type="button" className={`card lesson-card proc-tile${b !== undefined ? ' done' : ''}`} onClick={() => start(p)}>
              <div className="eyebrow">
                {p.kind === 'mop' ? 'MOP' : 'Drill'}
                {b !== undefined && (
                  <span className="done-tag">
                    {' '}
                    · <Icon name="star" /> Best {b} ({grade(b).letter})
                  </span>
                )}
              </div>
              <h2 className="h-card">{p.title}</h2>
              <p style={{ color: 'var(--text-muted)', margin: 0 }}>{p.summary}</p>
              <div className="meta">
                <span className={`chip ${p.level === 'Beginner' ? 'chip-ok' : p.level === 'Advanced' ? 'chip-warn' : 'chip-info'}`}>{p.level}</span>
                <span className="chip">{p.steps.length} steps</span>
                <span className="chip">{TOPOLOGIES[p.topology].label}</span>
                {p.weather && <span className="chip">{WEATHER[p.weather].label}</span>}
              </div>
              <span className="tile-go" aria-hidden="true">
                {b !== undefined ? 'Run again' : 'Start'} <Icon name="arrow-right" />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
