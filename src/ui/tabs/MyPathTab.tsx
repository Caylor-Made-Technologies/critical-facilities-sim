/**
 * My Path: a personal training plan. Optional resume (read on this device
 * only, never stored), a few questions, an 8-question skill check, then a
 * week-by-week path built from this app's lessons, drills and certs.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type React from 'react';
import { BRANCHES, DC_CERTS, LADDER } from '../../content/ladder';
import {
  EMPTY_CONFIDENCE,
  EQUIPMENT_EXP,
  GOALS,
  HOURS,
  ROLES,
  SKILL_AREAS,
  STYLES,
  YEARS,
  analyzeResume,
  buildPath,
  confidenceFromResume,
  dcCertsInResume,
  equipmentFromResume,
  itemDone,
  roleFromResume,
  scoreProfile,
  skillCheck,
  yearsIdFrom,
  type PathItem,
  type Profile,
  type ResumeSignals,
  type SkillArea,
  type SkillScores,
} from '../../content/path';
import { Confetti, CountUp } from '../common';
import { buzz } from '../haptics';
import { Icon, type IconName } from '../icons';
import type { Tab } from '../nav';
import type { ProgressHandle } from '../progress';
import { readResume } from '../resumeReader';

const FACES = ['😬', '🙂', '😊', '😎', '🏆'];
const FACE_LABEL = ['New to me', 'A little', 'Comfortable', 'Confident', 'I could teach it'];

type Draft = Omit<Profile, 'done' | 'createdAt' | 'check'> & { check: Record<string, boolean> };

const emptyDraft = (): Draft => ({
  name: '',
  role: 'new',
  jobTitle: '',
  years: '0',
  equipment: [],
  confidence: { ...EMPTY_CONFIDENCE },
  certs: [],
  goal: 'climb',
  branch: '',
  hours: 2,
  style: 'hands',
  check: {},
  resume: null,
});

const STEPS = ['Hello', 'Resume', 'Your job', 'Equipment', 'Confidence', 'Certs', 'Goals', 'Skill check'] as const;

// ---------------------------------------------------------------------------
export function MyPathTab({ p, onStart, go }: { p: ProgressHandle; onStart: (it: PathItem) => void; go: (t: Tab) => void }) {
  const profile = p.progress.profile;
  const [mode, setMode] = useState<'wizard' | 'building' | 'view'>(profile ? 'view' : 'wizard');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [retake, setRetake] = useState(false);

  const finish = (d: Draft) => {
    setDraft(d);
    setMode('building');
  };
  useEffect(() => {
    if (mode !== 'building' || !draft) return;
    const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const t = window.setTimeout(
      () => {
        p.saveProfile({ ...draft, done: profile?.done ?? [], createdAt: new Date().toISOString().slice(0, 10) });
        setMode('view');
        setRetake(false);
        window.scrollTo({ top: 0, behavior: calm ? 'auto' : 'smooth' });
      },
      calm ? 300 : 3200,
    );
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, draft]);

  return (
    <div className="tab-panel mypath">
      {mode === 'wizard' && (
        <Wizard
          key={retake ? 'retake' : 'edit'}
          initial={profile ? { ...profile, check: retake ? {} : profile.check } : emptyDraft()}
          startAt={retake ? STEPS.length - 1 : 0}
          onDone={finish}
          onCancel={profile ? () => setMode('view') : undefined}
        />
      )}
      {mode === 'building' && draft && <Building name={draft.name} />}
      {mode === 'view' && profile && (
        <PathView
          p={p}
          profile={profile}
          onStart={onStart}
          go={go}
          onEdit={() => {
            setRetake(false);
            setMode('wizard');
          }}
          onRetake={() => {
            setRetake(true);
            setMode('wizard');
          }}
          onDelete={() => {
            if (window.confirm('Delete your profile and path from this device? Your other progress stays.')) {
              p.saveProfile(null);
              setMode('wizard');
            }
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
function Wizard({ initial, startAt, onDone, onCancel }: { initial: Draft; startAt: number; onDone: (d: Draft) => void; onCancel?: () => void }) {
  const [d, setD] = useState<Draft>(initial);
  const [step, setStep] = useState(startAt);
  const [dir, setDir] = useState<1 | -1>(1);
  const top = useRef<HTMLDivElement>(null);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  const move = (n: number) => {
    setDir(n > step ? 1 : -1);
    setStep(n);
    buzz(8);
    requestAnimationFrame(() => top.current?.scrollIntoView({ block: 'start', behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }));
  };
  const last = step === STEPS.length - 1;
  const hi = d.name.trim() ? `, ${d.name.trim()}` : '';

  return (
    <section className="wizard" aria-labelledby="wiz-h" ref={top}>
      <div className="wiz-top">
        <div className="eyebrow">My Path · step {step + 1} of {STEPS.length}</div>
        {onCancel && (
          <button className="btn btn-sm btn-ghost" type="button" onClick={onCancel}>
            <Icon name="close" /> Cancel
          </button>
        )}
      </div>
      <ol className="wiz-steps" aria-label="Steps">
        {STEPS.map((s, i) => (
          <li key={s} className={i < step ? 'done' : i === step ? 'now' : ''} aria-current={i === step ? 'step' : undefined}>
            <span className="visually-hidden">{s}</span>
          </li>
        ))}
      </ol>
      <div className="wiz-bar" aria-hidden="true">
        <span style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
      </div>

      <div className={`wiz-card card dir-${dir > 0 ? 'fwd' : 'back'}`} key={step}>
        {step === 0 && (
          <>
            <div className="wiz-hero" aria-hidden="true">
              <span className="orb" />
              <span className="orb-ring" />
              <span className="orb-emoji">🧭</span>
            </div>
            <h1 id="wiz-h">Let's build a path that's yours</h1>
            <p className="wiz-lead">
              A few questions, an optional resume, and a quick 8-question skill check. Then you get a week-by-week
              training plan built around what you already know and where you want to go.
            </p>
            <label className="field big-field">
              <span>What should I call you? (optional)</span>
              <input type="text" value={d.name} maxLength={40} autoComplete="given-name" placeholder="First name" onChange={(e) => set('name', e.target.value)} />
            </label>
            <PrivacyNote />
          </>
        )}

        {step === 1 && <ResumeStep d={d} setD={setD} hi={hi} />}

        {step === 2 && (
          <>
            <h1 id="wiz-h">What do you do right now{hi}?</h1>
            {d.resume && roleFromResume(d.resume) && <p className="suggest">✨ Picked from your resume. Change it if it's off.</p>}
            <div className="pick-grid" role="radiogroup" aria-label="Your current work">
              {ROLES.map((r, i) => (
                <button key={r.id} type="button" role="radio" aria-checked={d.role === r.id} className={`pick${d.role === r.id ? ' on' : ''}`} style={{ '--i': i } as React.CSSProperties} onClick={() => set('role', r.id)}>
                  {r.label}
                </button>
              ))}
            </div>
            <div className="wiz-row">
              <label className="field big-field">
                <span>Your job title (optional)</span>
                <input type="text" value={d.jobTitle} maxLength={80} placeholder="e.g. Building Engineer" onChange={(e) => set('jobTitle', e.target.value)} />
              </label>
            </div>
            <fieldset className="chip-set">
              <legend>Years in the trades or facilities</legend>
              {YEARS.map((y) => (
                <button key={y.id} type="button" aria-pressed={d.years === y.id} className={`tip-chip${d.years === y.id ? ' on' : ''}`} onClick={() => set('years', y.id)}>
                  {y.label}
                </button>
              ))}
            </fieldset>
          </>
        )}

        {step === 3 && (
          <>
            <h1 id="wiz-h">What have you worked on?</h1>
            <p className="wiz-lead">Tap everything you've operated, maintained or repaired. Partial counts.</p>
            <div className="equip-grid">
              {EQUIPMENT_EXP.map((e, i) => {
                const on = d.equipment.includes(e.id);
                return (
                  <button
                    key={e.id}
                    type="button"
                    aria-pressed={on}
                    className={`equip${on ? ' on' : ''}`}
                    style={{ '--i': i } as React.CSSProperties}
                    onClick={() => {
                      buzz(8);
                      set('equipment', on ? d.equipment.filter((x) => x !== e.id) : [...d.equipment, e.id]);
                    }}
                  >
                    <span className="equip-check" aria-hidden="true">
                      <Icon name="check" />
                    </span>
                    {e.label}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <h1 id="wiz-h">How confident do you feel?</h1>
            <p className="wiz-lead">Be honest: this only shapes your plan. Nobody else sees it.</p>
            <ul className="conf-list">
              {SKILL_AREAS.map((a, i) => {
                const v = d.confidence[a.id];
                return (
                  <li key={a.id} style={{ '--i': i } as React.CSSProperties}>
                    <div className="conf-head">
                      <span>
                        <span aria-hidden="true">{a.emoji}</span> <strong>{a.label}</strong>
                        <span className="muted small"> · {a.blurb}</span>
                      </span>
                      <span className="conf-face" key={v} aria-hidden="true">
                        {FACES[v - 1]}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={5}
                      step={1}
                      value={v}
                      aria-label={`${a.label} confidence`}
                      aria-valuetext={FACE_LABEL[v - 1]}
                      onChange={(e) => set('confidence', { ...d.confidence, [a.id]: Number(e.target.value) })}
                      className={`conf-range lvl-${v}`}
                    />
                    <span className="conf-label">{FACE_LABEL[v - 1]}</span>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {step === 5 && (
          <>
            <h1 id="wiz-h">Any data center certifications yet?</h1>
            {d.resume && dcCertsFound(d) && <p className="suggest">✨ Found some on your resume and ticked them.</p>}
            <div className="equip-grid">
              {DC_CERTS.map((c, i) => {
                const on = d.certs.includes(c.id);
                return (
                  <button key={c.id} type="button" aria-pressed={on} className={`equip cert-pick${on ? ' on' : ''}`} style={{ '--i': i } as React.CSSProperties} onClick={() => set('certs', on ? d.certs.filter((x) => x !== c.id) : [...d.certs, c.id])}>
                    <span className="equip-check" aria-hidden="true">
                      <Icon name="check" />
                    </span>
                    <span>
                      <strong>{c.short}</strong>
                      <span className="muted small"> {c.name}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="muted small">None yet? Totally fine. Your path will tell you which one to go for first.</p>
          </>
        )}

        {step === 6 && (
          <>
            <h1 id="wiz-h">Where do you want to go{hi}?</h1>
            <div className="pick-grid" role="radiogroup" aria-label="Your goal">
              {GOALS.map((g, i) => (
                <button key={g.id} type="button" role="radio" aria-checked={d.goal === g.id} className={`pick${d.goal === g.id ? ' on' : ''}`} style={{ '--i': i } as React.CSSProperties} onClick={() => set('goal', g.id)}>
                  {g.label}
                </button>
              ))}
            </div>
            {d.goal === 'branch' && (
              <label className="field big-field">
                <span>Which specialty?</span>
                <select value={d.branch} onChange={(e) => set('branch', e.target.value)}>
                  <option value="">Pick one…</option>
                  {BRANCHES.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.emoji} {b.title}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <fieldset className="chip-set">
              <legend>Study time per week</legend>
              {HOURS.map((h) => (
                <button key={h} type="button" aria-pressed={d.hours === h} className={`tip-chip${d.hours === h ? ' on' : ''}`} onClick={() => set('hours', h)}>
                  {h} hour{h > 1 ? 's' : ''}
                </button>
              ))}
            </fieldset>
            <fieldset className="chip-set">
              <legend>How do you like to learn?</legend>
              {STYLES.map((s) => (
                <button key={s.id} type="button" aria-pressed={d.style === s.id} className={`tip-chip${d.style === s.id ? ' on' : ''}`} onClick={() => set('style', s.id)}>
                  <span aria-hidden="true">{s.emoji}</span> {s.label}
                </button>
              ))}
            </fieldset>
          </>
        )}

        {step === 7 && <SkillCheck check={d.check} setCheck={(c) => set('check', c)} hi={hi} />}
      </div>

      <div className="wiz-nav">
        <button className="btn" type="button" disabled={step === 0} onClick={() => move(step - 1)}>
          <Icon name="arrow-left" /> Back
        </button>
        {step === 1 && !d.resume && (
          <button className="btn btn-ghost" type="button" onClick={() => move(step + 1)}>
            Skip for now
          </button>
        )}
        {last ? (
          <button className="btn btn-primary btn-lg" type="button" disabled={Object.keys(d.check).length < skillCheck().length} onClick={() => onDone(d)}>
            <Icon name="star" /> Build my path
          </button>
        ) : (
          <button className="btn btn-primary" type="button" onClick={() => move(step + 1)} disabled={step === 6 && d.goal === 'branch' && !d.branch}>
            Next <Icon name="arrow-right" />
          </button>
        )}
      </div>
    </section>
  );
}

const dcCertsFound = (d: Draft) => (d.resume?.certs ?? []).some((c) => DC_CERTS.some((x) => c.toUpperCase().includes(x.short)));

function PrivacyNote() {
  return (
    <p className="privacy-pill">
      <Icon name="lock" /> Stays on this device. Your resume is read right here and never uploaded or saved.
    </p>
  );
}

// ---------------------------------------------------------------------------
function ResumeStep({ d, setD, hi }: { d: Draft; setD: React.Dispatch<React.SetStateAction<Draft>>; hi: string }) {
  const [state, setState] = useState<'idle' | 'reading' | 'done' | 'error'>(d.resume ? 'done' : 'idle');
  const [err, setErr] = useState('');
  const [paste, setPaste] = useState('');
  const [over, setOver] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  const apply = async (text: string) => {
    setState('reading');
    const started = Date.now();
    const r: ResumeSignals = analyzeResume(text);
    const certs = dcCertsInResume(text);
    // Let the scan animation play for a moment; the work itself is instant.
    const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    await new Promise((res) => setTimeout(res, calm ? 0 : Math.max(0, 1800 - (Date.now() - started))));
    setD((x) => ({
      ...x,
      resume: r,
      role: roleFromResume(r) ?? x.role,
      jobTitle: x.jobTitle || r.titles[0] || '',
      years: yearsIdFrom(r.years) ?? x.years,
      equipment: [...new Set([...x.equipment, ...equipmentFromResume(r)])],
      confidence: confidenceFromResume(r),
      certs: [...new Set([...x.certs, ...certs])],
    }));
    setState('done');
    buzz([10, 40, 10]);
  };
  const onFile = async (f: File | undefined) => {
    if (!f) return;
    setErr('');
    setState('reading');
    try {
      const text = await readResume(f);
      if (text.trim().length < 40) throw new Error('I couldn\'t find much text in that file (it may be a scanned image). Try pasting the text instead.');
      await apply(text);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Couldn\'t read that file. Try pasting the text instead.');
      setState('error');
    }
    if (file.current) file.current.value = '';
  };

  return (
    <>
      <h1 id="wiz-h">Got a resume{hi}?</h1>
      <p className="wiz-lead">I'll read it to pre-fill your answers. Optional, and you can change everything after.</p>
      {state !== 'done' && (
        <div
          className={`drop${over ? ' over' : ''}${state === 'reading' ? ' reading' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            onFile(e.dataTransfer.files?.[0]);
          }}
        >
          <div className="doc" aria-hidden="true">
            <span className="doc-line" />
            <span className="doc-line short" />
            <span className="doc-line" />
            <span className="doc-line" />
            <span className="doc-line short" />
            {state === 'reading' && <span className="scan" />}
          </div>
          {state === 'reading' ? (
            <p className="drop-text" aria-live="polite">
              Reading your resume on this device…
            </p>
          ) : (
            <>
              <p className="drop-text">Drop a PDF, Word (.docx) or text file here</p>
              <button className="btn btn-primary" type="button" onClick={() => file.current?.click()}>
                <Icon name="arrow-up" /> Choose a file
              </button>
              <input ref={file} type="file" hidden accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" onChange={(e) => onFile(e.target.files?.[0])} aria-label="Choose your resume file" />
            </>
          )}
        </div>
      )}
      {err && (
        <p className="form-error" role="alert">
          {err}
        </p>
      )}
      {state !== 'done' && state !== 'reading' && (
        <details className="paste">
          <summary>Or paste your resume text</summary>
          <textarea rows={6} value={paste} maxLength={50000} onChange={(e) => setPaste(e.target.value)} aria-label="Resume text" placeholder="Paste here…" />
          <button className="btn btn-sm" type="button" disabled={paste.trim().length < 40} onClick={() => apply(paste)}>
            Read it
          </button>
        </details>
      )}
      {state === 'done' && d.resume && <ResumeFindings r={d.resume} onClear={() => { setD((x) => ({ ...x, resume: null })); setState('idle'); }} />}
      <PrivacyNote />
    </>
  );
}

function ResumeFindings({ r, onClear }: { r: ResumeSignals; onClear: () => void }) {
  const top = [...SKILL_AREAS].sort((a, b) => r.hits[b.id] - r.hits[a.id]).filter((a) => r.hits[a.id] > 0);
  return (
    <div className="findings" aria-live="polite">
      <p className="findings-head">
        <span aria-hidden="true">✨</span> Read {r.chars.toLocaleString()} characters. Here's what I found:
      </p>
      {r.titles.length > 0 && (
        <div className="find-group">
          <h2>Job titles</h2>
          <ul className="find-chips">
            {r.titles.map((t, i) => (
              <li key={t} style={{ '--i': i } as React.CSSProperties}>
                {t}
              </li>
            ))}
          </ul>
        </div>
      )}
      {r.years !== null && (
        <div className="find-group">
          <h2>Experience</h2>
          <ul className="find-chips">
            <li>About {r.years} year{r.years === 1 ? '' : 's'}</li>
          </ul>
        </div>
      )}
      {top.length > 0 && (
        <div className="find-group">
          <h2>Strongest areas on paper</h2>
          <ul className="find-chips">
            {top.slice(0, 5).map((a, i) => (
              <li key={a.id} style={{ '--i': i } as React.CSSProperties}>
                <span aria-hidden="true">{a.emoji}</span> {a.label}
              </li>
            ))}
          </ul>
        </div>
      )}
      {r.certs.length > 0 && (
        <div className="find-group">
          <h2>Certifications & skills</h2>
          <ul className="find-chips cert-chips">
            {r.certs.map((c, i) => (
              <li key={c} style={{ '--i': i } as React.CSSProperties}>
                🎖️ {c}
              </li>
            ))}
          </ul>
        </div>
      )}
      {r.keywords.length > 0 && (
        <div className="find-group">
          <h2>Keywords</h2>
          <ul className="find-chips kw">
            {r.keywords.slice(0, 18).map((k, i) => (
              <li key={k} style={{ '--i': i } as React.CSSProperties}>
                {k}
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="muted small">
        I pre-filled the next steps from this. The resume itself is already gone: only these findings are kept.{' '}
        <button type="button" className="linklike" onClick={onClear}>
          Remove these findings
        </button>
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
function SkillCheck({ check, setCheck, hi }: { check: Record<string, boolean>; setCheck: (c: Record<string, boolean>) => void; hi: string }) {
  const qs = useMemo(() => skillCheck(), []);
  const firstOpen = qs.findIndex((q) => !(q.id in check));
  const [i, setI] = useState(firstOpen < 0 ? qs.length : firstOpen);
  const [picked, setPicked] = useState<number | null>(null);
  if (i >= qs.length) {
    const right = qs.filter((q) => check[q.id]).length;
    return (
      <div className="check-done">
        <div className="big-score" aria-hidden="true">
          <CountUp value={right} />
          <span>/{qs.length}</span>
        </div>
        <h1 id="wiz-h">Skill check done{hi}!</h1>
        <p className="wiz-lead">
          {right >= 7 ? 'Sharp. Your path will push you toward advanced work.' : right >= 4 ? 'Good base. Your path will fill in the gaps.' : 'No problem at all. Your path starts right at the foundations.'}{' '}
          Tap <strong>Build my path</strong>.
        </p>
        <button className="linklike" type="button" onClick={() => { setCheck({}); setI(0); }}>
          Retake the skill check
        </button>
      </div>
    );
  }
  const q = qs[i]!;
  return (
    <div className="check">
      <h1 id="wiz-h" className="check-h">
        Quick skill check: {i + 1} of {qs.length}
      </h1>
      <div className="check-dots" aria-hidden="true">
        {qs.map((x, k) => (
          <span key={x.id} className={k < i ? (check[x.id] ? 'ok' : 'bad') : k === i ? 'now' : ''} />
        ))}
      </div>
      <p className="check-q" key={q.id}>
        {q.q}
      </p>
      <div className="quiz-options" role="group" aria-label="Answers">
        {q.options.map((o, k) => {
          const state = picked === null ? '' : k === q.answer ? ' correct' : k === picked ? ' wrong' : ' dim';
          return (
            <button
              key={o}
              type="button"
              className={`quiz-opt${state}`}
              aria-disabled={picked !== null}
              onClick={() => {
                if (picked !== null) return;
                setPicked(k);
                const ok = k === q.answer;
                buzz(ok ? 20 : [40, 60, 40]);
                setCheck({ ...check, [q.id]: ok });
                window.setTimeout(() => {
                  setPicked(null);
                  setI(i + 1);
                }, window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 400 : 1100);
              }}
            >
              <span className="quiz-letter" aria-hidden="true">
                {String.fromCharCode(65 + k)}
              </span>
              <span>{o}</span>
            </button>
          );
        })}
      </div>
      <p className="muted small">Not sure? Pick your best guess. It only tunes your path.</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
const BUILD_STEPS = ['Reading your answers', 'Scoring your skill check', 'Finding your strengths', 'Mapping you to the career ladder', 'Picking lessons and drills', 'Scheduling your weeks'];

function Building({ name }: { name: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setN((x) => Math.min(BUILD_STEPS.length, x + 1)), 480);
    return () => window.clearInterval(t);
  }, []);
  return (
    <section className="building" aria-live="polite" aria-label="Building your path">
      <div className="build-orbit" aria-hidden="true">
        <span className="build-core">🧭</span>
        {['⚡', '❄️', '🦺', '🔋', '🎛️', '📋'].map((e, i) => (
          <span key={e} className="build-sat" style={{ '--i': i } as React.CSSProperties}>
            {e}
          </span>
        ))}
      </div>
      <h1>Building your path{name.trim() ? `, ${name.trim()}` : ''}…</h1>
      <ul className="build-steps">
        {BUILD_STEPS.map((s, i) => (
          <li key={s} className={i < n ? 'done' : i === n ? 'now' : ''}>
            <span className="build-tick" aria-hidden="true">
              {i < n ? '✓' : ''}
            </span>
            {s}
          </li>
        ))}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------------------
export function Radar({ scores }: { scores: Record<SkillArea, number> }) {
  const n = SKILL_AREAS.length;
  const c = 130;
  const R = 92;
  const pt = (i: number, v: number) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [c + Math.cos(a) * R * (v / 100), c + Math.sin(a) * R * (v / 100)] as const;
  };
  const poly = SKILL_AREAS.map((a, i) => pt(i, scores[a.id]).join(',')).join(' ');
  return (
    <svg className="radar" viewBox="0 0 260 260" role="img" aria-label={`Skill radar: ${SKILL_AREAS.map((a) => `${a.label} ${scores[a.id]}`).join(', ')}`}>
      {[25, 50, 75, 100].map((r) => (
        <polygon key={r} className="radar-grid" points={SKILL_AREAS.map((_, i) => pt(i, r).join(',')).join(' ')} />
      ))}
      {SKILL_AREAS.map((a, i) => {
        const [x, y] = pt(i, 100);
        const [lx, ly] = pt(i, 122);
        return (
          <g key={a.id}>
            <line className="radar-axis" x1={c} y1={c} x2={x} y2={y} />
            <text x={lx} y={ly} className="radar-emoji" textAnchor="middle" dominantBaseline="middle">
              {a.emoji}
            </text>
          </g>
        );
      })}
      <polygon className="radar-shape" points={poly} />
      {SKILL_AREAS.map((a, i) => {
        const [x, y] = pt(i, scores[a.id]);
        return <circle key={a.id} className="radar-dot" cx={x} cy={y} r={4} style={{ '--i': i } as React.CSSProperties} />;
      })}
    </svg>
  );
}

const KIND: Record<PathItem['kind'], { icon: IconName; label: string }> = {
  lesson: { icon: 'book', label: 'Lesson' },
  proc: { icon: 'list', label: 'Scored practice' },
  safety: { icon: 'shield', label: 'Safety drill' },
  tab: { icon: 'arrow-right', label: 'Explore' },
  cert: { icon: 'star', label: 'Certification' },
  exam: { icon: 'clock', label: 'Exam' },
};

function greeting(): string {
  const h = new Date().getHours();
  return h < 5 ? 'Late shift' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

function PathView({ p, profile, onStart, go, onEdit, onRetake, onDelete }: { p: ProgressHandle; profile: Profile; onStart: (it: PathItem) => void; go: (t: Tab) => void; onEdit: () => void; onRetake: () => void; onDelete: () => void }) {
  const s: SkillScores = useMemo(() => scoreProfile(profile), [profile]);
  const path = useMemo(() => buildPath(profile, s), [profile, s]);
  const [burst, setBurst] = useState(0);
  const all = path.phases.flatMap((ph) => ph.items);
  const isDone = (it: PathItem) => itemDone(it, p.progress, profile.done);
  const doneN = all.filter(isDone).length;
  const next = all.find((it) => !isDone(it));
  const pct = all.length ? doneN / all.length : 0;
  const rung = LADDER.find((r) => r.id === s.rung)!;
  const rungIdx = LADDER.indexOf(rung);
  const role = ROLES.find((r) => r.id === profile.role)!;
  const name = profile.name.trim();
  const prevDone = useRef(doneN);
  useEffect(() => {
    if (doneN > prevDone.current && doneN === all.length) setBurst(Date.now());
    prevDone.current = doneN;
  }, [doneN, all.length]);
  const area = (id: SkillArea) => SKILL_AREAS.find((a) => a.id === id)!;

  return (
    <>
      <header className="path-hero">
        <div className="path-hero-bg" aria-hidden="true" />
        <div className="eyebrow">My Path</div>
        <h1>
          {greeting()}
          {name ? `, ${name}` : ''} <span className="wave" aria-hidden="true">👋</span>
        </h1>
        <p className="path-hero-sub">
          {profile.jobTitle || role.label} · {YEARS.find((y) => y.id === profile.years)!.label} · {profile.hours} hr/week
        </p>
        {next ? (
          <div className="next-up card">
            <span className="next-label">Next up · week {path.weekOf[next.key]}</span>
            <strong>{next.title}</strong>
            <span className="muted small">{next.why}</span>
            <button className="btn btn-primary" type="button" onClick={() => onStart(next)}>
              <Icon name="play" /> Start{next.minutes ? ` · ${next.minutes} min` : ''}
            </button>
          </div>
        ) : (
          <div className="next-up card all-done">
            <strong>🏆 Path complete!</strong>
            <span>Retake the skill check to build your next level.</span>
            <button className="btn btn-primary" type="button" onClick={onRetake}>
              Build my next path
            </button>
          </div>
        )}
      </header>

      <section className="path-profile" aria-labelledby="prof-h">
        <div className="card prof-card">
          <h2 id="prof-h" className="h-card">
            Your skill profile
          </h2>
          <div className="prof-top">
            <div className="prof-ring" aria-label={`Overall ${s.overall} out of 100`}>
              <svg viewBox="0 0 120 120" aria-hidden="true">
                <circle cx="60" cy="60" r="50" className="ring-bg" />
                <circle cx="60" cy="60" r="50" className="ring-fg prof-ring-fg" strokeDasharray={314} style={{ '--off': 314 * (1 - s.overall / 100) } as React.CSSProperties} />
              </svg>
              <span className="prof-score">
                <CountUp value={s.overall} />
              </span>
            </div>
            <div>
              <span className="level-chip">{s.level.name}</span>
              <p className="prof-blurb">{s.level.blurb}</p>
            </div>
          </div>
          <Radar scores={s.areas} />
          <div className="prof-lists">
            <div>
              <h3>💪 Strengths</h3>
              <ul className="find-chips">
                {s.strengths.map((a) => (
                  <li key={a}>
                    {area(a).emoji} {area(a).label}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3>🎯 Focus areas</h3>
              <ul className="find-chips focus">
                {s.focus.map((a) => (
                  <li key={a}>
                    {area(a).emoji} {area(a).label}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <ul className="area-bars">
            {SKILL_AREAS.map((a, i) => (
              <li key={a.id} style={{ '--i': i } as React.CSSProperties}>
                <span>
                  {a.emoji} {a.label}
                </span>
                <span className="mix-bar" role="img" aria-label={`${a.label}: ${s.areas[a.id]} out of 100`}>
                  <span className="mix-fill mix-hands" style={{ '--w': `${s.areas[a.id]}%`, '--i': i } as React.CSSProperties} />
                </span>
                <span className="mix-val" aria-hidden="true">
                  {s.areas[a.id]}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card ladder-spot">
          <h2 className="h-card">Your spot on the ladder</h2>
          <ol className="mini-ladder" reversed>
            {[...LADDER].reverse().map((r) => {
              const i = LADDER.indexOf(r);
              return (
                <li key={r.id} className={i === rungIdx ? 'here' : i < rungIdx ? 'below' : ''} style={{ '--i': i } as React.CSSProperties}>
                  <span className="mini-num">{i === rungIdx ? '🧗' : i + 1}</span>
                  {r.role}
                </li>
              );
            })}
          </ol>
          <p>
            Based on your role, you're around <strong>rung {rungIdx + 1}</strong>. Your path aims at{' '}
            <strong>{LADDER[Math.min(LADDER.length - 1, rungIdx + 1)]!.role.toLowerCase()}</strong>
            {profile.goal === 'branch' && profile.branch ? <> with a branch toward <strong>{BRANCHES.find((b) => b.id === profile.branch)?.title}</strong></> : null}.
          </p>
          <button className="btn btn-sm" type="button" onClick={() => go('career')}>
            Open the career ladder <Icon name="arrow-right" />
          </button>
        </div>
      </section>

      <section className="path-plan print-area" aria-labelledby="plan-h">
        <div className="plan-head">
          <h2 id="plan-h">Your training path</h2>
          <span className="plan-meta">
            {doneN} of {all.length} done · about {path.weeks} week{path.weeks === 1 ? '' : 's'} · {Math.round(path.totalMinutes / 60)} hr of practice
          </span>
        </div>
        <div className="plan-bar" aria-hidden="true">
          <span style={{ width: `${pct * 100}%` }} />
        </div>
        <ol className="phases">
          {path.phases.map((ph, pi) => {
            const phDone = ph.items.filter(isDone).length;
            return (
              <li key={ph.id} className={`phase${phDone === ph.items.length ? ' complete' : ''}`} style={{ '--i': pi } as React.CSSProperties}>
                <div className="phase-head">
                  <span className="phase-emoji" aria-hidden="true">
                    {phDone === ph.items.length ? '✅' : ph.emoji}
                  </span>
                  <div>
                    <h3>
                      Phase {pi + 1}: {ph.title}
                    </h3>
                    <p className="muted small">{ph.blurb}</p>
                  </div>
                  <span className="chip">
                    {phDone}/{ph.items.length}
                  </span>
                </div>
                <ul className="path-items">
                  {ph.items.map((it, k) => {
                    const done = isDone(it);
                    const manual = it.kind === 'tab';
                    return (
                      <li key={it.key} className={`path-item${done ? ' done' : ''}${next?.key === it.key ? ' next' : ''}`} style={{ '--i': k } as React.CSSProperties}>
                        <span className="pi-icon" aria-hidden="true">
                          <Icon name={done ? 'check' : KIND[it.kind].icon} />
                        </span>
                        <div className="pi-body">
                          <span className="pi-meta">
                            {KIND[it.kind].label} · week {path.weekOf[it.key]}
                            {it.minutes ? ` · ${it.minutes} min` : ''}
                          </span>
                          <strong>{it.title}</strong>
                          <span className="pi-why">{it.why}</span>
                        </div>
                        <div className="pi-actions">
                          <button className={`btn btn-sm${done ? '' : ' btn-primary'}`} type="button" onClick={() => onStart(it)}>
                            {done ? 'Again' : 'Start'}
                          </button>
                          {manual && (
                            <label className="pi-check">
                              <input
                                type="checkbox"
                                checked={done}
                                onChange={() => {
                                  if (!done) buzz([10, 40, 10]);
                                  p.togglePathDone(it.key);
                                }}
                              />
                              Done
                            </label>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          })}
        </ol>
        <p className="muted small">
          Lessons, drills, safety drills, certs and the exam tick themselves off when you finish them. Tap <strong>Done</strong>{' '}
          on the explore items when you've been through them.
        </p>
      </section>

      <section className="card path-actions no-print">
        <h2 className="h-card">Tune your path</h2>
        <div className="record-actions">
          <button className="btn" type="button" onClick={onRetake}>
            <Icon name="target" /> Retake skill check
          </button>
          <button className="btn" type="button" onClick={onEdit}>
            <Icon name="list" /> Edit my answers
          </button>
          <button className="btn" type="button" onClick={() => window.print()}>
            <Icon name="print" /> Print my plan
          </button>
          <button className="btn btn-ghost" type="button" onClick={onDelete}>
            <Icon name="close" /> Delete my path
          </button>
        </div>
        <p className="muted small">
          Built {profile.createdAt || 'today'}. Your answers and the skill findings stay in this browser only. Use About →
          Download a backup to move them to a new phone. This is a learning plan, not a job assessment or a qualification.
        </p>
      </section>
      <Confetti burst={burst} />
    </>
  );
}
