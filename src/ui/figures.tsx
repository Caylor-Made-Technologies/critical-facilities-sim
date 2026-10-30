/**
 * Animated teaching figures (original SVG artwork).
 * - Refrigeration cycle cutaway with clickable parts.
 * - Heat path from chip to outdoors.
 * Animations stop under prefers-reduced-motion (handled in CSS).
 */
import { useState } from 'react';
import type { FigureId } from '../content/lessons';

const PARTS = {
  compressor: { label: 'Compressor', text: 'Squeezes low-pressure vapor into hot, high-pressure vapor. Uses most of the chiller\'s power.' },
  condenser: { label: 'Condenser', text: 'Hot vapor gives up heat to condenser water (or air) and turns to liquid. Too hot here = high head pressure.' },
  expansion: { label: 'Expansion valve', text: 'Pressure drops suddenly, so the liquid becomes very cold.' },
  evaporator: { label: 'Evaporator', text: 'Cold refrigerant boils by absorbing heat from the chilled water, which leaves colder.' },
} as const;
type Part = keyof typeof PARTS;

export function RefrigerationFigure({ highlight }: { highlight?: string }) {
  const [picked, setPicked] = useState<Part | null>(null);
  const active = (picked ?? (highlight as Part | undefined)) || null;
  const part = (id: Part, x: number, y: number, w: number, h: number, fill: string) => (
    <g
      className={`fig-part${active === id ? ' on' : ''}`}
      transform={`translate(${x},${y})`}
      tabIndex={0}
      role="button"
      aria-pressed={active === id}
      aria-label={`${PARTS[id].label}: ${PARTS[id].text}`}
      onClick={() => setPicked(id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setPicked(id);
        }
      }}
    >
      <rect width={w} height={h} rx={14} className="fig-box" style={{ stroke: fill }} />
      <text x={w / 2} y={h / 2 + 5} textAnchor="middle" className="fig-label">
        {PARTS[id].label}
      </text>
    </g>
  );

  return (
    <figure className="figure">
      <svg viewBox="0 0 520 330" role="group" aria-label="Refrigeration cycle cutaway. Select a part to learn what it does.">
        <title>Refrigeration cycle</title>
        {/* Hot side (top) and cold side (bottom) refrigerant lines */}
        {/* Refrigerant flows clockwise: compressor → condenser → expansion → evaporator */}
        <path className="fig-pipe hot" d="M80,130 V70 H190" />
        <path className="fig-pipe warm" d="M330,70 H430 V130" />
        <path className="fig-pipe cold" d="M430,200 V260 H330" />
        <path className="fig-pipe cool" d="M190,260 H80 V200" />
        {/* Water connections */}
        <path className="fig-water cw" d="M240,22 V40 M280,40 V22" />
        <text x={260} y={14} textAnchor="middle" className="fig-small">
          condenser water ↔ cooling towers
        </text>
        <path className="fig-water chw" d="M240,290 V308 M280,308 V290" />
        <text x={260} y={324} textAnchor="middle" className="fig-small">
          chilled water ↔ data hall
        </text>
        {part('condenser', 190, 40, 140, 60, 'var(--hot)')}
        {part('expansion', 366, 130, 128, 70, 'var(--warn)')}
        {part('evaporator', 190, 230, 140, 60, 'var(--cool)')}
        {part('compressor', 20, 130, 120, 70, 'var(--side-b)')}
        <text x={260} y={170} textAnchor="middle" className="fig-center">
          refrigerant loop
        </text>
      </svg>
      <figcaption aria-live="polite">
        {active ? (
          <>
            <strong>{PARTS[active].label}:</strong> {PARTS[active].text}
          </>
        ) : (
          'Tap or select a part to see what it does.'
        )}
      </figcaption>
    </figure>
  );
}

const STAGES = [
  { id: 'rack', label: 'Chips & racks', color: 'var(--hot)' },
  { id: 'crah', label: 'CRAH / CDU', color: 'var(--warn)' },
  { id: 'chiller', label: 'Chiller', color: 'var(--side-b)' },
  { id: 'tower', label: 'Cooling tower', color: 'var(--cool)' },
  { id: 'out', label: 'Outdoors', color: 'var(--cool-2)' },
];

export function HeatPathFigure({ highlight }: { highlight?: string }) {
  return (
    <figure className="figure">
      <svg viewBox="0 0 560 120" role="img" aria-label="Heat path: chips and racks, to CRAH or CDU, to chiller, to cooling tower, to outdoors.">
        <title>Heat path</title>
        {STAGES.map((s, i) => {
          const x = 10 + i * 112;
          return (
            <g key={s.id} className={`fig-part static${highlight === s.id ? ' on' : ''}`}>
              {i > 0 && <path className="fig-pipe hot-flow" d={`M${x - 22},60 H${x}`} />}
              <rect x={x} y={30} width={90} height={60} rx={12} className="fig-box" style={{ stroke: s.color }} />
              <text x={x + 45} y={64} textAnchor="middle" className="fig-label small">
                {s.label}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption>Heat is handed off from one loop to the next until it leaves the building.</figcaption>
    </figure>
  );
}

export function Figure({ id, highlight }: { id: FigureId; highlight?: string }) {
  return id === 'refrigeration' ? <RefrigerationFigure highlight={highlight} /> : <HeatPathFigure highlight={highlight} />;
}
