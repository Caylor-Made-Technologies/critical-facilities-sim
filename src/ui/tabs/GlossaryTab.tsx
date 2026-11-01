/** Glossary tab: searchable terms, by section. */
import { useMemo, useState } from 'react';
import { GLOSSARY, type GlossarySection } from '../../content/glossary';
import { PageHead, SectionTabs } from '../common';

type Filter = 'all' | GlossarySection;
const SECTIONS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'Electrical', label: 'Electrical' },
  { id: 'Mechanical', label: 'Mechanical' },
  { id: 'Operations & safety', label: 'Ops & safety' },
];

export function GlossaryTab({ initialQuery = '' }: { initialQuery?: string }) {
  const [q, setQ] = useState(initialQuery);
  const [section, setSection] = useState<Filter>('all');
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return GLOSSARY.filter((t) => (section === 'all' || t.section === section) && (!needle || `${t.term} ${t.def}`.toLowerCase().includes(needle))).sort((a, b) =>
      a.term.localeCompare(b.term),
    );
  }, [q, section]);

  return (
    <div className="tab-panel">
      <PageHead eyebrow="Glossary" title="Speak the language">
        {`${GLOSSARY.length} terms you'll hear on the floor, in plain English.`}
      </PageHead>
      <SectionTabs label="Glossary sections" sections={SECTIONS} value={section} onChange={setSection} />
      <label className="visually-hidden" htmlFor="gl-search">
        Search terms
      </label>
      <input id="gl-search" type="search" placeholder="Search: e.g. head pressure, SOC, MOP" value={q} onChange={(e) => setQ(e.target.value)} style={{ margin: '4px 0 14px' }} />
      <dl className="glossary">
        {list.map((t) => (
          <div key={t.term} className="gl-item">
            <dt>
              {t.term} <span className={`chip gl-sec`}>{t.section}</span>
            </dt>
            <dd>{t.def}</dd>
          </div>
        ))}
      </dl>
      {!list.length && <p style={{ color: 'var(--text-muted)' }}>No matching terms.</p>}
    </div>
  );
}
