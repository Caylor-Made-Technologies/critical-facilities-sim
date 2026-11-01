/**
 * Field Tools: quick calculators techs use on shift. Every formula lives in
 * src/sim/physics.ts; this file only collects inputs and shows results.
 */
import { useState, type ReactNode } from 'react';
import {
  BATTERY_AGES,
  airflowCfm,
  batteryLifeYears,
  cToF,
  chwGpm,
  classifyInlet,
  fToC,
  genFuelLPerS,
  genRuntimeS,
  litresToGallons,
  kva,
  kwToTons,
  pue,
  singlePhaseAmps,
  threePhaseAmps,
  upsRuntimeMinFor,
  type BatteryAge,
} from '../../sim';
import { PageHead } from '../common';
import { Icon, type IconName } from '../icons';

const n1 = (v: number, d = 1) => (Number.isFinite(v) ? v.toLocaleString(undefined, { maximumFractionDigits: d, minimumFractionDigits: 0 }) : '—');

function Num({ label, value, onChange, unit, step = 1, min = 0, max }: { label: string; value: number; onChange: (v: number) => void; unit?: string; step?: number; min?: number; max?: number }) {
  return (
    <label className="field tool-field">
      <span>{label}</span>
      <span className="tool-input">
        <input
          type="number"
          inputMode="decimal"
          value={Number.isFinite(value) ? value : ''}
          step={step}
          min={min}
          max={max}
          onChange={(e) => onChange(e.target.value === '' ? NaN : Number(e.target.value))}
        />
        {unit && <span className="tool-unit">{unit}</span>}
      </span>
    </label>
  );
}

function Tool({ icon, title, formula, children, result }: { icon: IconName; title: string; formula: string; children: ReactNode; result: ReactNode }) {
  return (
    <section className="card tool" aria-label={title}>
      <h2 className="tool-title">
        <span className="tool-icon" aria-hidden="true">
          <Icon name={icon} />
        </span>
        {title}
      </h2>
      <div className="tool-inputs">{children}</div>
      <div className="tool-result" aria-live="polite">
        {result}
      </div>
      <p className="tool-formula">
        <code>{formula}</code>
      </p>
    </section>
  );
}

function Out({ big, label }: { big: string; label: string }) {
  return (
    <div className="tool-out">
      <strong>{big}</strong>
      <span>{label}</span>
    </div>
  );
}

export function FieldToolsTab() {
  // Electrical
  const [kw, setKw] = useState(150);
  const [volts, setVolts] = useState(480);
  const [pf, setPf] = useState(0.95);
  // UPS
  const [loadPct, setLoadPct] = useState(60);
  const [ratedMin, setRatedMin] = useState(5);
  const [age, setAge] = useState<BatteryAge>('new');
  // Generator
  const [genKw, setGenKw] = useState(2000);
  const [genLoad, setGenLoad] = useState(1400);
  const [fuelGal, setFuelGal] = useState(4000);
  // Cooling
  const [itKw, setItKw] = useState(2100);
  const [chwDt, setChwDt] = useState(12);
  const [airDt, setAirDt] = useState(20);
  // PUE
  const [facKw, setFacKw] = useState(2700);
  const [pueIt, setPueIt] = useState(2100);
  // Battery life
  const [design, setDesign] = useState(10);
  const [roomF, setRoomF] = useState(77);
  // Temperature
  const [tempF, setTempF] = useState(80.6);

  const amps3 = threePhaseAmps(kw, volts, pf);
  const amps1 = singlePhaseAmps(kw, volts, pf);
  const runtimeMin = upsRuntimeMinFor(loadPct / 100, ratedMin, BATTERY_AGES[age].health);
  const genHrs = genRuntimeS(fuelGal * 3.785, Math.min(genLoad, genKw), genKw) / 3600;
  const tons = kwToTons(itKw);
  const band = classifyInlet(fToC(tempF));
  const life = batteryLifeYears(design, fToC(roomF));

  return (
    <div className="tab-panel">
      <PageHead eyebrow="Field tools" title="Numbers you need on shift">
        Quick calculators for power, runtime, fuel, cooling and efficiency. Rules of thumb for learning and sanity checks,
        not engineering design. Use the nameplate, manuals and your site's engineering for real decisions.
      </PageHead>
      <div className="tools-grid">
        <Tool icon="bolt" title="Load to amps" formula="I = kW × 1000 ÷ (√3 × V × PF)" result={<><Out big={`${n1(amps3, 0)} A`} label="three-phase" /><Out big={`${n1(amps1, 0)} A`} label="single-phase" /><Out big={`${n1(kva(kw, pf))} kVA`} label="apparent power" /></>}>
          <Num label="Load" value={kw} onChange={setKw} unit="kW" />
          <label className="field tool-field">
            <span>Voltage</span>
            <select value={volts} onChange={(e) => setVolts(Number(e.target.value))}>
              {[208, 240, 415, 480, 600, 4160, 13800].map((v) => (
                <option key={v} value={v}>
                  {v.toLocaleString()} V
                </option>
              ))}
            </select>
          </label>
          <Num label="Power factor" value={pf} onChange={setPf} step={0.01} max={1} />
        </Tool>

        <Tool icon="pulse" title="UPS battery runtime" formula="t = rated × (1 ÷ load)^1.2 × health" result={<><Out big={`${n1(runtimeMin)} min`} label={`at ${loadPct}% load`} /><Out big={`${Math.round(BATTERY_AGES[age].health * 100)}%`} label="battery capacity" /></>}>
          <label className="field tool-field">
            <span>
              Load: <strong>{loadPct}%</strong>
            </span>
            <input type="range" min={10} max={100} step={5} value={loadPct} onChange={(e) => setLoadPct(Number(e.target.value))} />
          </label>
          <Num label="Runtime at full load" value={ratedMin} onChange={setRatedMin} unit="min" />
          <label className="field tool-field">
            <span>Battery age</span>
            <select value={age} onChange={(e) => setAge(e.target.value as BatteryAge)}>
              {(Object.keys(BATTERY_AGES) as BatteryAge[]).map((a) => (
                <option key={a} value={a}>
                  {BATTERY_AGES[a].label}
                </option>
              ))}
            </select>
          </label>
        </Tool>

        <Tool icon="flame" title="Generator fuel runtime" formula="burn ≈ kW × 0.27 L/kWh (10% idle floor)" result={<><Out big={`${n1(genHrs)} h`} label="until empty" /><Out big={`${n1(litresToGallons(genFuelLPerS(Math.min(genLoad, genKw), genKw) * 3600))} gal/h`} label="burn rate" /></>}>
          <Num label="Generator rating" value={genKw} onChange={setGenKw} unit="kW" step={50} />
          <Num label="Load" value={genLoad} onChange={setGenLoad} unit="kW" step={50} />
          <Num label="Fuel on hand" value={fuelGal} onChange={setFuelGal} unit="gal" step={100} />
        </Tool>

        <Tool icon="layers" title="Cooling: tons, water, air" formula="tons = kW ÷ 3.517 · gpm = tons × 24 ÷ ΔT · CFM = kW × 3412 ÷ (1.08 × ΔT)" result={<><Out big={`${n1(tons, 0)} tons`} label="of cooling" /><Out big={`${n1(chwGpm(tons, chwDt), 0)} gpm`} label="chilled water" /><Out big={`${n1(airflowCfm(itKw, airDt), 0)} CFM`} label="airflow" /></>}>
          <Num label="Heat load" value={itKw} onChange={setItKw} unit="kW" step={50} />
          <Num label="Water ΔT" value={chwDt} onChange={setChwDt} unit="°F" />
          <Num label="Air ΔT" value={airDt} onChange={setAirDt} unit="°F" />
        </Tool>

        <Tool icon="target" title="PUE" formula="PUE = total facility kW ÷ IT kW" result={<><Out big={n1(pue(facKw, pueIt), 2)} label="PUE" /><Out big={`${n1((pueIt / facKw) * 100, 0)}%`} label="of power reaches IT" /><Out big={`${n1(facKw - pueIt, 0)} kW`} label="overhead" /></>}>
          <Num label="Total facility" value={facKw} onChange={setFacKw} unit="kW" step={50} />
          <Num label="IT load" value={pueIt} onChange={setPueIt} unit="kW" step={50} />
        </Tool>

        <Tool icon="clipboard" title="Battery life vs room temp" formula="life = design × 0.5^((T − 77 °F) ÷ 15 °F)" result={<><Out big={`${n1(life)} yr`} label="expected life" /><Out big={`${n1((1 - life / design) * 100, 0)}%`} label="life lost to heat" /></>}>
          <Num label="Design life" value={design} onChange={setDesign} unit="yr" />
          <Num label="Average room temp" value={roomF} onChange={setRoomF} unit="°F" />
        </Tool>

        <Tool icon="search" title="Temperature & inlet check" formula="°C = (°F − 32) × 5 ÷ 9 · ASHRAE recommended 64.4–80.6 °F" result={<><Out big={`${n1(fToC(tempF))} °C`} label={`${n1(tempF)} °F`} /><Out big={band === 'recommended' ? 'Recommended' : band === 'allowable' ? 'Allowable' : 'Out of range'} label="server inlet band" /></>}>
          <Num label="Temperature" value={tempF} onChange={setTempF} unit="°F" step={0.5} min={-40} />
          <p className="muted small">Back the other way: {n1(fToC(tempF))} °C is {n1(cToF(fToC(tempF)))} °F.</p>
        </Tool>
      </div>
    </div>
  );
}
