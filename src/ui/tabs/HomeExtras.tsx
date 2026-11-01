/** Home extras: daily challenge with streak, badge wall, and the install button. */
import { useEffect, useMemo, useState } from 'react';
import { PROCEDURES } from '../../content/procedures';
import { HAZARD_HUNTS } from '../../content/safetyTools';
import { BADGES } from '../badges';
import { Confetti } from '../common';
import { dailyChallenge } from '../daily';
import { Icon } from '../icons';
import { streakOf, today, type ProgressHandle } from '../progress';
import type { Tab } from '../nav';

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

export function BadgeWall({ p }: { p: ProgressHandle }) {
  const got = BADGES.filter((b) => b.earned(p.progress)).length;
  return (
    <section className="card" aria-labelledby="badges-h">
      <div className="daily-top">
        <h2 className="h-card" id="badges-h">
          Badges
        </h2>
        <span className="score-pill">
          {got} / {BADGES.length}
        </span>
      </div>
      <ul className="badge-grid">
        {BADGES.map((b) => {
          const on = b.earned(p.progress);
          return (
            <li key={b.id} className={`badge${on ? ' on' : ''}`}>
              <span className="badge-medal" aria-hidden="true">
                <Icon name={on ? b.icon : 'lock'} />
              </span>
              <strong>{b.name}</strong>
              <span>
                <span className="visually-hidden">{on ? 'Earned. ' : 'Not earned yet. '}</span>
                {b.how}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/** "Install app" when the browser offers it; iPhone gets the Share-menu steps instead. */
export function InstallButton() {
  const [evt, setEvt] = useState<PromptEvent | null>(null);
  const [installed, setInstalled] = useState(() => window.matchMedia?.('(display-mode: standalone)').matches ?? false);
  const [help, setHelp] = useState(false);
  useEffect(() => {
    const on = (e: Event) => {
      e.preventDefault();
      setEvt(e as PromptEvent);
    };
    const done = () => setInstalled(true);
    window.addEventListener('beforeinstallprompt', on);
    window.addEventListener('appinstalled', done);
    return () => {
      window.removeEventListener('beforeinstallprompt', on);
      window.removeEventListener('appinstalled', done);
    };
  }, []);
  if (installed) return null;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  return (
    <div className="install">
      <button
        className="btn btn-lg"
        type="button"
        onClick={async () => {
          if (evt) {
            await evt.prompt();
            setEvt(null);
          } else setHelp((h) => !h);
        }}
        aria-expanded={evt ? undefined : help}
      >
        <img src={`${import.meta.env.BASE_URL}brand/app-mark.png`} alt="" width={22} height={22} /> Install the app
      </button>
      {help && (
        <p className="install-help">
          {ios ? 'In Safari, tap the Share button, then "Add to Home Screen".' : 'Open your browser menu (⋮) and choose "Install app" or "Add to Home screen".'} It works offline after that.
        </p>
      )}
    </div>
  );
}
