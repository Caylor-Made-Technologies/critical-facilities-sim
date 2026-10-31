/** Coach card for MOP practice and emergency drills, shown above the simulator. */
import { useState } from 'react';
import { grade, SCORE, type Procedure, type ProcRun } from '../../sim';
import { Icon } from '../icons';

export interface ProcFeedback {
  ok: boolean;
  text: string;
}

interface Props {
  proc: Procedure;
  run: ProcRun;
  feedback: ProcFeedback | null;
  onConfirm: () => void;
  onChoose: (i: number) => void;
  onHint: () => void;
  onShowMe: () => void;
  onRetry: () => void;
  onExit: () => void;
  onBrowse: () => void;
}

export function ProcedureCoach({ proc, run, feedback, onConfirm, onChoose, onHint, onShowMe, onRetry, onExit, onBrowse }: Props) {
  const [whyOpen, setWhyOpen] = useState(false);
  const kindLabel = proc.kind === 'mop' ? 'MOP practice' : 'Emergency drill';

  if (run.done) {
    const g = grade(run.score);
    return (
      <section className="card proc-card proc-result" aria-labelledby="proc-h">
        <div className="proc-top">
          <div>
            <div className="eyebrow">{kindLabel} · complete</div>
            <h2 id="proc-h">{proc.title}</h2>
          </div>
          <button className="btn btn-icon btn-ghost" type="button" onClick={onExit} aria-label="Close procedure">
            <Icon name="close" />
          </button>
        </div>
        <div className="grade-row">
          <div className={`grade-badge g-${g.letter[0]!.toLowerCase()}`} aria-hidden="true">
            {g.letter}
          </div>
          <div>
            <div className="grade-score">
              {run.score} <span>/ 100</span>
            </div>
            <p className="grade-label">{g.label}</p>
          </div>
        </div>
        <h3 className="h-sub">What cost points</h3>
        {run.mistakes.length ? (
          <ul className="mistakes">
            {run.mistakes.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
            {run.hints.length > 0 && <li>Hints used: {run.hints.length} (−{run.hints.length * SCORE.hint})</li>}
          </ul>
        ) : (
          <p className="proc-clean">
            <Icon name="check" /> {run.hints.length ? `No mistakes. Hints used: ${run.hints.length}.` : 'Nothing. Clean run.'}
          </p>
        )}
        <h3 className="h-sub">Remember</h3>
        <ul className="checklist">
          {proc.debrief.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
        <div className="step-nav">
          <button className="btn btn-primary" type="button" onClick={onRetry}>
            <Icon name="reset" /> Run it again
          </button>
          <button className="btn" type="button" onClick={onBrowse}>
            <Icon name="book" /> More procedures
          </button>
        </div>
      </section>
    );
  }

  const s = proc.steps[run.step]!;
  const hinted = run.hints.includes(run.step);
  const wrong = run.wrong[run.step] ?? [];
  return (
    <section className={`card proc-card kind-${proc.kind}`} aria-labelledby="proc-h">
      <div className="proc-top">
        <div style={{ flex: 1 }}>
          <div className="eyebrow">
            {kindLabel} · Step {run.step + 1} of {proc.steps.length}
          </div>
          <h2 id="proc-h">{s.title}</h2>
        </div>
        <div className="score-pill" aria-label={`Score ${run.score} of 100`}>
          <span key={run.score}>{run.score}</span>
        </div>
        <button className="btn btn-icon btn-ghost" type="button" onClick={onExit} aria-label="Exit procedure">
          <Icon name="close" />
        </button>
      </div>
      <div className="stepper" aria-hidden="true">
        {proc.steps.map((_, i) => (
          <span key={i} className={i < run.step ? 'done' : i === run.step ? 'now' : ''} />
        ))}
      </div>
      {feedback && (
        <p className={`proc-feedback ${feedback.ok ? 'ok' : 'bad'}`} role="status" key={feedback.text}>
          <Icon name={feedback.ok ? 'check' : 'warning'} /> {feedback.text}
        </p>
      )}
      <div className="step-body" key={run.step}>
        <p>{s.detail}</p>
        <button className="linklike why-toggle" type="button" aria-expanded={whyOpen} onClick={() => setWhyOpen(!whyOpen)}>
          {whyOpen ? 'Hide why' : 'Why this step?'}
        </button>
        {whyOpen && <p className="proc-why">{s.why}</p>}

        {s.choices && (
          <div className="choices" role="group" aria-label="Pick one">
            {s.choices.map((c, i) => {
              const isWrong = wrong.includes(i);
              return (
                <div key={c.text}>
                  <button type="button" className={`choice${isWrong ? ' wrong' : ''}`} disabled={isWrong} onClick={() => onChoose(i)}>
                    <span className="choice-letter" aria-hidden="true">
                      {String.fromCharCode(65 + i)}
                    </span>
                    {c.text}
                  </button>
                  {isWrong && (
                    <p className="choice-why">
                      <strong>Not this one!</strong> {c.why}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {s.check && (
          <p className="waiting">
            <span className="wait-dot" aria-hidden="true" /> Do it on the diagram. This step ticks off by itself when the plant gets there.
          </p>
        )}
        {s.check && hinted && s.hint && (
          <div className="callout simpler">
            <strong>Hint: </strong>
            {s.hint}
          </div>
        )}
      </div>
      <div className="step-nav">
        {s.confirm && (
          <button className="btn btn-primary" type="button" onClick={onConfirm}>
            <Icon name="check" /> {s.confirm}
          </button>
        )}
        {s.check && s.hint && !hinted && (
          <button className="btn" type="button" onClick={onHint}>
            <Icon name="help" /> Hint (−{SCORE.hint})
          </button>
        )}
        {s.focus && (
          <button className="btn" type="button" onClick={onShowMe}>
            <Icon name="target" /> Show {s.focus}
          </button>
        )}
      </div>
    </section>
  );
}
