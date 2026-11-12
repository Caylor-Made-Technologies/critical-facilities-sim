/** Procedures tab: MOP practice, emergency drills (plus a surprise drill) and rounds practice, each scored. */
import { useState } from 'react';
import { DRILLS, MOPS, SURPRISE_COUNT, surpriseDrill } from '../../content/procedures';
import { ROUNDS } from '../../content/rounds';
import { grade, SCORE, TOPOLOGIES, WEATHER, type Procedure } from '../../sim';
import { PageHead, SectionTabs } from '../common';
import { Icon } from '../icons';
import { fmtSecs } from '../progress';
import { RoundsPractice } from './RoundsPractice';
import { use3d } from '../view3d';

type Section = 'mop' | 'drill' | 'rounds';
const SECTIONS: { id: Section; label: string }[] = [
  { id: 'mop', label: 'MOP practice' },
  { id: 'drill', label: 'Emergency drills' },
  { id: 'rounds', label: 'Rounds' },
];
type Level = 'all' | Procedure['level'] | 'todo';
const LEVELS: { id: Level; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'todo', label: 'Not done yet' },
  { id: 'Beginner', label: 'Beginner' },
  { id: 'Intermediate', label: 'Intermediate' },
  { id: 'Advanced', label: 'Advanced' },
];
const LEVEL_ORDER: Procedure['level'][] = ['Beginner', 'Intermediate', 'Advanced'];

interface Props {
  best: Record<string, number>;
  times: Record<string, number>;
  start: (p: Procedure) => void;
  /** Start an 8-hour shift in shift mode (Phase 8d). */
  startShift?: () => void;
  /** Walk a live round on the simulator (Phase 9d). */
  startRound?: () => void;
  onRound: (id: string, score: number) => void;
}

function Tile({ p, best, time, start }: { p: Procedure; best?: number; time?: number; start: (p: Procedure) => void }) {
  return (
    <button type="button" className={`card lesson-card proc-tile${best !== undefined ? ' done' : ''}`} onClick={() => start(p)}>
      <div className="eyebrow">
        {p.kind === 'mop' ? 'MOP' : 'Drill'}
        {best !== undefined && (
          <span className="done-tag">
            {' '}
            · <Icon name="star" /> Best {best} ({grade(best).letter}){time !== undefined && ` · ${fmtSecs(time)}`}
          </span>
        )}
      </div>
      <h2 className="h-card">{p.title}</h2>
      <p style={{ color: 'var(--text-muted)', margin: 0 }}>{p.summary}</p>
      <div className="meta">
        <span className={`chip ${p.level === 'Beginner' ? 'chip-ok' : p.level === 'Advanced' ? 'chip-warn' : 'chip-info'}`}>{p.level}</span>
        <span className="chip">{p.steps.length} steps</span>
        <span className="chip">{TOPOLOGIES[p.topology].label}</span>
        {p.weather && <span className="chip">{WEATHER[p.weather].label}</span>}
      </div>
      <span className="tile-go" aria-hidden="true">
        {best !== undefined ? 'Run again' : 'Start'} <Icon name="arrow-right" />
      </span>
    </button>
  );
}

export function ProceduresTab({ best, times, start, startShift, startRound, onRound }: Props) {
  const [section, setSection] = useState<Section>('mop');
  const [level, setLevel] = useState<Level>('all');
  const all = [...MOPS, ...DRILLS];
  const counts = {
    mop: `${MOPS.filter((p) => p.id in best).length}/${MOPS.length}`,
    drill: `${DRILLS.filter((p) => p.id in best).length}/${DRILLS.length}`,
    rounds: `${ROUNDS.filter((r) => r.id in best).length}/${ROUNDS.length}`,
  };
  // Recommended next: the easiest one not done yet, MOPs first.
  const next = LEVEL_ORDER.flatMap((l) => all.filter((p) => p.level === l && !(p.id in best)))[0];
  const list = (section === 'mop' ? MOPS : DRILLS).filter((p) => (level === 'all' ? true : level === 'todo' ? !(p.id in best) : p.level === level));

  return (
    <div className="tab-panel">
      <PageHead eyebrow="Procedures" title="Practice the real thing, safely">
        Run a method of procedure (MOP) step by step on the live plant, handle an emergency drill, or work a round sheet. Every
        move is checked and scored. Break things here so you never break them at work.
      </PageHead>

      {next && section !== 'rounds' && (
        <button type="button" className="card next-up" onClick={() => start(next)}>
          <span className="next-icon" aria-hidden="true">
            <Icon name="target" />
          </span>
          <span>
            <span className="eyebrow">Recommended next</span>
            <strong>{next.title}</strong>
            <small>
              {next.kind === 'mop' ? 'MOP' : 'Drill'} · {next.level} · {next.steps.length} steps
            </small>
          </span>
          <Icon name="arrow-right" />
        </button>
      )}

      {startShift && (
        <button type="button" className="card next-up shift-start" onClick={startShift}>
          <span className="next-icon" aria-hidden="true">
            <Icon name="clock" />
          </span>
          <span>
            <span className="eyebrow">Shift mode{best['shift-mode'] !== undefined ? ` · best ${best['shift-mode']}` : ''}</span>
            <strong>Work an 8-hour shift in about 15 minutes</strong>
            <small>Random events, alarms to acknowledge, repairs to return to service, then a scored hand-off.</small>
          </span>
          <Icon name="arrow-right" />
        </button>
      )}

      <Practice3DToggle />
      <SectionTabs label="Practice types" sections={SECTIONS} value={section} onChange={setSection} counts={counts} />

      {section === 'rounds' ? (
        <div className="section-body">
          {startRound && (
            <button type="button" className="card next-up rg-start" onClick={startRound}>
              <span className="next-icon" aria-hidden="true">
                <Icon name="clipboard" />
              </span>
              <span>
                <span className="eyebrow">Live round{best['rounds-live'] !== undefined ? ` · best ${best['rounds-live']}` : ''}</span>
                <strong>Walk a live round on the simulator</strong>
                <small>Go station to station, read the gauges, write the values down and flag what’s out of range. Something is wrong somewhere.</small>
              </span>
              <Icon name="arrow-right" />
            </button>
          )}
          <RoundsPractice best={best} onDone={onRound} />
        </div>
      ) : (
        <>
          <div className="callout">
            <strong>How scoring works: </strong>
            start at 100. A blocked action costs {SCORE.blocked}, a hint {SCORE.hint}, a wrong call {SCORE.wrongChoice}, and
            dropping load costs {SCORE.dropped}. The stopwatch saves your best time too. Generic training only, not your
            site's procedures.
          </div>
          <div className="filter-row" role="group" aria-label="Filter by level">
            {LEVELS.map((l) => (
              <button key={l.id} type="button" className="filter-chip" aria-pressed={level === l.id} onClick={() => setLevel(l.id)}>
                {l.label}
              </button>
            ))}
          </div>
          <div className="lesson-list" key={`${section}-${level}`}>
            {section === 'drill' && (level === 'all' || level === 'Advanced' || (level === 'todo' && !('drill-surprise' in best))) && (
              <button type="button" className="card lesson-card proc-tile surprise" onClick={() => start(surpriseDrill())}>
                <div className="eyebrow">
                  Drill · random
                  {'drill-surprise' in best && (
                    <span className="done-tag">
                      {' '}
                      · <Icon name="star" /> Best {best['drill-surprise']}
                    </span>
                  )}
                </div>
                <h2 className="h-card">Surprise drill</h2>
                <p style={{ color: 'var(--text-muted)', margin: 0 }}>
                  One of {SURPRISE_COUNT} random failures. No warning which. Read the event log, find it, get it fixed.
                </p>
                <div className="meta">
                  <span className="chip chip-warn">Advanced</span>
                  <span className="chip">Different every time</span>
                </div>
                <span className="tile-go" aria-hidden="true">
                  Roll the dice <Icon name="arrow-right" />
                </span>
              </button>
            )}
            {list.map((p) => (
              <Tile key={p.id} p={p} best={best[p.id]} time={times[p.id]} start={start} />
            ))}
            {list.length === 0 && (
              <p className="proc-clean">
                <Icon name="check" /> Nothing left here. Try another level or run one again to beat your time.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/** Choose 2D or 3D for every MOP and drill (shared with the Simulator's switch). */
function Practice3DToggle() {
  const [on, set] = use3d();
  return (
    <section className={`card practice3d${on ? ' on' : ''}`} aria-labelledby="p3d-h">
      <span className="practice3d-icon" aria-hidden="true">
        <Icon name="layers" />
      </span>
      <div>
        <h2 id="p3d-h" className="h-card">
          Practice in 3D
        </h2>
        <p className="muted small">Run MOPs and drills on a 3D plant: the camera flies to each device as the steps move on. Same scoring as 2D.</p>
      </div>
      <div className="mode-switch" role="group" aria-label="Practice view">
        <button type="button" aria-pressed={!on} onClick={() => set(false)}>
          2D
        </button>
        <button type="button" aria-pressed={on} onClick={() => set(true)}>
          3D
        </button>
      </div>
    </section>
  );
}
