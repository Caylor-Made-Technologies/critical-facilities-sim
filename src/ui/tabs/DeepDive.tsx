/**
 * Equipment deep dive (Phase 7): sub-topics, normal readings, how it fails,
 * related tips, "see it live" links into the simulator, and a short quiz.
 */
import { READINGS_NOTE, type DeepDive } from '../../content/deepdive';
import { VERIFY_NOTE } from '../../content/lifecycleTypes';
import { LESSONS } from '../../content/lessons';
import { PROCEDURES } from '../../content/procedures';
import { TIPS } from '../../content/tips';
import { Icon } from '../icons';
import { QuizBlock } from '../QuizBlock';
import type { Jump } from '../search';

export type DeepPart = 'overview' | 'deep' | 'readings' | 'fails' | 'live' | 'quiz';
export const DEEP_PARTS: { id: DeepPart; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'deep', label: 'Deep dive' },
  { id: 'readings', label: 'Normal readings' },
  { id: 'fails', label: 'How it fails' },
  { id: 'live', label: 'Tips & practice' },
  { id: 'quiz', label: 'Quiz' },
];

/** Title of a walkthrough or MOP/drill, or null if the id is unknown. */
export function practiceTitle(kind: 'lesson' | 'proc', id: string): string | null {
  if (kind === 'lesson') return LESSONS.find((l) => l.id === id)?.title ?? null;
  return PROCEDURES.find((p) => p.id === id)?.title ?? null;
}

function Verify() {
  return (
    <div className="callout dd-verify" role="note">
      <Icon name="warning" /> <span>{VERIFY_NOTE}</span>
    </div>
  );
}

interface Props {
  dive: DeepDive;
  part: Exclude<DeepPart, 'overview'>;
  title: string;
  best: number;
  onJump: (j: Jump) => void;
  onFinish: (pct: number, answers: Record<string, boolean>) => void;
}

export function DeepDivePart({ dive, part, title, best, onJump, onFinish }: Props) {
  if (part === 'deep')
    return (
      <section className="dd-part" aria-label={`${title}: deep dive`}>
        {dive.topics.some((t) => t.verify) && <Verify />}
        {dive.topics.map((t) => (
          <div key={t.h} className="dd-topic">
            <h3>
              <span className="dot" aria-hidden="true" />
              {t.h} {t.verify && <span className="chip chip-warn dd-vchip">Verify</span>}
            </h3>
            {t.p.map((x) => (
              <p key={x}>{x}</p>
            ))}
          </div>
        ))}
      </section>
    );

  if (part === 'readings')
    return (
      <section className="dd-part" aria-label={`${title}: normal readings`}>
        <div className="callout dd-verify" role="note">
          <Icon name="warning" /> <span>{READINGS_NOTE}</span> <span className="chip chip-warn dd-vchip">Verify</span>
        </div>
        <div className="table-wrap" tabIndex={0} role="region" aria-label="Normal readings table (scrolls sideways)">
          <table className="t dd-readings">
            <thead>
              <tr>
                <th scope="col">Reading</th>
                <th scope="col">Typical normal</th>
                <th scope="col">If it isn&rsquo;t</th>
              </tr>
            </thead>
            <tbody>
              {dive.readings.map((r) => (
                <tr key={r.what}>
                  <th scope="row">{r.what}</th>
                  <td data-label="Typical normal">{r.normal}</td>
                  <td data-label="If it isn’t">{r.act}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    );

  if (part === 'fails')
    return (
      <section className="dd-part" aria-label={`${title}: how it fails`}>
        <ol className="dd-fails">
          {dive.failures.map((f) => (
            <li key={f.mode} className="card dd-fail">
              <strong>{f.mode}</strong>
              <p>
                <span className="dd-k">Early signs:</span> {f.signs}
              </p>
              <p>
                <span className="dd-k">If nobody acts:</span> {f.then}
              </p>
            </li>
          ))}
        </ol>
      </section>
    );

  if (part === 'live') {
    const tips = dive.tips.map((id) => TIPS.find((t) => t.id === id)).filter((t) => !!t);
    return (
      <section className="dd-part" aria-label={`${title}: tips and practice`}>
        <h3>
          <span className="dot" aria-hidden="true" />
          See it live
        </h3>
        <p className="muted small">Opens in the simulator. Walkthroughs show it; MOPs and drills score you.</p>
        <div className="dd-live">
          {dive.practice.map((x) => {
            const name = practiceTitle(x.kind, x.id);
            if (!name) return null;
            return (
              <button key={x.id} type="button" className="btn" onClick={() => onJump(x.kind === 'lesson' ? { kind: 'lesson', id: x.id } : { kind: 'proc', id: x.id })}>
                <Icon name="bolt" /> {x.kind === 'lesson' ? 'Walkthrough' : x.id.startsWith('drill') ? 'Drill' : 'MOP'}: {name}
              </button>
            );
          })}
        </div>
        <h3>
          <span className="dot" aria-hidden="true" />
          Field tips
        </h3>
        <ul className="dd-tips">
          {tips.map((t) => (
            <li key={t.id} className="card">
              <strong>{t.title}</strong>
              <p>{t.text}</p>
              {t.caution && <p className="dd-caution">{t.caution}</p>}
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <section className="dd-part" aria-label={`${title}: quiz`}>
      <QuizBlock key={dive.id} qs={dive.quiz} best={best} onFinish={onFinish} />
    </section>
  );
}
