/** Coach card for MOP practice and emergency drills, shown above the simulator. */
import { useEffect, useRef, useState } from 'react';
import { grade, SCORE, type Consequence, type Procedure, type ProcChoice, type ProcRun } from '../../sim';
import { Confetti } from '../common';
import { Icon } from '../icons';
import { fmtSecs } from '../progress';

export interface ProcFeedback {
  ok: boolean;
  text: string;
}

interface Props {
  proc: Procedure;
  run: ProcRun;
  /** When the run started (ms since epoch). */
  started: number;
  /** Finish time in seconds, once done. */
  secs?: number;
  bestSecs?: number;
  feedback: ProcFeedback | null;
  /** Run a choice's consequence on a copy of the live plant. */
  preview: (c: ProcChoice) => Consequence | null;
  onConfirm: () => void;
  onChoose: (i: number) => void;
  onHint: () => void;
  onShowMe: () => void;
  onRetry: () => void;
  onExit: () => void;
  onBrowse: () => void;
}

export function ProcedureCoach({ proc, run, started, secs, bestSecs, feedback, preview, onConfirm, onChoose, onHint, onShowMe, onRetry, onExit, onBrowse }: Props) {
  const [whyOpen, setWhyOpen] = useState(false);
  // Outcomes of wrong choices, simulated once when picked (key: "step:choice").
  const [outcomes, setOutcomes] = useState<Record<string, Consequence | null>>({});
  const kindLabel = proc.kind === 'mop' ? 'MOP practice' : 'Emergency drill';
  // "Think deeper" Q&As load with the result screen, not with the app (they are only read here).
  const [deeper, setDeeper] = useState<{ q: string; a: string }[] | undefined>(proc.deeper);
  useEffect(() => {
    if (!run.done || deeper) return;
    let live = true;
    void import('../../content/deeper').then((m) => live && setDeeper(m.DEEPER[proc.id]));
    return () => {
      live = false;
    };
  }, [run.done, proc.id, deeper]);
  // Follow bar: when the coach card scrolls out of view, a slim bar keeps the step in sight.
  const cardRef = useRef<HTMLElement>(null);
  const [away, setAway] = useState(false);
  useEffect(() => {
    const el = cardRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setAway(!e?.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, [run.done]);
  useEffect(() => {
    document.body.classList.toggle('has-follow', away && !run.done);
    return () => document.body.classList.remove('has-follow');
  }, [away, run.done]);
  // Live stopwatch (real time), ticking once a second while the run is open.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (run.done) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [run.done]);

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
        <Confetti burst={run.score === 100 ? 1 : 0} />
        <div className="grade-row">
          <div className={`grade-badge g-${g.letter[0]!.toLowerCase()}`} aria-hidden="true">
            {g.letter}
          </div>
          <div>
            <div className="grade-score">
              {run.score} <span>/ 100</span>
            </div>
            <p className="grade-label">{g.label}</p>
            {secs !== undefined && (
              <p className="grade-time">
                <Icon name="pulse" /> Finished in {fmtSecs(secs)}
                {bestSecs !== undefined && ` · best ${fmtSecs(Math.min(bestSecs, secs))}`}
              </p>
            )}
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
        {deeper && deeper.length > 0 && (
          <>
            <h3 className="h-sub">Think deeper</h3>
            <div className="deeper">
              {deeper.map((d) => (
                <details key={d.q} className="deeper-q">
                  <summary>{d.q}</summary>
                  <p>
                    <strong>One good answer: </strong>
                    {d.a}
                  </p>
                </details>
              ))}
            </div>
          </>
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
    <>
    {away && (
      <button
        type="button"
        className={`follow-bar kind-${proc.kind}`}
        onClick={() => cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        aria-label={`Step ${run.step + 1} of ${proc.steps.length}: ${s.title}. Score ${run.score}. Show the step.`}
      >
        <span className="follow-step">
          {run.step + 1}/{proc.steps.length}
        </span>
        <span className="follow-title">{s.title}</span>
        <span className="follow-score">{run.score}</span>
        <Icon name="arrow-up" />
      </button>
    )}
    <section ref={cardRef} className={`card proc-card kind-${proc.kind}`} aria-labelledby="proc-h">
      <div className="proc-top">
        <div style={{ flex: 1 }}>
          <div className="eyebrow">
            {kindLabel} · Step {run.step + 1} of {proc.steps.length}
          </div>
          <h2 id="proc-h">{s.title}</h2>
        </div>
        <div className="stopwatch" aria-label={`Time ${fmtSecs((now - started) / 1000)}`}>
          {fmtSecs((now - started) / 1000)}
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
      {proc.plan && (
        <details className="mop-sheet" open={run.step === 0}>
          <summary>
            MOP sheet · risk <span className={`chip mop-risk risk-${proc.plan.risk.toLowerCase()}`}>{proc.plan.risk}</span>
          </summary>
          <div className="mop-sheet-body">
            <div>
              <strong>Before you start</strong>
              <ul>{proc.plan.prereqs.map((x) => <li key={x}>{x}</li>)}</ul>
            </div>
            <div>
              <strong>Stop work if</strong>
              <ul>{proc.plan.stopWork.map((x) => <li key={x}>{x}</li>)}</ul>
            </div>
            <div>
              <strong>Rollback</strong>
              <ol>{proc.plan.rollback.map((x) => <li key={x}>{x}</li>)}</ol>
            </div>
          </div>
        </details>
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
                  <button
                    type="button"
                    className={`choice${isWrong ? ' wrong' : ''}`}
                    disabled={isWrong}
                    onClick={() => {
                      if (!c.correct && c.consequence) setOutcomes((o) => ({ ...o, [`${run.step}:${i}`]: preview(c) }));
                      onChoose(i);
                    }}
                  >
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
                  {isWrong && outcomes[`${run.step}:${i}`] && <Outcome c={outcomes[`${run.step}:${i}`]!} />}
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
    </>
  );
}

/** What a wrong choice would have done, simulated on a copy of the plant. */
function Outcome({ c }: { c: Consequence }) {
  const headline = c.refused
    ? 'The plant would have refused it.'
    : c.racksDown > 0
      ? `${c.racksDown} rack${c.racksDown > 1 ? 's' : ''} would have lost power within ${c.seconds} s.`
      : c.gpuRowsTripped.length
        ? `GPU row ${c.gpuRowsTripped.join(', ')} would have shut down.`
        : `No racks down in ${c.seconds} s, but look what it set off:`;
  return (
    <div className="outcome" role="note">
      <div className="outcome-head">
        <Icon name="pulse" /> Simulated on a copy of your plant
      </div>
      <p className="outcome-headline">{headline}</p>
      {c.refused && <p className="outcome-refused">{c.refused}</p>}
      {c.lines.length > 0 && (
        <ul className="outcome-lines">
          {c.lines.filter((l) => !c.refused || !l.includes(c.refused.slice(0, 30))).map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
