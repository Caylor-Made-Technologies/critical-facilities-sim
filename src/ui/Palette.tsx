/** Quick search (Ctrl/⌘ + K): type a few letters, press Enter to jump. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from './icons';
import type { Jump, SearchItem } from './search';

// The search index pulls in every piece of content, so it loads on first open.
// The box itself is always ready, so nothing typed is lost while it loads.
let finder: ((q: string) => SearchItem[]) | null = null;
const loadFinder = () => import('./search').then((m) => (finder = m.search));

export function Palette({ open, onClose, onJump }: { open: boolean; onClose: () => void; onJump: (j: Jump) => void }) {
  const dlg = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const [ready, setReady] = useState(!!finder);
  useEffect(() => {
    if (open && !finder) void loadFinder().then(() => setReady(true));
  }, [open]);
  const results = useMemo(() => (ready && finder ? finder(q) : []), [q, ready]);

  useEffect(() => {
    const d = dlg.current;
    if (!d) return;
    if (open && !d.open) {
      setQ('');
      setActive(0);
      d.showModal();
      requestAnimationFrame(() => input.current?.focus());
    } else if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => setActive(0), [q]);
  useEffect(() => {
    document.getElementById(`pal-opt-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const go = (i: number) => {
    const r = results[i];
    if (!r) return;
    onClose();
    onJump(r.jump);
  };

  return (
    <dialog
      ref={dlg}
      className="palette"
      aria-label="Quick search"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dlg.current) onClose();
      }}
    >
      <div className="pal-box">
        <div className="pal-input">
          <Icon name="search" />
          <input
            ref={input}
            type="search"
            role="combobox"
            aria-expanded="true"
            aria-controls="pal-list"
            aria-activedescendant={results.length ? `pal-opt-${active}` : undefined}
            aria-label="Search lessons, drills, gear, safety and terms"
            placeholder="Search lessons, drills, gear, safety, terms…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActive((a) => Math.min(results.length - 1, a + 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActive((a) => Math.max(0, a - 1));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                go(active);
              }
            }}
          />
          <kbd className="pal-kbd">Esc</kbd>
        </div>
        <ul className="pal-list" id="pal-list" role="listbox" aria-label="Results">
          {results.map((r, i) => (
            <li
              key={`${r.type}-${r.title}`}
              id={`pal-opt-${i}`}
              role="option"
              aria-selected={i === active}
              className={i === active ? 'active' : ''}
              onMouseMove={() => setActive(i)}
              onClick={() => go(i)}
            >
              <span className={`pal-type t-${r.type.replace(/\s+/g, '-').toLowerCase()}`}>{r.type}</span>
              <span className="pal-title">{r.title}</span>
              <Icon name="arrow-right" />
            </li>
          ))}
          {!results.length && <li className="pal-empty">{ready ? 'No matches. Try fewer letters.' : 'Loading search…'}</li>}
        </ul>
        <div className="pal-foot" aria-hidden="true">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> move
          </span>
          <span>
            <kbd>Enter</kbd> open
          </span>
        </div>
      </div>
    </dialog>
  );
}
