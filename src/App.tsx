/**
 * App shell: brand header, grouped sidebar (laptop), bottom bar + "More"
 * sheet (phone), hash routing, XP toasts, and every tab.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { CHANGE } from './content/change';
import { CODES } from './content/codes';
import { guideForKind } from './content/equipment';
import { LESSONS, simForStep, type Lesson } from './content/lessons';
import { SAFETY } from './content/safety';
import { UPTIME } from './content/uptime';
import { choose, confirmStep, evaluate, previewConsequence, procedureSim, startRun, takeHint, type ComponentKind, type Procedure, type ProcRun } from './sim';
import { BUSINESS } from './ui/business';
import { Icon } from './ui/icons';
import { BOTTOM, GROUPS, NAV, TAB_IDS, type Tab } from './ui/nav';
import { usePrefs } from './ui/prefs';
import { levelOf, useProgress } from './ui/progress';
import { SimulatorTab, type SimView } from './ui/sim/SimulatorTab';
import { AboutTab } from './ui/tabs/AboutTab';
import { ArticlesTab } from './ui/tabs/ArticlesTab';
import { EquipmentTab } from './ui/tabs/EquipmentTab';
import { FeedbackTab } from './ui/tabs/FeedbackTab';
import { GlossaryTab } from './ui/tabs/GlossaryTab';
import { HomeTab } from './ui/tabs/HomeTab';
import { Coach, LearnTab, type LessonState } from './ui/tabs/LearnTab';
import { NeverDoTab } from './ui/tabs/NeverDoTab';
import { ProceduresTab } from './ui/tabs/ProceduresTab';
import { PROCEDURES, surpriseDrill } from './content/procedures';
import { DesignsTab } from './ui/tabs/DesignsTab';
import { CasesTab } from './ui/tabs/CasesTab';
import { ProcedureCoach, type ProcFeedback } from './ui/sim/ProcedureCoach';
import { QuizTab } from './ui/tabs/QuizTab';
import { useSimulation } from './ui/useSimulation';

/** Lessons with simulator actions or focus targets play out in the Simulator tab. */
const drivesSim = (l: Lesson) => l.steps.some((s) => s.actions || s.focus);

function tabFromHash(): Tab {
  const h = window.location.hash.replace(/^#\/?/, '');
  return (TAB_IDS as string[]).includes(h) ? (h as Tab) : 'home';
}

export function App() {
  const { prefs, resolvedTheme, update, reset: resetPrefs } = usePrefs();
  const [simView, setSimView] = useState<SimView>('electrical');
  const [tab, setTabState] = useState<Tab>(tabFromHash);
  const [moreOpen, setMoreOpen] = useState(false);
  const [toast, setToast] = useState<{ id: number; msg: string } | null>(null);
  const toastTimer = useRef<number>();
  const showToast = useCallback((msg: string) => {
    window.clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), msg });
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);
  const p = useProgress(showToast);
  const h = useSimulation('2N');
  const [mode, setMode] = useState<'explore' | 'failure'>('explore');
  const [selected, setSelected] = useState<string | null>(null);
  const [guideId, setGuideId] = useState<string | null>(null);
  const [lesson, setLesson] = useState<LessonState | null>(null);
  const [proc, setProc] = useState<{ p: Procedure; run: ProcRun; started: number; secs?: number } | null>(null);
  const [procFb, setProcFb] = useState<ProcFeedback | null>(null);

  useEffect(() => {
    const on = () => setTabState(tabFromHash());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  const setTab = useCallback((t: Tab) => {
    if (window.location.hash !== `#/${t}`) window.location.hash = `/${t}`;
    const swap = () => {
      setTabState(t);
      setMoreOpen(false);
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    };
    // Cross-fade between tabs where the browser supports view transitions.
    const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
    const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (doc.startViewTransition && !calm) doc.startViewTransition(() => flushSync(swap));
    else swap();
    document.getElementById('main')?.focus({ preventScroll: true });
  }, []);

  // Close the phone "More" sheet with Escape.
  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMoreOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [moreOpen]);

  // --- Walkthroughs drive the simulator ---
  const goToStep = useCallback(
    (l: Lesson, step: number) => {
      if (drivesSim(l)) {
        h.load(simForStep(l, step));
        setSelected(l.steps[step]?.focus ?? null);
        setMode('explore');
        setSimView(l.steps[step]?.view ?? 'electrical');
      }
      setLesson({ lesson: l, step });
    },
    [h],
  );
  const startLesson = (l: Lesson) => {
    setProc(null);
    goToStep(l, 0);
  };
  const startTour = () => {
    setProc(null);
    goToStep(LESSONS[0]!, 0);
    setTab('sim');
  };

  // --- Procedures and drills run on the live simulator ---
  const focusStep = useCallback((p: Procedure, i: number) => {
    const st = p.steps[i];
    if (!st) return;
    setSimView(st.view ?? 'electrical');
    if (st.focus) setSelected(st.focus);
  }, []);
  const startProc = (p: Procedure) => {
    const sim = procedureSim(p);
    h.load(sim);
    h.setSpeed(1);
    h.setRunning(!!p.run);
    setMode('explore');
    setLesson(null);
    setSelected(null);
    setProcFb(null);
    const run = startRun(p, sim);
    setProc({ p, run, started: Date.now() });
    focusStep(p, run.step);
    setTab('sim');
  };
  // Score and auto-advance on every engine change.
  useEffect(() => {
    if (!proc || proc.run.done) return;
    const next = evaluate(proc.p, proc.run, h.sim);
    if (next.score === proc.run.score && next.step === proc.run.step && next.eventIdx === proc.run.eventIdx && next.racksDown === proc.run.racksDown) return;
    if (next.score < proc.run.score) setProcFb({ ok: false, text: next.mistakes[next.mistakes.length - 1] ?? 'Points lost.' });
    else if (next.step > proc.run.step) {
      setProcFb({ ok: true, text: `Step ${proc.run.step + 1} done: ${proc.p.steps[proc.run.step]!.title}.` });
      // On a phone the coach may be scrolled out of view, so confirm with a toast too.
      if (!next.done) showToast(`Step ${proc.run.step + 1} done. Next: ${proc.p.steps[next.step]!.title}`);
    }
    setProc({ ...proc, run: next });
    if (next.step !== proc.run.step) focusStep(proc.p, next.step);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [h.version]);
  // Save the best score when a run finishes.
  useEffect(() => {
    if (proc?.run.done) {
      const secs = (Date.now() - proc.started) / 1000;
      setProc({ ...proc, secs });
      p.finishProcedure(proc.p.id, proc.run.score, secs);
      h.setRunning(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proc?.run.done]);
  const procAct = (fn: (r: ProcRun) => ProcRun, fb?: (before: ProcRun, after: ProcRun) => ProcFeedback | null) => {
    if (!proc) return;
    const before = proc.run;
    const after = h.act(() => fn(before));
    setProcFb(fb ? fb(before, after) : null);
    setProc({ ...proc, run: after });
    if (after.step !== before.step) focusStep(proc.p, after.step);
  };
  const procCoach = proc ? (
    <ProcedureCoach
      proc={proc.p}
      run={proc.run}
      started={proc.started}
      secs={proc.secs}
      bestSecs={p.progress.times[proc.p.id]}
      feedback={procFb}
      preview={(c) => previewConsequence(h.sim, c)}
      onConfirm={() => procAct((r) => confirmStep(proc.p, r, h.sim), (b) => ({ ok: true, text: `Confirmed: ${proc.p.steps[b.step]!.confirm}.` }))}
      onChoose={(i) =>
        procAct(
          (r) => choose(proc.p, r, h.sim, i),
          (b, a) => {
            const c = proc.p.steps[b.step]!.choices![i]!;
            return a.step > b.step ? { ok: true, text: c.why } : null;
          },
        )
      }
      onHint={() => procAct(takeHint)}
      onShowMe={() => focusStep(proc.p, proc.run.step)}
      onRetry={() => startProc(proc.p.id === 'drill-surprise' ? surpriseDrill() : proc.p)}
      onExit={() => {
        setProc(null);
        setProcFb(null);
      }}
      onBrowse={() => {
        setProc(null);
        setTab('procedures');
      }}
    />
  ) : null;

  const openGuide = (kind: ComponentKind) => {
    setGuideId(guideForKind(kind)?.id ?? null);
    setTab('equipment');
  };
  const showKindInSim = (kind: string) => {
    const first = [...h.sim.graph.nodes.values()].find((n) => n.kind === kind);
    setSelected(first?.id ?? null);
    if (first) setSimView(first.domain === 'mechanical' && first.kind !== 'cdu' ? 'mechanical' : 'electrical');
    setTab('sim');
  };

  const lvl = levelOf(p.xp);
  const current = NAV.find((n) => n.id === tab)!;
  const simLesson = lesson && drivesSim(lesson.lesson) ? lesson : null;

  return (
    <div className="shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="app-header">
        <a
          className="brand"
          href="#/home"
          onClick={(e) => {
            e.preventDefault();
            setTab('home');
          }}
        >
          <img src={`${import.meta.env.BASE_URL}brand/logo-mark.png`} alt="Caylor Made Technologies logo" width={38} height={38} />
          <span className="brand-text">
            <span className="brand-title">Critical Facilities Simulator</span>
            <span className="brand-sub">Caylor Made Technologies</span>
          </span>
        </a>
        <div className="header-actions">
          <button className="xp-pill" type="button" onClick={() => setTab('home')} aria-label={`Level ${lvl.name}, ${p.xp} XP. Go to Home.`}>
            <Icon name="star" />
            <span className="xp-pill-level">{lvl.name}</span>
            <span className="xp-pill-xp">{p.xp} XP</span>
          </button>
          <button
            className="btn btn-icon btn-ghost"
            type="button"
            onClick={() => update({ theme: resolvedTheme === 'dark' ? 'light' : 'dark' })}
            aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
          >
            <Icon name={resolvedTheme === 'dark' ? 'sun' : 'moon'} />
          </button>
        </div>
      </header>

      <div className="body">
        <nav className="sidebar" aria-label="Sections">
          {GROUPS.map((g) => (
            <div key={g} className="side-group">
              <div className="side-group-label">{g}</div>
              {NAV.filter((n) => n.group === g).map((n) => (
                <a
                  key={n.id}
                  href={`#/${n.id}`}
                  className={`side-link${n.id === 'never' ? ' danger' : ''}`}
                  aria-current={tab === n.id ? 'page' : undefined}
                  onClick={(e) => {
                    e.preventDefault();
                    setTab(n.id);
                  }}
                >
                  <Icon name={n.icon} />
                  {n.label}
                </a>
              ))}
            </div>
          ))}
        </nav>

        <div className="content">
          <main id="main" tabIndex={-1} aria-label={current.label}>
            {tab === 'home' && <HomeTab p={p} go={setTab} startTour={startTour} />}
            {tab === 'sim' && (
              <SimulatorTab
                h={h}
                mode={mode}
                setMode={setMode}
                selected={selected}
                setSelected={setSelected}
                onOpenGuide={openGuide}
                view={simView}
                setView={setSimView}
                units={prefs.units}
                focused={!!proc || !!simLesson}
                setUnits={(u) => update({ units: u })}
                coach={
                  procCoach ?? (simLesson ? (
                    <Coach
                      compact
                      state={simLesson}
                      goTo={(s) => goToStep(simLesson.lesson, s)}
                      onExit={() => setLesson(null)}
                      onBackToLesson={() => setTab('learn')}
                      onFinish={() => p.finishLesson(simLesson.lesson.id)}
                    />
                  ) : (
                    <div className="callout" style={{ marginTop: 0, marginBottom: 14 }}>
                      <strong>New here? </strong>
                      <button className="linklike" type="button" onClick={startTour}>
                        Take the 4-minute guided tour
                      </button>
                      , pick a walkthrough in Learn, or{' '}
                      <button className="linklike" type="button" onClick={() => setTab('procedures')}>
                        run a scored MOP or drill
                      </button>
                      .
                    </div>
                  ))
                }
              />
            )}
            {tab === 'learn' && (
              <LearnTab
                active={lesson}
                done={p.progress.lessons}
                start={startLesson}
                goTo={(s) => lesson && goToStep(lesson.lesson, s)}
                exit={() => setLesson(null)}
                finish={p.finishLesson}
                showSim={() => setTab('sim')}
              />
            )}
            {tab === 'procedures' && (
              <ProceduresTab best={p.progress.procs} times={p.progress.times} start={startProc} onRound={(id, score) => p.finishProcedure(id, score)} />
            )}
            {tab === 'cases' && (
              <CasesTab
                onPractice={(id) => {
                  const pr = PROCEDURES.find((x) => x.id === id);
                  if (pr) startProc(pr);
                  else setTab('procedures');
                }}
              />
            )}
            {tab === 'designs' && <DesignsTab sim={h.sim} version={h.version} units={prefs.units} onTry={(t) => { setProc(null); setLesson(null); h.reset(t); setSelected(null); setTab('sim'); }} />}
            {tab === 'quiz' && <QuizTab p={p} />}
            {tab === 'equipment' && <EquipmentTab openId={guideId} onShowInSim={showKindInSim} onRead={p.readGuide} />}
            {tab === 'never' && <NeverDoTab />}
            {tab === 'glossary' && <GlossaryTab />}
            {tab === 'safety' && (
              <ArticlesTab eyebrow="Safety" title="Go home the way you came in" intro="Electrical and mechanical hazards, lockout/tagout, and the PPE basics, in plain English." articles={SAFETY} />
            )}
            {tab === 'codes' && (
              <ArticlesTab eyebrow="Codes & standards" title="The rulebook, decoded" intro="Who writes the rules and what each standard means for you on shift, split by electrical, mechanical, fire, and environmental." articles={CODES} />
            )}
            {tab === 'uptime' && (
              <ArticlesTab eyebrow="Uptime" title="Keep the load running" intro="The habits, practices, and emergency response that prevent outages." articles={UPTIME} />
            )}
            {tab === 'change' && (
              <ArticlesTab
                eyebrow="Management of change"
                title="Change management (MOC)"
                intro="Every change to a critical system is reviewed, approved, executed step by step, and documented. This is how the industry keeps changes from becoming outages."
                articles={CHANGE}
              />
            )}
            {tab === 'feedback' && <FeedbackTab />}
            {tab === 'about' && (
              <AboutTab
                onResetPrefs={() => {
                  resetPrefs();
                  p.reset();
                  showToast('Saved settings and progress cleared.');
                }}
              />
            )}
          </main>

          <footer className="app-footer">
            <div className="inner">
              <div className="brand-foot">
                <img src={`${import.meta.env.BASE_URL}brand/logo-mark.png`} alt="" width={44} height={44} />
                <div className="foot-word">
                  <strong>CAYLOR MADE</strong>
                  <span>TECHNOLOGIES</span>
                </div>
              </div>
              <p className="foot-tagline">Advanced Engineering. Built Different.</p>
              <p className="disclaimer">
                Educational simulation of generic data center infrastructure. Not a site procedure. Always follow your
                facility's approved MOPs/EOPs and LOTO program.
              </p>
              <p>
                Built by {BUSINESS.name} · {BUSINESS.city} · <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>
              </p>
              <nav aria-label="Footer">
                <a href="#/about" onClick={(e) => { e.preventDefault(); setTab('about'); }}>
                  About, privacy & terms
                </a>
                <a href="#/feedback" onClick={(e) => { e.preventDefault(); setTab('feedback'); }}>
                  Feedback
                </a>
                <a href={BUSINESS.site} rel="noopener">
                  {BUSINESS.siteLabel}
                </a>
                <a href={BUSINESS.github} rel="noopener">
                  Source on GitHub
                </a>
              </nav>
            </div>
          </footer>
        </div>
      </div>

      {/* Phone navigation */}
      <nav className="bottombar" aria-label="Quick sections">
        {BOTTOM.map((id) => {
          const n = NAV.find((x) => x.id === id)!;
          return (
            <a
              key={id}
              href={`#/${id}`}
              aria-current={tab === id ? 'page' : undefined}
              onClick={(e) => {
                e.preventDefault();
                setTab(id);
              }}
            >
              <Icon name={n.icon} />
              {n.short}
            </a>
          );
        })}
        <button type="button" aria-expanded={moreOpen} aria-controls="more-sheet" onClick={() => setMoreOpen(!moreOpen)} className={!BOTTOM.includes(tab) ? 'active' : ''}>
          <Icon name="menu" />
          More
        </button>
      </nav>
      {moreOpen && (
        <>
          <div className="sheet-backdrop" onClick={() => setMoreOpen(false)} aria-hidden="true" />
          <div className="sheet" id="more-sheet" role="dialog" aria-modal="true" aria-label="All sections">
            <div className="sheet-handle" aria-hidden="true" />
            {GROUPS.filter((g) => NAV.some((n) => n.group === g && !BOTTOM.includes(n.id))).map((g) => (
              <div key={g} className="sheet-group">
                <div className="side-group-label">{g}</div>
                <div className="sheet-grid">
                  {NAV.filter((n) => n.group === g && !BOTTOM.includes(n.id)).map((n) => (
                    <a
                      key={n.id}
                      href={`#/${n.id}`}
                      className={`sheet-link${n.id === 'never' ? ' danger' : ''}`}
                      aria-current={tab === n.id ? 'page' : undefined}
                      onClick={(e) => {
                        e.preventDefault();
                        setTab(n.id);
                      }}
                    >
                      <Icon name={n.icon} />
                      <span>{n.label}</span>
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="toast-region" aria-live="polite">
        {toast && (
          <div className="toast" key={toast.id}>
            <Icon name="star" /> {toast.msg}
          </div>
        )}
      </div>
    </div>
  );
}
