/** Short multiple-choice quiz with explanations (Life of a DC stages, equipment deep dives). */
import { useState } from 'react';
import type { LifeQuestion } from '../content/lifecycleTypes';
import { Confetti } from './common';
import { LIFE_PASS } from './progress';

export function QuizBlock({ qs, best, onFinish }: { qs: LifeQuestion[]; best: number; onFinish: (pct: number, answers: Record<string, boolean>) => void }) {
  const [picks, setPicks] = useState<Record<string, number>>({});
  const [done, setDone] = useState(false);
  const right = qs.filter((q) => picks[q.id] === q.answer).length;
  const pct = Math.round((right / qs.length) * 100);
  const submit = () => {
    setDone(true);
    onFinish(pct, Object.fromEntries(qs.map((q) => [q.id, picks[q.id] === q.answer])));
  };
  return (
    <div className="lc-quiz">
      {best > 0 && !done && <p className="muted small">Best so far: {best}%.</p>}
      {qs.map((q, n) => (
        <fieldset key={q.id} className={`card lc-q${done ? (picks[q.id] === q.answer ? ' ok' : ' bad') : ''}`}>
          <legend>
            {n + 1}. {q.q}
          </legend>
          {q.choices.map((c, i) => (
            <label key={c} className={`lc-choice${picks[q.id] === i ? ' on' : ''}${done && i === q.answer ? ' right' : ''}`}>
              <input type="radio" name={q.id} checked={picks[q.id] === i} disabled={done} onChange={() => setPicks({ ...picks, [q.id]: i })} />
              {c}
            </label>
          ))}
          {done && <p className="lc-why">{picks[q.id] === q.answer ? 'Right. ' : `Answer: ${q.choices[q.answer]}. `}{q.why}</p>}
        </fieldset>
      ))}
      <div className="step-nav">
        {!done ? (
          <button type="button" className="btn btn-primary" disabled={Object.keys(picks).length < qs.length} onClick={submit}>
            Check answers
          </button>
        ) : (
          <>
            <Confetti burst={pct === 100 ? 1 : 0} />
            <span role="status" className={pct >= LIFE_PASS ? 'lc-good' : 'lc-try'}>
              {right} of {qs.length} right ({pct}%). {pct >= LIFE_PASS ? 'Passed.' : `${LIFE_PASS}% passes. Read the explanations and try again.`}
            </span>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setPicks({});
                setDone(false);
              }}
            >
              Try again
            </button>
          </>
        )}
      </div>
    </div>
  );
}
