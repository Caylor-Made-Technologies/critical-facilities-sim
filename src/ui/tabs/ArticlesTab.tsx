/** A tab made of articles with a side table of contents (Safety, Change). */
import { useState, type ReactNode } from 'react';
import type { Article } from '../../content/types';
import { Blocks } from './ArticleView';

interface Props {
  eyebrow: string;
  title: string;
  intro: string;
  articles: Article[];
  /** Extra content shown under a given article id. */
  extras?: Record<string, ReactNode>;
}

export function ArticlesTab({ eyebrow, title, intro, articles, extras }: Props) {
  const [current, setCurrent] = useState(articles[0]!.id);
  const art = articles.find((a) => a.id === current) ?? articles[0]!;
  const groups = [...new Set(articles.map((a) => a.group))];

  return (
    <div className="tab-panel">
      <div className="page-head">
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{intro}</p>
      </div>
      <div className="content-layout">
        <nav className="toc" aria-label={`${title} topics`}>
          {groups.map((g) => (
            <div key={g} style={{ display: 'contents' }}>
              <div className="toc-group">{g}</div>
              {articles
                .filter((a) => a.group === g)
                .map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    aria-current={a.id === current}
                    onClick={() => {
                      setCurrent(a.id);
                      document.getElementById('article-top')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                  >
                    {a.title}
                  </button>
                ))}
            </div>
          ))}
        </nav>
        <article className="card article" key={art.id} aria-labelledby="article-h">
          <div id="article-top" />
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
