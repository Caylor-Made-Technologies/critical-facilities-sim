/**
 * Graphics v2 (Phase 5): BMS-style trends from the engine v2 trend log (one sample per 10 s of sim time,
 * last hour). Sparklines for the readings a tech watches when something goes wrong: rack inlet, CHW
 * supply, condenser water, CRAH fan speed, TES charge and PUE. Lazy chunk.
 */
import { sparkPath } from '../../sim/physics';
import type { EngineV2 } from '../../sim/v2/engine';
import type { TrendKey, TrendSample } from '../../sim/v2/trends';
import { fmtTemp } from '../format';
import type { Units } from '../prefs';

const W = 220;
const H = 44;

interface Line {
  key: TrendKey;
  label: string;
  /** Smallest y-range drawn, so a steady reading sits flat mid-box. */
  span: number;
  fmt: (v: number, u: Units) => string;
  /** Range the reading should stay in (shaded), when there is one. */
  band?: (u: Units) => [number, number];
}

const LINES: Line[] = [
  { key: 'inletC', label: 'Rack inlet', span: 2, fmt: (v, u) => fmtTemp(v, u, 1), band: () => [18, 27] },
  { key: 'chwsC', label: 'CHW supply', span: 2, fmt: (v, u) => fmtTemp(v, u, 1) },
  { key: 'cwC', label: 'CW supply', span: 2, fmt: (v, u) => fmtTemp(v, u, 1) },
  { key: 'fanSpeed', label: 'CRAH fans', span: 0.1, fmt: (v) => `${Math.round(v * 100)}%` },
  { key: 'tesSoc', label: 'TES charge', span: 0.1, fmt: (v) => `${Math.round(v * 100)}%` },
  { key: 'pue', label: 'PUE', span: 0.05, fmt: (v) => (Number.isFinite(v) ? v.toFixed(2) : '—') },
];

const ago = (s: number) => (s < 120 ? `${Math.round(s)} s` : `${Math.round(s / 60)} min`);

function Spark({ samples, line, units }: { samples: readonly TrendSample[]; line: Line; units: Units }) {
  const vals = samples.map((s) => s[line.key]);
  const p = sparkPath(vals, W, H, line.span);
  const last = vals.at(-1);
  const first = vals[0];
  const finite = vals.filter((v) => Number.isFinite(v));
  const min = finite.length ? Math.min(...finite) : NaN;
  const max = finite.length ? Math.max(...finite) : NaN;
  const y = (v: number) => H - ((v - p.lo) / (p.hi - p.lo || 1)) * H;
  const band = line.band?.(units);
  const bandRect = band && p.hi > p.lo ? { y1: Math.max(0, Math.min(H, y(band[1]))), y2: Math.max(0, Math.min(H, y(band[0]))) } : null;
  const label = `${line.label}: now ${last !== undefined ? line.fmt(last, units) : '—'}, low ${line.fmt(min, units)}, high ${line.fmt(max, units)} over the last ${ago((samples.at(-1)?.t ?? 0) - (samples[0]?.t ?? 0))}.`;
  return (
    <li className="trend-row" data-trend={line.key}>
      <div className="trend-head">
        <span>{line.label}</span>
        <strong>{last !== undefined ? line.fmt(last, units) : '—'}</strong>
      </div>
      <svg viewBox={`-2 -2 ${W + 4} ${H + 4}`} className="trend-svg" role="img" aria-label={label}>
        {bandRect && bandRect.y2 > bandRect.y1 && <rect x={0} y={bandRect.y1} width={W} height={bandRect.y2 - bandRect.y1} className="trend-band" />}
        <path d={p.d} className="trend-line" />
        {last !== undefined && Number.isFinite(last) && <circle cx={W} cy={vals.length > 1 ? y(last) : H / 2} r={3} className="trend-dot" />}
      </svg>
      <div className="trend-foot muted">
        {first !== undefined && Number.isFinite(min) ? `low ${line.fmt(min, units)} · high ${line.fmt(max, units)}` : 'no data yet'}
      </div>
    </li>
  );
}

export default function TrendPanel({ engine, units }: { engine: EngineV2; units: Units }) {
  const logged = engine.trends.samples;
  // The logged points plus a live end point, so the header matches the KPI tiles between samples.
  const s: readonly TrendSample[] = logged.length && engine.t > logged.at(-1)!.t ? [...logged, { t: engine.t, ...engine.trendReading() }] : logged;
  const span = s.length > 1 ? s.at(-1)!.t - s[0]!.t : 0;
  return (
    <details className="dock-more trend-panel">
      <summary>
        <span>Trends · last {span > 0 ? ago(span) : '—'}</span>
      </summary>
      <ul className="trend-grid">
        {LINES.map((l) => (
          <Spark key={l.key} samples={s} line={l} units={units} />
        ))}
      </ul>
      <p className="dock-note">One point every 10 s of sim time, the last hour kept. Run the plant, break something and watch the shape: the fault library&apos;s &quot;What to check&quot; describes each trend signature. Shaded band on rack inlet = ASHRAE recommended 18–27 °C (64–81 °F).</p>
    </details>
  );
}
