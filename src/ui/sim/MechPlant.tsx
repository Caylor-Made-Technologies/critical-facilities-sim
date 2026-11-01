/**
 * Mechanical plant diagram (SVG): cooling towers → condenser pumps →
 * chillers / free-cooling heat exchanger → chilled water headers → pumps →
 * storage tank → CRAHs, CDUs and DOAS in the data hall.
 * Pipes are colored by water temperature and animate when water is moving.
 */
import { useRef, type CSSProperties, type ReactNode } from 'react';
import { usePauseWhenOffscreen } from '../common';
import type { Component, Simulation } from '../../sim';
import { fmtTemp, tempColor } from '../format';
import type { Units } from '../prefs';

interface Props {
  sim: Simulation;
  version: number;
  selected: string | null;
  failureMode: boolean;
  units: Units;
  onActivate: (id: string) => void;
}

const COLS = [110, 250, 390];
const Y = { tower: 70, cwp: 175, chiller: 270, hdrS: 350, hdrR: 372, chwp: 430, dist: 500, hall: 565 };
const CRAH_X = [70, 140, 210, 280, 350, 420, 490, 560];
const CDU_X = [660, 735, 810];

export function MechPlant({ sim, version, selected, failureMode, units, onActivate }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  usePauseWhenOffscreen(wrapRef);
  const r = sim.thermal.readout;
  const g = sim.graph;
  const running = new Set(r.running);
  const towerLeave = r.condenserC - 5.5;
  const cwHot = tempColor(r.condenserC);
  const cwCool = tempColor(towerLeave);
  const chwS = tempColor(r.chwSupplyC);
  const chwR = tempColor(r.chwReturnC);
  const flowing = r.chwFlowFraction > 0;
  const econ = r.economizer !== 'off';

  const pipe = (d: string, color: string, live: boolean, key?: string, width = 5) => (
    <path key={key ?? d} d={d} className={`mp-pipe${live ? ' flow' : ' still'}`} style={{ stroke: live ? color : 'var(--dead)', strokeWidth: width } as CSSProperties} />
  );

  const unit = (id: string, x: number, y: number, shape: ReactNode, sub?: string, w = 90, h = 48) => {
    if (!g.nodes.has(id)) return null;
    const n: Component = g.get(id);
    const on = running.has(id);
    const cls = [
      'mp-unit',
      on ? 'on' : '',
      n.status === 'failed' ? 'failed' : '',
      n.status === 'maintenance' ? 'maint' : '',
      !on && n.status !== 'failed' ? 'idle' : '',
      selected === id ? 'selected' : '',
    ].join(' ');
    const state = n.status === 'failed' ? 'FAILED' : n.status === 'maintenance' ? 'MAINT' : on ? 'running' : n.status === 'standby' ? 'standby' : 'off';
    return (
      <g
        key={id}
        className={cls}
        transform={`translate(${x},${y})`}
        tabIndex={0}
        role="button"
        aria-pressed={selected === id}
        aria-label={`${n.tag}, ${n.name}, ${state}${sub ? `, ${sub}` : ''}. ${failureMode ? 'Press to fail or restore.' : 'Press for details.'}`}
        onClick={() => onActivate(id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onActivate(id);
          }
        }}
      >
        <rect className="mp-hit" x={-w / 2 - 6} y={-h / 2 - 6} width={w + 12} height={h + 36} />
        {shape}
        <rect className="focus-ring" x={-w / 2 - 6} y={-h / 2 - 6} width={w + 12} height={h + 12} rx={10} />
        <text className="mp-tag" y={h / 2 + 14} textAnchor="middle">
          {n.tag}
        </text>
        <text className="mp-sub" y={h / 2 + 26} textAnchor="middle">
          {sub ?? state}
        </text>
      </g>
    );
  };

  const box = (label: string, w = 90, h = 48, fill?: string) => (
    <>
      <rect className="mp-body" x={-w / 2} y={-h / 2} width={w} height={h} rx={10} style={fill ? { fill } : undefined} />
      <text className="mp-glyph" y={4} textAnchor="middle">
        {label}
      </text>
    </>
  );
  const tower = (
    <>
      <path className="mp-body" d="M-36,24 L-26,-24 H26 L36,24 Z" />
      <circle className="mp-fan" cy={-14} r={9} />
      <text className="mp-glyph" y={14} textAnchor="middle">
        TOWER
      </text>
    </>
  );
  const pump = (
    <>
      <circle className="mp-body" r={18} />
      <path className="mp-impeller" d="M0,-10 L8,6 H-8 Z" />
    </>
  );
  const chillerMode = (id: string) => {
    const m = r.chillers[id];
    if (g.get(id).status === 'failed') return 'TRIPPED';
    if (m === 'starting') return `starting ${Math.ceil((r.chillerTimers[id] ?? 0) / 60)} min`;
    return m === 'running' ? `${Math.round(g.get(id).state.demandKw ?? 0)} kW` : g.get(id).status === 'standby' ? 'standby' : 'off';
  };

  return (
    <div ref={wrapRef} className="diagram-wrap mech" role="group" aria-label="Mechanical plant diagram. Tab to move between equipment.">
      <div className="mode-banner">
        {failureMode ? (
          <span className="chip chip-alarm">Failure mode: tap equipment to fail or restore it</span>
        ) : (
          <span className="chip chip-info">Explore: tap equipment to learn about it</span>
        )}
      </div>
      <svg className="oneline" viewBox="0 0 960 660" preserveAspectRatio="xMidYMid meet" data-version={version}>
        <title>Mechanical plant</title>
        <text className="ol-zone-label" x={14} y={22}>
          Heat rejection
        </text>
        <text className="ol-zone-label" x={14} y={235}>
          Chiller plant
        </text>
        <text className="ol-zone-label" x={14} y={470}>
          Distribution & data hall
        </text>

        {/* Condenser water: towers ↔ pumps ↔ chillers (cool leg left, warm return right) */}
        {COLS.map((x, i) => {
          const live = running.has(`CWP-0${i + 1}`) || running.has(`CT-0${i + 1}`);
          return (
            <g key={x}>
              {pipe(`M${x - 14},${Y.tower + 24} V${Y.chiller - 28}`, cwCool, live)}
              {pipe(`M${x + 14},${Y.chiller - 28} V${Y.tower + 24}`, cwHot, live && running.has(`CH-0${i + 1}`))}
            </g>
          );
        })}
        {/* Free cooling HX tie-in */}
        {pipe(`M${COLS[2]! + 14},215 H560 V${Y.chiller - 24}`, cwCool, econ)}
        {/* Chillers / HX / air-cooled chiller down to the CHW headers */}
        {[...COLS, 560, 700].map((x, i) => {
          const id = ['CH-01', 'CH-02', 'CH-03', 'HX', 'ACH-04'][i]!;
          const live = id === 'HX' ? econ && flowing : r.chillers[id] === 'running' && flowing;
          return (
            <g key={id}>
              {pipe(`M${x - 10},${Y.chiller + 28} V${Y.hdrS}`, chwS, live)}
              {pipe(`M${x + 10},${Y.hdrR} V${Y.chiller + 28}`, chwR, live)}
            </g>
          );
        })}
        {/* Headers */}
        {pipe(`M40,${Y.hdrS} H930`, chwS, flowing, 'hdrS', 7)}
        {pipe(`M930,${Y.hdrR} H40`, chwR, flowing, 'hdrR', 7)}
        {/* Pumps to distribution header */}
        {COLS.map((x, i) => pipe(`M${x},${Y.hdrS} V${Y.dist}`, chwS, running.has(`CHWP-0${i + 1}`), `p${i}`))}
        {pipe(`M560,${Y.hdrS} V${Y.chwp - 36}`, chwS, r.tesDischargeKwt > 0 || flowing, 'tes')}
        {pipe(`M40,${Y.dist} H880`, chwS, flowing, 'dist', 6)}
        {[...CRAH_X, ...CDU_X, 880].map((x) => pipe(`M${x},${Y.dist} V${Y.hall - 26}`, chwS, flowing, `d${x}`, 4))}

        {/* Equipment */}
        {COLS.map((x, i) => unit(`CT-0${i + 1}`, x, Y.tower, tower, undefined, 76, 48))}
        {COLS.map((x, i) => unit(`CWP-0${i + 1}`, x, Y.cwp, pump, undefined, 40, 40))}
        {COLS.map((x, i) => unit(`CH-0${i + 1}`, x, Y.chiller, box('CHILLER', 100, 52), chillerMode(`CH-0${i + 1}`), 100, 52))}
        <g transform={`translate(560,${Y.chiller})`} className={`mp-unit static${econ ? ' on' : ' idle'}`}>
          <rect className="mp-body" x={-50} y={-26} width={100} height={52} rx={10} />
          <text className="mp-glyph" y={-2} textAnchor="middle">
            FREE COOLING
          </text>
          <text className="mp-glyph small" y={12} textAnchor="middle">
            plate HX · {r.economizer}
          </text>
        </g>
        {unit('ACH-04', 700, Y.chiller, box('AIR-COOLED', 100, 52), chillerMode('ACH-04'), 100, 52)}
        {COLS.map((x, i) => unit(`CHWP-0${i + 1}`, x, Y.chwp, pump, undefined, 40, 40))}
        {unit(
          'TES-01',
          560,
          Y.chwp,
          <>
            <rect className="mp-body" x={-30} y={-34} width={60} height={68} rx={10} />
            <rect x={-26} y={30 - 60 * r.tesSoc} width={52} height={60 * r.tesSoc} rx={6} style={{ fill: chwS, opacity: 0.55 }} />
            <text className="mp-glyph" y={4} textAnchor="middle">
              TES
            </text>
          </>,
          `${Math.round(r.tesSoc * 100)}% · ${isFinite(r.tesMinutes) ? Math.round(r.tesMinutes) : '—'} min`,
          60,
          68,
        )}
        {unit('DOAS-01', 700, Y.chwp, box('DOAS', 80, 44), undefined, 80, 44)}
        {unit('DOAS-02', 795, Y.chwp, box('DOAS', 80, 44), undefined, 80, 44)}
        {unit('CRAC-201', 895, Y.chwp - 120, box('CRAC', 70, 44), `UPS room ${fmtTemp(r.upsRoomC, units)}`, 70, 44)}
        {CRAH_X.map((x, i) => unit(`CRAH-${101 + i}`, x, Y.hall, box('CRAH', 56, 44), undefined, 56, 44))}
        {CDU_X.map((x, i) => {
          const row = r.gpuRows[i]!;
          return unit(`CDU-${i + 1}`, x, Y.hall, box('CDU', 60, 44), `GPU ${Math.round(row.tempC)} °C${row.tripped ? ' TRIP' : row.throttled ? ' THROTTLE' : ''}`, 60, 44);
        })}

        {/* Data hall band */}
        <g className="mp-hall">
          <rect x={30} y={612} width={900} height={36} rx={10} style={{ fill: tempColor(r.hallInletC), opacity: 0.18 }} />
          <rect x={30} y={612} width={900} height={36} rx={10} className="mp-hall-border" style={{ stroke: tempColor(r.hallInletC) }} />
          <text x={480} y={635} textAnchor="middle" className="mp-hall-text">
            Data hall · rack inlet {fmtTemp(r.hallInletC, units, 1)} · dew point {fmtTemp(r.hallDewC, units)} · {r.hallPressurePa > 0 ? '+' : ''}
            {r.hallPressurePa} Pa
          </text>
        </g>
      </svg>
      <div className="legend mech-legend" aria-hidden="true">
        <span>
          <i style={{ background: tempColor(14) }} /> cold
        </span>
        <span>
          <i style={{ background: tempColor(22) }} /> cool
        </span>
        <span>
          <i style={{ background: tempColor(30) }} /> warm
        </span>
        <span>
          <i style={{ background: tempColor(38) }} /> hot
        </span>
      </div>
    </div>
  );
}
