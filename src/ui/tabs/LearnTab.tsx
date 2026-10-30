/** Learn tab: guided step-by-step walkthroughs, plus the coach used inside the Simulator. */
import { useState } from 'react';
import { LESSONS, type Lesson, type LessonArea } from '../../content/lessons';
import { PageHead, SectionTabs } from '../common';
import { Figure } from '../figures';
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
  onFinish?: () => void;
}

/** Step-by-step coach card. Shows a simpler explanation on request. */
export function Coach({ state, compact, goTo, onExit, onShowSim, onBackToLesson, onFinish }: CoachProps) {
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
        {s.figure && <Figure id={s.figure.id} highlight={s.figure.highlight} />}
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
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => {
              onFinish?.();
              onExit();
            }}
          >
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

const AREAS: { id: LessonArea; label: string }[] = [
  { id: 'electrical', label: 'Electrical' },
  { id: 'mechanical', label: 'Mechanical' },
  { id: 'safety', label: 'Safety & operations' },
];

interface Props {
  active: LessonState | null;
  done: string[];
  start: (lesson: Lesson) => void;
  goTo: (step: number) => void;
  exit: () => void;
  finish: (id: string) => void;
  showSim: () => void;
}

export function LearnTab({ active, done, start, goTo, exit, finish, showSim }: Props) {
  const [area, setArea] = useState<LessonArea>(active?.lesson.area ?? 'electrical');
  const counts = Object.fromEntries(
    AREAS.map((a) => {
      const ls = LESSONS.filter((l) => l.area === a.id);
      return [a.id, `${ls.filter((l) => done.includes(l.id)).length}/${ls.length}`];
    }),
  ) as Record<LessonArea, string>;
  const list = LESSONS.filter((l) => l.area === area);
  return (
    <div className="tab-panel">
      <PageHead eyebrow="Learn" title="Step-by-step walkthroughs">
        Short guided lessons. Electrical ones drive the simulator for you; mechanical ones use animated cutaways. Stuck?
        Press "I don't get it" on any step for a plain-words version.
      </PageHead>
      {active ? (
        <Coach state={active} goTo={goTo} onExit={exit} onShowSim={showSim} onFinish={() => finish(active.lesson.id)} />
      ) : (
        <>
          <SectionTabs label="Lesson sections" sections={AREAS} value={area} onChange={setArea} counts={counts} />
          <div className="lesson-list" key={area}>
            {list.map((l, i) => {
              const isDone = done.includes(l.id);
              return (
                <button key={l.id} type="button" className={`card lesson-card${isDone ? ' done' : ''}`} onClick={() => start(l)}>
                  <div className="eyebrow">
                    Lesson {i + 1}
                    {isDone && <span className="done-tag"> · <Icon name="check" /> Done</span>}
                  </div>
                  <h2 className="h-card">{l.title}</h2>
                  <p style={{ color: 'var(--text-muted)', margin: 0 }}>{l.summary}</p>
                  <div className="meta">
                    <span className={`chip ${l.level === 'Beginner' ? 'chip-ok' : 'chip-info'}`}>{l.level}</span>
                    <span className="chip">{l.minutes} min</span>
                    <span className="chip">{l.steps.length} steps</span>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
