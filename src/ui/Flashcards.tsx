/**
 * Leitner-style flashcards: cards you miss come back first, cards you know
 * move up a box. Box 3+ counts as mastered. Boxes are saved locally.
 */
import { useMemo, useState, type ReactNode } from 'react';
import { Icon } from './icons';

export interface Card {
  id: string;
  front: ReactNode;
  back: ReactNode;
  tag?: string;
}

/** Next card: lowest box first; among equals, rotate so you don't see the same one twice in a row. */
export function nextCard(cards: { id: string }[], boxes: Record<string, number>, lastId: string | null, turn: number): number {
  if (!cards.length) return -1;
  const low = Math.min(...cards.map((c) => boxes[c.id] ?? 0));
  const pool = cards.map((c, i) => ({ c, i })).filter((x) => (boxes[x.c.id] ?? 0) === low && x.c.id !== lastId);
  const list = pool.length ? pool : cards.map((c, i) => ({ c, i }));
  return list[turn % list.length]!.i;
}

export function Flashcards({ cards, boxes, onRate, label }: { cards: Card[]; boxes: Record<string, number>; onRate: (id: string, knew: boolean) => void; label: string }) {
  const [turn, setTurn] = useState(0);
  const [last, setLast] = useState<string | null>(null);
  const [flipped, setFlipped] = useState(false);
  const idx = useMemo(() => nextCard(cards, boxes, last, turn), [cards, boxes, last, turn]);
  const mastered = cards.filter((c) => (boxes[c.id] ?? 0) >= 3).length;
  const card = cards[idx];
  if (!card) return null;
  const box = boxes[card.id] ?? 0;
  const rate = (knew: boolean) => {
    onRate(card.id, knew);
    setLast(card.id);
    setTurn((t) => t + 1);
    setFlipped(false);
  };
  return (
    <section className="flash" aria-label={label}>
      <div className="flash-meta">
        <span>
          <strong>{mastered}</strong> of {cards.length} mastered
        </span>
        <span className="flash-boxes" role="img" aria-label={`This card is in box ${box + 1} of 5`}>
          {[0, 1, 2, 3, 4].map((b) => (
            <span key={b} className={b <= box ? 'on' : ''} />
          ))}
        </span>
      </div>
      <div className="flash-bar" aria-hidden="true">
        <span style={{ width: `${(mastered / cards.length) * 100}%` }} />
      </div>
      <button type="button" className={`flash-card${flipped ? ' flipped' : ''}`} onClick={() => setFlipped(!flipped)} aria-label={flipped ? 'Card answer showing. Tap to see the front.' : 'Tap to show the answer.'} key={`${card.id}-${turn}`}>
        <span className="flash-face flash-front" aria-hidden={flipped}>
          {card.tag && <span className="chip">{card.tag}</span>}
          <span className="flash-text">{card.front}</span>
          <span className="flash-hint">
            <Icon name="reset" /> Tap to flip
          </span>
        </span>
        <span className="flash-face flash-back" aria-hidden={!flipped}>
          {card.back}
        </span>
      </button>
      <div className="flash-actions" aria-live="polite">
        {flipped ? (
          <>
            <button className="btn" type="button" onClick={() => rate(false)}>
              <Icon name="reset" /> Not yet
            </button>
            <button className="btn btn-primary" type="button" onClick={() => rate(true)}>
              <Icon name="check" /> Knew it
            </button>
          </>
        ) : (
          <button className="btn btn-primary" type="button" onClick={() => setFlipped(true)}>
            Show answer
          </button>
        )}
      </div>
    </section>
  );
}
