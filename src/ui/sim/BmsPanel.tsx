/** Simplified BMS: plant status, temperatures, storage, humidity, and an inlet trend vs. the ASHRAE band. */
import { PHYSICS, type Simulation } from '../../sim';
import { fmtKw, fmtTemp, tempColor } from '../format';
import type { Units } from '../prefs';

function InletChart({ sim, units }: { sim: Simulation; units: Units }) {
  const hist = sim.thermal.readout.history;
  const W = 320;
  const H = 120;
  const lo = 15;
  const hi = 45;
  const y = (c: number) => H - ((Math.min(hi, Math.max(lo, c)) - lo) / (hi - lo)) * H;
  const t0 = hist[0]?.t ?? 0;
  const t1 = Math.max(t0 + 60, hist[hist.length - 1]?.t ?? 60);
  const x = (t: number) => ((t - t0) / (t1 - t0)) * W;
  const line = (key: 'inletC' | 'chwC') => hist.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p[key]).toFixed(1)}`).join(' ');
  const [rLo, rHi] = PHYSICS.ashraeRecommendedC;
  const last = hist[hist.length - 1];
  return (
    <figure className="bms-chart">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Rack inlet temperature trend. Now ${last ? fmtTemp(last.inletC, units, 1) : 'n/a'}. Green band is the ASHRAE recommended range, ${fmtTemp(rLo, units)} to ${fmtTemp(rHi, units)}.`}
      >
        <rect x={0} y={y(rHi)} width={W} height={y(rLo) - y(rHi)} className="band-ok" />
        <line x1={0} x2={W} y1={y(PHYSICS.serverShutdownC)} y2={y(PHYSICS.serverShutdownC)} className="band-trip" />
        <path d={line('chwC')} className="trend chw" />
        <path d={line('inletC')} className="trend inlet" style={{ stroke: last ? tempColor(last.inletC) : undefined }} />
      </svg>
      <figcaption>
        <span className="key inlet" /> Rack inlet <span className="key chw" /> CHW supply <span className="key band" /> ASHRAE recommended{' '}
        <span className="key trip" /> IT shutdown
      </figcaption>
    </figure>
  );
}

export function BmsPanel({ sim, units }: { sim: Simulation; units: Units }) {
  const r = sim.thermal.readout;
  const T = (c: number, d = 0) => fmtTemp(c, units, d);
  const inletBad = r.hallInletC > PHYSICS.ashraeRecommendedC[1];
  const chillersOn = Object.entries(r.chillers).filter(([, m]) => m !== 'off');
  const rows: [string, string, string?][] = [
    ['Outdoor', `${T(r.dryBulbC)} · wet bulb ${T(r.wetBulbC)}`],
    ['Free cooling', r.economizer === 'off' ? 'off (too warm outside)' : `${r.economizer} · ${fmtKw(r.economizerKwt)}t`],
    ['Chillers', chillersOn.length ? chillersOn.map(([id, m]) => `${id} ${m}`).join(', ') : 'none needed'],
    ['Cooling load', `${fmtKw(r.loadKwt)}t (chillers ${fmtKw(r.chillerKwt)}t of ${fmtKw(r.chillerCapacityKwt)}t)`],
    ['CHW supply / return', `${T(r.chwSupplyC, 1)} / ${T(r.chwReturnC, 1)}`, r.chwSupplyC > PHYSICS.chwSupplyC + 1 ? 'bad' : undefined],
    ['Condenser water', `${T(r.condenserC, 1)} (trip ${T(PHYSICS.chillerHighHeadTripC)})`, r.condenserC > PHYSICS.chillerHighHeadTripC - 2 ? 'warn' : undefined],
    ['Storage tank', `${Math.round(r.tesSoc * 100)}% · ${isFinite(r.tesMinutes) ? `${Math.round(r.tesMinutes)} min` : '—'} at this load${r.tesDischargeKwt > 0 ? ' · DISCHARGING' : ''}`, r.tesDischargeKwt > 0 ? 'warn' : undefined],
    ['Rack inlet', `${T(r.hallInletC, 1)}`, inletBad ? 'bad' : undefined],
    ['Hall humidity', `dew point ${T(r.hallDewC)} · ${Math.round(r.hallRh)}% RH${r.hallHumidity === 'ok' ? '' : ` · ${r.hallHumidity.replace('-', ' ')}`}`, r.hallHumidity === 'ok' ? undefined : 'warn'],
    ['Hall pressure', `${r.hallPressurePa > 0 ? '+' : ''}${r.hallPressurePa} Pa · DOAS ${r.doasOn ? 'on' : 'OFF'}`, r.doasOn ? undefined : 'warn'],
    ['UPS room', T(r.upsRoomC, 1), r.upsRoomC > 30 ? 'warn' : undefined],
    ['Mechanical power', fmtKw(r.mechanicalKw)],
  ];
  return (
    <section className="card bms" aria-labelledby="bms-h">
      <h2 id="bms-h" className="h-card">
        BMS
      </h2>
      <InletChart sim={sim} units={units} />
      <dl className="bms-list">
        {rows.map(([k, v, tone]) => (
          <div key={k} className={tone ? `tone-${tone}` : undefined}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <h3 className="bms-sub">GPU rows (liquid cooled)</h3>
      <div className="gpu-rows">
        {r.gpuRows.map((g) => {
          const pct = Math.min(100, Math.max(0, ((g.tempC - 55) / (PHYSICS.gpuShutdownC - 55)) * 100));
          const state = g.tripped ? 'TRIPPED' : g.throttled ? 'THROTTLING' : g.cduOk ? 'OK' : 'NO CDU';
          return (
            <div key={g.row} className="gpu-row">
              <span>Row {g.row}</span>
              <div className="meter" role="img" aria-label={`Row ${g.row} GPU temperature ${Math.round(g.tempC)} degrees C, ${state}`}>
                <span style={{ width: `${pct}%`, background: g.tripped || g.throttled ? 'var(--alarm)' : pct > 60 ? 'var(--warn)' : 'var(--ok)' }} />
              </div>
              <span className={g.tripped || g.throttled ? 'bad' : ''}>
                {Math.round(g.tempC)} °C {state !== 'OK' && `· ${state}`}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
