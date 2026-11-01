/**
 * A tab made of articles. Article groups (Electrical, Mechanical, …) become
 * sections you switch between at the top; the side list shows that section.
 */
import { useState, type ReactNode } from 'react';
import type { Article } from '../../content/types';
import { PageHead, SectionTabs } from '../common';
import { Blocks } from './ArticleView';

interface Props {
  eyebrow: string;
  title: string;
  intro: string;
  articles: Article[];
  /** Extra content shown under a given article id. */
  extras?: Record<string, ReactNode>;
  /** Skip the page header (when the tab is embedded in a bigger page). */
  bare?: boolean;
  /** Open this article first. */
  openId?: string | null;
}

export function ArticlesTab({ eyebrow, title, intro, articles, extras, bare, openId }: Props) {
  const groups = [...new Set(articles.map((a) => a.group))];
  const first = articles.find((a) => a.id === openId) ?? articles[0]!;
  const [group, setGroup] = useState(first.group);
  const [current, setCurrent] = useState(first.id);
  const inGroup = articles.filter((a) => a.group === group);
  const art = inGroup.find((a) => a.id === current) ?? inGroup[0]!;

  return (
    <div className={bare ? '' : 'tab-panel'}>
      {!bare && (
        <PageHead eyebrow={eyebrow} title={title}>
          {intro}
        </PageHead>
      )}
      <SectionTabs
        label={`${title} sections`}
        sections={groups.map((g) => ({ id: g, label: g }))}
        value={group}
        onChange={(g) => {
          setGroup(g);
          setCurrent(articles.find((a) => a.group === g)!.id);
        }}
      />
      <div className={inGroup.length > 1 ? 'content-layout' : ''}>
        {inGroup.length > 1 && (
          <nav className="toc" aria-label={`${group} topics`}>
            {inGroup.map((a) => (
              <button key={a.id} type="button" aria-current={a.id === art.id} onClick={() => setCurrent(a.id)}>
                {a.title}
              </button>
            ))}
          </nav>
        )}
        <article className="card article" key={art.id} aria-labelledby="article-h">
          <div className="eyebrow">{art.group}</div>
          <h2 id="article-h">{art.title}</h2>
          <p style={{ color: 'var(--text-muted)' }}>{art.intro}</p>
          <Blocks blocks={art.blocks} />
          {extras?.[art.id]}
        </article>
      </div>
    </div>
  );
}
