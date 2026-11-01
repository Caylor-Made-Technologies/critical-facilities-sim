/**
 * Electrical one-line diagram (SVG) with pan, zoom and animated power flow.
 * Standard symbology where practical: circle-G generators, double-circle
 * transformers, square breakers (filled = closed, hollow = open), bars for buses.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { loadFraction, type Component, type Simulation } from '../../sim';
import { Icon } from '../icons';
import { usePauseWhenOffscreen } from '../common';
import { computeLayout, type NodeBox } from './layout';

interface Props {
  sim: Simulation;
  version: number;
  selected: string | null;
  failureMode: boolean;
  onActivate: (id: string) => void;
}

interface View {
  x: number;
  y: number;
  w: number;
  h: number;
}

const SIDE_VAR: Record<string, string> = {
  A: 'var(--side-a)',
  B: 'var(--side-b)',
  C: 'var(--side-c)',
  CATCHER: 'var(--side-r)',
  COMMON: 'var(--side-common)',
};

export const sideColor = (n: Component) => SIDE_VAR[n.side] ?? 'var(--side-common)';

const GLYPH: Partial<Record<Component['kind'], string>> = {
  utility: 'UTIL',
  'mv-switchgear': 'MV SWGR',
  'paralleling-bus': 'PARALLEL',
  ats: 'ATS',
  ups: 'UPS',
  bess: 'BESS',
  sts: 'STS',
  pdu: 'PDU',
  rpp: 'RPP',
  busway: 'BUSWAY',
  cdu: 'CDU',
};

/** One short status line under each node. */
function subLine(sim: Simulation, n: Component): string {
  const sol = sim.solution;
  if (n.status === 'failed') return 'FAILED';
  if (n.status === 'maintenance') return 'MAINT';
  switch (n.kind) {
    case 'breaker':
      return n.state.closed ? 'closed' : 'open';
    case 'generator':
      return n.state.genState === 'running' ? `${Math.round(loadFraction(sim.graph, sol, n.id) * 100)}%` : n.state.genState ?? 'off';
    case 'ats':
      return n.state.selected === 'emergency' ? 'on GEN' : 'on UTIL';
    case 'ups': {
      const m = sol.upsMode.get(n.id);
      return m === 'normal' ? `${Math.round(loadFraction(sim.graph, sol, n.id) * 100)}%` : m === 'static-bypass' ? 'BYPASS' : m === 'battery' ? `BATT ${Math.round((n.state.soc ?? 0) * 100)}%` : 'OFF';
    }
    case 'bess':
      return sol.bessDischargeKw.has(n.id) ? `discharging ${Math.round((n.state.soc ?? 0) * 100)}%` : `SOC ${Math.round((n.state.soc ?? 0) * 100)}%`;
    default:
      if (!sol.energized.has(n.id)) return 'de-energized';
      return n.ratedKw ? `${Math.round(loadFraction(sim.graph, sol, n.id) * 100)}%` : '';
  }
}

export function OneLine({ sim, version, selected, failureMode, onActivate }: Props) {
  const layout = useMemo(() => computeLayout(sim.graph), [sim.graph]);
  const wrapRef = useRef<HTMLDivElement>(null);
  usePauseWhenOffscreen(wrapRef);
  const fit = useCallback((): View => ({ x: 0, y: 0, w: layout.width, h: layout.height }), [layout]);
  /**
   * Opening view: zoomed to a readable scale (~0.85 px per unit) and centered
   * on the top of the plant, instead of shrinking everything to fit.
   */
  const readable = useCallback((): View => {
    const r = wrapRef.current?.getBoundingClientRect();
    if (!r || !r.width) return fit();
    const w = Math.min(layout.width, r.width / 0.85);
    const h = (w * r.height) / r.width;
    if (w >= layout.width && h >= layout.height) return fit();
    return { x: (layout.width - w) / 2, y: 0, w, h };
  }, [layout, fit]);
  const [view, setView] = useState<View>(fit);
  useEffect(() => setView(readable()), [readable]);

  // Bring the selected component into view (walkthrough steps point at things).
  useEffect(() => {
    const box = selected ? layout.nodes.get(selected) : undefined;
    if (!box) return;
    setView((v) => {
      const pad = 60;
      const inside = box.x > v.x + pad && box.x < v.x + v.w - pad && box.y > v.y + pad && box.y < v.y + v.h - pad;
      return inside ? v : { ...v, x: box.x - v.w / 2, y: Math.max(0, box.y - v.h / 3) };
    });
  }, [selected, layout]);

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const dragged = useRef(false);
  const [dragging, setDragging] = useState(false);

  /** Convert a screen delta to diagram units. */
  const scale = () => {
    const r = wrapRef.current?.getBoundingClientRect();
    if (!r) return 1;
    return Math.max(view.w / r.width, view.h / r.height);
  };

  const zoomAt = useCallback((factor: number, cx?: number, cy?: number) => {
    setView((v) => {
      const w = Math.min(Math.max(v.w * factor, 200), layout.width * 2.5);
      const h = (w / v.w) * v.h;
      const px = cx ?? v.x + v.w / 2;
      const py = cy ?? v.y + v.h / 2;
      return { x: px - ((px - v.x) * w) / v.w, y: py - ((py - v.y) * h) / v.h, w, h };
    });
  }, [layout.width]);

  // Wheel zoom (non-passive so the page doesn't scroll).
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const s = Math.max(view.w / r.width, view.h / r.height);
      const ox = (r.width * s - view.w) / 2;
      const oy = (r.height * s - view.h) / 2;
      const cx = view.x - ox + (e.clientX - r.left) * s;
      const cy = view.y - oy + (e.clientY - r.top) * s;
      zoomAt(e.deltaY > 0 ? 1.12 : 1 / 1.12, cx, cy);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [view, zoomAt]);

  const onPointerDown = (e: PointerEvent) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    dragged.current = false;
  };
  const onPointerMove = (e: PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const pts = [...pointers.current.values()];
    if (pointers.current.size === 2) {
      // Pinch zoom
      const other = pts.find((p) => p !== prev)!;
      const d0 = Math.hypot(prev.x - other.x, prev.y - other.y);
      const d1 = Math.hypot(e.clientX - other.x, e.clientY - other.y);
      if (d0 > 0 && d1 > 0) zoomAt(d0 / d1);
      dragged.current = true;
    } else {
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      if (!dragged.current && Math.hypot(dx, dy) < 6) return;
      if (!dragged.current) {
        dragged.current = true;
        setDragging(true);
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      }
      const s = scale();
      setView((v) => ({ ...v, x: v.x - dx * s, y: v.y - dy * s }));
    }
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
  };
  const onPointerUp = (e: PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) setDragging(false);
  };

  const pan = (dx: number, dy: number) => setView((v) => ({ ...v, x: v.x + dx * v.w, y: v.y + dy * v.h }));
  const onKeyDown = (e: KeyboardEvent) => {
    if ((e.target as Element).closest('.ol-node')) return;
    const map: Record<string, () => void> = {
      ArrowLeft: () => pan(-0.1, 0),
      ArrowRight: () => pan(0.1, 0),
      ArrowUp: () => pan(0, -0.1),
      ArrowDown: () => pan(0, 0.1),
      '+': () => zoomAt(1 / 1.2),
      '=': () => zoomAt(1 / 1.2),
      '-': () => zoomAt(1.2),
    };
    const fn = map[e.key];
    if (fn) {
      e.preventDefault();
      fn();
    }
  };

  const sol = sim.solution;
  const g = sim.graph;

  // Draw each physical connection once (the tie breaker has edges both ways).
  const edges = useMemo(() => {
    const seen = new Set<string>();
    return g.edges.filter((e) => {
      if (e.kind !== 'power' || !layout.nodes.has(e.from) || !layout.nodes.has(e.to)) return false;
      const k = [e.from, e.to].sort().join('|');
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }, [g, layout]);

  const edgePath = (a: NodeBox, b: NodeBox) => {
    if (Math.abs(a.y - b.y) < 1) {
      const [l, r] = a.x < b.x ? [a, b] : [b, a];
      return `M${l.x + l.w / 2},${l.y} H${r.x - r.w / 2}`;
    }
    const [top, bot] = a.y < b.y ? [a, b] : [b, a];
    const y1 = top.y + top.h / 2;
    const y2 = bot.y - bot.h / 2;
    const mid = y2 - 16;
    return `M${top.x},${y1} V${mid} H${bot.x} V${y2}`;
  };

  return (
    <div
      ref={wrapRef}
      className={`diagram-wrap${dragging ? ' dragging' : ''}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
      tabIndex={0}
      role="group"
      aria-label="Electrical one-line diagram. Use arrow keys to pan, plus and minus to zoom, Tab to move between components."
    >
      <div className="mode-banner">
        {failureMode ? (
          <span className="chip chip-alarm">Failure mode: tap a component to fail or restore it</span>
        ) : (
          <span className="chip chip-info">Explore: tap a component to learn about it</span>
        )}
      </div>
      <svg className="oneline" viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`} preserveAspectRatio="xMidYMid meet" data-version={version}>
        <title>Electrical one-line diagram</title>
        {layout.zones.map((z) => (
          <text key={z.label} className="ol-zone-label" x={Math.max(14, view.x + 14)} y={z.y}>
            {z.label}
          </text>
        ))}
        <g>
          {edges.map((e) => {
            const a = layout.nodes.get(e.from)!;
            const b = layout.nodes.get(e.to)!;
            const to = g.get(e.to);
            const from = g.get(e.from);
            const carrying =
              (sol.feeders.get(e.to)?.includes(e.from) ?? false) || (sol.feeders.get(e.from)?.includes(e.to) ?? false);
            const live = sol.energized.has(e.from) && sol.energized.has(e.to) && carrying;
            const frac = Math.min(1.2, loadFraction(g, sol, to.ratedKw ? to.id : from.id));
            const color = sideColor(to.side === 'COMMON' ? from : to);
            const style = live ? ({ '--flow-speed': `${(2.4 - 1.6 * Math.min(1, frac)).toFixed(2)}s`, stroke: color } as CSSProperties) : undefined;
            return <path key={e.id} d={edgePath(a, b)} className={`ol-edge ${live ? 'flow' : 'dead'}`} style={style} />;
          })}
        </g>
        <g>
          {[...layout.nodes.values()].map((box) => {
            const n = g.get(box.id);
            const energized = sol.energized.has(n.id);
            const color = energized ? sideColor(n) : 'var(--dead)';
            const over = n.ratedKw > 0 && loadFraction(g, sol, n.id) > 1;
            const upsAlarm = n.kind === 'ups' && sol.upsMode.get(n.id) !== 'normal' && n.status !== 'maintenance';
            const cls = [
              'ol-node',
              n.status === 'failed' ? 'failed' : '',
              n.status === 'maintenance' ? 'maint' : '',
              over || upsAlarm ? 'alarm' : '',
              selected === n.id ? 'selected' : '',
            ].join(' ');
            const sub = subLine(sim, n);
            const label = `${n.tag}, ${n.name}. ${sub}. ${failureMode ? 'Press to fail or restore.' : 'Press for details.'}`;
            return (
              <g
                key={n.id}
                className={cls}
                transform={`translate(${box.x},${box.y})`}
                tabIndex={0}
                role="button"
                aria-label={label}
                aria-pressed={selected === n.id}
                onClick={() => {
                  if (!dragged.current) onActivate(n.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onActivate(n.id);
                  }
                }}
              >
                <rect x={-Math.max(box.w, 48) / 2 - 6} y={-Math.max(box.h, 44) / 2 - 4} width={Math.max(box.w, 48) + 12} height={Math.max(box.h, 44) + 26} fill="transparent" />
                <Shape box={box} n={n} color={color} />
                <rect className="focus-ring" x={-box.w / 2 - 6} y={-box.h / 2 - 6} width={box.w + 12} height={box.h + 12} rx={10} />
                <text className="label" y={box.h / 2 + 13} textAnchor="middle">
                  {n.tag}
                </text>
                {sub && (
                  <text className="sub" y={box.h / 2 + 25} textAnchor="middle">
                    {sub}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>
      <div className="zoom-controls">
        <button className="btn btn-icon" type="button" aria-label="Zoom in" onClick={() => zoomAt(1 / 1.25)}>
          <Icon name="plus" />
        </button>
        <button className="btn btn-icon" type="button" aria-label="Zoom out" onClick={() => zoomAt(1.25)}>
          <Icon name="minus" />
        </button>
        <button className="btn btn-icon" type="button" aria-label="Fit whole diagram" onClick={() => setView(fit())}>
          <Icon name="fit" />
        </button>
      </div>
    </div>
  );
}

function Shape({ box, n, color }: { box: NodeBox; n: Component; color: string }) {
  const { w, h } = box;
  switch (box.shape) {
    case 'breaker':
      return (
        <rect
          className="body"
          x={-w / 2}
          y={-h / 2}
          width={w}
          height={h}
          rx={4}
          stroke={color}
          style={n.state.closed && n.status !== 'failed' ? { fill: color } : undefined}
        />
      );
    case 'bus':
      return <rect className="body" x={-w / 2} y={-h / 2} width={w} height={h} rx={6} stroke={color} style={{ fill: color, opacity: 0.9 }} />;
    case 'gen':
      return (
        <>
          <circle className="body" r={w / 2} stroke={color} />
          <text className="glyph" y={4} textAnchor="middle">
            G
          </text>
        </>
      );
    case 'tx':
      return (
        <>
          <circle className="body" cy={-9} r={13} stroke={color} />
          <circle className="body" cy={9} r={13} stroke={color} style={{ fillOpacity: 0.6 }} />
        </>
      );
    default:
      return (
        <>
          <rect className="body" x={-w / 2} y={-h / 2} width={w} height={h} rx={9} stroke={color} />
          {n.kind === 'bess' && (
            <rect x={-w / 2 + 6} y={h / 2 - 8} width={(w - 12) * (n.state.soc ?? 0)} height={3} rx={1.5} style={{ fill: color }} />
          )}
          {n.kind === 'ups' && (
            <rect x={-w / 2 + 6} y={h / 2 - 8} width={(w - 12) * (n.state.soc ?? 0)} height={3} rx={1.5} style={{ fill: color, opacity: 0.7 }} />
          )}
          <text className="glyph" y={4} textAnchor="middle">
            {GLYPH[n.kind] ?? n.kind.toUpperCase()}
          </text>
        </>
      );
  }
}
