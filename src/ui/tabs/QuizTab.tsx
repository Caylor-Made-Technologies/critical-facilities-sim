/**
 * Quiz tab. Answer a question; if it's wrong, the explanation drops down
 * automatically. If it's right, you can still open "why".
 */
import { useEffect, useMemo, useState } from 'react';
import { QUIZ, QUIZ_SECTIONS, type QuizQuestion, type QuizSection } from '../../content/quiz';
import { Confetti, PageHead, SectionTabs } from '../common';
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

const EXAM_LEN = 20;
const EXAM_SECS = 15 * 60;

function Exam({ p }: { p: ProgressHandle }) {
  const [run, setRun] = useState(0);
  const [i, setI] = useState(0);
  const [picks, setPicks] = useState<number[]>([]);
  const [started, setStarted] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [done, setDone] = useState(false);
  const [burst, setBurst] = useState(0);
  const qs = useMemo(() => [...QUIZ].sort(() => Math.random() - 0.5).slice(0, EXAM_LEN), [run]);
  const left = started ? Math.max(0, EXAM_SECS - Math.floor((now - started) / 1000)) : EXAM_SECS;

  useEffect(() => {
    if (!started || done) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [started, done]);

  const finish = (all: number[]) => {
    setDone(true);
    const score = Math.round((all.filter((x, k) => x === qs[k]!.answer).length / qs.length) * 100);
    p.finishExam(score);
    if (score >= 80) setBurst(Date.now());
  };
  useEffect(() => {
    if (started && !done && left === 0) finish(picks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left]);

  const mmss = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
  if (!started)
    return (
      <section className="card exam-intro">
        <h2 className="h-card">Timed exam</h2>
        <p>
          {EXAM_LEN} random questions from every section, {EXAM_SECS / 60} minutes. No explanations until the end, like a real
          test. Score 80 or more to pass and earn the <strong>Exam ready</strong> badge.
        </p>
        {p.progress.exam >= 0 && <p className="muted">Your best: {p.progress.exam} / 100</p>}
        <button className="btn btn-primary btn-lg" type="button" onClick={() => { setStarted(Date.now()); setNow(Date.now()); }}>
          <Icon name="clock" /> Start the exam
        </button>
      </section>
    );

  if (done) {
    const right = picks.filter((x, k) => x === qs[k]!.answer).length;
    const score = Math.round((right / qs.length) * 100);
    const missed = qs.map((q, k) => ({ q, pick: picks[k] })).filter((x) => x.pick !== x.q.answer);
    return (
      <section className="card exam-result" aria-live="polite">
        <div className="loto-head">
          <h2 className="h-card">{score >= 80 ? 'Passed!' : 'Not yet. Keep going.'}</h2>
          <span className="score-pill final">{score} / 100</span>
        </div>
        <p>
          {right} of {qs.length} right{left === 0 ? ' (time ran out)' : ''}. Pass mark is 80.
        </p>
        {missed.length > 0 && (
          <>
            <h3>Review what you missed</h3>
            <ol className="exam-review">
              {missed.map(({ q, pick }) => (
                <li key={q.id}>
                  <strong>{q.q}</strong>
                  <span className="exam-yours">Your answer: {pick === undefined ? 'no answer' : q.options[pick]}</span>
                  <span className="exam-right">Correct: {q.options[q.answer]}</span>
                  <span className="muted">{q.why}</span>
                </li>
              ))}
            </ol>
          </>
        )}
        <button className="btn" type="button" onClick={() => { setRun(run + 1); setI(0); setPicks([]); setStarted(null); setDone(false); }}>
          <Icon name="reset" /> New exam
        </button>
        <Confetti burst={burst} />
      </section>
    );
  }

  const q = qs[i]!;
  return (
    <section className="card exam-q" aria-labelledby="exam-q">
      <div className="exam-bar">
        <span>
          Question {i + 1} of {qs.length}
        </span>
        <span className={`exam-timer${left < 60 ? ' low' : ''}`} aria-label={`${mmss} left`}>
          <Icon name="clock" /> {mmss}
        </span>
      </div>
      <div className="exam-progress" aria-hidden="true">
        <span style={{ width: `${(i / qs.length) * 100}%` }} />
      </div>
      <h2 className="h-card" id="exam-q" key={q.id}>
        {q.q}
      </h2>
      <div className="quiz-options" role="group" aria-label="Answers">
        {q.options.map((opt, k) => (
          <button
            key={opt}
            type="button"
            className="quiz-opt"
            onClick={() => {
              const all = [...picks.slice(0, i), k];
              setPicks(all);
              if (i + 1 < qs.length) setI(i + 1);
              else finish(all);
            }}
          >
            <span className="quiz-letter" aria-hidden="true">
              {String.fromCharCode(65 + k)}
            </span>
            <span>{opt}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

type QuizView = QuizSection | 'exam';

export function QuizTab({ p }: { p: ProgressHandle }) {
  const [section, setSection] = useState<QuizView>('electrical');
  const [round, setRound] = useState(0);
  const items = QUIZ.filter((q) => q.section === section);
  const sections: { id: QuizView; label: string }[] = [...QUIZ_SECTIONS, { id: 'exam', label: 'Timed exam' }];

  const counts = Object.fromEntries(
    QUIZ_SECTIONS.map((s) => {
      const qs = QUIZ.filter((q) => q.section === s.id);
      const right = qs.filter((q) => p.progress.quiz[q.id]).length;
      return [s.id, `${right}/${qs.length}`];
    }),
  ) as Partial<Record<QuizView, string>>;
  if (p.progress.exam >= 0) counts.exam = `best ${p.progress.exam}`;

  return (
    <div className="tab-panel">
      <PageHead eyebrow="Quiz" title="Test yourself">
        Pick an answer. If it's wrong, the explanation drops down so you learn why. Your best first-try score per section
        is tracked on this device only.
      </PageHead>
      <SectionTabs label="Quiz sections" sections={sections} value={section} onChange={setSection} counts={counts} />
      {section === 'exam' ? (
        <Exam p={p} />
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}
