/** "Is this a change?" practice. Nothing is saved. */
import { useState } from 'react';
import { CHANGE_QUIZ } from '../../content/change';

export function ChangeQuiz() {
  const [answers, setAnswers] = useState<Record<number, boolean>>({});
  return (
    <section style={{ marginTop: 24 }} aria-labelledby="quiz-h">
      <h3 id="quiz-h">
        <span className="dot" aria-hidden="true" />
        Practice: does this need a change record?
      </h3>
      {CHANGE_QUIZ.map((item, i) => {
        const picked = answers[i];
        const right = picked === item.answer;
        return (
          <div key={item.q} className="card" style={{ boxShadow: 'none', marginTop: 10 }}>
            <p style={{ color: 'var(--text-heading)', fontWeight: 600 }}>{item.q}</p>
            <div className="card-actions" style={{ marginTop: 0 }}>
              <button className="btn" type="button" aria-pressed={picked === true} onClick={() => setAnswers({ ...answers, [i]: true })}>
                Yes, it's a change
              </button>
              <button className="btn" type="button" aria-pressed={picked === false} onClick={() => setAnswers({ ...answers, [i]: false })}>
                No
              </button>
            </div>
            {picked !== undefined && (
              <div className={`callout${right ? '' : ' callout-warn'}`} role="status">
                <strong>{right ? 'Correct' : 'Not quite'}: </strong>
                {item.why}
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}
