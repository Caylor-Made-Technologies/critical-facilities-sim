/** Never Do tab: hard stops, in red, grouped by side of the house. */
import { useState } from 'react';
import { NEVER, NEVER_SECTIONS, type NeverSection } from '../../content/neverdo';
import { DangerMark, NeverList, PageHead, SectionTabs } from '../common';

export function NeverDoTab() {
  const [section, setSection] = useState<NeverSection>('everyone');
  const counts = Object.fromEntries(NEVER_SECTIONS.map((s) => [s.id, String(NEVER[s.id].length)])) as Record<NeverSection, string>;
  return (
    <div className="tab-panel">
      <PageHead eyebrow="Hard stops" title="Never do this. Ever.">
        These are the lines you don't cross under any circumstances, no matter the pressure, the time of night, or who is
        asking. Each one has hurt people or taken down sites.
      </PageHead>
      <div className="never-banner" role="note">
        <DangerMark />
        <div>
          <strong>NO exceptions. NO shortcuts. NO "just this once."</strong>
          <span>If a task seems to need one of these, stop and call your lead. Everyone has stop-work authority.</span>
        </div>
      </div>
      <SectionTabs label="Never-do sections" sections={NEVER_SECTIONS} value={section} onChange={setSection} counts={counts} />
      <section className="card never-card" key={section} aria-label={`${NEVER_SECTIONS.find((s) => s.id === section)!.label} hard stops`}>
        <NeverList rules={NEVER[section]} />
      </section>
    </div>
  );
}
