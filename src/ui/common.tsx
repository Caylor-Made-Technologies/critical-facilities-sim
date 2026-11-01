/** Small shared UI pieces. */
import { useEffect, type ReactNode, type RefObject } from 'react';
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
  return (
    <div className="section-tabs" role="tablist" aria-label={label}>
      {sections.map((s) => (
        <button
          key={s.id}
          type="button"
          role="tab"
          aria-selected={value === s.id}
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
                {rule.replace(/^Never\b/, 'NEVER').replace(/[.!]+$/, '')}
                <span aria-hidden="true">!!</span>
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
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={4} />
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
