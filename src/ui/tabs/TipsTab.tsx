/**
 * Tips & tricks: 200+ quick field tips, memory aids and in-a-pinch moves.
 * Search, filter by topic, roll a random tip, and star favorites
 * (favorites stay on this device).
 */
import { useMemo, useState } from 'react';
import { TIP_CATS, TIPS, type Tip, type TipCat } from '../../content/tips';
import { PageHead } from '../common';
import { buzz } from '../haptics';
import { Icon } from '../icons';
import type { ProgressHandle } from '../progress';

const CAT = Object.fromEntries(TIP_CATS.map((c) => [c.id, c])) as Record<TipCat, (typeof TIP_CATS)[number]>;
const PAGE = 30;

export function TipCard({ tip, saved, onSave, big }: { tip: Tip; saved: boolean; onSave: () => void; big?: boolean }) {
  const c = CAT[tip.cat];
  return (
    <article className={`tip-card cat-${tip.cat}${big ? ' big' : ''}${tip.caution ? ' has-caution' : ''}`} aria-labelledby={`tip-${tip.id}`}>
      <div className="tip-top">
        <span className="tip-cat">
          <span aria-hidden="true">{c.icon}</span> {c.label}
        </span>
        <button
          type="button"
          className={`tip-star${saved ? ' on' : ''}`}
          aria-pressed={saved}
          aria-label={saved ? `Remove "${tip.title}" from saved tips` : `Save "${tip.title}"`}
          onClick={() => {
            buzz(saved ? 10 : [10, 40, 10]);
            onSave();
          }}
        >
          <Icon name="star" />
        </button>
      </div>
      <h3 id={`tip-${tip.id}`}>{tip.title}</h3>
      <p>{tip.text}</p>
      {tip.caution && (
        <p className="tip-caution">
          <Icon name="warning" /> {tip.caution}
        </p>
      )}
    </article>
  );
}

export function TipsTab({ p, initialQuery = '' }: { p: ProgressHandle; initialQuery?: string }) {
  const [q, setQ] = useState(initialQuery);
  const [cat, setCat] = useState<TipCat | 'all' | 'saved'>('all');
  const [shown, setShown] = useState(PAGE);
  const [roll, setRoll] = useState(() => Math.floor(Math.random() * TIPS.length));
  const [spin, setSpin] = useState(0);
  const fav = new Set(p.progress.favTips);

  const list = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return TIPS.filter(
      (t) =>
        (cat === 'all' || (cat === 'saved' ? p.progress.favTips.includes(t.id) : t.cat === cat)) &&
        words.every((w) => `${t.title} ${t.text} ${CAT[t.cat].label}`.toLowerCase().includes(w)),
    );
  }, [q, cat, p.progress.favTips]);

  const rolled = TIPS[roll]!;
  const reroll = () => {
    let n = roll;
    while (n === roll) n = Math.floor(Math.random() * TIPS.length);
    setRoll(n);
    setSpin(Date.now());
    buzz(15);
  };
  const pick = (c: typeof cat) => {
    setCat(c);
    setShown(PAGE);
  };

  return (
    <div className="tab-panel tips-tab">
      <PageHead eyebrow="Tips & tricks" title="Easy wins for when you're in a pinch">
        {`${TIPS.length} quick tips: memory aids like CCME and BOY, rules of thumb, troubleshooting shortcuts, and safe moves when things go sideways. Star the ones you want to keep.`}
      </PageHead>

      <section className="tip-roulette" aria-labelledby="roll-h">
        <div className="roll-head">
          <h2 id="roll-h" className="h-card">
            <span aria-hidden="true">🎲</span> Random tip
          </h2>
          <button className="btn btn-primary" type="button" onClick={reroll}>
            <Icon name="reset" /> Another one
          </button>
        </div>
        <div className="roll-card" key={spin} aria-live="polite">
          <TipCard tip={rolled} big saved={fav.has(rolled.id)} onSave={() => p.toggleTip(rolled.id)} />
        </div>
      </section>

      <div className="tips-tools">
        <label className="visually-hidden" htmlFor="tip-search">
          Search tips
        </label>
        <div className="tip-search">
          <Icon name="search" />
          <input
            id="tip-search"
            type="search"
            placeholder="Search tips: e.g. fuse, head pressure, BOY"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setShown(PAGE);
            }}
          />
        </div>
        <div className="tip-chips" role="group" aria-label="Tip topics">
          <button type="button" className={`tip-chip${cat === 'all' ? ' on' : ''}`} aria-pressed={cat === 'all'} onClick={() => pick('all')}>
            All <span>{TIPS.length}</span>
          </button>
          <button type="button" className={`tip-chip saved${cat === 'saved' ? ' on' : ''}`} aria-pressed={cat === 'saved'} onClick={() => pick('saved')}>
            <span aria-hidden="true">★</span> Saved <span>{p.progress.favTips.length}</span>
          </button>
          {TIP_CATS.map((c) => (
            <button key={c.id} type="button" className={`tip-chip${cat === c.id ? ' on' : ''}`} aria-pressed={cat === c.id} onClick={() => pick(c.id)}>
              <span aria-hidden="true">{c.icon}</span> {c.label} <span>{TIPS.filter((t) => t.cat === c.id).length}</span>
            </button>
          ))}
        </div>
      </div>

      <p className="tips-count" aria-live="polite">
        {list.length === TIPS.length ? `All ${list.length} tips` : `${list.length} tip${list.length === 1 ? '' : 's'}`}
        {cat === 'saved' && !list.length ? '. Tap the star on any tip to save it here.' : ''}
      </p>
      <div className="tip-grid">
        {list.slice(0, shown).map((t) => (
          <TipCard key={t.id} tip={t} saved={fav.has(t.id)} onSave={() => p.toggleTip(t.id)} />
        ))}
      </div>
      {list.length > shown && (
        <div className="tips-more">
          <button className="btn" type="button" onClick={() => setShown(shown + PAGE)}>
            Show {Math.min(PAGE, list.length - shown)} more
          </button>
        </div>
      )}
      <p className="muted small">
        Tips are general know-how for learning. The equipment manual, your site's procedures, and your lead always come
        first.
      </p>
    </div>
  );
}
