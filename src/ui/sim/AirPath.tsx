/**
 * Graphics v2 (Phase 5): data hall air path, drawn from the engine v2 air model. A side section of a
 * contained cold aisle: CRAH (coil + fans) → supply plenum → tiles → cold aisle → rack inlet → rack
 * outlet → hot aisle → return / room → back to the CRAH, each node colored by its temperature.
 * Recirculation (hot air over or around the racks back to the inlet) and bypass (cold air that never
 * reaches a server) are drawn as arrows sized to their share. The containment, blanking and tile
 * controls are operator actions (EngineV2.apply). Lazy chunk: loads with the other v2 panels.
 */
import type { ActionResult } from '../../sim';
import type { Action } from '../../sim/actions';
import type { EngineV2 } from '../../sim/v2/engine';
import { fmtTemp, tempColor } from '../format';
import type { Units } from '../prefs';

const BAND = {
  below: ['Below allowable', 'chip-alarm'],
  recommended: ['In recommended range', 'chip-ok'],
  allowable: ['Allowable, outside recommended', 'chip-warn'],
  over: ['Above allowable', 'chip-alarm'],
} as const;

const CONTAIN = [
  ['full', 'Doors shut'],
  ['door-open', 'Door propped open'],
  ['none', 'No containment'],
] as const;
const BLANK = [
  [0, 'All in'],
  [0.5, 'Half missing'],
  [1, 'All missing'],
] as const;
const TILES = [
  [0.6, 'Too few'],
  [1, 'Matched'],
  [1.6, 'Too many'],
] as const;

const pct = (x: number) => `${Math.round(x * 100)}%`;

export default function AirPath({ engine, apply, units }: { engine: EngineV2; apply: (a: Action) => ActionResult; units: Units }) {
  const r = engine.air.reading;
  const st = engine.air.state;
  const T = r.temps;
  const on = r.crahsRunning > 0;
  const coilPct = r.coilMaxKw > 0 ? r.coilKw / r.coilMaxKw : 0;
  const [bandText, bandChip] = BAND[r.inletBand];
  // Arrow widths: 2 px floor so a small share still shows, up to ~12 px at 40%+.
  const w = (share: number) => Math.max(2, Math.min(12, 2 + share * 25));
  const doors = st.containment === 'full' ? 'shut' : st.containment === 'door-open' ? 'open' : 'none';
  const node = (x: number, y: number, label: string, c: number, id: string) => (
    <g transform={`translate(${x},${y})`} className="air-node" data-node={id}>
      <rect x={-46} y={-17} width={92} height={34} rx={8} style={{ fill: tempColor(c), opacity: 0.22 }} />
      <rect x={-46} y={-17} width={92} height={34} rx={8} className="air-node-border" style={{ stroke: tempColor(c) }} />
      <text y={-3} textAnchor="middle" className="air-node-label">
        {label}
      </text>
      <text y={11} textAnchor="middle" className="air-node-val">
        {fmtTemp(c, units, 1)}
      </text>
    </g>
  );
  const summary = `Air path: supply ${fmtTemp(r.supplyC, units, 1)}, cold aisle ${fmtTemp(T.cold, units, 1)}, rack inlet ${fmtTemp(T.rackIn, units, 1)}, rack outlet ${fmtTemp(T.rackOut, units, 1)}, hot aisle ${fmtTemp(T.hot, units, 1)}, return ${fmtTemp(T.room, units, 1)}. Recirculation ${pct(r.recirc)}, bypass ${pct(r.bypass)}. ${r.crahsRunning} CRAHs running, fans ${pct(r.fanSpeed)}, coils at ${pct(coilPct)} of capacity. Containment doors ${doors}.`;

  return (
    <section className="card air-card" aria-labelledby="air-h">
      <h2 id="air-h" className="h-card hall-title">
        Air path (live) <span className={`chip ${bandChip}`}>rack inlet {fmtTemp(T.rackIn, units, 1)} · {bandText}</span>
      </h2>
      <div className="air-scroll" tabIndex={0} role="group" aria-label="Air path diagram (scrolls sideways on small screens)">
        <svg className="air-svg" viewBox="0 0 720 300" role="img" aria-label={summary} data-recirc={r.recirc.toFixed(3)} data-bypass={r.bypass.toFixed(3)}>
          <defs>
            <marker id="air-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerUnits="userSpaceOnUse" markerWidth="12" markerHeight="12" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" className="air-arrowhead" />
            </marker>
          </defs>
          {/* Room, ceiling return plenum and raised floor */}
          <rect x={10} y={14} width={700} height={276} rx={12} className="air-room" />
          <line x1={10} y1={64} x2={710} y2={64} className="air-floor" />
          <line x1={10} y1={245} x2={710} y2={245} className="air-floor" />
          <text x={700} y={30} textAnchor="end" className="air-zone">
            Ceiling return plenum
          </text>
          <text x={700} y={282} textAnchor="end" className="air-zone">
            Raised floor supply plenum
          </text>

          {/* Main loop: CRAH → under floor → tiles → cold aisle … hot aisle → return → ceiling → CRAH */}
          <path d="M85,222 V264 H300 V252" className={`air-flow${on ? ' flow' : ''}`} style={{ stroke: tempColor(r.supplyC), strokeWidth: 8 }} markerEnd="url(#air-arrow)" />
          <path d="M506,135 H548" className={`air-flow${on ? ' flow' : ''}`} style={{ stroke: tempColor(T.hot), strokeWidth: 6 }} markerEnd="url(#air-arrow)" />
          <path d="M600,118 V44 H85 V102" className={`air-flow${on ? ' flow' : ''}`} style={{ stroke: tempColor(T.room), strokeWidth: 8 }} markerEnd="url(#air-arrow)" />

          {/* Recirculation: hot aisle air over the racks (or through missing blanking) back to the inlet */}
          <path d="M445,116 C445,76 335,76 335,112" className="air-flow air-recirc flow" style={{ stroke: tempColor(T.hot), strokeWidth: w(r.recirc), opacity: r.recirc > 0.005 ? 1 : 0.3 }} markerEnd="url(#air-arrow)" />
          <text x={390} y={74} textAnchor="middle" className="air-share" data-share="recirc">
            recirculation {pct(r.recirc)}
          </text>
          {/* Bypass: supply air that skips the servers and goes straight back to the CRAH */}
          <path d="M262,236 C215,232 190,180 150,170" className="air-flow air-bypass flow" style={{ stroke: tempColor(r.supplyC), strokeWidth: w(r.bypass), opacity: r.bypass > 0.005 ? 1 : 0.3 }} markerEnd="url(#air-arrow)" />
          <text x={196} y={150} textAnchor="middle" className="air-share" data-share="bypass">
            bypass {pct(r.bypass)}
          </text>

          {/* CRAH */}
          <g transform="translate(85,165)" className={`air-crah${on ? ' on' : ''}`}>
            <rect x={-55} y={-57} width={110} height={114} rx={10} className="air-box" />
            <text y={-38} textAnchor="middle" className="air-node-label">
              CRAH × {r.crahsRunning}
            </text>
            <text y={-21} textAnchor="middle" className="air-node-val">
              fans {pct(r.fanSpeed)}
            </text>
            <text y={-5} textAnchor="middle" className="air-node-val">
              coil {pct(coilPct)}
            </text>
            <text y={11} textAnchor="middle" className="air-node-val">
              {Math.round(r.coilKw).toLocaleString('en-US')} kW
            </text>
            <text y={30} textAnchor="middle" className="air-node-sub">
              supply {fmtTemp(r.supplyC, units, 1)}
            </text>
            <text y={45} textAnchor="middle" className="air-node-sub">
              {Math.round(r.fanKw)} kW fans
            </text>
          </g>

          {/* Cold aisle containment: roof and end doors */}
          {st.containment !== 'none' && (
            <g className="air-contain" data-contain={st.containment}>
              <line x1={250} y1={100} x2={360} y2={100} />
              <line x1={250} y1={100} x2={250} y2={st.containment === 'door-open' ? 160 : 244} />
              {st.containment === 'door-open' && <line x1={250} y1={160} x2={218} y2={204} className="air-door-open" />}
            </g>
          )}
          <rect x={262} y={243} width={76} height={4} className="air-tiles" />
          <text x={300} y={238} textAnchor="middle" className="air-zone">
            tiles
          </text>

          {/* Rack (gap = missing blanking panels) */}
          <rect x={362} y={95} width={40} height={148} rx={4} className="air-rack" />
          {st.blankingMissing > 0 && <rect x={366} y={150} width={32} height={8 + 22 * st.blankingMissing} className="air-gap" />}
          <text x={0} y={0} transform="translate(386,232) rotate(-90)" className="air-zone">
            racks
          </text>

          {node(300, 135, 'Cold aisle', T.cold, 'cold')}
          {node(300, 195, 'Rack inlet', T.rackIn, 'rackIn')}
          {node(460, 195, 'Rack outlet', T.rackOut, 'rackOut')}
          {node(460, 135, 'Hot aisle', T.hot, 'hot')}
          {node(600, 135, 'Return', T.room, 'room')}
        </svg>
      </div>
      <div className="air-controls" role="group" aria-label="Air management what-ifs">
        <div className="field">
          <span>Containment</span>
          <div className="seg" role="group" aria-label="Containment">
            {CONTAIN.map(([m, label]) => (
              <button key={m} type="button" aria-pressed={st.containment === m} onClick={() => apply({ a: 'containment', mode: m })}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <span>Blanking panels</span>
          <div className="seg" role="group" aria-label="Blanking panels">
            {BLANK.map(([v, label]) => (
              <button key={v} type="button" aria-pressed={Math.abs(st.blankingMissing - v) < 1e-6} onClick={() => apply({ a: 'blanking', missing: v })}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <span>Perforated tiles</span>
          <div className="seg" role="group" aria-label="Perforated tiles">
            {TILES.map(([v, label]) => (
              <button key={v} type="button" aria-pressed={Math.abs(st.tileRatio - v) < 1e-6} onClick={() => apply({ a: 'tiles', ratio: v })}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <p className="dock-note">
        One lumped hall, simplified for training: a real floor has hot spots per row and rack. Watch fans, coil load and PUE climb when air
        skips the servers or loops back. Ranges are ASHRAE TC 9.9 class {st.cls}; check your site&apos;s current limits.
      </p>
    </section>
  );
}
