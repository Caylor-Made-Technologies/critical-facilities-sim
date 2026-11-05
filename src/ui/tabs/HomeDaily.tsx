/** Home cards that need the quiz and tips content: loaded a moment after the first paint. */
import { useMemo, useState } from 'react';
import { PROCEDURES } from '../../content/procedures';
import { HAZARD_HUNTS } from '../../content/safetyTools';
import { TIPS, tipOfDay } from '../../content/tips';
import { Confetti } from '../common';
import { buzz } from '../haptics';
import { dailyChallenge } from '../daily';
import { Icon } from '../icons';
import { streakOf, today, type ProgressHandle } from '../progress';
import type { Tab } from '../nav';
import type React from 'react';
import { TipCard } from './TipsTab';

export function DailyCard({ p, go, startProc }: { p: ProgressHandle; go: (t: Tab) => void; startProc: (id: string) => void }) {
  const date = today();
  const ch = useMemo(() => dailyChallenge(date), [date]);
  const [picks, setPicks] = useState<(number | null)[]>([null, null, null]);
  const [burst, setBurst] = useState(0);
  const doneScore = p.progress.daily[date];
  const answered = picks.every((x) => x !== null);
  const right = picks.filter((x, i) => x === ch.questions[i]!.answer).length;
  const streak = streakOf(p.progress.daily);
  const proc = PROCEDURES.find((x) => x.id === ch.procId)!;
  const hunt = HAZARD_HUNTS.find((x) => x.id === ch.huntId)!;

  const pick = (qi: number, oi: number) => {
    if (picks[qi] !== null) return;
    buzz(oi === ch.questions[qi]!.answer ? 20 : [40, 60, 40]);
    const next = picks.map((x, i) => (i === qi ? oi : x));
    setPicks(next);
    if (next.every((x) => x !== null)) {
      const score = Math.round((next.filter((x, i) => x === ch.questions[i]!.answer).length / 3) * 100);
      p.finishDaily(score);
      if (score === 100) setBurst(Date.now());
    }
  };

  return (
    <section className="card daily" aria-labelledby="daily-h">
      <div className="daily-top">
        <div>
          <div className="eyebrow" id="daily-h">
            Daily challenge · {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
          </div>
          <h2 className="h-card">Three questions. One minute. Keep the streak.</h2>
        </div>
        <div className={`streak${streak ? ' hot' : ''}`} aria-label={`${streak} day streak`}>
          <Icon name="flame" />
          <strong>{streak}</strong>
          <span>day{streak === 1 ? '' : 's'}</span>
        </div>
      </div>
      {doneScore !== undefined && !answered ? (
        <p className="daily-done">
          <Icon name="check" /> Done for today: {doneScore} / 100. Come back tomorrow to grow your streak.
        </p>
      ) : (
        <ol className="daily-qs">
          {ch.questions.map((q, qi) => (
            <li key={q.id}>
              <p className="daily-q">{q.q}</p>
              <div className="daily-opts" role="group" aria-label={`Question ${qi + 1} answers`}>
                {q.options.map((o, oi) => {
                  const chosen = picks[qi] === oi;
                  const state = picks[qi] === null ? '' : oi === q.answer ? ' right' : chosen ? ' wrong' : ' dim';
                  return (
                    <button key={o} type="button" className={`daily-opt${state}`} onClick={() => pick(qi, oi)} disabled={picks[qi] !== null} aria-pressed={chosen}>
                      {o}
                    </button>
                  );
                })}
              </div>
              {picks[qi] !== null && <p className="daily-why">{q.why}</p>}
            </li>
          ))}
        </ol>
      )}
      {answered && (
        <p className="daily-score" aria-live="polite">
          <strong>
            {right} of 3 right{right === 3 ? '. Perfect!' : '.'}
          </strong>{' '}
          Streak: {streak} day{streak === 1 ? '' : 's'}.
        </p>
      )}
      <div className="daily-more">
        <span className="muted">Today's practice:</span>
        <button className="btn btn-sm" type="button" onClick={() => startProc(proc.id)}>
          <Icon name="play" /> {proc.title}
        </button>
        <button className="btn btn-sm" type="button" onClick={() => go('safety')}>
          <Icon name="eye" /> Hazard hunt: {hunt.title}
        </button>
      </div>
      <Confetti burst={burst} />
    </section>
  );
}

export function TipOfDay({ p, go }: { p: ProgressHandle; go: (t: Tab) => void }) {
  const [offset, setOffset] = useState(0);
  const base = TIPS.indexOf(tipOfDay(today()));
  const tip = TIPS[(base + offset) % TIPS.length]!;
  return (
    <section className="tip-day" aria-labelledby="tipday-h">
      <div className="roll-head">
        <h2 id="tipday-h" className="h-card">
          <span aria-hidden="true">💡</span> {offset === 0 ? 'Tip of the day' : 'Another tip'}
        </h2>
        <div className="whats-new-btns">
          <button className="btn btn-sm" type="button" onClick={() => setOffset(offset + 1)}>
            <Icon name="reset" /> Next tip
          </button>
          <button className="btn btn-sm btn-ghost" type="button" onClick={() => go('tips')}>
            All {TIPS.length} <Icon name="arrow-right" />
          </button>
        </div>
      </div>
      <div className="roll-card" key={tip.id} aria-live="polite">
        <TipCard tip={tip} saved={p.progress.favTips.includes(tip.id)} onSave={() => p.toggleTip(tip.id)} />
      </div>
    </section>
  );
}
