/**
 * Life of a Data Center: a 10-stage track inside Learn. Each stage has a lesson,
 * a 3D tour, a hands-on task, minute details, common mistakes and a quiz.
 * Everything in 3D is also reachable from plain lists and buttons.
 */
import { useEffect, useMemo, useState } from 'react';
import { LIFE_STAGES, VERIFY_NOTE, type LifeStage, type LifeTask } from '../../content/lifecycle';
import { capacityLimits, downtimeMinutesPerYear, itLoadKw, kwToTons, siteScore, upsModulesNeeded, type Redundancy } from '../../sim';
import { Confetti, SectionTabs } from '../common';
import { Icon } from '../icons';
import { LIFE_PASS, lifeStageDone, type ProgressHandle } from '../progress';
import { Campus3D } from '../three/Scene3D';
import { QuizBlock } from '../QuizBlock';

type Part = 'lesson' | 'tour' | 'task' | 'details' | 'mistakes' | 'quiz';
const PARTS: { id: Part; label: string }[] = [
  { id: 'lesson', label: 'Lesson' },
  { id: 'tour', label: '3D tour' },
  { id: 'task', label: 'Try it' },
  { id: 'details', label: 'Minute details' },
  { id: 'mistakes', label: 'Mistakes' },
  { id: 'quiz', label: 'Quiz' },
];

interface Props {
  p: ProgressHandle;
  onRunIst: () => void;
  /** Open this stage first (from search or a link). */
  openId?: string | null;
}

export function LifeTrack({ p, onRunIst, openId }: Props) {
  const [open, setOpen] = useState<string | null>(openId ?? null);
  const stage = LIFE_STAGES.find((s) => s.id === open);
  const done = LIFE_STAGES.filter((s) => lifeStageDone(p.progress, s.id)).length;
  if (stage) return <StageView key={stage.id} stage={stage} p={p} onRunIst={onRunIst} onClose={() => setOpen(null)} onGo={setOpen} />;
  return (
    <section aria-labelledby="lc-h">
      <div className="card lc-intro">
        <div>
          <div className="eyebrow">Learning path · {done}/10 stages complete</div>
          <h2 id="lc-h" className="h-card">
            Life of a data center
          </h2>
          <p className="muted">
            From an empty field to decommissioning: what happens at each stage, what you would see on site, and the small
            details technicians handle. Each stage has a lesson, a 3D tour, a hands-on task and a quiz ({LIFE_PASS}% passes).
          </p>
        </div>
        <div className="lc-meter" role="progressbar" aria-valuemin={0} aria-valuemax={10} aria-valuenow={done} aria-label="Stages complete">
          <span style={{ width: `${done * 10}%` }} />
        </div>
      </div>
      <ol className="lc-stages">
        {LIFE_STAGES.map((s) => {
          const l = p.progress.life[s.id];
          const isDone = lifeStageDone(p.progress, s.id);
          return (
            <li key={s.id}>
              <button type="button" className={`card lc-stage${isDone ? ' done' : ''}`} onClick={() => setOpen(s.id)}>
                <span className="lc-num" aria-hidden="true">
                  {isDone ? <Icon name="check" /> : s.n}
                </span>
                <span className="lc-stage-body">
                  <span className="eyebrow">Stage {s.n}{isDone ? ' · complete' : ''}</span>
                  <strong>{s.title}</strong>
                  <span className="muted small">{s.short}</span>
                  <span className="lc-ticks">
                    <span className={l?.tour ? 'on' : ''}>Tour</span>
                    <span className={(s.task.kind === 'sim' ? 'life-ist' in p.progress.procs || l?.task : l?.task) ? 'on' : ''}>Task</span>
                    <span className={(l?.quiz ?? 0) >= LIFE_PASS ? 'on' : ''}>Quiz {l?.quiz ? `${l.quiz}%` : ''}</span>
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function StageView({ stage, p, onRunIst, onClose, onGo }: { stage: LifeStage; p: ProgressHandle; onRunIst: () => void; onClose: () => void; onGo: (id: string) => void }) {
  const [part, setPart] = useState<Part>('lesson');
  const prev = LIFE_STAGES[stage.n - 2];
  const next = LIFE_STAGES[stage.n];
  const life = p.progress.life[stage.id];
  const taskDone = stage.task.kind === 'sim' ? 'life-ist' in p.progress.procs || !!life?.task : !!life?.task;
  const counts: Partial<Record<Part, string>> = { tour: life?.tour ? '✓' : `${stage.tour.length}`, task: taskDone ? '✓' : '1', quiz: life?.quiz ? `${life.quiz}%` : `${stage.quiz.length}` };
  return (
    <section className="lc-view" aria-labelledby="lc-stage-h">
      <div className="lc-top">
        <button type="button" className="btn btn-sm" onClick={onClose}>
          <Icon name="arrow-left" /> All stages
        </button>
        <span className="muted small">Stage {stage.n} of 10</span>
      </div>
      <h2 id="lc-stage-h" className="lc-title">
        {stage.title}
      </h2>
      <p className="muted lc-short">{stage.short}</p>
      <SectionTabs label="Stage parts" sections={PARTS} value={part} onChange={setPart} counts={counts} />
      <div className="lc-part" key={part}>
        {part === 'lesson' && <Lesson stage={stage} onNext={() => setPart('tour')} />}
        {part === 'tour' && <Tour stage={stage} done={!!life?.tour} onDone={() => p.finishLifeTour(stage.id)} onNext={() => setPart('task')} />}
        {part === 'task' && <Task stage={stage} done={taskDone} onDone={() => p.finishLifeTask(stage.id)} onRunIst={onRunIst} />}
        {part === 'details' && <Details stage={stage} />}
        {part === 'mistakes' && <Mistakes stage={stage} />}
        {part === 'quiz' && <QuizBlock qs={stage.quiz} best={life?.quiz ?? 0} onFinish={(pct, answers) => p.finishLifeQuiz(stage.id, pct, answers)} />}
      </div>
      <nav className="lc-pager" aria-label="Stages">
        {prev ? (
          <button type="button" className="btn" onClick={() => onGo(prev.id)}>
            <Icon name="arrow-left" /> {prev.n}. {prev.title}
          </button>
        ) : (
          <span />
        )}
        {next && (
          <button type="button" className="btn" onClick={() => onGo(next.id)}>
            {next.n}. {next.title} <Icon name="arrow-right" />
          </button>
        )}
      </nav>
    </section>
  );
}

function Lesson({ stage, onNext }: { stage: LifeStage; onNext: () => void }) {
  return (
    <article className="card lc-lesson">
      {stage.lesson.map((sec) => (
        <section key={sec.h}>
          <h3 className="h-sub">{sec.h}</h3>
          {sec.p.map((t) => (
            <p key={t}>{t}</p>
          ))}
        </section>
      ))}
      <div className="step-nav">
        <button type="button" className="btn btn-primary" onClick={onNext}>
          Take the 3D tour <Icon name="arrow-right" />
        </button>
      </div>
    </article>
  );
}

function Tour({ stage, done, onDone, onNext }: { stage: LifeStage; done: boolean; onDone: () => void; onNext: () => void }) {
  const [at, setAt] = useState<number | null>(null);
  const stops = useMemo(() => stage.tour.map((t) => ({ anchor: t.anchor, title: t.title })), [stage]);
  const last = at === stage.tour.length - 1;
  useEffect(() => {
    if (last && !done) onDone();
  }, [last, done, onDone]);
  const stop = at === null ? null : stage.tour[at]!;
  return (
    <div className="card lc-tour">
      <Campus3D state={stage.scene} stops={stops} active={at} label={`3D campus at the ${stage.title.toLowerCase()} stage. ${stage.tour.length} numbered tour stops: ${stage.tour.map((t, i) => `${i + 1}, ${t.title}`).join('; ')}.`} />
      <div className="lc-stop" aria-live="polite">
        {stop ? (
          <>
            <div className="eyebrow">
              Stop {at! + 1} of {stage.tour.length}
            </div>
            <h3 className="h-sub">{stop.title}</h3>
            <p>{stop.text}</p>
          </>
        ) : (
          <p className="muted">Press Start to fly through {stage.tour.length} stops, or pick one from the list.</p>
        )}
      </div>
      <div className="step-nav">
        <button type="button" className="btn" disabled={at === null} onClick={() => setAt(at! > 0 ? at! - 1 : null)}>
          <Icon name="arrow-left" /> Back
        </button>
        {!last ? (
          <button type="button" className="btn btn-primary" onClick={() => setAt(at === null ? 0 : at + 1)}>
            {at === null ? 'Start the tour' : 'Next stop'} <Icon name="arrow-right" />
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={onNext}>
            <Icon name="check" /> Tour done: try it yourself
          </button>
        )}
        <button type="button" className="btn btn-ghost" onClick={() => setAt(null)} disabled={at === null}>
          Whole site
        </button>
      </div>
      <ol className="lc-stops">
        {stage.tour.map((t, i) => (
          <li key={t.anchor + i}>
            <button type="button" className={`lc-stop-btn${at === i ? ' on' : ''}`} aria-current={at === i ? 'step' : undefined} onClick={() => setAt(i)}>
              <span className="lc-dot" aria-hidden="true">
                {i + 1}
              </span>
              {t.title}
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hands-on tasks

function Task({ stage, done, onDone, onRunIst }: { stage: LifeStage; done: boolean; onDone: () => void; onRunIst: () => void }) {
  const t = stage.task;
  return (
    <div className="card lc-task">
      <h3 className="h-sub">{t.title}</h3>
      <p>{t.prompt}</p>
      {t.kind === 'order' && <OrderTask task={t} onDone={onDone} />}
      {t.kind === 'sort' && <SortTask task={t} onDone={onDone} />}
      {t.kind === 'calc' && <CalcTask task={t} onDone={onDone} />}
      {t.kind === 'sim' && (
        <div className="lc-sim">
          <button type="button" className="btn btn-primary" onClick={onRunIst}>
            <Icon name="bolt" /> Run the IST in the simulator
          </button>
          <p className="muted small">Opens the live plant with a scored, step-by-step coach. Same scoring as the other drills.</p>
        </div>
      )}
      {done && (
        <p className="lc-ok" role="status">
          <Icon name="check" /> Done. {t.explain}
        </p>
      )}
    </div>
  );
}

/** Deterministic shuffle so the order task never starts solved (and stays stable between renders). */
function shuffled<T>(items: T[], seed: number): T[] {
  const a = items.map((v, i) => ({ v, k: Math.sin(i * 12.9898 + seed * 78.233) }));
  a.sort((x, y) => x.k - y.k);
  const out = a.map((x) => x.v);
  return out.every((v, i) => v === items[i]) ? [...out.slice(1), out[0]!] : out;
}

function OrderTask({ task, onDone }: { task: Extract<LifeTask, { kind: 'order' }>; onDone: () => void }) {
  const [list, setList] = useState(() => shuffled(task.items, task.items.length));
  const [checked, setChecked] = useState(false);
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    const n = [...list];
    [n[i], n[j]] = [n[j]!, n[i]!];
    setList(n);
    setChecked(false);
  };
  const right = list.filter((v, i) => v === task.items[i]).length;
  const all = right === list.length;
  useEffect(() => {
    if (checked && all) onDone();
  }, [checked, all, onDone]);
  return (
    <>
      <ol className="lc-order">
        {list.map((v, i) => (
          <li key={v} className={checked ? (v === task.items[i] ? 'ok' : 'bad') : ''}>
            <span className="lc-order-n" aria-hidden="true">
              {i + 1}
            </span>
            <span className="lc-order-t">{v}</span>
            <span className="lc-order-btns">
              <button type="button" className="btn btn-icon btn-sm" aria-label={`Move "${v}" up`} disabled={i === 0} onClick={() => move(i, -1)}>
                <Icon name="arrow-up" />
              </button>
              <button type="button" className="btn btn-icon btn-sm" aria-label={`Move "${v}" down`} disabled={i === list.length - 1} onClick={() => move(i, 1)}>
                <Icon name="arrow-down" />
              </button>
            </span>
          </li>
        ))}
      </ol>
      <div className="step-nav">
        <button type="button" className="btn btn-primary" onClick={() => setChecked(true)}>
          Check my order
        </button>
        {checked && (
          <span role="status" className={all ? 'lc-good' : 'lc-try'}>
            {all ? 'All in the right order.' : `${right} of ${list.length} in the right place. Keep going.`}
          </span>
        )}
      </div>
    </>
  );
}

function SortTask({ task, onDone }: { task: Extract<LifeTask, { kind: 'sort' }>; onDone: () => void }) {
  const [picks, setPicks] = useState<Record<number, string>>({});
  const [checked, setChecked] = useState(false);
  const allPicked = task.items.every((_, i) => picks[i]);
  const right = task.items.filter((it, i) => picks[i] === it.bucket).length;
  const all = right === task.items.length;
  useEffect(() => {
    if (checked && all) onDone();
  }, [checked, all, onDone]);
  return (
    <>
      <ul className="lc-sort">
        {task.items.map((it, i) => {
          const state = checked && picks[i] ? (picks[i] === it.bucket ? 'ok' : 'bad') : '';
          return (
            <li key={it.text} className={state}>
              <span className="lc-sort-t" id={`lc-s-${i}`}>
                {it.text}
              </span>
              <div className="lc-chips" role="radiogroup" aria-labelledby={`lc-s-${i}`}>
                {task.buckets.map((b) => (
                  <label key={b.id} className={`lc-chip${picks[i] === b.id ? ' on' : ''}`}>
                    <input
                      type="radio"
                      name={`lc-s-${i}`}
                      value={b.id}
                      checked={picks[i] === b.id}
                      onChange={() => {
                        setPicks({ ...picks, [i]: b.id });
                        setChecked(false);
                      }}
                    />
                    {b.label}
                  </label>
                ))}
              </div>
              {state === 'bad' && <span className="lc-hint">Not quite. Try another.</span>}
            </li>
          );
        })}
      </ul>
      <div className="step-nav">
        <button type="button" className="btn btn-primary" disabled={!allPicked} onClick={() => setChecked(true)}>
          Check my answers
        </button>
        {checked && (
          <span role="status" className={all ? 'lc-good' : 'lc-try'}>
            {all ? 'All sorted correctly.' : `${right} of ${task.items.length} right.`}
          </span>
        )}
      </div>
    </>
  );
}

function Num({ label, value, set, min, max, step = 1, unit }: { label: string; value: number; set: (v: number) => void; min: number; max: number; step?: number; unit?: string }) {
  return (
    <label className="field lc-num-field">
      <span>
        {label} <strong>{value.toLocaleString()}{unit ? ` ${unit}` : ''}</strong>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => set(Number(e.target.value))} />
    </label>
  );
}

const SITES = [
  { id: 'a', name: 'Site A: next to a substation', r: { power: 5, fiber: 3, water: 3, risk: 2, cost: 2, time: 5 } },
  { id: 'b', name: 'Site B: cheap land, far from power', r: { power: 1, fiber: 4, water: 4, risk: 4, cost: 5, time: 1 } },
  { id: 'c', name: 'Site C: fiber hub near a river', r: { power: 3, fiber: 5, water: 5, risk: 1, cost: 3, time: 3 } },
];
const FACTORS: { id: keyof (typeof SITES)[number]['r']; label: string }[] = [
  { id: 'power', label: 'Utility power available' },
  { id: 'time', label: 'Power delivered soon' },
  { id: 'fiber', label: 'Diverse fiber' },
  { id: 'water', label: 'Water supply' },
  { id: 'risk', label: 'Low flood / weather risk' },
  { id: 'cost', label: 'Low land and tax cost' },
];

function CalcTask({ task, onDone }: { task: Extract<LifeTask, { kind: 'calc' }>; onDone: () => void }) {
  const [touched, setTouched] = useState(false);
  const touch = () => setTouched(true);
  useEffect(() => {
    if (touched) onDone();
  }, [touched, onDone]);
  // Downtime
  const [nines, setNines] = useState(4);
  const [perMin, setPerMin] = useState(5000);
  // Site
  const [w, setW] = useState<Record<string, number>>({ power: 5, time: 4, fiber: 3, water: 2, risk: 4, cost: 2 });
  // Design
  const [racks, setRacks] = useState(200);
  const [kwr, setKwr] = useState(10);
  const [mod, setMod] = useState(500);
  const [red, setRed] = useState<Redundancy>('N+1');
  // Capacity
  const [pw, setPw] = useState(1000);
  const [cool, setCool] = useState(800);
  const [space, setSpace] = useState(120);
  const [dens, setDens] = useState(10);

  if (task.calc === 'downtime') {
    const a = 1 - Math.pow(10, -nines);
    const mins = downtimeMinutesPerYear(a);
    return (
      <div className="lc-calc" onInput={touch}>
        <div className="seg" role="group" aria-label="Availability">
          {[2, 3, 4, 5].map((n) => (
            <button key={n} type="button" aria-pressed={nines === n} onClick={() => (setNines(n), touch())}>
              {((1 - Math.pow(10, -n)) * 100).toFixed(Math.max(0, n - 2))}%
            </button>
          ))}
        </div>
        <Num label="Example cost per minute of downtime" value={perMin} set={setPerMin} min={100} max={50000} step={100} unit="$" />
        <div className="lc-out">
          <div>
            <span className="muted small">Allowed downtime</span>
            <strong>{mins >= 60 ? `${(mins / 60).toFixed(1)} hours` : `${mins.toFixed(1)} minutes`} / year</strong>
          </div>
          <div>
            <span className="muted small">Example cost</span>
            <strong>${Math.round(mins * perMin).toLocaleString()} / year</strong>
          </div>
        </div>
        <p className="muted small">Formula: downtime = (1 − availability) × 525,600 minutes. The cost is an example input, not a real figure.</p>
      </div>
    );
  }
  if (task.calc === 'site') {
    const ranked = SITES.map((s) => ({ ...s, score: siteScore(w, s.r) })).sort((x, y) => y.score - x.score);
    return (
      <div className="lc-calc" onInput={touch}>
        <p className="muted small">How much does each factor matter? (0 = not at all, 5 = deal-breaker)</p>
        {FACTORS.map((f) => (
          <Num key={f.id} label={f.label} value={w[f.id] ?? 0} set={(v) => setW({ ...w, [f.id]: v })} min={0} max={5} />
        ))}
        <ol className="lc-rank">
          {ranked.map((s, i) => (
            <li key={s.id} className={i === 0 ? 'top' : ''}>
              <span>{s.name}</span>
              <span className="lc-bar" aria-hidden="true">
                <span style={{ width: `${s.score}%` }} />
              </span>
              <strong>{Math.round(s.score)}</strong>
            </li>
          ))}
        </ol>
        <p className="muted small">Score = weighted average of each site's 0–5 ratings, as a percent. Ratings here are made up for practice.</p>
      </div>
    );
  }
  if (task.calc === 'design') {
    const kw = itLoadKw(racks, kwr);
    const n = upsModulesNeeded(kw, mod, red);
    return (
      <div className="lc-calc" onInput={touch}>
        <Num label="Racks" value={racks} set={setRacks} min={10} max={1000} step={10} />
        <Num label="Average kW per rack" value={kwr} set={setKwr} min={2} max={100} />
        <Num label="UPS module size" value={mod} set={setMod} min={250} max={1500} step={250} unit="kW" />
        <div className="seg" role="group" aria-label="Redundancy">
          {(['N', 'N+1', '2N'] as Redundancy[]).map((r) => (
            <button key={r} type="button" aria-pressed={red === r} onClick={() => (setRed(r), touch())}>
              {r}
            </button>
          ))}
        </div>
        <div className="lc-out">
          <div>
            <span className="muted small">IT load</span>
            <strong>{kw.toLocaleString()} kW</strong>
          </div>
          <div>
            <span className="muted small">UPS modules to buy</span>
            <strong>{n}</strong>
          </div>
          <div>
            <span className="muted small">Heat to remove</span>
            <strong>{Math.round(kwToTons(kw)).toLocaleString()} tons</strong>
          </div>
        </div>
        <p className="muted small">
          Modules: N = load ÷ module size, rounded up; N+1 adds one; 2N doubles. Cooling: 1 ton ≈ 3.517 kW. {kwr > 30 ? 'At this density, plan for liquid cooling.' : ''} Planning math only; real designs add margins, losses and growth.
        </p>
      </div>
    );
  }
  const c = capacityLimits(pw, cool, space, dens);
  const lim = { power: 'Power', cooling: 'Cooling', space: 'Floor space' }[c.limit];
  return (
    <div className="lc-calc" onInput={touch}>
      <Num label="Usable power (at redundancy)" value={pw} set={setPw} min={100} max={3000} step={50} unit="kW" />
      <Num label="Usable cooling (hot day, unit out)" value={cool} set={setCool} min={100} max={3000} step={50} unit="kW" />
      <Num label="Rack positions" value={space} set={setSpace} min={10} max={300} step={5} />
      <Num label="Average kW per rack" value={dens} set={setDens} min={2} max={60} />
      <div className="lc-out">
        <div>
          <span className="muted small">Racks you can fill</span>
          <strong>{c.racks}</strong>
        </div>
        <div>
          <span className="muted small">Runs out first</span>
          <strong>{lim}</strong>
        </div>
      </div>
      <ul className="lc-stranded">
        <li>Stranded power: {Math.round(c.strandedPowerKw).toLocaleString()} kW</li>
        <li>Stranded cooling: {Math.round(c.strandedCoolingKw).toLocaleString()} kW</li>
        <li>Empty rack positions: {c.strandedRacks}</li>
      </ul>
      <p className="muted small">Each budget ÷ kW per rack gives the racks it could support; the smallest wins. Planning math only.</p>
    </div>
  );
}

// ---------------------------------------------------------------------------

function Details({ stage }: { stage: LifeStage }) {
  const anyVerify = stage.details.some((d) => d.verify);
  return (
    <div className="lc-details">
      {anyVerify && (
        <div className="callout lc-verify" role="note">
          <Icon name="warning" /> <span>{VERIFY_NOTE}</span>
        </div>
      )}
      <div className="lc-cards">
        {stage.details.map((d) => (
          <article key={d.title} className="card lc-card">
            <h3 className="h-sub">
              {d.title}
              {d.verify && <span className="chip chip-warn lc-vchip">Verify</span>}
            </h3>
            <p>{d.text}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

function Mistakes({ stage }: { stage: LifeStage }) {
  return (
    <ul className="lc-mistakes">
      {stage.mistakes.map((m) => (
        <li key={m.mistake} className="card">
          <strong>
            <Icon name="warning" /> {m.mistake}
          </strong>
          <p>{m.why}</p>
        </li>
      ))}
    </ul>
  );
}

