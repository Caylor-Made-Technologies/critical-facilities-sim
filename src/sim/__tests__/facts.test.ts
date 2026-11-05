import { describe, expect, it } from 'vitest';
import { FACTS } from '../../content/facts';
import { GLOSSARY } from '../../content/glossary';
import { LADDER } from '../../content/ladder';
import { HAZARD_HUNTS, LOTO_DRILLS } from '../../content/safetyTools';
import { EQUIPMENT } from '../../content/equipment';
import { QUIZ } from '../../content/quiz';
import { TIPS } from '../../content/tips';

describe('content facts stay in sync with the content', () => {
  it('counts match', () => {
    expect(FACTS.equipment).toBe(EQUIPMENT.length);
    expect(FACTS.quiz).toBe(QUIZ.length);
    expect(FACTS.tips).toBe(TIPS.length);
  });
  it('glossary terms, ladder goals and drill ids match', () => {
    expect([...FACTS.glossaryTerms]).toEqual(GLOSSARY.map((t) => t.term));
    expect(FACTS.ladderGoals).toEqual(Object.fromEntries(LADDER.map((r) => [r.id, r.doNow.length])));
    expect([...FACTS.lotoIds]).toEqual(LOTO_DRILLS.map((d) => d.id));
    expect([...FACTS.huntIds]).toEqual(HAZARD_HUNTS.map((d) => d.id));
  });
});
