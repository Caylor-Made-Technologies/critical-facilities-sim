/** Simulator tab: Explore and Failure modes over the electrical one-line and the mechanical plant. */
import type { ReactNode } from 'react';
import { BATTERY_AGES, describeCapacity, formatT, PHYSICS, TOPOLOGIES, WEATHER, type BatteryAge, type Component, type Topology, type WeatherId } from '../../sim';
import { fmtTemp } from '../format';
import { Icon, type IconName } from '../icons';
import { PageHead } from '../common';
import { lazy, Suspense, useMemo, useState } from 'react';
import { Hall3D, Plant3DView } from '../three/Scene3D';
import { plantModel } from '../three/plantModel';
import { use3d } from '../view3d';
import { hallVis } from '../three/hallState';
import type { Units } from '../prefs';
import type { SimHandle } from '../useSimulation';
import { BmsPanel } from './BmsPanel';
import { ComponentCard } from './ComponentCard';
import { DataHall } from './DataHall';
import { EventLog } from './EventLog';
import { MechPlant } from './MechPlant';
import { OneLine } from './OneLine';
import { plantIssues, StatusBanner } from './StatusBanner';
import { alarmsByEquipment, type AlarmMap } from './v2view';

const EfficiencyPanel = lazy(() => import('./EfficiencyPanel'));
const AlarmPanel = lazy(() => import('./AlarmPanel'));
const TrendPanel = lazy(() => import('./TrendPanel'));
const AirPath = lazy(() => import('./AirPath'));

export type SimView = 'electrical' | 'mechanical';

interface Props {
  h: SimHandle;
  mode: 'explore' | 'failure';
  setMode: (m: 'explore' | 'failure') => void;
  selected: string | null;
  setSelected: (id: string | null) => void;
  onOpenGuide: (kind: Component['kind']) => void;
  coach?: ReactNode;
  /** A walkthrough or procedure is running: keep the intro short so the coach sits near the top. */
  focused?: boolean;
  view: SimView;
  setView: (v: SimView) => void;
  units: Units;
  setUnits: (u: Units) => void;
}

const SPEEDS = [1, 10, 60];

/** One reading in the KPI strip. The value re-mounts when it changes, which plays a short flash. */
function Kpi({ icon, label, value, tone, onClick, hint }: { icon: IconName; label: string; value: string; tone: 'ok' | 'warn' | 'bad' | 'live'; onClick?: () => void; hint?: string }) {
  const body = (
    <>
      <span className="kpi-icon">
        <Icon name={icon} />
      </span>
      <div>
        <div className="kpi-label">{label}</div>
        <div className="kpi-value" key={value}>
          {value}
        </div>
      </div>
    </>
  );
  return onClick ? (
    <div role="listitem" className="kpi-item">
      <button type="button" className={`kpi kpi-btn tone-${tone}`} onClick={onClick} aria-label={`${label}: ${value}. ${hint ?? ''}`}>
        {body}
      </button>
    </div>
  ) : (
    <div className={`kpi tone-${tone}`} role="listitem">
      {body}
    </div>
  );
}

export function SimulatorTab({ h, mode, setMode, selected, setSelected, onOpenGuide, coach, focused, view, setView, units, setUnits }: Props) {
  const { sim, version } = h;
  const [is3d, set3d] = use3d();
  const sol = sim.solution;
  const racksDown = sim.itDownRacks().length;
  const th = sim.thermal.readout;
  // Plant settings start open on wide screens, folded on phones to keep the diagram close.
  const [wide] = useState(() => window.matchMedia?.('(min-width: 1024px)').matches ?? true);
  const onBattery = [...sol.upsMode.values()].filter((m) => m === 'battery').length;
  const onBypass = [...sol.upsMode.values()].filter((m) => m === 'static-bypass').length;
  const gensRunning = sim.graph.byKind('generator').filter((g) => g.state.genState === 'running').length;
  const pue = sim.pue();
  const itPct = sol.itDemandKw ? (sol.itPoweredKw / sol.itDemandKw) * 100 : 0;

  const activate = (id: string) => {
    if (mode === 'failure') {
      const n = sim.graph.get(id);
      h.apply({ a: n.status === 'failed' ? 'restore' : 'fail', id });
      if (!h.running) h.setRunning(true);
    }
    setSelected(id);
  };

  // Graphics v2: equipment in alarm (engine v2 alarm list) drives rings and badges on every diagram.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const almSum = useMemo(() => h.engine?.alarmSummary ?? null, [h.engine, sim, version]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const alarms = useMemo(() => alarmsByEquipment(almSum, (id) => sim.graph.nodes.has(id)), [almSum, sim]);

  const issues = plantIssues(sim, units);
  const tone = (bad: boolean, warn = false) => (bad ? 'bad' : warn ? 'warn' : 'ok');

  return (
    <div className="tab-panel">
      <PageHead eyebrow="Simulator" title="Utility to chip, live">
        {focused ? null : <>Follow power from two utility feeds to 36 racks, and heat from the chips back out to the cooling towers. Tap anything
        to learn what it does. Switch to Failure mode to break things and watch the plant respond.</>}
      </PageHead>

      {coach}

      <StatusBanner sim={sim} units={units} />

      <section className="card control-dock" aria-label="Simulator controls">
        <div className="dock-row">
          <div className="seg seg-icons" role="group" aria-label="Diagram view">
            <button type="button" aria-pressed={view === 'electrical'} onClick={() => setView('electrical')}>
              <Icon name="bolt" /> Electrical
            </button>
            <button type="button" aria-pressed={view === 'mechanical'} onClick={() => setView('mechanical')}>
              <Icon name="pulse" /> Mechanical
            </button>
          </div>
          <div className="seg seg-icons seg-3d" role="group" aria-label="2D or 3D">
            <button type="button" aria-pressed={!is3d} onClick={() => set3d(false)}>
              2D
            </button>
            <button type="button" aria-pressed={is3d} onClick={() => set3d(true)}>
              <Icon name="layers" /> 3D
            </button>
          </div>
          <div className="seg seg-icons" role="group" aria-label="Mode">
            <button type="button" aria-pressed={mode === 'explore'} onClick={() => setMode('explore')}>
              <Icon name="search" /> Explore
            </button>
            <button type="button" className="danger" aria-pressed={mode === 'failure'} onClick={() => setMode('failure')}>
              <Icon name="warning" /> Failure
            </button>
          </div>
          <div className="dock-time" role="group" aria-label="Time controls">
            <button className={`btn btn-primary run-btn${h.running ? ' is-running' : ''}`} type="button" onClick={() => h.setRunning(!h.running)}>
              <Icon name={h.running ? 'pause' : 'play'} /> {h.running ? 'Pause' : 'Run'}
            </button>
            <div className="seg" role="group" aria-label="Speed">
              {SPEEDS.map((s) => (
                <button key={s} type="button" aria-pressed={h.speed === s} onClick={() => h.setSpeed(s)}>
                  {s}×
                </button>
              ))}
            </div>
            <button className="btn" type="button" onClick={() => h.apply({ a: 'skip', s: 10 })} aria-label="Skip ahead 10 seconds">
              <Icon name="skip" /> 10s
            </button>
            {h.engine && !h.running && (
              <button className="btn" type="button" onClick={h.step} aria-label="Step one second">
                1s
              </button>
            )}
          </div>
        </div>
        <details className="dock-more" open={wide}>
          <summary>
            <span>Plant settings</span>
            <span className="dock-summary">
              {TOPOLOGIES[h.topology].label} · {WEATHER[sim.thermal.state.weather].label} · °{units}
            </span>
          </summary>
          <div className="dock-row">
            <label className="field">
              Redundancy design
              <select
                value={h.topology}
                onChange={(e) => {
                  setSelected(null);
                  h.reset(e.target.value as Topology);
                }}
              >
                {(Object.keys(TOPOLOGIES) as Topology[]).map((t) => (
                  <option key={t} value={t}>
                    {TOPOLOGIES[t].label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Outdoor weather
              <select value={sim.thermal.state.weather} onChange={(e) => h.apply({ a: 'weather', w: e.target.value as WeatherId })}>
                {(Object.keys(WEATHER) as WeatherId[]).map((w) => (
                  <option key={w} value={w}>
                    {WEATHER[w].label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              UPS battery age
              <select value={sim.batteryAge} onChange={(e) => h.apply({ a: 'batteryAge', age: e.target.value as BatteryAge })}>
                {(Object.keys(BATTERY_AGES) as BatteryAge[]).map((a) => (
                  <option key={a} value={a}>
                    {BATTERY_AGES[a].label}
                  </option>
                ))}
              </select>
            </label>
            <div className="field">
              <span>Units</span>
              <div className="seg" role="group" aria-label="Temperature units">
                <button type="button" aria-pressed={units === 'F'} onClick={() => setUnits('F')}>
                  °F
                </button>
                <button type="button" aria-pressed={units === 'C'} onClick={() => setUnits('C')}>
                  °C
                </button>
              </div>
            </div>
            <button
              className="btn dock-reset"
              type="button"
              onClick={() => {
                setSelected(null);
                h.setRunning(false);
                h.reset();
              }}
            >
              <Icon name="reset" /> Reset plant
            </button>
          </div>
          <p className="dock-note">{TOPOLOGIES[h.topology].summary}</p>
        </details>
      </section>

      <div className="kpis" role="list" aria-label="Plant readings (scrolls sideways on small screens)" tabIndex={0}>
        <Kpi icon="pulse" label="Sim time" value={formatT(sim.t)} tone={h.running ? 'live' : 'ok'} />
        {almSum && (
          <Kpi
            icon="warning"
            label="Alarms"
            value={almSum.list.length ? `${almSum.list.length}${almSum.unacked ? ` · ${almSum.unacked} new` : ''}` : 'none'}
            tone={almSum.list.some((a) => a.priority === 'critical' || a.priority === 'high') ? 'bad' : almSum.list.length ? 'warn' : 'ok'}
            hint="Go to the alarm list."
            onClick={() => {
              const el = document.querySelector<HTMLElement>('.alarm-panel');
              el?.scrollIntoView({ block: 'start', behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
              el?.querySelector<HTMLElement>('h3')?.focus();
            }}
          />
        )}
        <Kpi icon="bolt" label="IT powered" value={`${itPct.toFixed(itPct < 100 ? 1 : 0)}%`} tone={tone(itPct < 100)} />
        <Kpi icon="warning" label="Racks down" value={String(racksDown)} tone={tone(racksDown > 0)} />
        <Kpi icon="info" label="UPS battery / bypass" value={`${onBattery} / ${onBypass}`} tone={tone(onBattery > 0, onBypass > 0)} />
        <Kpi icon="reset" label="Generators" value={gensRunning ? `${gensRunning} running` : 'standby'} tone={tone(false, gensRunning > 0)} />
        <Kpi icon="target" label="Rack inlet" value={fmtTemp(th.hallInletC, units, 1)} tone={tone(th.hallInletC > PHYSICS.ashraeRecommendedC[1])} />
        <Kpi icon="change" label="CHW supply" value={fmtTemp(th.chwSupplyC, units, 1)} tone={tone(false, th.chwSupplyC > PHYSICS.chwSupplyC + 1)} />
        {h.engine ? (
          <Kpi icon="scale" label="PUE (live)" value={Number.isFinite(h.engine.efficiency.pue) ? h.engine.efficiency.pue.toFixed(2) : '—'} tone="ok" />
        ) : (
          <Kpi icon="scale" label="PUE" value={isFinite(pue) ? pue.toFixed(2) : '—'} tone="ok" />
        )}
      </div>
      {/* v2 panels load a moment after the page: hold their space so nothing below jumps (Phase 6b). */}
      {h.engine ? (
        <Suspense fallback={<div className="v2-slot v2-slot-top" aria-hidden="true" />}>
          <EfficiencyPanel engine={h.engine} units={units} />
          <TrendPanel engine={h.engine} units={units} />
          <AlarmPanel engine={h.engine} apply={h.apply} />
        </Suspense>
      ) : (
        <div className="v2-slot v2-slot-top" aria-hidden="true" />
      )}
      <p className="dock-note sim-model-note">
        Simplified training model: realistic example values from a made-up plant, not a design or operations tool. Your site&apos;s procedures and
        the manufacturer&apos;s data come first.
      </p>
      <span className="visually-hidden" aria-live="polite">
        {issues[0] && issues[0].level !== 'info' ? `Plant status: ${issues[0].text}` : ''}
      </span>

      <div className="sim-layout">
        <div>
          {is3d ? (
            <Plant3DCard sim={sim} version={version} view={view} selected={selected} failureMode={mode === 'failure'} onActivate={activate} alarms={alarms} />
          ) : view === 'mechanical' ? (
            <MechPlant sim={sim} version={version} selected={selected} failureMode={mode === 'failure'} units={units} onActivate={activate} engine={h.engine} alarms={alarms} />
          ) : (
            <OneLine sim={sim} version={version} selected={selected} failureMode={mode === 'failure'} onActivate={activate} alarms={alarms} />
          )}
          {view === 'electrical' && !is3d && (
          <div className="legend" aria-hidden="true">
            <span>
              <i style={{ background: 'var(--side-a)' }} /> A side
            </span>
            <span>
              <i style={{ background: 'var(--side-b)' }} /> B side
            </span>
            <span>
              <i style={{ background: 'var(--side-c)' }} /> C system
            </span>
            <span>
              <i style={{ background: 'var(--side-r)' }} /> Catcher / shared
            </span>
            <span>
              <i style={{ background: 'var(--dead)' }} /> De-energized
            </span>
            <span>Moving dashes = power flowing (faster = more load)</span>
          </div>
          )}
          {h.engine ? (
            <Suspense fallback={<div className="v2-slot v2-slot-air" aria-hidden="true" />}>
              <AirPath engine={h.engine} apply={h.apply} units={units} />
            </Suspense>
          ) : (
            <div className="v2-slot v2-slot-air" aria-hidden="true" />
          )}
          <Hall3DCard sim={sim} version={version} selected={selected} onPick={activate} />
          <DataHall sim={sim} selected={selected} onActivate={activate} units={units} />
        </div>
        <aside className="side-panel" aria-label="Details">
          {selected && (
            <ComponentCard key={selected} sim={sim} id={selected} apply={h.apply} onClose={() => setSelected(null)} onOpenGuide={onOpenGuide} units={units} />
          )}
          {view === 'mechanical' ? (
            <BmsPanel sim={sim} units={units} />
          ) : (
            !selected && (
              <section className="card" aria-labelledby="cap-h">
              <h2 id="cap-h" className="h-card">Capacity check</h2>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                Live N-math for each group. Tap a component on the diagram for its details.
              </p>
              <ul style={{ fontSize: '0.88rem', paddingLeft: '1.1em' }}>
                {sim.capacityReport().map((c) => (
                  <li key={c.name} style={{ color: c.holds ? undefined : 'var(--alarm)' }}>
                    <strong>{c.name}:</strong> {describeCapacity(c, c.name.startsWith('UPS') ? 'modules' : 'generators')}
                  </li>
                ))}
              </ul>
            </section>
            )
          )}
          <EventLog sim={sim} count={sim.events.length} />
        </aside>
      </div>
    </div>
  );
}

function Hall3DCard({ sim, version, selected, onPick }: { sim: SimHandle['sim']; version: number; selected: string | null; onPick: (id: string) => void }) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const vis = useMemo(() => hallVis(sim), [sim, version]);
  const down = vis.racks.filter((r) => r.status === 'down' || r.status === 'hot').length;
  const throttled = vis.racks.filter((r) => r.status === 'throttled').length;
  const summary = down ? `${down} rack${down > 1 ? 's' : ''} down` : throttled ? `${throttled} GPU racks throttling` : 'all 36 racks running';
  return (
    <section className="card hall3d-card" aria-labelledby="hall3d-h">
      <h2 id="hall3d-h" className="h-card hall-title">
        3D data hall <span className={`chip${down ? ' chip-alarm' : ''}`}>live · {summary}</span>
      </h2>
      <Hall3D mode="live" vis={vis} selected={selected} onPick={onPick} label={`3D view of the data hall: ${summary}. Airflow at ${Math.round(vis.airflow * 100)} percent. The rack tiles below list every rack.`} />
      <div className="legend" aria-hidden="true">
        <span>
          <i style={{ background: 'var(--ok)' }} /> running
        </span>
        <span>
          <i style={{ background: 'var(--warn)' }} /> throttling
        </span>
        <span>
          <i style={{ background: 'var(--alarm)' }} /> down (blinking)
        </span>
        <span>
          <i style={{ background: 'var(--cyan)' }} /> cold air (turns orange as the hall heats)
        </span>
        <span>Pulses on the busway = power flowing</span>
      </div>
    </section>
  );
}

function Plant3DCard({ sim, version, view, selected, failureMode, onActivate, alarms }: { sim: SimHandle['sim']; version: number; view: SimView; selected: string | null; failureMode: boolean; onActivate: (id: string) => void; alarms: AlarmMap }) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const model = useMemo(() => plantModel(sim, view, alarms), [sim, version, view, alarms]);
  const inAlarm = model.nodes.filter((n) => n.alarm).length;
  const failed = model.nodes.filter((n) => n.state === 'failed').length;
  const locked = model.nodes.filter((n) => n.state === 'maint').length;
  const live = model.links.filter((l) => l.live).length;
  const summary = `${view === 'electrical' ? 'Electrical' : 'Mechanical'} plant in 3D: ${model.nodes.length} components, ${failed} failed, ${locked} locked out, ${live} of ${model.links.length} ${view === 'electrical' ? 'feeds carrying power' : 'pipes flowing'}.${inAlarm ? ` ${inAlarm} in alarm.` : ''}`;
  return (
    <section className={`card plant3d-card${failureMode ? ' failure' : ''}`} aria-label={`3D ${view} plant`}>
      <div className="plant3d-top">
        <span className={`chip ${failureMode ? 'chip-alarm' : 'chip-info'}`}>{failureMode ? 'Failure mode: tap equipment to fail or restore it' : 'Explore: tap equipment to learn about it'}</span>
        <label className="field plant3d-jump">
          <span>Jump to component</span>
          <select
            value={selected && model.nodes.some((n) => n.id === selected) ? selected : ''}
            onChange={(e) => e.target.value && onActivate(e.target.value)}
          >
            <option value="">Choose…</option>
            {model.nodes.map((n) => (
              <option key={n.id} value={n.id}>
                {n.tag} · {n.sub || n.state}
              </option>
            ))}
          </select>
        </label>
      </div>
      <Plant3DView model={model} selected={selected} failureMode={failureMode} onActivate={onActivate} label={summary} />
      <div className="legend" aria-hidden="true">
        {view === 'electrical' ? (
          <>
            <span>
              <i style={{ background: 'var(--side-a)' }} /> A side
            </span>
            <span>
              <i style={{ background: 'var(--side-b)' }} /> B side
            </span>
            <span>
              <i style={{ background: 'var(--dead)' }} /> dead
            </span>
            <span>Moving lights = power flowing · breaker lever up = closed</span>
          </>
        ) : (
          <>
            <span>
              <i style={{ background: 'var(--cyan)' }} /> chilled supply
            </span>
            <span>
              <i style={{ background: 'var(--blue-glow)' }} /> chilled return
            </span>
            <span>
              <i style={{ background: 'var(--ok)' }} /> condenser to chiller
            </span>
            <span>
              <i style={{ background: 'var(--warn)' }} /> condenser to tower
            </span>
          </>
        )}
        <span>
          <i style={{ background: 'var(--alarm)' }} /> failed (blinking)
        </span>
        <span>
          <i style={{ background: 'var(--warn)' }} /> locked out 🔒
        </span>
        <span>Beacon on top = alarm (red high/critical, amber medium, blue low; blinks until acknowledged)</span>
      </div>
    </section>
  );
}
