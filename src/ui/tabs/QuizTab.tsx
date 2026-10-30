/**
 * Quiz tab. Answer a question; if it's wrong, the explanation drops down
 * automatically. If it's right, you can still open "why".
 */
import { useState } from 'react';
import { QUIZ, QUIZ_SECTIONS, type QuizQuestion, type QuizSection } from '../../content/quiz';
import { PageHead, SectionTabs } from '../common';
import { Icon } from '../icons';
import type { ProgressHandle } from '../progress';

function Question({ item, n, onAnswer }: { item: QuizQuestion; n: number; onAnswer: (correct: boolean) => void }) {
  const [picked, setPicked] = useState<number | null>(null);
  const [whyOpen, setWhyOpen] = useState(false);
  const answered = picked !== null;
  const right = picked === item.answer;

  const choose = (i: number) => {
    if (answered) return;
    setPicked(i);
    const ok = i === item.answer;
    setWhyOpen(!ok); // drop the explanation down when they get it wrong
    onAnswer(ok);
  };

  return (
    <article className={`card quiz-q${answered ? (right ? ' is-right' : ' is-wrong') : ''}`} aria-labelledby={`q-${item.id}`}>
      <div className="quiz-num">Q{n}</div>
      <h2 id={`q-${item.id}`} className="h-card">
        {item.q}
      </h2>
      <div className="quiz-options" role="group" aria-label="Answers">
        {item.options.map((opt, i) => {
          const state = !answered ? '' : i === item.answer ? ' correct' : i === picked ? ' wrong' : ' dim';
          return (
            <button key={opt} type="button" className={`quiz-opt${state}`} onClick={() => choose(i)} aria-disabled={answered}>
              <span className="quiz-letter" aria-hidden="true">
                {String.fromCharCode(65 + i)}
              </span>
              <span>{opt}</span>
              {answered && i === item.answer && <span className="visually-hidden"> (correct answer)</span>}
              {answered && i === picked && i !== item.answer && <span className="visually-hidden"> (your answer, incorrect)</span>}
            </button>
          );
        })}
      </div>
      {answered && (
        <div className="quiz-result" role="status">
          {right ? (
            <span className="quiz-badge ok">
              <Icon name="check" /> Correct, nice work!
            </span>
          ) : (
            <span className="quiz-badge bad">
              <Icon name="warning" /> Not quite. Here's why:
            </span>
          )}
          <button className="btn btn-ghost" type="button" aria-expanded={whyOpen} aria-controls={`why-${item.id}`} onClick={() => setWhyOpen(!whyOpen)}>
            {whyOpen ? 'Hide explanation' : 'Show explanation'}
          </button>
        </div>
      )}
      <div id={`why-${item.id}`} className={`dropdown${whyOpen ? ' open' : ''}`} hidden={!whyOpen}>
        <div className="dropdown-inner">
          <strong>Explanation: </strong>
          {item.why}
        </div>
      </div>
    </article>
  );
}

export function QuizTab({ p }: { p: ProgressHandle }) {
  const [section, setSection] = useState<QuizSection>('electrical');
  const [round, setRound] = useState(0);
  const items = QUIZ.filter((q) => q.section === section);

  const counts = Object.fromEntries(
    QUIZ_SECTIONS.map((s) => {
      const qs = QUIZ.filter((q) => q.section === s.id);
      const right = qs.filter((q) => p.progress.quiz[q.id]).length;
      return [s.id, `${right}/${qs.length}`];
    }),
  ) as Record<QuizSection, string>;

  return (
    <div className="tab-panel">
      <PageHead eyebrow="Quiz" title="Test yourself">
        Pick an answer. If it's wrong, the explanation drops down so you learn why. Your best first-try score per section
        is tracked on this device only.
      </PageHead>
      <SectionTabs label="Quiz sections" sections={QUIZ_SECTIONS} value={section} onChange={setSection} counts={counts} />
      <div className="quiz-list" key={`${section}-${round}`}>
        {items.map((q, i) => (
          <Question key={q.id} item={q} n={i + 1} onAnswer={(ok) => p.answer(q.id, ok)} />
        ))}
      </div>
      <div className="card-actions">
        <button className="btn" type="button" onClick={() => setRound(round + 1)}>
          <Icon name="reset" /> Try this section again
        </button>
      </div>
    </div>
  );
}
