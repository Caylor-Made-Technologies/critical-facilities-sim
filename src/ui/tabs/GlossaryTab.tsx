/** Glossary tab: searchable terms, by section. */
import { useMemo, useState } from 'react';
import { GLOSSARY, type GlossarySection } from '../../content/glossary';
import { PageHead, SectionTabs } from '../common';
import { Flashcards } from '../Flashcards';

type Filter = 'all' | GlossarySection;
const SECTIONS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'Electrical', label: 'Electrical' },
  { id: 'Mechanical', label: 'Mechanical' },
  { id: 'Operations & safety', label: 'Ops & safety' },
];

export function GlossaryTab({ initialQuery = '', boxes = {}, onRate }: { initialQuery?: string; boxes?: Record<string, number>; onRate?: (id: string, knew: boolean) => void }) {
  const [q, setQ] = useState(initialQuery);
  const [mode, setMode] = useState<'list' | 'cards'>('list');
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
      <div className="mode-switch" role="group" aria-label="Glossary view">
        <button type="button" aria-pressed={mode === 'list'} onClick={() => setMode('list')}>
          List
        </button>
        <button type="button" aria-pressed={mode === 'cards'} onClick={() => setMode('cards')}>
          Flashcards
        </button>
      </div>
      <SectionTabs label="Glossary sections" sections={SECTIONS} value={section} onChange={setSection} />
      {mode === 'cards' && onRate ? (
        <Flashcards
          key={section}
          label="Glossary flashcards"
          boxes={boxes}
          onRate={onRate}
          cards={GLOSSARY.filter((t) => section === 'all' || t.section === section).map((t) => ({ id: `g:${t.term}`, front: t.term, back: t.def, tag: t.section }))}
        />
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}
