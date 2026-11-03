/** Home: hero, growth path (XP + levels), and a door into every subject. */
import { LESSONS } from '../../content/lessons';
import { NEVER } from '../../content/neverdo';
import { QUIZ } from '../../content/quiz';
import { EQUIPMENT } from '../../content/equipment';
import { GLOSSARY } from '../../content/glossary';
import { PROCEDURES } from '../../content/procedures';
import { ROUNDS } from '../../content/rounds';
import { grade } from '../../sim';
import { Icon } from '../icons';
import { fmtSecs, LEVELS, levelOf, type ProgressHandle } from '../progress';
import { NAV, type Tab } from '../nav';
import { CountUp } from '../common';
import { BadgeWall, DailyCard, InstallButton, PathCard, QuickStart, TipOfDay } from './HomeExtras';



function CircuitArt() {
  // Decorative circuit traces, in the spirit of the CM brand mark (original artwork).
  return (
    <svg className="hero-art" viewBox="0 0 600 260" aria-hidden="true" focusable="false">
      <g className="trace">
        <path d="M0,60 H140 L170,90 H300 L330,60 H600" />
        <path d="M0,140 H90 L120,170 H260 L290,140 H420 L450,170 H600" />
        <path d="M0,220 H200 L230,190 H380 L410,220 H600" />
        <path d="M170,90 V140 M330,60 V20 M450,170 V230 M230,190 V140" />
      </g>
      <g className="pulse">
        <path d="M0,60 H140 L170,90 H300 L330,60 H600" />
        <path d="M0,140 H90 L120,170 H260 L290,140 H420 L450,170 H600" />
        <path d="M0,220 H200 L230,190 H380 L410,220 H600" />
      </g>
      <g className="nodes">
        {[
          [140, 60],
          [170, 90],
          [300, 90],
          [330, 60],
          [330, 20],
          [120, 170],
          [260, 170],
          [290, 140],
          [450, 170],
          [450, 230],
          [230, 190],
          [230, 140],
          [380, 190],
          [170, 140],
        ].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={4.5} />
        ))}
      </g>
    </svg>
  );
}

function Ring({ pct, label }: { pct: number; label: string }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <svg className="ring" viewBox="0 0 128 128" role="img" aria-label={label}>
      <circle cx="64" cy="64" r={r} className="ring-bg" />
      <circle cx="64" cy="64" r={r} className="ring-fg" strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, pct))} />
    </svg>
  );
}

interface Props {
  p: ProgressHandle;
  go: (t: Tab) => void;
  startTour: () => void;
  startProc: (id: string) => void;
}

export function HomeTab({ p, go, startTour, startProc }: Props) {
  const lvl = levelOf(p.xp);
  const lessonsDone = p.progress.lessons.length;
  const quizRight = Object.values(p.progress.quiz).filter(Boolean).length;
  const neverCount = Object.values(NEVER).reduce((n, l) => n + l.length, 0);

  return (
    <div className="tab-panel home">
      <section className="hero" aria-labelledby="hero-h">
        <CircuitArt />
        <div className="hero-inner">
          <div className="eyebrow">Critical facilities, from utility to chip</div>
          <h1 id="hero-h">
            Learn the plant that <span className="grad">never sleeps.</span>
          </h1>
          <p className="hero-sub">
            Break a data center on purpose, watch the backups catch it, and learn the rules that keep people safe and
            servers running. Free, offline, and built to grow with you.
          </p>
          <div className="hero-cta">
            <button className="btn btn-primary btn-lg" type="button" onClick={startTour}>
              <Icon name="play" /> Start the guided tour
            </button>
            <button className="btn btn-lg" type="button" onClick={() => go('sim')}>
              <Icon name="bolt" /> Open the simulator
            </button>
            <InstallButton />
          </div>
          <ul className="hero-stats" aria-label="What's inside">
            <li>
              <strong><CountUp value={LESSONS.length} /></strong> walkthroughs
            </li>
            <li>
              <strong><CountUp value={PROCEDURES.length} /></strong> scored MOPs and drills
            </li>
            <li>
              <strong><CountUp value={QUIZ.length} /></strong> quiz questions
            </li>
            <li>
              <strong><CountUp value={EQUIPMENT.length} /></strong> equipment guides
            </li>
            <li>
              <strong><CountUp value={GLOSSARY.length} /></strong> terms
            </li>
            <li>
              <strong><CountUp value={7} /></strong> redundancy designs
            </li>
          </ul>
        </div>
      </section>

      <PathCard p={p} go={go} />
      <QuickStart go={go} />

      <section className="card whats-new" aria-labelledby="new-h">
        <span className="new-badge" aria-hidden="true">
          <Icon name="shield" />
        </span>
        <div>
          <div className="eyebrow" id="new-h">
            New: My Path
          </div>
          <p>
            Your own training plan. Add your resume (it's read on your phone and never uploaded), answer a few questions,
            take a 2-minute skill check, and get a week-by-week path with a skill radar and your spot on the career
            ladder.
          </p>
        </div>
        <div className="whats-new-btns">
          <button className="btn btn-primary" type="button" onClick={() => go('mypath')}>
            Build my path <Icon name="arrow-right" />
          </button>
          <button className="btn" type="button" onClick={() => go('tips')}>
            Tips & Tricks
          </button>
        </div>
      </section>

      <DailyCard p={p} go={go} startProc={startProc} />

      <section className="grid growth" aria-labelledby="growth-h">
        <div className="card level-card">
          <Ring pct={lvl.pct} label={`${Math.round(lvl.pct * 100)} percent to the next level`} />
          <div>
            <div className="eyebrow" id="growth-h">
              Your growth path
            </div>
            <h2 className="level-name">{lvl.name}</h2>
            <p className="level-blurb">{lvl.blurb}</p>
            <div className="xp-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(lvl.pct * 100)} aria-label="Progress to next level">
              <span style={{ width: `${Math.round(lvl.pct * 100)}%` }} />
            </div>
            <div className="xp-meta">
              <span>{p.xp} XP</span>
              <span>{lvl.next ? `${lvl.next.xp - p.xp} XP to ${lvl.next.name}` : 'Top level reached'}</span>
            </div>
          </div>
        </div>
        <div className="card">
          <h2 className="h-card">Level ladder</h2>
          <ol className="ladder">
            {LEVELS.map((l, i) => (
              <li key={l.name} className={i < lvl.index ? 'done' : i === lvl.index ? 'current' : ''}>
                <span className="ladder-dot" aria-hidden="true" />
                <span className="ladder-name">{l.name}</span>
                <span className="ladder-xp">{l.xp} XP</span>
              </li>
            ))}
          </ol>
          <div className="mini-stats">
            <span>
              <strong>{lessonsDone}</strong>/{LESSONS.length} lessons
            </span>
            <span>
              <strong>{quizRight}</strong>/{QUIZ.length} quiz correct
            </span>
            <span>
              <strong>{p.progress.guides.length}</strong>/{EQUIPMENT.length} guides read
            </span>
            <span>
              <strong>{Object.keys(p.progress.procs).length}</strong>/{PROCEDURES.length} procedures run
            </span>
          </div>
        </div>
      </section>

      <BadgeWall p={p} />

      <section className="card record print-area" aria-labelledby="record-h">
        <div className="print-only print-head">
          <strong>Critical Facilities Simulator · Practice record</strong>
          <span>Printed {new Date().toISOString().slice(0, 10)} · {lvl.name}, {p.xp} XP</span>
        </div>
        <div className="record-head">
          <h2 id="record-h" className="h-card">
            Training record
          </h2>
          <div className="record-actions no-print">
            <button className="btn btn-sm" type="button" onClick={() => window.print()}>
              <Icon name="book" /> Print / save PDF
            </button>
            <button className="btn btn-sm" type="button" onClick={() => go('procedures')}>
              <Icon name="list" /> All practice
            </button>
          </div>
        </div>
        <ul className="record-list">
          {[
            ...PROCEDURES.map((pr) => ({ id: pr.id, title: pr.title, kind: pr.kind === 'mop' ? 'MOP' : 'Drill' })),
            { id: 'drill-surprise', title: 'Surprise drill', kind: 'Drill' },
            ...ROUNDS.map((r) => ({ id: r.id, title: `Rounds: ${r.title}`, kind: 'Rounds' })),
          ].map((pr) => {
            const best = p.progress.procs[pr.id];
            const time = p.progress.times[pr.id];
            return (
              <li key={pr.id} className={best === undefined ? 'todo' : ''}>
                <span className={`record-grade${best === undefined ? '' : ` g-${grade(best).letter[0]!.toLowerCase()}`}`} aria-hidden="true">
                  {best === undefined ? '–' : grade(best).letter}
                </span>
                <span className="record-name">
                  {pr.title}
                  <small>
                    {pr.kind} · {best === undefined ? 'not run yet' : `best ${best}/100`}
                    {time !== undefined && ` · ${fmtSecs(time)}`}
                  </small>
                </span>
              </li>
            );
          })}
        </ul>
        <p className="record-note">
          Saved only in this browser. Nothing is sent anywhere. This is a practice record from a free educational simulator, not a
          qualification, certification or site authorization.
        </p>
      </section>

      <TipOfDay p={p} go={go} />

      <section aria-labelledby="explore-h">
        <h2 id="explore-h" className="section-title">
          Pick a subject
        </h2>
        <div className="topic-grid">
          {NAV.filter((n) => n.id !== 'home').map((n) => (
            <button key={n.id} type="button" className={`topic-card${n.id === 'never' ? ' danger' : ''}`} onClick={() => go(n.id)}>
              <span className="topic-icon">
                <Icon name={n.icon} />
              </span>
              <span className="topic-title">{n.label}</span>
              <span className="topic-desc">{n.id === 'never' ? `${neverCount} hard stops you must never cross` : n.desc}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
