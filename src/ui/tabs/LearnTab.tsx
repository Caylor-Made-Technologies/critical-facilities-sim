/** Learn tab: guided step-by-step walkthroughs, plus the coach used inside the Simulator. */
import { useState } from 'react';
import { LESSONS, type Lesson } from '../../content/lessons';
import { Icon } from '../icons';

export interface LessonState {
  lesson: Lesson;
  step: number;
}

interface CoachProps {
  state: LessonState;
  compact?: boolean;
  goTo: (step: number) => void;
  onExit: () => void;
  onShowSim?: () => void;
  onBackToLesson?: () => void;
}

/** Step-by-step coach card. Shows a simpler explanation on request. */
export function Coach({ state, compact, goTo, onExit, onShowSim, onBackToLesson }: CoachProps) {
  const { lesson, step } = state;
  const s = lesson.steps[step]!;
  const [simpleFor, setSimpleFor] = useState<string | null>(null);
  const showSimple = simpleFor === `${lesson.id}:${step}`;
  const last = step === lesson.steps.length - 1;

  return (
    <section className="card" aria-labelledby="coach-h" style={compact ? { marginBottom: 14, borderColor: 'var(--blue)' } : undefined}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div className="eyebrow">
            {lesson.title} · Step {step + 1} of {lesson.steps.length}
          </div>
          <h2 id="coach-h" style={{ fontSize: compact ? '1.1rem' : undefined }}>
            {s.title}
          </h2>
        </div>
        <button className="btn btn-icon btn-ghost" type="button" onClick={onExit} aria-label="Exit walkthrough">
          <Icon name="close" />
        </button>
      </div>
      <div className="stepper" aria-hidden="true">
        {lesson.steps.map((_, i) => (
          <span key={i} className={i <= step ? 'done' : ''} />
        ))}
      </div>
      <div className="step-body" key={step} aria-live="polite">
        {s.body.map((p) => (
          <p key={p}>{p}</p>
        ))}
        {showSimple && (
          <div className="callout simpler">
            <strong>In plain words: </strong>
            {s.simpler}
          </div>
        )}
      </div>
      <div className="step-nav">
        <button className="btn" type="button" disabled={step === 0} onClick={() => goTo(step - 1)}>
          <Icon name="arrow-left" /> Back
        </button>
        <button className="btn" type="button" aria-expanded={showSimple} onClick={() => setSimpleFor(showSimple ? null : `${lesson.id}:${step}`)}>
          <Icon name="help" /> {showSimple ? 'Hide simple version' : "I don't get it, explain simpler"}
        </button>
        {onShowSim && (s.actions || s.focus) && (
          <button className="btn" type="button" onClick={onShowSim}>
            <Icon name="bolt" /> Show me in the simulator
          </button>
        )}
        {onBackToLesson && (
          <button className="btn" type="button" onClick={onBackToLesson}>
            <Icon name="book" /> Full lesson
          </button>
        )}
        <span className="spacer" />
        {last ? (
          <button className="btn btn-primary" type="button" onClick={onExit}>
            <Icon name="check" /> Finish
          </button>
        ) : (
          <button className="btn btn-primary" type="button" onClick={() => goTo(step + 1)}>
            Next <Icon name="arrow-right" />
          </button>
        )}
      </div>
    </section>
  );
}

interface Props {
  active: LessonState | null;
  start: (lesson: Lesson) => void;
  goTo: (step: number) => void;
  exit: () => void;
  showSim: () => void;
}

export function LearnTab({ active, start, goTo, exit, showSim }: Props) {
  return (
    <div className="tab-panel">
      <div className="page-head">
        <div className="eyebrow">Learn</div>
        <h1>Step-by-step walkthroughs</h1>
        <p>
          Short guided lessons that drive the simulator for you. Stuck on a step? Press <strong>"I don't get it"</strong>{' '}
          for a plain-words version. New here? Start with the first one.
        </p>
      </div>
      {active ? (
        <Coach state={active} goTo={goTo} onExit={exit} onShowSim={showSim} />
      ) : (
        <div className="lesson-list">
          {LESSONS.map((l, i) => (
            <button key={l.id} type="button" className="card lesson-card" onClick={() => start(l)}>
              <div className="eyebrow">Lesson {i + 1}</div>
              <h2 className="h-card">{l.title}</h2>
              <p style={{ color: 'var(--text-muted)', margin: 0 }}>{l.summary}</p>
              <div className="meta">
                <span className={`chip ${l.level === 'Beginner' ? 'chip-ok' : 'chip-info'}`}>{l.level}</span>
                <span className="chip">{l.minutes} min</span>
                <span className="chip">{l.steps.length} steps</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
