/**
 * Live round coach (Phase 9d): walk station to station on the live plant, read the gauge, write the value,
 * flag what's out of range, then check the round. Loaded on demand with the round content.
 */
import { useEffect, useRef, useState } from 'react';
import { outOfRange, scoreRound, STATIONS, toTick, type RoundEntry, type RoundIssue } from '../../content/liveRounds';
import { grade } from '../../sim';
import { Confetti } from '../common';
import { Icon } from '../icons';
import type { SimHandle } from '../useSimulation';

interface Props {
  h: SimHandle;
  issues: RoundIssue[];
  /** Move the simulator to a station's equipment (select it, right view). */
  goTo: (id: string, view: 'electrical' | 'mechanical') => void;
  onFinish: (score: number) => void;
  onExit: () => void;
}

/** Original analog gauge: a 240° dial with labeled major marks and a needle. */
function Gauge({ value, min, max, tick, unit, label }: { value: number; min: number; max: number; tick: number; unit: string; label: string }) {
  const a0 = -210;
  const sweep = 240;
  const ang = (v: number) => ((a0 + (sweep * (Math.min(max, Math.max(min, v)) - min)) / (max - min)) * Math.PI) / 180;
  const pt = (v: number, r: number) => [60 + r * Math.cos(ang(v)), 60 + r * Math.sin(ang(v))] as const;
  const marks: number[] = [];
  for (let v = min; v <= max + 1e-9; v += tick) marks.push(Math.round(v * 1000) / 1000);
  const majorEvery = Math.max(1, Math.round((max - min) / tick / 8));
  const [nx, ny] = pt(value, 40);
  return (
    <svg className="rg-gauge" viewBox="0 0 120 120" role="img" aria-label={`${label} gauge, ${min} to ${max} ${unit}, needle at ${toTick(value, { tick, min, max })} ${unit}`}>
      <circle cx="60" cy="60" r="54" className="rg-face" />
      {marks.map((v, i) => {
        const major = i % majorEvery === 0;
        const [x1, y1] = pt(v, major ? 42 : 46);
        const [x2, y2] = pt(v, 50);
        return <line key={v} x1={x1} y1={y1} x2={x2} y2={y2} className={major ? 'rg-major' : 'rg-minor'} />;
      })}
      <line x1="60" y1="60" x2={nx} y2={ny} className="rg-needle" />
      <circle cx="60" cy="60" r="4" className="rg-hub" />
      {marks
        .filter((_, i) => i % majorEvery === 0)
        .map((v) => {
          const [x, y] = pt(v, 33);
          return (
            <text key={v} x={x} y={y} className="rg-num" textAnchor="middle" dominantBaseline="middle">
              {v}
            </text>
          );
        })}
      <text x="60" y="96" className="rg-unit" textAnchor="middle">
        {unit}
      </text>
    </svg>
  );
}

export default function RoundCoach({ h, issues, goTo, onFinish, onExit }: Props) {
  const [i, setI] = useState(0);
  const [entries, setEntries] = useState<RoundEntry[]>(STATIONS.map(() => ({ value: null, flagged: false })));
  const [result, setResult] = useState<{ score: number; read: number; flags: number; truth: number[] } | null>(null);
  const [draft, setDraft] = useState('');
  const e = h.engine;
  const st = STATIONS[i]!;
  const moved = useRef(-1);
  useEffect(() => {
    if (moved.current === i) return;
    moved.current = i;
    goTo(st.at, st.view);
    setDraft(entries[i]?.value === null || entries[i]?.value === undefined ? '' : String(entries[i]!.value));
  });

  if (!e) return null;
  const live = st.read(e);
  const save = () => {
    const v = draft.trim() === '' ? null : Number(draft);
    const next = entries.map((x, k) => (k === i ? { ...x, value: v !== null && Number.isFinite(v) ? v : null } : x));
    setEntries(next);
    return next;
  };
  const check = () => {
    const next = save();
    const truth = STATIONS.map((s) => s.read(e));
    const r = scoreRound(STATIONS, truth, next);
    setResult({ ...r, truth });
    onFinish(r.score);
  };

  if (result) {
    const g = grade(result.score);
    return (
      <section className="card proc-card proc-result rg-card" aria-labelledby="rg-h">
        <div className="proc-top">
          <div>
            <div className="eyebrow">Live round · checked</div>
            <h2 id="rg-h">Round results</h2>
          </div>
          <button className="btn btn-icon btn-ghost" type="button" onClick={onExit} aria-label="Close round">
            <Icon name="close" />
          </button>
        </div>
        <Confetti burst={result.score === 100 ? 1 : 0} />
        <div className="grade-row">
          <div className={`grade-badge g-${g.letter[0]!.toLowerCase()}`} aria-hidden="true">
            {g.letter}
          </div>
          <div>
            <div className="grade-score">
              {result.score} <span>/ 100</span>
            </div>
            <div className="muted small">
              {result.read} of {STATIONS.length} read right · {result.flags} of {STATIONS.length} flagged right
            </div>
          </div>
        </div>
        <ul className="rg-results">
          {STATIONS.map((s, k) => {
            const t = result.truth[k]!;
            const bad = outOfRange(t, s);
            const en = entries[k]!;
            return (
              <li key={s.id} className={bad ? 'bad' : ''}>
                <strong>{s.label}</strong>
                <span>
                  Actual {toTick(t, s)} {s.unit} (normal {s.normal[0]}–{s.normal[1]}) · you wrote {en.value ?? '—'}
                  {en.flagged ? ' · flagged' : ''}
                </span>
                {bad && <span className="rg-why">{s.why}</span>}
              </li>
            );
          })}
        </ul>
        <p className="muted small">Hidden problem{issues.length > 1 ? 's' : ''} this round: {issues.map((x) => x.title).join('; ')}.</p>
        <div className="step-nav">
          <button type="button" className="btn btn-primary" onClick={onExit}>
            Done
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="card proc-card rg-card" aria-labelledby="rg-h">
      <div className="proc-top">
        <div style={{ flex: 1 }}>
          <div className="eyebrow">
            Live round · station {i + 1} of {STATIONS.length} · at {e.sim.graph.get(st.at).tag}
          </div>
          <h2 id="rg-h">{st.label}</h2>
        </div>
        <button className="btn btn-icon btn-ghost" type="button" onClick={onExit} aria-label="Leave the round">
          <Icon name="close" />
        </button>
      </div>
      <div className="rg-body">
        <Gauge value={live} min={st.min} max={st.max} tick={st.tick} unit={st.unit} label={st.label} />
        <div className="rg-form">
          <label className="field">
            <span>Reading ({st.unit})</span>
            <input type="number" inputMode="decimal" value={draft} onChange={(ev) => setDraft(ev.target.value)} onBlur={save} aria-describedby="rg-normal" />
          </label>
          <p id="rg-normal" className="muted small">
            Round sheet normal: {st.normal[0]}–{st.normal[1]} {st.unit}. Read to the nearest mark.
          </p>
          <label className="check">
            <input
              type="checkbox"
              checked={entries[i]!.flagged}
              onChange={(ev) => setEntries(entries.map((x, k) => (k === i ? { ...x, flagged: ev.target.checked } : x)))}
            />{' '}
            Out of range: flag it
          </label>
        </div>
      </div>
      <div className="step-nav">
        {i > 0 && (
          <button type="button" className="btn" onClick={() => (save(), setI(i - 1))}>
            Back
          </button>
        )}
        {i < STATIONS.length - 1 ? (
          <button type="button" className="btn btn-primary" onClick={() => (save(), setI(i + 1))}>
            Next station
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={check}>
            Check my round
          </button>
        )}
      </div>
    </section>
  );
}
