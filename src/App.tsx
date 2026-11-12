/**
 * App shell: brand header, grouped sidebar (laptop), bottom bar + "More"
 * sheet (phone), hash routing, XP toasts, and every tab.
 */
import { TabBoundary } from './ui/TabBoundary';
import { applyUpdate, onUpdateReady } from './ui/swUpdate';
import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import type React from 'react';
import { LESSONS, simForStep, type Lesson } from './content/lessons';
import { buildPlant, choose, confirmStep, evaluate, previewConsequence, procedureSim, Simulation, startRun, takeHint, type ComponentKind, type Procedure, type ProcRun } from './sim';
import { BUSINESS } from './ui/business';
import { Icon } from './ui/icons';
import { BOTTOM, GROUP_DESC, GROUPS, NAV, TAB_IDS, type Tab } from './ui/nav';
import { TEXT_SIZES, usePrefs } from './ui/prefs';
import { levelOf, useProgress } from './ui/progress';
import { SimulatorTab, type SimView } from './ui/sim/SimulatorTab';
import type { PathItem } from './content/path';
import { rememberTab } from './ui/tabs/HomeExtras';
import type { Jump } from './ui/search';
import { useCountUp } from './ui/common';
import { HomeTab } from './ui/tabs/HomeTab';
import { ProceduresTab } from './ui/tabs/ProceduresTab';
import { PROCEDURES, surpriseDrill } from './content/procedures';
import { ProcedureCoach, type ProcFeedback } from './ui/sim/ProcedureCoach';
import { useSimulation } from './ui/useSimulation';
import type { PlannedEvent } from './content/shift';
import type { RoundIssue } from './content/liveRounds';
import { Palette } from './ui/Palette';
import { resetQuality } from './ui/three/quality';

import type { LessonState } from './ui/tabs/LearnTab';
import type { Article } from './content/types';

// Every tab except Home, the Simulator and Procedures loads on demand, so the
// first page is light. All of them are fetched once the browser is idle, so
// moving around (and offline use) stays instant.
const LOADERS = {
  about: () => import('./ui/tabs/AboutTab'),
  articles: () => import('./ui/tabs/ArticlesTab'),
  safety: () => import('./ui/tabs/SafetyTab'),
  tools: () => import('./ui/tabs/FieldToolsTab'),
  career: () => import('./ui/tabs/CareerTab'),
  tips: () => import('./ui/tabs/TipsTab'),
  mypath: () => import('./ui/tabs/MyPathTab'),
  equipment: () => import('./ui/tabs/EquipmentTab'),
  feedback: () => import('./ui/tabs/FeedbackTab'),
  glossary: () => import('./ui/tabs/GlossaryTab'),
  learn: () => import('./ui/tabs/LearnTab'),
  never: () => import('./ui/tabs/NeverDoTab'),
  designs: () => import('./ui/tabs/DesignsTab'),
  cases: () => import('./ui/tabs/CasesTab'),
  quiz: () => import('./ui/tabs/QuizTab'),
  codes: () => import('./content/codes'),
  uptime: () => import('./content/uptime'),
  change: () => import('./content/change'),
  equipmentData: () => import('./content/equipment'),
  tipsData: () => import('./content/tips'),
  search: () => import('./ui/search'),
};
const AboutTab = lazy(() => LOADERS.about().then((m) => ({ default: m.AboutTab })));
const SafetyTab = lazy(() => LOADERS.safety().then((m) => ({ default: m.SafetyTab })));
const FieldToolsTab = lazy(() => LOADERS.tools().then((m) => ({ default: m.FieldToolsTab })));
const CareerTab = lazy(() => LOADERS.career().then((m) => ({ default: m.CareerTab })));
const TipsTab = lazy(() => LOADERS.tips().then((m) => ({ default: m.TipsTab })));
const MyPathTab = lazy(() => LOADERS.mypath().then((m) => ({ default: m.MyPathTab })));
const EquipmentTab = lazy(() => LOADERS.equipment().then((m) => ({ default: m.EquipmentTab })));
const FeedbackTab = lazy(() => LOADERS.feedback().then((m) => ({ default: m.FeedbackTab })));
const GlossaryTab = lazy(() => LOADERS.glossary().then((m) => ({ default: m.GlossaryTab })));
const LearnTab = lazy(() => LOADERS.learn().then((m) => ({ default: m.LearnTab })));
const Coach = lazy(() => LOADERS.learn().then((m) => ({ default: m.Coach })));
const ShiftCoach = lazy(() => import('./ui/sim/ShiftCoach'));
const RoundCoach = lazy(() => import('./ui/sim/RoundCoach'));
const NeverDoTab = lazy(() => LOADERS.never().then((m) => ({ default: m.NeverDoTab })));
const DesignsTab = lazy(() => LOADERS.designs().then((m) => ({ default: m.DesignsTab })));
const CasesTab = lazy(() => LOADERS.cases().then((m) => ({ default: m.CasesTab })));
const QuizTab = lazy(() => LOADERS.quiz().then((m) => ({ default: m.QuizTab })));
type ArticleProps = { eyebrow: string; title: string; intro: string };
const articlesFrom = (data: () => Promise<Article[]>) =>
  lazy(async () => {
    const [{ ArticlesTab }, articles] = await Promise.all([LOADERS.articles(), data()]);
    return { default: (p: ArticleProps) => <ArticlesTab {...p} articles={articles} /> };
  });
const CodesTab = articlesFrom(() => LOADERS.codes().then((m) => m.CODES));
const UptimeTab = articlesFrom(() => LOADERS.uptime().then((m) => m.UPTIME));
const ChangeTab = articlesFrom(() => LOADERS.change().then((m) => m.CHANGE));
// One chunk at a time, each in an idle moment, so preloading never blocks a tap.
const preloadAll = () => {
  const queue = Object.values(LOADERS);
  const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
  const next = () => {
    const f = queue.shift();
    if (!f) return;
    void f()
      .catch(() => {})
      .finally(() => (w.requestIdleCallback ? w.requestIdleCallback(next, { timeout: 2000 }) : window.setTimeout(next, 50)));
  };
  next();
};

/** Placeholder while a tab's code arrives (usually already cached). */
function TabLoading() {
  return (
    <div className="tab-loading" role="status" aria-live="polite">
      <span className="scene3d-spinner" aria-hidden="true" />
      <span className="visually-hidden">Loading…</span>
    </div>
  );
}

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
  const tabRef = useRef(tab);
  tabRef.current = tab;
  // Brand "power-on" intro: once per visit, skipped for reduced motion.
  // Brand intro: static markup in index.html (so it paints before the code loads).
  // First visit this session: let it finish its animation. Otherwise remove it now.
  useEffect(() => {
    const boot = document.getElementById('boot');
    if (!boot) return;
    let first = false;
    try {
      first = !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches && !sessionStorage.getItem('cfs-splash');
      sessionStorage.setItem('cfs-splash', '1');
    } catch {
      /* storage blocked */
    }
    if (!first) {
      boot.remove();
      return;
    }
    const t = window.setTimeout(() => boot.remove(), 1900);
    return () => window.clearTimeout(t);
  }, []);
  // Sliding highlight behind the active sidebar and bottom-bar items.
  const sideRef = useRef<HTMLElement>(null);
  const bottomRef = useRef<HTMLElement>(null);
  const [sideInk, setSideInk] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [bottomInk, setBottomInk] = useState<{ x: number; w: number } | null>(null);
  useLayoutEffect(() => {
    const place = () => {
      const a = sideRef.current?.querySelector<HTMLElement>('[aria-current="page"]');
      setSideInk(a ? { x: a.offsetLeft, y: a.offsetTop, w: a.offsetWidth, h: a.offsetHeight } : null);
      // 6e: keep the current tab visible in the sidebar on short screens (it scrolls on its own).
      const side = sideRef.current;
      if (a && side && (a.offsetTop < side.scrollTop || a.offsetTop + a.offsetHeight > side.scrollTop + side.clientHeight)) side.scrollTop = a.offsetTop - side.clientHeight / 2;
      const b = bottomRef.current?.querySelector<HTMLElement>('[aria-current="page"], button.active');
      setBottomInk(b ? { x: b.offsetLeft, w: b.offsetWidth } : null);
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [tab]);
  const [moreOpen, setMoreOpen] = useState(false);
  const [toast, setToast] = useState<{ id: number; msg: string } | null>(null);
  const toastTimer = useRef<number>();
  const showToast = useCallback((msg: string) => {
    window.clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), msg });
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);
  const p = useProgress(showToast);
  // A new deploy finished downloading in the background (B-003).
  const [updateReady, setUpdateReady] = useState(false);
  useEffect(() => onUpdateReady(() => setUpdateReady(true)), []);
  const h = useSimulation('2N');
  const [mode, setMode] = useState<'explore' | 'failure'>('explore');
  const [selected, setSelected] = useState<string | null>(null);
  const [guideId, setGuideId] = useState<string | null>(null);
  /** A search result asked for a guide's Deep dive part (cleared once shown). */
  const [guideDeep, setGuideDeep] = useState(false);
  const [lesson, setLesson] = useState<LessonState | null>(null);
  type ProcState = { p: Procedure; run: ProcRun; started: number; secs?: number } | null;
  const [proc, setProcState] = useState<ProcState>(null);
  /** Shift mode (Phase 8d): the planned events of the running shift, or null. */
  const [shift, setShift] = useState<{ seed: number; plan: PlannedEvent[] } | null>(null);
  /** Live round (Phase 9d): the hidden issues of the round being walked, or null. */
  const [round, setRound] = useState<{ seed: number; issues: RoundIssue[] } | null>(null);
  // The latest run, updated synchronously (B-023): a click and the scoring effect can land in the same frame,
  // and the effect must build on the click's result, not on the run from the render before it.
  const procRef = useRef<ProcState>(null);
  const setProc = useCallback((v: ProcState) => {
    procRef.current = v;
    setProcState(v);
  }, []);
  const [procFb, setProcFb] = useState<ProcFeedback | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  // Life of a Data Center stage to open in Learn (from search).
  const [lifeOpen, setLifeOpen] = useState<string | null>(null);
  // Fetch every tab once the first page has settled.
  useEffect(() => {
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    const id = window.setTimeout(() => (w.requestIdleCallback ? w.requestIdleCallback(preloadAll, { timeout: 4000 }) : preloadAll()), 2500);
    return () => window.clearTimeout(id);
  }, []);
  const [safetyArticle, setSafetyArticle] = useState<string | null>(null);
  const [glossaryQ, setGlossaryQ] = useState('');
  const [tipQ, setTipQ] = useState('');
  const [caseOpen, setCaseOpen] = useState<string | null>(null);
  const xpShown = useCountUp(p.xp);

  // Ctrl/⌘+K, or "/" outside a text field, opens quick search.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
      if ((e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      } else if (e.key === '/' && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Cards light up softly under a mouse pointer (laptops only). Sets CSS
  // custom properties through the CSSOM, so it works under the strict CSP.
  useEffect(() => {
    if (!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    let last: PointerEvent | null = null;
    const paint = () => {
      raf = 0;
      const e = last;
      if (!e) return;
      const card = (e.target as Element | null)?.closest?.('.card, .topic-card') as HTMLElement | null;
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - r.left}px`);
      card.style.setProperty('--my', `${e.clientY - r.top}px`);
    };
    const onMove = (e: PointerEvent) => {
      last = e;
      if (!raf) raf = requestAnimationFrame(paint);
    };
    document.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      document.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => rememberTab(tab), [tab]);
  useEffect(() => {
    // Back/forward or a #/tab link: show the new tab from the top, like a menu tap does.
    const on = () => {
      const t = tabFromHash();
      if (t === tabRef.current) return;
      setTabState(t);
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    };
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
    // Slide between tabs in the direction you're moving through the menu.
    const doc = document as Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void>; ready?: Promise<void> } };
    const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (doc.startViewTransition && !calm) {
      const root = document.documentElement;
      const from = TAB_IDS.indexOf(tabRef.current);
      root.dataset.vt = TAB_IDS.indexOf(t) >= from ? 'fwd' : 'back';
      const vt = doc.startViewTransition(() => flushSync(swap)) as { finished: Promise<void>; ready?: Promise<void>; skipTransition?: () => void };
      // A transition can be skipped (e.g. a second tap mid-slide); that's fine, the page still swaps.
      vt.ready?.catch(() => {});
      // B-023: while a slide runs, the browser sends taps to the page root, so a quick tap on the new page was
      // lost. A tap ends the slide at once, and its click (which also lands on the root) is replayed on the
      // control under the finger.
      const onDown = (e: PointerEvent) => {
        if (e.target !== root) return;
        vt.skipTransition?.();
        const replay = (c: MouseEvent) => {
          document.removeEventListener('click', replay, true);
          if (c.target !== root) return;
          const el = document.elementFromPoint(c.clientX, c.clientY)?.closest<HTMLElement>('button, a[href], summary, label, [role="button"], [role="tab"]');
          if (el) {
            c.stopPropagation();
            el.click();
          }
        };
        document.addEventListener('click', replay, true);
        setTimeout(() => document.removeEventListener('click', replay, true), 1000);
      };
      document.addEventListener('pointerdown', onDown, true);
      vt.finished
        .catch(() => {})
        .finally(() => {
          delete root.dataset.vt;
          // Leave the listener a moment longer: the tap that skipped the slide may still be finishing.
          setTimeout(() => document.removeEventListener('pointerdown', onDown, true), 0);
        });
    } else swap();
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
    // Steps with no view of their own (like the pre-job brief) stay on the procedure's plant.
    const before = p.steps.slice(0, i + 1).reverse().find((x) => x.view)?.view;
    setSimView(st.view ?? before ?? p.steps.find((x) => x.view)?.view ?? 'electrical');
    if (st.focus) setSelected(st.focus);
  }, []);
  const startProc = (p: Procedure) => {
    setShift(null);
    setRound(null);
    const sim = procedureSim(p);
    h.load(sim, p.scenario);
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
  /** Start an 8-hour shift (Phase 8d): fresh 2N plant, a seeded plan of events, 32× speed. */
  const startShift = () => {
    void import('./content/shift').then((m) => {
      const seed = Math.floor(Math.random() * 1e9) + 1;
      const plan = m.planShift(seed);
      setProc(null);
      setRound(null);
      setLesson(null);
      setSelected(null);
      h.load(new Simulation(buildPlant('2N')), plan.map((x) => ({ at: x.at, action: x.def.action })));
      h.setSpeed(m.SHIFT.speed);
      h.setRunning(true);
      setMode('explore');
      setShift({ seed, plan });
      setTab('sim');
    });
  };
  /** Walk a live round (Phase 9d): fresh 2N plant, seeded hidden problems, 30 min ahead, then paused for the walk. */
  const startRound = () => {
    void import('./content/liveRounds').then((m) => {
      const seed = Math.floor(Math.random() * 1e9) + 1;
      const issues = m.planRound(seed);
      setProc(null);
      setShift(null);
      setLesson(null);
      h.load(new Simulation(buildPlant('2N')), [...issues.flatMap((x) => x.actions), { a: 'skip', s: m.ROUND_WARMUP_S } as const].map((action) => ({ at: 0, action })));
      h.setSpeed(1);
      h.setRunning(false);
      setMode('explore');
      setRound({ seed, issues });
      setTab('sim');
    });
  };
  // Score and auto-advance on every engine change.
  useEffect(() => {
    const proc = procRef.current;
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
    const proc = procRef.current;
    if (proc?.run.done) {
      const secs = (Date.now() - proc.started) / 1000;
      setProc({ ...proc, secs });
      p.finishProcedure(proc.p.id, proc.run.score, secs);
      h.setRunning(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proc?.run.done]);
  const procAct = (fn: (r: ProcRun) => ProcRun, fb?: (before: ProcRun, after: ProcRun) => ProcFeedback | null) => {
    const proc = procRef.current;
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
      preview={(c) => {
        // Try the wrong answer on a copy of what the app runs (engine v2), so the preview matches the plant.
        const e = h.engine;
        return previewConsequence(h.sim, c, e ? () => {
          const cp = e.copy();
          return { sim: cp.sim, advance: (s: number) => cp.apply({ a: 'skip', s }) };
        } : undefined);
      }}
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
    void LOADERS.equipmentData().then((m) => {
      setGuideId(m.guideForKind(kind)?.id ?? null);
      setTab('equipment');
    });
  };
  const showKindInSim = (kind: string) => {
    const first = [...h.sim.graph.nodes.values()].find((n) => n.kind === kind);
    setSelected(first?.id ?? null);
    if (first) setSimView(first.domain === 'mechanical' && first.kind !== 'cdu' ? 'mechanical' : 'electrical');
    setTab('sim');
  };

  const jump = (j: Jump) => {
    setLifeOpen(null);
    setSafetyArticle(null);
    setGlossaryQ('');
    setTipQ('');
    setCaseOpen(null);
    if (j.kind === 'tab') setTab(j.tab);
    else if (j.kind === 'lesson') {
      const l = LESSONS.find((x) => x.id === j.id);
      if (l) {
        startLesson(l);
        setTab(drivesSim(l) ? 'sim' : 'learn');
      }
    } else if (j.kind === 'proc') {
      const pr = PROCEDURES.find((x) => x.id === j.id);
      if (pr) startProc(pr);
    } else if (j.kind === 'guide') {
      setGuideId(j.id);
      setGuideDeep(!!j.deep);
      setTab('equipment');
    } else if (j.kind === 'case') {
      setCaseOpen(j.id);
      setTab('cases');
    } else if (j.kind === 'safety') {
      setSafetyArticle(j.id);
      setTab('safety');
    } else if (j.kind === 'life') {
      setLesson(null);
      setLifeOpen(j.id);
      setTab('learn');
    } else if (j.kind === 'tip') {
      const id = j.id;
      void LOADERS.tipsData().then((m) => {
        setTipQ(m.TIPS.find((t) => t.id === id)?.title ?? '');
        setTab('tips');
      });
    } else {
      setGlossaryQ(j.term);
      setTab('glossary');
    }
  };

  const startPathItem = (it: PathItem) => {
    if (it.kind === 'lesson') {
      const l = LESSONS.find((x) => x.id === it.ref);
      if (l) {
        startLesson(l);
        setTab(drivesSim(l) ? 'sim' : 'learn');
      }
    } else if (it.kind === 'proc') {
      const pr = PROCEDURES.find((x) => x.id === it.ref);
      if (pr) startProc(pr);
    } else if (it.kind === 'safety') setTab('safety');
    else if (it.kind === 'exam') setTab('quiz');
    else if (it.kind === 'cert') setTab('career');
    else setTab(it.ref as Tab);
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
          <img src={`${import.meta.env.BASE_URL}brand/app-mark.png`} alt="Critical Facilities Simulator logo" width={38} height={38} />
          <span className="brand-text">
            <span className="brand-title">
              <span className="brand-full">Critical Facilities Simulator</span>
              <span className="brand-short" aria-hidden="true">CF Simulator</span>
            </span>
            <span className="brand-sub">Caylor Made Technologies</span>
          </span>
        </a>
        <span className="surge" key={tab} aria-hidden="true" />
        <div className="header-actions">
          <button className="search-btn" type="button" onClick={() => setPaletteOpen(true)} aria-label="Quick search (Control K)">
            <Icon name="search" />
            <span className="search-btn-text">Search</span>
            <kbd className="search-kbd" aria-hidden="true">Ctrl K</kbd>
          </button>
          <button className="xp-pill" type="button" onClick={() => setTab('home')} aria-label={`Level ${lvl.name}, ${p.xp} XP. Go to Home.`}>
            <Icon name="star" />
            <span className="xp-pill-level">{lvl.name}</span>
            <span className="xp-pill-xp">{xpShown} XP</span>
          </button>
          <button
            className="btn btn-icon btn-ghost text-size-btn"
            type="button"
            onClick={() => {
              const next = TEXT_SIZES[(TEXT_SIZES.indexOf(prefs.text) + 1) % TEXT_SIZES.length]!;
              update({ text: next });
              showToast(`Text size: ${{ s: 'small', m: 'normal', l: 'large', xl: 'extra large' }[next]}`);
            }}
            aria-label={`Text size: ${{ s: 'small', m: 'normal', l: 'large', xl: 'extra large' }[prefs.text]}. Tap to change.`}
          >
            <span aria-hidden="true" className={`aa aa-${prefs.text}`}>
              Aa
            </span>
          </button>
          <button
            className="btn btn-icon btn-ghost"
            type="button"
            onClick={(e) => {
              const next = resolvedTheme === 'dark' ? 'light' : 'dark';
              const doc = document as Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void>; ready?: Promise<void> } };
              const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
              if (!doc.startViewTransition || calm) return update({ theme: next });
              // Reveal the new theme in a circle growing from the button.
              const r = e.currentTarget.getBoundingClientRect();
              const root = document.documentElement;
              root.style.setProperty('--vt-x', `${r.left + r.width / 2}px`);
              root.style.setProperty('--vt-y', `${r.top + r.height / 2}px`);
              root.classList.add('theme-vt');
              const vt = doc.startViewTransition(() => flushSync(() => update({ theme: next })));
              vt.ready?.catch(() => {});
              vt.finished.catch(() => {}).finally(() => root.classList.remove('theme-vt'));
            }}
            aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
          >
            <Icon name={resolvedTheme === 'dark' ? 'sun' : 'moon'} />
          </button>
        </div>
      </header>

      <div className="body">
        <nav className="sidebar" aria-label="Sections" ref={sideRef}>
          {sideInk && <span className={`side-ink${tab === 'never' ? ' danger' : ''}`} aria-hidden="true" style={{ transform: `translate(${sideInk.x}px, ${sideInk.y}px)`, width: sideInk.w, height: sideInk.h }} />}
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
          <main id="main" tabIndex={-1} aria-label={current.label} data-tab={tab}>
            <TabBoundary key={tab} label={current.label}>
            <Suspense fallback={<TabLoading />}>
            {tab === 'home' && (
              <HomeTab
                p={p}
                go={setTab}
                startTour={startTour}
                startProc={(id) => {
                  const pr = PROCEDURES.find((x) => x.id === id);
                  if (pr) startProc(pr);
                }}
              />
            )}
            {tab === 'tools' && <FieldToolsTab />}
            {tab === 'mypath' && <MyPathTab p={p} onStart={startPathItem} go={setTab} />}
            {tab === 'tips' && <TipsTab key={tipQ} p={p} initialQuery={tipQ} />}
            {tab === 'career' && <CareerTab sim={h.sim} version={h.version} units={prefs.units} boxes={p.progress.cards} onRate={p.rateCard} openSim={() => setTab('sim')} p={p} go={setTab} />}
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
                  procCoach ?? (round ? (
                    <Suspense fallback={null}>
                      <RoundCoach
                        key={round.seed}
                        h={h}
                        issues={round.issues}
                        goTo={(id, view) => (setSimView(view), setSelected(id))}
                        onFinish={(score) => p.finishProcedure('rounds-live', score)}
                        onExit={() => setRound(null)}
                      />
                    </Suspense>
                  ) : shift ? (
                    <Suspense fallback={null}>
                      <ShiftCoach key={shift.seed} h={h} plan={shift.plan} onFinish={(score) => p.finishProcedure('shift-mode', score)} onExit={() => (setShift(null), h.setSpeed(1), h.setRunning(false))} />
                    </Suspense>
                  ) : simLesson ? (
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
                p={p}
                runIst={() => void import('./content/lifecycle').then((m) => startProc(m.IST_L5))}
                lifeOpen={lifeOpen}
                key={lifeOpen ?? 'learn'}
              />
            )}
            {tab === 'procedures' && (
              <ProceduresTab best={p.progress.procs} times={p.progress.times} start={startProc} startShift={startShift} startRound={startRound} onRound={(id, score) => p.finishProcedure(id, score)} />
            )}
            {tab === 'cases' && (
              <CasesTab
                key={caseOpen ?? 'cases'}
                initialOpen={caseOpen}
                onPractice={(id) => {
                  const pr = PROCEDURES.find((x) => x.id === id);
                  if (pr) startProc(pr);
                  else setTab('procedures');
                }}
              />
            )}
            {tab === 'designs' && <DesignsTab sim={h.sim} version={h.version} units={prefs.units} onTry={(t) => { setProc(null); setLesson(null); h.reset(t); setSelected(null); setTab('sim'); }} />}
            {tab === 'quiz' && <QuizTab p={p} />}
            {tab === 'equipment' && <EquipmentTab openId={guideId} openDeep={guideDeep} onDeepShown={() => setGuideDeep(false)} onShowInSim={showKindInSim} onRead={p.readGuide} onJump={jump} p={p} />}
            {tab === 'never' && <NeverDoTab />}
            {tab === 'glossary' && <GlossaryTab key={glossaryQ} initialQuery={glossaryQ} boxes={p.progress.cards} onRate={p.rateCard} />}
            {tab === 'safety' && <SafetyTab key={safetyArticle ?? 'safety'} scores={p.progress.safety} onScore={p.finishSafety} openArticle={safetyArticle} />}
            {tab === 'codes' && (
              <CodesTab eyebrow="Codes & standards" title="The rulebook, decoded" intro="Who writes the rules and what each standard means for you on shift, split by electrical, mechanical, fire, and environmental."  />
            )}
            {tab === 'uptime' && (
              <UptimeTab eyebrow="Uptime" title="Keep the load running" intro="The habits, practices, and emergency response that prevent outages."  />
            )}
            {tab === 'change' && (
              <ChangeTab
                eyebrow="Management of change"
                title="Change management (MOC)"
                intro="Every change to a critical system is reviewed, approved, executed step by step, and documented. This is how the industry keeps changes from becoming outages."
              />
            )}
            {tab === 'feedback' && <FeedbackTab />}
            {tab === 'about' && (
              <AboutTab
                progress={p.progress}
                onRestore={(next) => {
                  p.restore(next);
                  showToast('Progress restored.');
                }}
                onResetPrefs={() => {
                  resetPrefs();
                  resetQuality();
                  p.reset();
                  showToast('Saved settings and progress cleared.');
                }}
              />
            )}
            </Suspense>
            </TabBoundary>
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
                facility's approved MOPs/EOPs and LOTOTO program.
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
      <nav className="bottombar" aria-label="Quick sections" ref={bottomRef}>
        {bottomInk && <span className="bottom-ink" aria-hidden="true" style={{ transform: `translateX(${bottomInk.x}px)`, width: bottomInk.w }} />}
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
                <p className="sheet-group-desc">{GROUP_DESC[g]}</p>
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

      <Palette open={paletteOpen} onClose={() => setPaletteOpen(false)} onJump={jump} />

      {updateReady && (
        <div className="upd-bar" role="status">
          <span>A new version of the app is ready.</span>
          <button className="btn btn-primary" type="button" onClick={applyUpdate}>
            <Icon name="reset" /> Reload
          </button>
          <button className="btn btn-ghost" type="button" onClick={() => setUpdateReady(false)}>
            Later
          </button>
        </div>
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
