/**
 * App shell: brand header, grouped sidebar (laptop), bottom bar + "More"
 * sheet (phone), hash routing, XP toasts, and every tab.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { CHANGE } from './content/change';
import { CODES } from './content/codes';
import { guideForKind } from './content/equipment';
import { LESSONS, simForStep, type Lesson } from './content/lessons';
import { SAFETY } from './content/safety';
import { UPTIME } from './content/uptime';
import type { ComponentKind } from './sim';
import { BUSINESS } from './ui/business';
import { Icon } from './ui/icons';
import { BOTTOM, GROUPS, NAV, TAB_IDS, type Tab } from './ui/nav';
import { usePrefs } from './ui/prefs';
import { levelOf, useProgress } from './ui/progress';
import { SimulatorTab } from './ui/sim/SimulatorTab';
import { AboutTab } from './ui/tabs/AboutTab';
import { ArticlesTab } from './ui/tabs/ArticlesTab';
import { EquipmentTab } from './ui/tabs/EquipmentTab';
import { FeedbackTab } from './ui/tabs/FeedbackTab';
import { GlossaryTab } from './ui/tabs/GlossaryTab';
import { HomeTab } from './ui/tabs/HomeTab';
import { Coach, LearnTab, type LessonState } from './ui/tabs/LearnTab';
import { NeverDoTab } from './ui/tabs/NeverDoTab';
import { QuizTab } from './ui/tabs/QuizTab';
import { useSimulation } from './ui/useSimulation';

function tabFromHash(): Tab {
  const h = window.location.hash.replace(/^#\/?/, '');
  return (TAB_IDS as string[]).includes(h) ? (h as Tab) : 'home';
}

export function App() {
  const { resolvedTheme, update, reset: resetPrefs } = usePrefs();
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

  useEffect(() => {
    const on = () => setTabState(tabFromHash());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  const setTab = useCallback((t: Tab) => {
    if (window.location.hash !== `#/${t}`) window.location.hash = `/${t}`;
    setTabState(t);
    setMoreOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
      if (l.area === 'electrical') {
        h.load(simForStep(l, step));
        setSelected(l.steps[step]?.focus ?? null);
        setMode('explore');
      }
      setLesson({ lesson: l, step });
    },
    [h],
  );
  const startLesson = (l: Lesson) => goToStep(l, 0);
  const startTour = () => {
    goToStep(LESSONS[0]!, 0);
    setTab('sim');
  };

  const openGuide = (kind: ComponentKind) => {
    setGuideId(guideForKind(kind)?.id ?? null);
    setTab('equipment');
  };
  const showKindInSim = (kind: string) => {
    const first = [...h.sim.graph.nodes.values()].find((n) => n.kind === kind);
    setSelected(first?.id ?? null);
    setTab('sim');
  };

  const lvl = levelOf(p.xp);
  const current = NAV.find((n) => n.id === tab)!;
  const simLesson = lesson && lesson.lesson.area === 'electrical' ? lesson : null;

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
                coach={
                  simLesson ? (
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
                      </button>{' '}
                      or pick any walkthrough in the Learn tab.
                    </div>
                  )
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
