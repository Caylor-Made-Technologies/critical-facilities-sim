/** Simulator tab: Explore and Failure modes over the electrical one-line. */
import type { ReactNode } from 'react';
import { describeCapacity, formatT, TOPOLOGIES, type Component, type Topology } from '../../sim';
import { Icon } from '../icons';
import type { SimHandle } from '../useSimulation';
import { ComponentCard } from './ComponentCard';
import { DataHall } from './DataHall';
import { EventLog } from './EventLog';
import { OneLine } from './OneLine';

interface Props {
  h: SimHandle;
  mode: 'explore' | 'failure';
  setMode: (m: 'explore' | 'failure') => void;
  selected: string | null;
  setSelected: (id: string | null) => void;
  onOpenGuide: (kind: Component['kind']) => void;
  coach?: ReactNode;
}

const SPEEDS = [1, 10, 60];

export function SimulatorTab({ h, mode, setMode, selected, setSelected, onOpenGuide, coach }: Props) {
  const { sim, version } = h;
  const sol = sim.solution;
  const racksDown = sim.droppedRacks().length;
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

  return (
    <div className="tab-panel">
      <div className="page-head">
        <div className="eyebrow">Simulator</div>
        <h1>Utility to chip, live</h1>
        <p>
          Follow power from two utility feeds through generators, UPS, and distribution to 36 racks. Tap anything to learn
          what it does. Switch to <strong>Failure mode</strong> to break things and watch the plant respond.
        </p>
      </div>

      {coach}

      <div className="sim-toolbar">
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
        <div className="field">
          <span>Mode</span>
          <div className="seg" role="group" aria-label="Mode">
            <button type="button" aria-pressed={mode === 'explore'} onClick={() => setMode('explore')}>
              Explore
            </button>
            <button type="button" className="danger" aria-pressed={mode === 'failure'} onClick={() => setMode('failure')}>
              Failure
            </button>
          </div>
        </div>
        <div className="field">
          <span>Time</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-primary" type="button" onClick={() => h.setRunning(!h.running)} aria-label={h.running ? 'Pause' : 'Run'}>
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
        <div className="spacer" />
        <button
          className="btn"
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
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: -4 }}>{TOPOLOGIES[h.topology].summary}</p>

      <div className="kpis" aria-live="off">
        <div className="kpi">
          <div className="kpi-label">Sim time</div>
          <div className="kpi-value">{formatT(sim.t)}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">IT powered</div>
          <div className={`kpi-value${itPct < 100 ? ' bad' : ''}`}>{itPct.toFixed(itPct < 100 ? 1 : 0)}%</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Racks down</div>
          <div className={`kpi-value${racksDown ? ' bad' : ''}`}>{racksDown}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">UPS on battery / bypass</div>
          <div className={`kpi-value${onBattery ? ' bad' : onBypass ? ' warn' : ''}`}>
            {onBattery} / {onBypass}
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Generators running</div>
          <div className={`kpi-value${gensRunning ? ' warn' : ''}`}>{gensRunning}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">PUE</div>
          <div className="kpi-value">{isFinite(pue) ? pue.toFixed(2) : '—'}</div>
        </div>
      </div>

      <div className="sim-layout">
        <div>
          <OneLine sim={sim} version={version} selected={selected} failureMode={mode === 'failure'} onActivate={activate} />
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
          <DataHall sim={sim} selected={selected} onActivate={activate} />
        </div>
        <aside className="side-panel" aria-label="Details">
          {selected ? (
            <ComponentCard key={selected} sim={sim} id={selected} act={h.act} onClose={() => setSelected(null)} onOpenGuide={onOpenGuide} />
          ) : (
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
          )}
          <EventLog sim={sim} />
        </aside>
      </div>
    </div>
  );
}
