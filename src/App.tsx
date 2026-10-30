/** App shell: brand header, tabs (hash-routed), footer. */
import { useCallback, useEffect, useState } from 'react';
import { CHANGE } from './content/change';
import { guideForKind } from './content/equipment';
import { LESSONS, simForStep, type Lesson } from './content/lessons';
import { SAFETY } from './content/safety';
import type { ComponentKind } from './sim';
import { BUSINESS } from './ui/business';
import { Icon, type IconName } from './ui/icons';
import { usePrefs } from './ui/prefs';
import { SimulatorTab } from './ui/sim/SimulatorTab';
import { AboutTab } from './ui/tabs/AboutTab';
import { ArticlesTab } from './ui/tabs/ArticlesTab';
import { ChangeQuiz } from './ui/tabs/ChangeQuiz';
import { EquipmentTab } from './ui/tabs/EquipmentTab';
import { Coach, LearnTab, type LessonState } from './ui/tabs/LearnTab';
import { useSimulation } from './ui/useSimulation';

type Tab = 'sim' | 'learn' | 'equipment' | 'safety' | 'change' | 'about';

const TABS: { id: Tab; label: string; short: string; icon: IconName }[] = [
  { id: 'sim', label: 'Simulator', short: 'Sim', icon: 'bolt' },
  { id: 'learn', label: 'Learn', short: 'Learn', icon: 'book' },
  { id: 'equipment', label: 'Equipment', short: 'Equipment', icon: 'wrench' },
  { id: 'safety', label: 'Safety & Codes', short: 'Safety', icon: 'shield' },
  { id: 'change', label: 'Change Mgmt', short: 'Change', icon: 'change' },
];

function tabFromHash(): Tab {
  const h = window.location.hash.replace(/^#\/?/, '');
  return (['sim', 'learn', 'equipment', 'safety', 'change', 'about'] as Tab[]).includes(h as Tab) ? (h as Tab) : 'sim';
}

export function App() {
  const { resolvedTheme, update, reset: resetPrefs } = usePrefs();
  const [tab, setTabState] = useState<Tab>(tabFromHash);
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.getElementById('main')?.focus({ preventScroll: true });
  }, []);

  // --- Walkthroughs drive the simulator ---
  const goToStep = useCallback(
    (l: Lesson, step: number) => {
      h.load(simForStep(l, step));
      setSelected(l.steps[step]?.focus ?? null);
      setMode('explore');
      setLesson({ lesson: l, step });
    },
    [h],
  );
  const startLesson = (l: Lesson) => goToStep(l, 0);
  const exitLesson = () => setLesson(null);

  const openGuide = (kind: ComponentKind) => {
    setGuideId(guideForKind(kind)?.id ?? null);
    setTab('equipment');
  };
  const showKindInSim = (kind: string) => {
    const first = [...h.sim.graph.nodes.values()].find((n) => n.kind === kind);
    setSelected(first?.id ?? null);
    setTab('sim');
  };

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="app-header">
        <a
          className="brand"
          href="#/sim"
          onClick={(e) => {
            e.preventDefault();
            setTab('sim');
          }}
        >
          <img src={`${import.meta.env.BASE_URL}brand/logo-mark.png`} alt="Caylor Made Technologies logo" width={38} height={38} />
          <span className="brand-text">
            <span className="brand-title">Critical Facilities Simulator</span>
            <span className="brand-sub">Caylor Made Technologies</span>
          </span>
        </a>
        <nav className="tabbar tabbar-top" aria-label="Sections">
          <div className="tabbar" role="tablist" aria-label="Sections">
          {TABS.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} aria-controls="main" onClick={() => setTab(t.id)}>
              <Icon name={t.icon} />
              {t.label}
            </button>
          ))}
          </div>
        </nav>
        <div className="header-actions">
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

      <main id="main" tabIndex={-1}>
        {tab === 'sim' && (
          <SimulatorTab
            h={h}
            mode={mode}
            setMode={setMode}
            selected={selected}
            setSelected={setSelected}
            onOpenGuide={openGuide}
            coach={
              lesson ? (
                <Coach
                  compact
                  state={lesson}
                  goTo={(s) => goToStep(lesson.lesson, s)}
                  onExit={exitLesson}
                  onBackToLesson={() => setTab('learn')}
                />
              ) : (
                <div className="callout" style={{ marginTop: 0, marginBottom: 14 }}>
                  <strong>New here? </strong>
                  <button className="linklike" type="button" onClick={() => startLesson(LESSONS[0]!)}>
                    Take the 4-minute guided tour
                  </button>{' '}
                  or pick any walkthrough in the Learn tab.
                </div>
              )
            }
          />
        )}
        {tab === 'learn' && (
          <LearnTab active={lesson} start={startLesson} goTo={(s) => lesson && goToStep(lesson.lesson, s)} exit={exitLesson} showSim={() => setTab('sim')} />
        )}
        {tab === 'equipment' && <EquipmentTab openId={guideId} onShowInSim={showKindInSim} />}
        {tab === 'safety' && (
          <ArticlesTab
            eyebrow="Safety & codes"
            title="Rules, regulations & uptime"
            intro="The safety rules, standards, and habits that keep people safe and the load running, in plain English."
            articles={SAFETY}
          />
        )}
        {tab === 'change' && (
          <ArticlesTab
            eyebrow="Management of change"
            title="Change management (MOC)"
            intro="Every change to a critical system is reviewed, approved, executed step by step, and documented. This is how the industry keeps changes from becoming outages."
            articles={CHANGE}
            extras={{ what: <ChangeQuiz /> }}
          />
        )}
        {tab === 'about' && <AboutTab onResetPrefs={resetPrefs} />}
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
            <button className="linklike" type="button" onClick={() => setTab('about')}>
              About, privacy & terms
            </button>
            <a href={BUSINESS.site} rel="noopener">
              {BUSINESS.siteLabel}
            </a>
            <a href={BUSINESS.github} rel="noopener">
              Source on GitHub
            </a>
          </nav>
        </div>
      </footer>

      <nav className="tabbar tabbar-bottom" aria-label="Sections (bottom)">
        <div className="tabbar-inner" role="tablist" aria-label="Sections">
          {TABS.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} aria-controls="main" onClick={() => setTab(t.id)}>
              <Icon name={t.icon} />
              {t.short}
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}
