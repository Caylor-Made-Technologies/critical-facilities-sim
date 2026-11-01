/** Case Studies: composite incidents with timeline, root cause (5 whys), fixes and discussion. */
import { useState } from 'react';
import { CASES, type CaseArea, type CaseStudy } from '../../content/cases';
import { PageHead, SectionTabs } from '../common';
import { Icon } from '../icons';

type Section = 'all' | CaseArea;
const SECTIONS: { id: Section; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'electrical', label: 'Electrical' },
  { id: 'mechanical', label: 'Mechanical' },
  { id: 'operations', label: 'Operations' },
];

function CaseView({ c, onBack, onPractice }: { c: CaseStudy; onBack: () => void; onPractice?: () => void }) {
  const [whyStep, setWhyStep] = useState(1);
  return (
    <article className="case-view section-body" aria-labelledby="case-h">
      <button className="btn btn-ghost" type="button" onClick={onBack}>
        <Icon name="arrow-left" /> All case studies
      </button>
      <div className="eyebrow" style={{ marginTop: 12 }}>
        Case study · {c.area}
      </div>
      <h2 id="case-h" className="case-title">
        {c.title}
      </h2>
      <p className="lede">{c.summary}</p>
      <dl className="case-facts">
        <div>
          <dt>Setting</dt>
          <dd>{c.setting}</dd>
        </div>
        <div>
          <dt>Impact</dt>
          <dd>{c.impact}</dd>
        </div>
      </dl>

      <section className="card">
        <h3 className="h-card">Timeline</h3>
        <ol className="timeline">
          {c.timeline.map((e) => (
            <li key={e.t + e.what}>
              <time>{e.t}</time>
              <span>{e.what}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="card">
        <h3 className="h-card">Ask "why?" five times</h3>
        <p className="round-help">Each answer becomes the next question. Reveal one at a time and guess the next answer first.</p>
        <ol className="whys">
          {c.whys.slice(0, whyStep).map((w, i) => (
            <li key={w} style={{ ['--i' as string]: i }}>
              {w}
            </li>
          ))}
        </ol>
        {whyStep < c.whys.length ? (
          <button className="btn" type="button" onClick={() => setWhyStep(whyStep + 1)}>
            <Icon name="help" /> Next "why?"
          </button>
        ) : (
          <p className="whys-root">
            <Icon name="target" /> Root cause reached: a process or system gap, not one person.
          </p>
        )}
      </section>

      <div className="case-cols">
        <section className="card">
          <h3 className="h-card">Contributing factors</h3>
          <ul className="factor-list">
            {c.factors.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </section>
        <section className="card">
          <h3 className="h-card">What changed afterwards</h3>
          <ul className="checklist">
            {c.fixes.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </section>
      </div>

      <section className="card">
        <h3 className="h-card">Discuss</h3>
        <p className="round-help">Answer for yourself first, then compare.</p>
        <div className="deeper">
          {c.questions.map((q) => (
            <details key={q.q} className="deeper-q">
              <summary>{q.q}</summary>
              <p>
                <strong>One good answer: </strong>
                {q.a}
              </p>
            </details>
          ))}
        </div>
      </section>

      {onPractice && (
        <button className="card next-up" type="button" onClick={onPractice}>
          <span className="next-icon" aria-hidden="true">
            <Icon name="bolt" />
          </span>
          <span>
            <span className="eyebrow">Practice the lesson</span>
            <strong>Run the related scenario on the live plant</strong>
          </span>
          <Icon name="arrow-right" />
        </button>
      )}
    </article>
  );
}

export function CasesTab({ onPractice }: { onPractice: (id: string) => void }) {
  const [section, setSection] = useState<Section>('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const open = CASES.find((c) => c.id === openId);
  return (
    <div className="tab-panel">
      <PageHead eyebrow="Case studies" title="Learn from what went wrong">
        Outages rarely come from one mistake. Walk through six incidents the way a good review does: what happened, why
        (five times), and what changed so it never happens again.
      </PageHead>
      {open ? (
        <CaseView
          c={open}
          onBack={() => setOpenId(null)}
          onPractice={open.practice ? () => onPractice(open.practice!) : undefined}
        />
      ) : (
        <>
          <div className="callout">
            <strong>Composite cases. </strong>
            These are fictional, built from failure patterns common across the industry. No real site, company or person.
          </div>
          <SectionTabs label="Case areas" sections={SECTIONS} value={section} onChange={setSection} />
          <div className="lesson-list section-body" key={section}>
            {CASES.filter((c) => section === 'all' || c.area === section).map((c) => (
              <button key={c.id} type="button" className="card lesson-card proc-tile" onClick={() => setOpenId(c.id)}>
                <div className="eyebrow">Case · {c.area}</div>
                <h2 className="h-card">{c.title}</h2>
                <p style={{ color: 'var(--text-muted)', margin: 0 }}>{c.summary}</p>
                <div className="meta">
                  <span className="chip">{c.timeline.length} events</span>
                  <span className="chip">5 whys</span>
                  <span className="chip">{c.questions.length} questions</span>
                </div>
                <span className="tile-go" aria-hidden="true">
                  Read the case <Icon name="arrow-right" />
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
