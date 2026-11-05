/** Learn tab: guided step-by-step walkthroughs, plus the coach used inside the Simulator. */
import { useState } from 'react';
import { LESSONS, type Lesson, type LessonArea } from '../../content/lessons';
import { PageHead, SectionTabs } from '../common';
import { Figure } from '../figures';
import { Icon } from '../icons';
import type { ProgressHandle } from '../progress';
import { lifeStageDone } from '../progress';
import { FACTS } from '../../content/facts';
import { LifeTrack } from './LifeTrack';

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

type Area = LessonArea | 'life';
const AREAS: { id: Area; label: string }[] = [
  { id: 'life', label: 'Life of a data center' },
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
  p: ProgressHandle;
  /** Start the Level 5 IST practice on the simulator. */
  runIst: () => void;
  /** Open this Life of a Data Center stage (from search). */
  lifeOpen?: string | null;
}

export function LearnTab({ active, done, start, goTo, exit, finish, showSim, p, runIst, lifeOpen }: Props) {
  const [area, setArea] = useState<Area>(active?.lesson.area ?? 'life');
  const counts = Object.fromEntries(
    AREAS.filter((a): a is { id: LessonArea; label: string } => a.id !== 'life').map((a) => {
      const ls = LESSONS.filter((l) => l.area === a.id);
      return [a.id, `${ls.filter((l) => done.includes(l.id)).length}/${ls.length}`];
    }),
  ) as Partial<Record<Area, string>>;
  counts.life = `${FACTS.lifeStages.filter((id) => lifeStageDone(p.progress, id)).length}/10`;
  const list = LESSONS.filter((l) => l.area === area);
  return (
    <div className="tab-panel">
      <PageHead eyebrow="Learn" title="Learn the plant">
        Start with the life of a data center, from an empty field to decommissioning. Then the step-by-step
        walkthroughs: many drive the simulator for you. Stuck? Press "I don't get it" on any step.
      </PageHead>
      {active ? (
        <Coach state={active} goTo={goTo} onExit={exit} onShowSim={showSim} onFinish={() => finish(active.lesson.id)} />
      ) : (
        <>
          <SectionTabs label="Lesson sections" sections={AREAS} value={area} onChange={setArea} counts={counts} />
          {area === 'life' ? (
            <LifeTrack p={p} onRunIst={runIst} openId={lifeOpen} />
          ) : (
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
          )}
        </>
      )}
    </div>
  );
}
