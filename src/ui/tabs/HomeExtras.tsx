/** Home extras: daily challenge with streak, badge wall, and the install button. */
import { useEffect, useMemo, useState } from 'react';
import { PROCEDURES } from '../../content/procedures';
import { BADGES } from '../badges';
import { Confetti } from '../common';
import { buzz } from '../haptics';
import { Icon } from '../icons';
import { streakOf, today, type ProgressHandle } from '../progress';
import { NAV, type Tab } from '../nav';
import type React from 'react';
import { FACTS } from '../../content/facts';
import { buildPath, itemDone, scoreProfile } from '../../content/path';

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

const LAST_KEY = 'cfs-last-tab';

/** Remember the last tab someone used (local only) so Home can offer "Jump back in". */
export function rememberTab(t: Tab): void {
  if (t === 'home' || t === 'about' || t === 'feedback') return;
  try {
    localStorage.setItem(LAST_KEY, t);
  } catch {
    /* storage blocked */
  }
}

function lastTab(): Tab | null {
  try {
    const t = localStorage.getItem(LAST_KEY);
    return t && NAV.some((n) => n.id === t) ? (t as Tab) : null;
  } catch {
    return null;
  }
}

const QUICK: { tab: Tab; emoji: string; title: string; text: string }[] = [
  { tab: 'mypath', emoji: '📐', title: 'My Blueprint', text: 'Your career, engineered' },
  { tab: 'learn', emoji: '🏗️', title: 'Life of a data center', text: 'Field to decommissioning, 10 stages' },
  { tab: 'procedures', emoji: '🎯', title: 'Practice a drill', text: 'Scored MOPs and emergencies' },
  { tab: 'tips', emoji: '💡', title: 'Quick tips', text: `${FACTS.tips} tricks for a pinch` },
  { tab: 'tools', emoji: '🧮', title: 'Do the math', text: 'Amps, runtime, tons, fuel' },
  { tab: 'sim', emoji: '⚡', title: 'Break the plant', text: 'Fail things, watch backups' },
  { tab: 'safety', emoji: '🦺', title: 'Stay safe', text: 'Rules, drills, emergency cards' },
];

export function QuickStart({ go }: { go: (t: Tab) => void }) {
  const last = lastTab();
  const lastNav = last ? NAV.find((n) => n.id === last) : null;
  return (
    <section className="quick" aria-labelledby="quick-h">
      <h2 id="quick-h" className="quick-h">
        What do you want to do?
      </h2>
      {lastNav && (
        <button type="button" className="jump-back" onClick={() => go(lastNav.id)}>
          <span className="jump-icon" aria-hidden="true">
            <Icon name={lastNav.icon} />
          </span>
          <span>
            <strong>Jump back in</strong>
            <span>{lastNav.label}</span>
          </span>
          <Icon name="arrow-right" />
        </button>
      )}
      <div className="quick-grid">
        {QUICK.map((q, i) => (
          <button key={q.tab} type="button" className="quick-tile" style={{ '--i': i } as React.CSSProperties} onClick={() => go(q.tab)}>
            <span className="quick-emoji" aria-hidden="true">
              {q.emoji}
            </span>
            <strong>{q.title}</strong>
            <span>{q.text}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

/** Home card: your path's next step, or an invite to build one. */
export function PathCard({ p, go }: { p: ProgressHandle; go: (t: Tab) => void }) {
  const prof = p.progress.profile;
  if (!prof) {
    return (
      <button type="button" className="path-invite" onClick={() => go('mypath')}>
        <span className="path-invite-orb" aria-hidden="true">
          <Icon name="blueprint" />
        </span>
        <span>
          <strong>Get your Caylor Made Blueprint</strong>
          <span>Your career, engineered. Add your resume (it stays on your phone), answer a few questions, take a 2-minute skill check.</span>
        </span>
        <Icon name="arrow-right" />
      </button>
    );
  }
  const s = scoreProfile(prof);
  const path = buildPath(prof, s);
  const all = path.phases.flatMap((ph) => ph.items);
  const done = all.filter((it) => itemDone(it, p.progress, prof.done)).length;
  const next = all.find((it) => !itemDone(it, p.progress, prof.done));
  return (
    <button type="button" className="path-invite has-path" onClick={() => go('mypath')}>
      <span className="path-invite-ring" aria-hidden="true">
        <svg viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="16" className="ring-bg" />
          <circle cx="20" cy="20" r="16" className="ring-fg" strokeDasharray={100.5} strokeDashoffset={100.5 * (1 - (all.length ? done / all.length : 0))} />
        </svg>
        <span>{all.length ? Math.round((done / all.length) * 100) : 0}%</span>
      </span>
      <span>
        <strong>{prof.name ? `${prof.name}'s blueprint` : 'Your blueprint'} · rev {prof.rev} · {done}/{all.length} done</strong>
        <span>{next ? `Next up: ${next.title}` : 'Fully energized. Draw your next revision!'}</span>
      </span>
      <Icon name="arrow-right" />
    </button>
  );
}
