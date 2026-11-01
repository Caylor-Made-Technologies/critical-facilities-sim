/**
 * Safety Center: golden rules, the safety library, and hands-on practice
 * (approach boundaries, LOTO order, hazard hunts, emergency cards, and a
 * printable pre-task brief). Nothing leaves the browser.
 */
import { useMemo, useState } from 'react';
import type React from 'react';
import { SAFETY } from '../../content/safety';
import {
  BRIEF_PERMITS,
  BRIEF_PPE,
  EMERGENCY_CARDS,
  EMPTY_BRIEF,
  ENERGY_SOURCES,
  GOLDEN_RULES,
  HAZARD_HUNTS,
  LABEL_EXAMPLES,
  LOTO_DRILLS,
  SHOCK_BOUNDARIES,
  boundaryVerdict,
  briefGaps,
  lotoScore,
  scoreHunt,
  shuffledOrder,
  type Brief,
  type HazardHunt,
  type LotoDrill,
  type Who,
} from '../../content/safetyTools';
import { Confetti, DangerMark, PageHead, SectionTabs } from '../common';
import { Icon } from '../icons';
import { ArticlesTab } from './ArticlesTab';

type Section = 'rules' | 'library' | 'boundaries' | 'loto' | 'hunt' | 'emergency' | 'brief';

const SECTIONS: { id: Section; label: string }[] = [
  { id: 'rules', label: 'Golden rules' },
  { id: 'library', label: 'Library' },
  { id: 'boundaries', label: 'Boundaries' },
  { id: 'loto', label: 'LOTO drill' },
  { id: 'hunt', label: 'Hazard hunt' },
  { id: 'emergency', label: 'Emergency' },
  { id: 'brief', label: 'Pre-task brief' },
];

interface Props {
  scores: Record<string, number>;
  onScore: (id: string, score: number) => void;
  openArticle?: string | null;
}

export function SafetyTab({ scores, onScore, openArticle }: Props) {
  const [sec, setSec] = useState<Section>(openArticle ? 'library' : 'rules');
  const drills = LOTO_DRILLS.length + HAZARD_HUNTS.length;
  const done = [...LOTO_DRILLS, ...HAZARD_HUNTS].filter((d) => d.id in scores).length;
  return (
    <div className="tab-panel safety-center">
      <PageHead eyebrow="Safety Center" title="Go home the way you came in">
        The rules, the reasons, and hands-on practice: approach boundaries, lockout order, hazard hunts, emergency
        response, and a pre-task brief you can print.
      </PageHead>
      <div className="safety-meter card" aria-label="Safety practice progress">
        <div className="safety-meter-ring" aria-hidden="true">
          <svg viewBox="0 0 40 40">
            <circle cx="20" cy="20" r="16" className="ring-bg" />
            <circle cx="20" cy="20" r="16" className="ring-fg" strokeDasharray={100.5} strokeDashoffset={100.5 * (1 - done / drills)} />
          </svg>
          <Icon name="shield" />
        </div>
        <div>
          <strong>
            {done} of {drills} safety drills done
          </strong>
          <span>Each drill you finish adds 20 XP. Scores stay on this device.</span>
        </div>
      </div>
      <SectionTabs label="Safety Center sections" sections={SECTIONS} value={sec} onChange={setSec} />
      <div className="safety-pane" key={sec}>
        {sec === 'rules' && <GoldenRules go={setSec} />}
        {sec === 'library' && <ArticlesTab bare eyebrow="Safety" title="Safety library" intro="" articles={SAFETY} openId={openArticle} />}
        {sec === 'boundaries' && <BoundaryExplorer />}
        {sec === 'loto' && <LotoPractice scores={scores} onScore={onScore} />}
        {sec === 'hunt' && <HuntPractice scores={scores} onScore={onScore} />}
        {sec === 'emergency' && <EmergencyCards />}
        {sec === 'brief' && <BriefBuilder />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
function GoldenRules({ go }: { go: (s: Section) => void }) {
  return (
    <>
      <ol className="golden-grid">
        {GOLDEN_RULES.map((r, i) => (
          <li key={r.rule} className="card golden" style={{ '--i': i } as React.CSSProperties}>
            <span className="golden-icon" aria-hidden="true">
              <Icon name={r.icon} />
            </span>
            <strong>{r.rule}</strong>
            <span>{r.why}</span>
          </li>
        ))}
      </ol>
      <div className="callout">
        <strong>Practice next: </strong>
        <button className="linklike" type="button" onClick={() => go('loto')}>
          put lockout steps in order
        </button>
        ,{' '}
        <button className="linklike" type="button" onClick={() => go('hunt')}>
          spot the hazards
        </button>
        , or{' '}
        <button className="linklike" type="button" onClick={() => go('boundaries')}>
          walk up to live gear
        </button>
        .
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
function BoundaryExplorer() {
  const [labelId, setLabelId] = useState('med');
  const [dist, setDist] = useState(12);
  const [who, setWho] = useState<Who>('qualified');
  const [ppe, setPpe] = useState(false);
  const label = LABEL_EXAMPLES.find((l) => l.id === labelId)!;
  const v = boundaryVerdict(dist, who, ppe, label);
  const max = 32;
  // Scale: feet → SVG units along the floor (gear at x=30).
  // Square-root scale so the close-in boundaries (1 ft, 3.5 ft) aren't squashed.
  const sx = (ft: number) => 30 + Math.sqrt(Math.min(ft, max) / max) * 560;
  const ring = (ft: number, cls: string, text: string, pos: 'top-left' | 'top-right' | 'bottom') => (
    <g className={`bz ${cls}`}>
      <rect x={30} y={22} width={Math.max(0, sx(ft) - 30)} height={108} rx={6} />
      <line x1={sx(ft)} x2={sx(ft)} y1={16} y2={136} />
      <text x={pos === 'top-right' ? sx(ft) + 5 : sx(ft) - 5} y={pos === 'bottom' ? 150 : 12} textAnchor={pos === 'top-right' ? 'start' : 'end'}>
        {text}
      </text>
    </g>
  );
  return (
    <div className="grid boundary-wrap">
      <div className="card">
        <h2 className="h-card">Walk up to live gear</h2>
        <p className="muted">
          Covers are off on a 480 V switchboard. Pick the label, who you are, and slide closer. The shock boundaries are
          typical 480 V values; the arc flash numbers are made-up example labels. Real ones come from the label on the
          gear.
        </p>
        <svg className="boundary-svg" viewBox="0 0 600 160" role="img" aria-label={`Floor plan: you are ${dist} feet from exposed live parts. ${v.headline}.`}>
          {ring(label.afbFt, 'bz-arc', `Arc flash ${label.afbFt} ft`, 'top-right')}
          {ring(SHOCK_BOUNDARIES.limitedFt, 'bz-lim', `Limited ${SHOCK_BOUNDARIES.limitedFt} ft`, 'bottom')}
          {ring(SHOCK_BOUNDARIES.restrictedFt, 'bz-res', 'Restricted 1 ft', 'top-left')}
          <rect className="bz-gear" x={6} y={18} width={24} height={114} rx={3} />
          <text className="bz-gear-label" x={18} y={80} textAnchor="middle" transform="rotate(-90 18 80)">
            480 V
          </text>
          <g className={`bz-person tone-${v.tone}`} style={{ transform: `translateX(${sx(dist) - 30}px)` }}>
            <circle cx={30} cy={56} r={9} />
            <path d="M30 66v30M18 76h24M30 96l-10 22M30 96l10 22" />
          </g>
        </svg>
        <label className="field">
          <span>
            Distance from live parts: <strong>{dist} ft</strong>
          </span>
          <input type="range" min={0} max={max} step={0.5} value={dist} onChange={(e) => setDist(Number(e.target.value))} />
        </label>
        <div className="seg-row">
          <fieldset className="radio-seg">
            <legend>Example label</legend>
            {LABEL_EXAMPLES.map((l) => (
              <label key={l.id} className={labelId === l.id ? 'on' : ''}>
                <input type="radio" name="label" checked={labelId === l.id} onChange={() => setLabelId(l.id)} />
                {l.label} · {l.cal} cal/cm²
              </label>
            ))}
          </fieldset>
          <fieldset className="radio-seg">
            <legend>You are</legend>
            {(
              [
                ['unqualified', 'Unqualified'],
                ['escorted', 'Unqualified, escorted'],
                ['qualified', 'Qualified'],
              ] as [Who, string][]
            ).map(([id, t]) => (
              <label key={id} className={who === id ? 'on' : ''}>
                <input type="radio" name="who" checked={who === id} onChange={() => setWho(id)} />
                {t}
              </label>
            ))}
          </fieldset>
          <label className="check">
            <input type="checkbox" checked={ppe} onChange={(e) => setPpe(e.target.checked)} />
            Wearing arc-rated PPE rated for this label
          </label>
        </div>
      </div>
      <div className={`card verdict tone-${v.tone}`} aria-live="polite">
        <div className="verdict-head">
          {v.ok ? <Icon name="check" /> : <DangerMark />}
          <strong>{v.headline}</strong>
        </div>
        <ul>
          {v.detail.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
        <p className="muted small">
          With doors closed and latched, normal operation of well-maintained gear is a much lower risk. The boundaries
          matter most when covers are off or a task could cause an arc.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
function LotoPractice({ scores, onScore }: { scores: Record<string, number>; onScore: (id: string, s: number) => void }) {
  const [drill, setDrill] = useState<LotoDrill>(LOTO_DRILLS[0]!);
  return (
    <>
      <div className="pick-row" role="group" aria-label="Choose a lockout drill">
        {LOTO_DRILLS.map((d) => (
          <button key={d.id} type="button" className={`chip-btn${d.id === drill.id ? ' on' : ''}`} aria-pressed={d.id === drill.id} onClick={() => setDrill(d)}>
            {d.title}
            {d.id in scores && <span className="chip-score">{scores[d.id]}</span>}
          </button>
        ))}
      </div>
      <LotoGame key={drill.id} drill={drill} onScore={onScore} />
    </>
  );
}

function LotoGame({ drill, onScore }: { drill: LotoDrill; onScore: (id: string, s: number) => void }) {
  const [seed, setSeed] = useState(() => Date.now() % 100000);
  const order = useMemo(() => shuffledOrder(drill.steps.length, seed), [drill, seed]);
  const [placed, setPlaced] = useState<number[]>([]);
  const [wrong, setWrong] = useState(0);
  const [miss, setMiss] = useState<{ i: number; n: number } | null>(null);
  const [burst, setBurst] = useState(0);
  const done = placed.length === drill.steps.length;
  const score = lotoScore(wrong);

  const pick = (i: number) => {
    if (done || placed.includes(i)) return;
    if (i === placed.length) {
      const next = [...placed, i];
      setPlaced(next);
      setMiss(null);
      if (next.length === drill.steps.length) {
        onScore(drill.id, score);
        if (score === 100) setBurst(Date.now());
      }
    } else {
      setWrong((w) => w + 1);
      setMiss({ i, n: Date.now() });
    }
  };
  const restart = () => {
    setSeed((s) => s + 7);
    setPlaced([]);
    setWrong(0);
    setMiss(null);
  };

  return (
    <div className="grid loto-wrap">
      <div className="card">
        <h2 className="h-card">{drill.title}</h2>
        <p className="muted">{drill.scenario}</p>
        <p>
          <strong>Tap the steps in the right order.</strong> A wrong pick costs 10 points and tells you why.
        </p>
        <div aria-live="polite" className="loto-feedback">
          {miss && (
            <div className="callout callout-warn">
              <strong>Not yet: </strong>
              {drill.steps[miss.i]!.why}
            </div>
          )}
        </div>
        <div className="loto-pool">
          {order.map((i) =>
            placed.includes(i) ? null : (
              <button
                key={`${i}-${miss?.i === i ? miss.n : 0}`}
                type="button"
                className={`loto-step${miss?.i === i ? ' miss' : ''}`}
                onClick={() => pick(i)}
                disabled={done}
              >
                {drill.steps[i]!.text}
              </button>
            ),
          )}
        </div>
      </div>
      <div className="card loto-done">
        <div className="loto-head">
          <h2 className="h-card">Your sequence</h2>
          <span className={`score-pill${done ? ' final' : ''}`}>{score} / 100</span>
        </div>
        <ol className="loto-list">
          {placed.map((i) => (
            <li key={i}>
              <Icon name="check" />
              {drill.steps[i]!.text}
            </li>
          ))}
          {!done && <li className="loto-next">Step {placed.length + 1}…</li>}
        </ol>
        {done && (
          <div className="loto-result">
            <p>
              <strong>{score === 100 ? 'Perfect lockout. Every source controlled, in order.' : `Done with ${wrong} wrong pick${wrong === 1 ? '' : 's'}.`}</strong>
            </p>
            <button className="btn btn-sm" type="button" onClick={restart}>
              <Icon name="reset" /> Shuffle and try again
            </button>
          </div>
        )}
        <Confetti burst={burst} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
function HuntPractice({ scores, onScore }: { scores: Record<string, number>; onScore: (id: string, s: number) => void }) {
  const [hunt, setHunt] = useState<HazardHunt>(HAZARD_HUNTS[0]!);
  return (
    <>
      <div className="pick-row" role="group" aria-label="Choose a hazard hunt">
        {HAZARD_HUNTS.map((h) => (
          <button key={h.id} type="button" className={`chip-btn${h.id === hunt.id ? ' on' : ''}`} aria-pressed={h.id === hunt.id} onClick={() => setHunt(h)}>
            {h.title}
            {h.id in scores && <span className="chip-score">{scores[h.id]}</span>}
          </button>
        ))}
      </div>
      <HuntGame key={hunt.id} hunt={hunt} onScore={onScore} />
    </>
  );
}

function HuntGame({ hunt, onScore }: { hunt: HazardHunt; onScore: (id: string, s: number) => void }) {
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [checked, setChecked] = useState(false);
  const [burst, setBurst] = useState(0);
  const res = scoreHunt(hunt, picked);
  const total = hunt.items.filter((i) => i.hazard).length;
  const toggle = (i: number) => {
    if (checked) return;
    const n = new Set(picked);
    if (n.has(i)) n.delete(i);
    else n.add(i);
    setPicked(n);
  };
  const check = () => {
    setChecked(true);
    onScore(hunt.id, res.score);
    if (res.score === 100) setBurst(Date.now());
  };
  return (
    <div className="card hunt">
      <h2 className="h-card">{hunt.title}</h2>
      <p className="hunt-scene">
        <Icon name="eye" /> {hunt.scene}
      </p>
      <p>
        <strong>Flag every hazard.</strong> There are {total}. Missing one costs 15 points; flagging something safe costs
        10.
      </p>
      <ul className="hunt-list">
        {hunt.items.map((it, i) => {
          const on = picked.has(i);
          const state = !checked ? '' : it.hazard ? (on ? ' hit' : ' missed') : on ? ' false' : ' safe';
          return (
            <li key={it.text} className={`hunt-item${on ? ' on' : ''}${state}`}>
              <button type="button" aria-pressed={on} onClick={() => toggle(i)} disabled={checked}>
                <span className="hunt-box" aria-hidden="true">
                  {on ? '!' : ''}
                </span>
                <span>{it.text}</span>
              </button>
              {checked && (
                <p className="hunt-why">
                  <strong>{it.hazard ? (on ? 'Found it. ' : 'Missed hazard. ') : on ? 'This one is safe. ' : 'Safe. '}</strong>
                  {it.why}
                </p>
              )}
            </li>
          );
        })}
      </ul>
      <div className="hunt-actions" aria-live="polite">
        {!checked ? (
          <button className="btn btn-primary" type="button" onClick={check}>
            <Icon name="check" /> Check my answers
          </button>
        ) : (
          <>
            <span className={`score-pill final`}>{res.score} / 100</span>
            <span>
              Found {res.found} of {total}
              {res.falseAlarms ? `, ${res.falseAlarms} false alarm${res.falseAlarms === 1 ? '' : 's'}` : ''}.
            </span>
            <button
              className="btn btn-sm"
              type="button"
              onClick={() => {
                setPicked(new Set());
                setChecked(false);
              }}
            >
              <Icon name="reset" /> Try again
            </button>
          </>
        )}
      </div>
      <Confetti burst={burst} />
    </div>
  );
}

// ---------------------------------------------------------------------------
function EmergencyCards() {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <>
      <div className="callout callout-warn">
        <strong>Call for help first: </strong>911 and your site emergency number. These cards are awareness, not first-aid
        training. Follow your site emergency plan, and take a certified first aid, CPR and AED course.
      </div>
      <div className="emer-grid">
        {EMERGENCY_CARDS.map((c) => {
          const isOpen = open === c.id;
          return (
            <section key={c.id} className={`card emer tone-${c.tone}${isOpen ? ' open' : ''}`} aria-labelledby={`emer-${c.id}`}>
              <button type="button" className="emer-head" aria-expanded={isOpen} aria-controls={`emer-body-${c.id}`} onClick={() => setOpen(isOpen ? null : c.id)}>
                <span className="emer-beacon" aria-hidden="true" />
                <h2 id={`emer-${c.id}`}>{c.title}</h2>
                <span className="emer-chev" aria-hidden="true">
                  <Icon name="plus" />
                </span>
              </button>
              <div className="emer-body" id={`emer-body-${c.id}`} hidden={!isOpen}>
                <h3>Do first</h3>
                <ol>
                  {c.doFirst.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ol>
                <h3 className="emer-dont">Don't</h3>
                <ul className="never-list compact">
                  {c.dont.map((d) => (
                    <li key={d}>
                      <DangerMark />
                      <span className="never-rule">{d}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
function BriefBuilder() {
  const [b, setB] = useState<Brief>(EMPTY_BRIEF);
  const gaps = briefGaps(b);
  const set = <K extends keyof Brief>(k: K, v: Brief[K]) => setB({ ...b, [k]: v });
  const toggle = (k: 'energy' | 'ppe' | 'permits', v: string) => set(k, b[k].includes(v) ? b[k].filter((x) => x !== v) : [...b[k], v]);
  const text = (k: 'task' | 'location' | 'worst' | 'emergency' | 'stopIf', label: string, hint: string) => (
    <label className="field">
      <span>{label}</span>
      <input type="text" value={b[k]} placeholder={hint} maxLength={140} onChange={(e) => set(k, e.target.value)} />
    </label>
  );
  const checks = (k: 'energy' | 'ppe' | 'permits', legend: string, list: readonly string[]) => (
    <fieldset className="check-grid">
      <legend>{legend}</legend>
      {list.map((x) => (
        <label key={x} className={`check${b[k].includes(x) ? ' on' : ''}`}>
          <input type="checkbox" checked={b[k].includes(x)} onChange={() => toggle(k, x)} />
          {x}
        </label>
      ))}
    </fieldset>
  );
  return (
    <div className="grid brief-wrap">
      <form className="card brief-form no-print" onSubmit={(e) => e.preventDefault()} aria-label="Pre-task brief">
        <h2 className="h-card">Build a pre-task brief</h2>
        <p className="muted">Fill it in, check the gaps, then print it for the job. Nothing is saved or sent.</p>
        {text('task', 'Task', 'e.g. Replace CRAH-104 fan belt')}
        {text('location', 'Location', 'e.g. Data hall 1, row C')}
        {text('worst', 'Worst thing that could happen', 'e.g. Fan starts while hands are on the belt')}
        {checks('energy', 'Energy sources here', ENERGY_SOURCES)}
        {checks('ppe', 'PPE', BRIEF_PPE)}
        {checks('permits', 'Permits & procedures', BRIEF_PERMITS)}
        {text('emergency', 'Emergency info', 'e.g. 911 + site line, exit east door, AED by security')}
        {text('stopIf', 'We stop if…', 'e.g. any tag or breaker does not match the MOP')}
      </form>
      <section className={`card brief-card print-area${gaps.length ? '' : ' ready'}`} aria-labelledby="brief-h">
        <div className="brief-top">
          <h2 className="h-card" id="brief-h">
            Pre-task brief
          </h2>
          <span className={`score-pill${gaps.length ? '' : ' final'}`}>{gaps.length ? `${gaps.length} gap${gaps.length === 1 ? '' : 's'}` : 'Ready'}</span>
        </div>
        <dl className="brief-dl">
          <dt>Task</dt>
          <dd>{b.task || '—'}</dd>
          <dt>Location</dt>
          <dd>{b.location || '—'}</dd>
          <dt>Worst case</dt>
          <dd>{b.worst || '—'}</dd>
          <dt>Energy</dt>
          <dd>{b.energy.join(', ') || '—'}</dd>
          <dt>PPE</dt>
          <dd>{b.ppe.join(', ') || '—'}</dd>
          <dt>Permits</dt>
          <dd>{b.permits.join(', ') || '—'}</dd>
          <dt>Emergency</dt>
          <dd>{b.emergency || '—'}</dd>
          <dt>Stop if</dt>
          <dd>{b.stopIf || '—'}</dd>
        </dl>
        <div className="brief-sign print-only">
          <span>Crew initials: ____________________</span>
          <span>Date / time: ____________________</span>
        </div>
        {gaps.length > 0 && (
          <ul className="brief-gaps no-print" aria-label="Still missing">
            {gaps.map((g) => (
              <li key={g}>
                <Icon name="warning" /> {g}
              </li>
            ))}
          </ul>
        )}
        <div className="record-actions no-print">
          <button className="btn btn-sm" type="button" onClick={() => window.print()}>
            <Icon name="print" /> Print
          </button>
          <button className="btn btn-sm btn-ghost" type="button" onClick={() => setB(EMPTY_BRIEF)}>
            <Icon name="reset" /> Clear
          </button>
        </div>
        <p className="muted small">A practice aid, not your site's official form.</p>
      </section>
    </div>
  );
}
