/**
 * Shift mode coach (Phase 8d): shift clock, what happened so far, fixes ready to return to service,
 * and the end-of-shift hand-off that scores the shift. Loaded on demand with the shift content.
 */
import { useEffect, useRef, useState } from 'react';
import { grade } from '../../sim';
import { scoreShift, shiftClock, SHIFT, SHIFT_POOL, type EventRecord, type Handoff, type PlannedEvent, type ShiftScore } from '../../content/shift';
import { Confetti } from '../common';
import { Icon } from '../icons';
import type { SimHandle } from '../useSimulation';

interface Props {
  h: SimHandle;
  plan: PlannedEvent[];
  onFinish: (score: number) => void;
  onExit: () => void;
}

const fresh = (): EventRecord => ({ happened: false, alarmAt: null, ackAt: null, fixReadyAt: null, fixedAt: null });

export default function ShiftCoach({ h, plan, onFinish, onExit }: Props) {
  const rec = useRef<Record<string, EventRecord>>(Object.fromEntries(plan.map((p) => [p.def.id, fresh()])));
  const told = useRef(new Set<string>());
  const [phase, setPhase] = useState<'running' | 'handoff' | 'done'>('running');
  const [hand, setHand] = useState<Handoff>({ happened: [], open: [] });
  const [result, setResult] = useState<ShiftScore | null>(null);
  const endAt = useRef<number | null>(null);
  const sim = h.sim;
  const t = sim.t;
  const e = h.engine;

  // Follow the plant each render (the engine re-renders a few times per second while running).
  useEffect(() => {
    if (phase !== 'running' || !e) return;
    const alarms = e.alarmSummary.list;
    for (const { def, at } of plan) {
      const r = rec.current[def.id]!;
      if (t < at) continue;
      if (!r.happened) {
        r.happened = true;
        if (def.fix.kind === 'operator') r.fixReadyAt = at;
        if (def.cue && !told.current.has(`cue:${def.id}`)) {
          told.current.add(`cue:${def.id}`);
          h.act((s) => s.log('warning', 'Rounds', def.cue!));
        }
      }
      if (def.alarm) {
        const a = alarms.find((x) => x.id === def.alarm);
        if (a && r.alarmAt === null) r.alarmAt = t;
        if (r.alarmAt !== null && r.ackAt === null && (!a || a.state === 'ack')) r.ackAt = t;
      }
      if (def.fix.kind === 'restore') {
        const fix = def.fix;
        if (r.fixReadyAt === null && t >= at + fix.readyAfterS) {
          r.fixReadyAt = t;
          const tag = sim.graph.get(fix.id).tag;
          h.act((s) => s.log('info', tag, `Tech: ${tag} is repaired and ready. Return it to service (Restore) when you're ready.`));
        }
        if (r.fixReadyAt !== null && r.fixedAt === null && sim.graph.get(fix.id).status !== 'failed') r.fixedAt = t;
      } else if (def.fix.kind === 'operator' && r.fixedAt === null) {
        const ok = def.fix.check === 'containment-shut' ? e.air.state.containment === 'full' : e.air.state.blankingMissing === 0;
        if (ok) r.fixedAt = t;
      }
    }
    if (t >= SHIFT.lengthS) {
      h.setRunning(false);
      endAt.current = SHIFT.lengthS;
      setPhase('handoff');
    }
  });

  const stillOpen = () =>
    plan
      .filter(({ def }) => rec.current[def.id]!.happened)
      .filter(({ def }) => (def.fix.kind === 'restore' ? sim.graph.get(def.fix.id).status === 'failed' : def.fix.kind === 'operator' ? rec.current[def.id]!.fixedAt === null : false))
      .map(({ def }) => def.id);

  const endShift = () => {
    h.setRunning(false);
    endAt.current = t;
    setPhase('handoff');
  };
  const submit = () => {
    const s = scoreShift(plan, rec.current, stillOpen(), sim.droppedRacks().length, hand);
    setResult(s);
    setPhase('done');
    onFinish(s.score);
  };
  const toggle = (list: 'happened' | 'open', id: string) =>
    setHand((x) => ({ ...x, [list]: x[list].includes(id) ? x[list].filter((y) => y !== id) : [...x[list], id] }));

  const happenedSoFar = plan.filter(({ def }) => rec.current[def.id]!.happened);
  const ready = plan.filter(({ def }) => def.fix.kind !== 'log' && rec.current[def.id]!.fixReadyAt !== null && rec.current[def.id]!.fixedAt === null);
  const pct = Math.min(100, Math.round((t / SHIFT.lengthS) * 100));

  if (phase === 'done' && result) {
    const g = grade(result.score);
    return (
      <section className="card proc-card proc-result shift-card" aria-labelledby="shift-h">
        <div className="proc-top">
          <div>
            <div className="eyebrow">Shift mode · hand-off scored</div>
            <h2 id="shift-h">Day shift {shiftClock(0)}–{shiftClock(endAt.current ?? t)}</h2>
          </div>
          <button className="btn btn-icon btn-ghost" type="button" onClick={onExit} aria-label="Close shift">
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
            <div className="muted small">{g.label}</div>
          </div>
        </div>
        <ul className="shift-lines">
          {result.lines.map((l) => (
            <li key={l.text} className={l.pts === l.max ? 'ok' : 'miss'}>
              <span>{l.text}</span>
              <strong>
                {l.pts}/{l.max}
              </strong>
            </li>
          ))}
        </ul>
        <div className="step-nav">
          <button type="button" className="btn btn-primary" onClick={onExit}>
            Done
          </button>
        </div>
      </section>
    );
  }

  if (phase === 'handoff') {
    return (
      <section className="card proc-card shift-card" aria-labelledby="shift-h">
        <div className="eyebrow">Shift mode · {shiftClock(endAt.current ?? t)} · hand-off</div>
        <h2 id="shift-h">Write your hand-off</h2>
        <p className="muted small">The next shift only knows what you tell them. Tick what happened on your shift, and what is still open for them.</p>
        <fieldset className="shift-fs">
          <legend>What happened this shift?</legend>
          {SHIFT_POOL.map((d) => (
            <label key={d.id} className="check">
              <input type="checkbox" checked={hand.happened.includes(d.id)} onChange={() => toggle('happened', d.id)} /> {d.title}
            </label>
          ))}
        </fieldset>
        <fieldset className="shift-fs">
          <legend>Still open for the next shift?</legend>
          {SHIFT_POOL.filter((d) => d.fix.kind !== 'log').map((d) => (
            <label key={d.id} className="check">
              <input type="checkbox" checked={hand.open.includes(d.id)} onChange={() => toggle('open', d.id)} /> {d.title}
            </label>
          ))}
        </fieldset>
        <div className="step-nav">
          <button type="button" className="btn btn-primary" onClick={submit}>
            Hand off and score my shift
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="card proc-card shift-card" aria-labelledby="shift-h">
      <div className="proc-top">
        <div>
          <div className="eyebrow">Shift mode · 8 h at {SHIFT.speed}×</div>
          <h2 id="shift-h">
            Day shift · <span className="shift-clock">{shiftClock(t)}</span>
          </h2>
        </div>
        <button className="btn btn-icon btn-ghost" type="button" onClick={onExit} aria-label="Leave the shift without scoring">
          <Icon name="close" />
        </button>
      </div>
      <div className="shift-bar" role="progressbar" aria-label="Shift progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
        <span style={{ width: `${pct}%` }} />
      </div>
      <p className="small">
        Run the plant like a real shift: watch the alarm list, acknowledge what comes in, fix what you can, and return repaired equipment to service. At {shiftClock(SHIFT.lengthS)} you write the hand-off.
      </p>
      {ready.length > 0 && (
        <div className="callout" role="status">
          <strong>Ready for you</strong>
          <ul style={{ margin: '6px 0 0' }}>
            {ready.map(({ def }) => (
              <li key={def.id}>{def.fix.kind === 'restore' ? `${sim.graph.get(def.fix.id).tag} is repaired: return it to service.` : def.fix.kind === 'operator' ? `${def.title}. ${def.fix.how}` : ''}</li>
            ))}
          </ul>
        </div>
      )}
      <p className="muted small">
        {happenedSoFar.length ? `${happenedSoFar.length} event${happenedSoFar.length > 1 ? 's' : ''} so far. ` : 'Quiet so far. '}
        Keep notes for your hand-off: the event log has everything.
      </p>
      <div className="step-nav">
        <button type="button" className="btn" onClick={endShift}>
          End shift now and hand off
        </button>
      </div>
    </section>
  );
}
