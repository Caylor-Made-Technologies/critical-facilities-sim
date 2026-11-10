/** Small shared UI pieces. */
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import type React from 'react';
import { createPortal } from 'react-dom';
import type { NeverRule } from '../content/neverdo';

/** Section switcher (Electrical / Mechanical / …) used at the top of tabs. */
export function SectionTabs<T extends string>({
  sections,
  value,
  onChange,
  label,
  counts,
}: {
  sections: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  counts?: Partial<Record<T, string>>;
}) {
  // A pill glides to the selected tab. It is decorative; aria-selected carries the state.
  const wrap = useRef<HTMLDivElement>(null);
  const [ink, setInk] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const place = () => {
    const b = wrap.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!b) return;
    const next = { x: b.offsetLeft, y: b.offsetTop, w: b.offsetWidth, h: b.offsetHeight };
    setInk((cur) => (cur && cur.x === next.x && cur.y === next.y && cur.w === next.w && cur.h === next.h ? cur : next));
  };
  // Re-measure after every render (labels and counts can change width) and on resize.
  useLayoutEffect(place);
  useEffect(() => {
    const el = wrap.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(place);
    ro.observe(el);
    el.querySelectorAll('button').forEach((b) => ro.observe(b));
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections.length]);
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const i = sections.findIndex((s) => s.id === value);
    const next = sections[(i + (e.key === 'ArrowRight' ? 1 : sections.length - 1)) % sections.length]!;
    onChange(next.id);
    requestAnimationFrame(() => wrap.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus());
  };
  return (
    <div className={`section-tabs${ink ? ' has-ink' : ''}`} role="tablist" aria-label={label} ref={wrap} onKeyDown={onKey}>
      {ink && <span className="section-ink" aria-hidden="true" style={{ transform: `translate(${ink.x}px, ${ink.y}px)`, width: ink.w, height: ink.h }} />}
      {sections.map((s) => (
        <button
          key={s.id}
          type="button"
          role="tab"
          aria-selected={value === s.id}
          tabIndex={value === s.id ? 0 : -1}
          className={`section-tab sec-${s.id}`}
          onClick={() => onChange(s.id)}
        >
          <span className="section-dot" aria-hidden="true" />
          {s.label}
          {counts?.[s.id] && <span className="section-count">{counts[s.id]}</span>}
        </button>
      ))}
    </div>
  );
}

/** A short burst of confetti for a perfect score. Decorative; off for reduced motion. */
export function Confetti({ burst }: { burst: number }) {
  const [live, setLive] = useState(0);
  useEffect(() => {
    if (!burst) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    setLive(burst);
    const t = window.setTimeout(() => setLive(0), 1900);
    return () => window.clearTimeout(t);
  }, [burst]);
  const bits = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        x: Math.round((Math.random() - 0.5) * 520),
        y: Math.round(-140 - Math.random() * 220),
        r: Math.round(Math.random() * 720 - 360),
        d: Math.round(Math.random() * 180),
        c: i % 4,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [live],
  );
  if (!live) return null;
  // Portal to <body> so a transformed (animating) card can't trap the fixed position.
  return createPortal(
    <div className="confetti" aria-hidden="true">
      {bits.map((b, i) => (
        <span
          key={i}
          className={`bit c${b.c}`}
          style={{ '--x': `${b.x}px`, '--y': `${b.y}px`, '--r': `${b.r}deg`, animationDelay: `${b.d}ms` } as React.CSSProperties}
        />
      ))}
    </div>,
    document.body,
  );
}

/** Counts smoothly from the previous value to the new one. */
export function useCountUp(target: number, ms = 700, start?: number): number {
  const reduce = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const first = reduce || start === undefined ? target : start;
  const [shown, setShown] = useState(first);
  const from = useRef(first);
  useEffect(() => {
    const start = from.current;
    if (start === target) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      from.current = target;
      setShown(target);
      return;
    }
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / ms);
      const eased = 1 - Math.pow(1 - k, 3);
      const v = Math.round(start + (target - start) * eased);
      setShown(v);
      from.current = v;
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return shown;
}

/** Red warning mark: a filled triangle with an exclamation point. */
export function DangerMark() {
  return (
    <svg className="danger-mark" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 2.5 1.5 21h21z" />
      <path d="M12 9v5.5M12 17.4v.2" className="bang" />
    </svg>
  );
}

/** The "never do" list: red text, warning marks, and the reason underneath. */
export function NeverList({ rules, compact }: { rules: (NeverRule | string)[]; compact?: boolean }) {
  return (
    <ul className={`never-list${compact ? ' compact' : ''}`}>
      {rules.map((r) => {
        const rule = typeof r === 'string' ? r : r.rule;
        const why = typeof r === 'string' ? undefined : r.why;
        return (
          <li key={rule}>
            <DangerMark />
            <div>
              <span className="never-rule">
                <span className="visually-hidden">Never do this: </span>
                {rule.replace(/^Never\b/, 'NEVER').replace(/[.!]+$/, '')}.
              </span>
              {why && <span className="never-why">Why: {why}</span>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Small decorative circuit traces, echoing the CM brand mark (original artwork). */
function HeadArt() {
  return (
    <svg className="head-art" viewBox="0 0 420 120" aria-hidden="true" focusable="false">
      <path d="M0,30 H120 L150,60 H260 L290,30 H420" />
      <path d="M40,95 H180 L210,70 H330 L360,95 H420" />
      <path d="M150,60 V95 M290,30 V8" />
      <path className="pulse" d="M0,30 H120 L150,60 H260 L290,30 H420" />
      {[
        [120, 30],
        [150, 60],
        [260, 60],
        [290, 30],
        [290, 8],
        [210, 70],
        [330, 70],
        [150, 95],
      ].map(([x, y], i) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={4} style={{ '--i': i } as React.CSSProperties} />
      ))}
    </svg>
  );
}

export function PageHead({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <div className="page-head">
      <HeadArt />
      <div className="eyebrow">{eyebrow}</div>
      <h1>{title}</h1>
      {children && <p>{children}</p>}
    </div>
  );
}

/**
 * Pause an element's CSS animations while it is scrolled off screen, so the
 * animated power and water flow costs nothing when you can't see it.
 * Sets an attribute directly; no re-render.
 */
export function usePauseWhenOffscreen(ref: RefObject<Element>) {
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => {
      if (e?.isIntersecting) el.removeAttribute('data-offscreen');
      else el.setAttribute('data-offscreen', '');
    });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
}

/** A number that counts up from zero when it first appears. */
export function CountUp({ value }: { value: number }) {
  return <>{useCountUp(value, 1100, 0)}</>;
}
