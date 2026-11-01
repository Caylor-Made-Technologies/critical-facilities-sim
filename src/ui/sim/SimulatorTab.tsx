/** Simulator tab: Explore and Failure modes over the electrical one-line and the mechanical plant. */
import type { ReactNode } from 'react';
import { describeCapacity, formatT, PHYSICS, TOPOLOGIES, WEATHER, type Component, type Topology, type WeatherId } from '../../sim';
import { fmtTemp } from '../format';
import { Icon, type IconName } from '../icons';
import { PageHead } from '../common';
import { useState } from 'react';
import type { Units } from '../prefs';
import type { SimHandle } from '../useSimulation';
import { BmsPanel } from './BmsPanel';
import { ComponentCard } from './ComponentCard';
import { DataHall } from './DataHall';
import { EventLog } from './EventLog';
import { MechPlant } from './MechPlant';
import { OneLine } from './OneLine';
import { plantIssues, StatusBanner } from './StatusBanner';

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
function Kpi({ icon, label, value, tone }: { icon: IconName; label: string; value: string; tone: 'ok' | 'warn' | 'bad' | 'live' }) {
  return (
    <div className={`kpi tone-${tone}`} role="listitem">
      <span className="kpi-icon">
        <Icon name={icon} />
      </span>
      <div>
        <div className="kpi-label">{label}</div>
        <div className="kpi-value" key={value}>
          {value}
        </div>
      </div>
    </div>
  );
}

export function SimulatorTab({ h, mode, setMode, selected, setSelected, onOpenGuide, coach, focused, view, setView, units, setUnits }: Props) {
  const { sim, version } = h;
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
      h.act((s) => (n.status === 'failed' ? s.restore(id) : s.fail(id)));
      if (!h.running) h.setRunning(true);
    }
    setSelected(id);
  };

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
            <button className="btn" type="button" onClick={() => h.act((s) => s.advance(10))} aria-label="Skip ahead 10 seconds">
              <Icon name="skip" /> 10s
            </button>
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
              <select value={sim.thermal.state.weather} onChange={(e) => h.act((s) => s.setWeather(e.target.value as WeatherId))}>
                {(Object.keys(WEATHER) as WeatherId[]).map((w) => (
                  <option key={w} value={w}>
                    {WEATHER[w].label}
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
        <Kpi icon="bolt" label="IT powered" value={`${itPct.toFixed(itPct < 100 ? 1 : 0)}%`} tone={tone(itPct < 100)} />
        <Kpi icon="warning" label="Racks down" value={String(racksDown)} tone={tone(racksDown > 0)} />
        <Kpi icon="info" label="UPS battery / bypass" value={`${onBattery} / ${onBypass}`} tone={tone(onBattery > 0, onBypass > 0)} />
        <Kpi icon="reset" label="Generators" value={gensRunning ? `${gensRunning} running` : 'standby'} tone={tone(false, gensRunning > 0)} />
        <Kpi icon="target" label="Rack inlet" value={fmtTemp(th.hallInletC, units, 1)} tone={tone(th.hallInletC > PHYSICS.ashraeRecommendedC[1])} />
        <Kpi icon="change" label="CHW supply" value={fmtTemp(th.chwSupplyC, units, 1)} tone={tone(false, th.chwSupplyC > PHYSICS.chwSupplyC + 1)} />
        <Kpi icon="scale" label="PUE" value={isFinite(pue) ? pue.toFixed(2) : '—'} tone="ok" />
      </div>
      <span className="visually-hidden" aria-live="polite">
        {issues[0] && issues[0].level !== 'info' ? `Plant status: ${issues[0].text}` : ''}
      </span>

      <div className="sim-layout">
        <div>
          {view === 'mechanical' ? (
            <MechPlant sim={sim} version={version} selected={selected} failureMode={mode === 'failure'} units={units} onActivate={activate} />
          ) : (
            <OneLine sim={sim} version={version} selected={selected} failureMode={mode === 'failure'} onActivate={activate} />
          )}
{view === 'electrical' && (
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
          <DataHall sim={sim} selected={selected} onActivate={activate} units={units} />
        </div>
        <aside className="side-panel" aria-label="Details">
          {selected && (
            <ComponentCard key={selected} sim={sim} id={selected} act={h.act} onClose={() => setSelected(null)} onOpenGuide={onOpenGuide} units={units} />
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
