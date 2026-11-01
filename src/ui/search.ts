/**
 * Quick search index for the command palette: every tab, lesson, MOP,
 * drill, equipment guide, case study, safety topic and glossary term.
 * Pure data and a small matcher, so it is unit tested.
 */
import { CASES } from '../content/cases';
import { EQUIPMENT } from '../content/equipment';
import { GLOSSARY } from '../content/glossary';
import { LESSONS } from '../content/lessons';
import { PROCEDURES } from '../content/procedures';
import { SAFETY } from '../content/safety';
import { NAV, type Tab } from './nav';

export type Jump =
  | { kind: 'tab'; tab: Tab }
  | { kind: 'lesson'; id: string }
  | { kind: 'proc'; id: string }
  | { kind: 'guide'; id: string }
  | { kind: 'case'; id: string }
  | { kind: 'safety'; id: string }
  | { kind: 'term'; term: string };

export interface SearchItem {
  title: string;
  /** What kind of thing it is, shown as a small label. */
  type: string;
  /** Extra words that match but aren't shown. */
  extra: string;
  jump: Jump;
}

export const SEARCH_INDEX: SearchItem[] = [
  ...NAV.map((n) => ({ title: n.label, type: 'Tab', extra: n.desc, jump: { kind: 'tab', tab: n.id } as Jump })),
  ...LESSONS.map((l) => ({ title: l.title, type: 'Walkthrough', extra: `${l.area} ${l.summary}`, jump: { kind: 'lesson', id: l.id } as Jump })),
  ...PROCEDURES.map((p) => ({ title: p.title, type: p.kind === 'mop' ? 'MOP' : 'Drill', extra: p.summary, jump: { kind: 'proc', id: p.id } as Jump })),
  ...EQUIPMENT.map((g) => ({ title: g.title, type: 'Equipment', extra: `${g.group} ${g.summary}`, jump: { kind: 'guide', id: g.id } as Jump })),
  ...CASES.map((c) => ({ title: c.title, type: 'Case study', extra: c.summary, jump: { kind: 'case', id: c.id } as Jump })),
  ...SAFETY.map((a) => ({ title: a.title, type: 'Safety', extra: `${a.group} ${a.intro}`, jump: { kind: 'safety', id: a.id } as Jump })),
  ...GLOSSARY.map((t) => ({ title: t.term, type: 'Term', extra: t.def, jump: { kind: 'term', term: t.term } as Jump })),
];

/** Best matches first: title prefix, then word prefix in title, then anywhere. */
export function search(q: string, limit = 30): SearchItem[] {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return SEARCH_INDEX.filter((i) => i.type === 'Tab').slice(0, limit);
  const scored: { item: SearchItem; score: number }[] = [];
  for (const item of SEARCH_INDEX) {
    const title = item.title.toLowerCase();
    const all = `${title} ${item.type.toLowerCase()} ${item.extra.toLowerCase()}`;
    if (!words.every((w) => all.includes(w))) continue;
    let score = 0;
    const first = words[0]!;
    if (title.startsWith(first)) score += 100;
    else if (new RegExp(`\\b${first.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(title)) score += 60;
    else if (title.includes(first)) score += 30;
    score += words.filter((w) => title.includes(w)).length * 10;
    score -= title.length / 50;
    scored.push({ item, score });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, limit).map((s) => s.item);
}
