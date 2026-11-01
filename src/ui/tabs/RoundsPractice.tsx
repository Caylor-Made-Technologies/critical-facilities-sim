/** Rounds practice: tap the readings that need action, then check your round. */
import { useState } from 'react';
import { ROUNDS, type RoundSheet } from '../../content/rounds';
import { grade } from '../../sim';
import { Icon } from '../icons';

/** Score: share of readings judged right (flagged when bad, left alone when fine). */
export function roundScore(sheet: RoundSheet, flagged: Set<number>): number {
  const right = sheet.readings.filter((r, i) => r.bad === flagged.has(i)).length;
  return Math.round((right / sheet.readings.length) * 100);
}

function Sheet({ sheet, best, onDone }: { sheet: RoundSheet; best?: number; onDone: (id: string, score: number) => void }) {
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [checked, setChecked] = useState(false);
  const toggle = (i: number) => {
    if (checked) return;
    const next = new Set(flagged);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    setFlagged(next);
  };
  const score = roundScore(sheet, flagged);
  return (
    <article className="card round-sheet">
      <div className="record-head">
        <div>
          <div className="eyebrow">{sheet.where}</div>
          <h2 className="h-card">{sheet.title}</h2>
        </div>
        {best !== undefined && <span className="chip chip-ok">Best {best}</span>}
      </div>
      <p className="round-help">Tap every reading that needs action, then check your round.</p>
      <ul className="readings">
        {sheet.readings.map((r, i) => {
          const isFlag = flagged.has(i);
          const verdict = checked ? (r.bad === isFlag ? 'right' : 'wrong') : '';
          return (
            <li key={r.label} className={`reading ${verdict}`}>
              <button type="button" className={`reading-btn${isFlag ? ' flagged' : ''}`} aria-pressed={isFlag} onClick={() => toggle(i)} disabled={checked}>
                <span className="reading-flag" aria-hidden="true">
                  <Icon name={isFlag ? 'warning' : 'check'} />
                </span>
                <span className="reading-label">{r.label}</span>
                <strong className="reading-value">{r.value}</strong>
              </button>
              {checked && (
                <p className="reading-why">
                  <strong>
                    {verdict === 'right' ? 'Right' : r.bad ? 'Missed!' : 'This one was fine'}
                    {r.bad ? ' · needs action' : ''}.
                  </strong>{' '}
                  Normal: {r.normal}. {r.why}
                </p>
              )}
            </li>
          );
        })}
      </ul>
      <div className="step-nav">
        {!checked ? (
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => {
              setChecked(true);
              onDone(sheet.id, score);
            }}
          >
            <Icon name="check" /> Check my round
          </button>
        ) : (
          <>
            <span className="round-score" role="status">
              {score}/100 · {grade(score).letter}
            </span>
            <button
              className="btn"
              type="button"
              onClick={() => {
                setChecked(false);
                setFlagged(new Set());
              }}
            >
              <Icon name="reset" /> Try again
            </button>
          </>
        )}
      </div>
    </article>
  );
}

export function RoundsPractice({ best, onDone }: { best: Record<string, number>; onDone: (id: string, score: number) => void }) {
  return (
    <>
      <div className="callout">
        <strong>Rounds are where problems are caught early. </strong>
        Each sheet has readings from a generic round. Some need action. Ranges are typical examples; your site's round sheets
        and manuals set the real limits.
      </div>
      <div className="rounds-grid">
        {ROUNDS.map((r) => (
          <Sheet key={r.id} sheet={r} best={best[r.id]} onDone={onDone} />
        ))}
      </div>
    </>
  );
}
