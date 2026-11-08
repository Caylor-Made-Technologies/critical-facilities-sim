/**
 * Live efficiency readout for engine v2 (Phase 4c part 3): PUE with its breakdown, economizer mode and
 * outdoor/hall psychrometrics. Loaded only when ?engine=v2 is on, so the default bundle doesn't grow.
 */
import type { EngineV2 } from '../../sim/v2/engine';
import { fmtTemp } from '../format';
import type { Units } from '../prefs';

const kw = (x: number) => `${Math.round(x).toLocaleString('en-US')} kW`;

export default function EfficiencyPanel({ engine, units }: { engine: EngineV2; units: Units }) {
  const r = engine.efficiency;
  const p = r.parts;
  const rows: [string, number][] = [
    ['IT load', r.itKw],
    ['Chillers', p.chillers],
    ['CRAH fans', p.crahFans],
    ['Chilled water pumps', p.chwPumps],
    ['Condenser water pumps', p.cwPumps],
    ['Cooling tower fans', p.towerFans],
    ['CDUs, DOAS, UPS-room AC', p.otherMech],
    ['UPS losses', p.upsLoss],
    ['Transformer losses', p.txLoss],
  ];
  const econ = { off: 'Off (chillers only)', partial: 'Partial (towers pre-cool)', full: 'Full (chillers can rest)' }[r.econMode];
  const pueText = Number.isFinite(r.pue) ? r.pue.toFixed(2) : '—';
  return (
    <details className="dock-more eff-panel">
      <summary>
        <span>Live PUE {pueText} · how it adds up</span>
      </summary>
      <table className="eff-table">
        <caption className="visually-hidden">Facility power by part</caption>
        <tbody>
          {rows.map(([label, v]) => (
            <tr key={label}>
              <th scope="row">{label}</th>
              <td>{kw(v)}</td>
            </tr>
          ))}
          <tr className="eff-total">
            <th scope="row">Total facility</th>
            <td>{kw(r.totalKw)}</td>
          </tr>
          <tr className="eff-total">
            <th scope="row">PUE = total ÷ IT</th>
            <td>{pueText}</td>
          </tr>
        </tbody>
      </table>
      <p className="dock-note">
        Economizer: <strong>{econ}</strong> · outdoor wet bulb {fmtTemp(engine.hyd.reading.wetBulbC, units, 1)}. Mode changes wait 15 min and
        use a {units === 'F' ? '1.8 °F' : '1 °C'} deadband so it doesn't cycle.
      </p>
      <p className="dock-note">
        <span className="chip chip-warn">Verify</span> Outdoor: dew point {fmtTemp(r.outdoor.dewPointC, units, 1)}, {Math.round(r.outdoor.rhPct)}% RH, enthalpy{' '}
        {r.outdoor.enthalpyKjKg.toFixed(1)} kJ/kg. Hall: dew point {fmtTemp(r.hall.dewPointC, units, 1)}, {Math.round(r.hall.rhPct)}% RH.
      </p>
      <p className="dock-note">Simplified model for training, not an energy audit. Numbers are examples from a made-up plant.</p>
    </details>
  );
}
