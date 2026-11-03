/** Designs & PUE: every redundancy design built and broken side by side, plus where the power goes. */
import { useEffect, useState } from 'react';
import { compareDesigns, powerBreakdown, TOPOLOGIES, type DesignRow, type Simulation, type Topology } from '../../sim';
import { PageHead, SectionTabs } from '../common';
import { fmtKw } from '../format';
import { Icon } from '../icons';
import type { Units } from '../prefs';

type Section = 'compare' | 'tiers' | 'pue';
const SECTIONS: { id: Section; label: string }[] = [
  { id: 'compare', label: 'Compare designs' },
  { id: 'tiers', label: 'Tiers explained' },
  { id: 'pue', label: 'Where the power goes' },
];

const Yes = ({ ok, text }: { ok: boolean; text: string }) => (
  <span className={`yn ${ok ? 'yes' : 'no'}`}>
    <Icon name={ok ? 'check' : 'close'} /> {text}
  </span>
);

function Compare({ onTry }: { onTry: (t: Topology) => void }) {
  const [rows, setRows] = useState<DesignRow[] | null>(null);
  useEffect(() => {
    // Building and breaking seven plants takes a moment; let the page paint first.
    const id = window.setTimeout(() => setRows(compareDesigns()), 30);
    return () => window.clearTimeout(id);
  }, []);
  if (!rows) {
    return (
      <p className="waiting">
        <span className="wait-dot" aria-hidden="true" /> Building and breaking all seven designs…
      </p>
    );
  }
  return (
    <>
      <p className="lede">
        Every row below was measured, not looked up: the simulator built each plant, failed one UPS module, then failed each
        whole UPS system in turn, and counted the racks that went dark.
      </p>
      <div className="design-grid">
        {rows.map((r) => (
          <article key={r.topology} className={`card design-card${r.survivesSystem ? ' strong' : r.survivesModule ? '' : ' weak'}`}>
            <div className="design-top">
              <h2 className="h-card">{r.label}</h2>
              <span className="tier-chip" title="Closest tier idea for the power path. Educational, not a rating.">
                Tier {r.tierIdea}
              </span>
            </div>
            <p className="design-sum">{TOPOLOGIES[r.topology].summary}</p>
            <ul className="design-facts">
              <li>
                <Yes ok={r.survivesModule} text="Lose one UPS module" />
              </li>
              <li>
                <Yes ok={r.survivesSystem} text={r.survivesSystem ? 'Lose a whole UPS system' : `Lose the UPS system: ${r.worstSystemDrop} racks down`} />
              </li>
              <li>
                <Yes ok={r.survivesSystem} text="Maintain a UPS system with no outage" />
              </li>
            </ul>
            <dl className="design-nums">
              <div>
                <dt>UPS modules</dt>
                <dd>{r.upsModules}</dd>
              </div>
              <div>
                <dt>Generators</dt>
                <dd>{r.generators}</dd>
              </div>
              <div>
                <dt>UPS built ÷ IT load</dt>
                <dd>{r.upsRatio.toFixed(2)}×</dd>
              </div>
              <div>
                <dt>Busiest UPS normally</dt>
                <dd>{Math.round(r.peakUpsLoad * 100)}%</dd>
              </div>
            </dl>
            <div className="meter" aria-hidden="true">
              <span style={{ width: `${Math.min(100, (r.upsRatio / 3) * 100)}%` }} />
            </div>
            <button className="btn" type="button" onClick={() => onTry(r.topology)}>
              <Icon name="bolt" /> Try it in the simulator
            </button>
          </article>
        ))}
      </div>
      <div className="callout">
        <strong>The trade-off: </strong>
        more UPS built per kW of IT costs more and runs each UPS at lighter load, which is less efficient. Distributed and block
        designs get the same "lose a whole system" protection as 2N with less equipment, but they need careful load balancing
        and static transfer switches.
      </div>
    </>
  );
}

const TIERS = [
  {
    t: 'I',
    name: 'Basic capacity',
    what: 'One path, no spares. Any failure or any maintenance takes the load down.',
    like: 'N',
  },
  {
    t: 'II',
    name: 'Redundant components',
    what: 'Spare UPS modules, generators and chillers, but still one distribution path. A breaker or bus outage still drops the load.',
    like: 'N+1, N+2',
  },
  {
    t: 'III',
    name: 'Concurrently maintainable',
    what: 'Every component and path can be taken out for planned maintenance without dropping the load. A failure during that work can still cause an outage.',
    like: '2N, distributed and block designs (power path)',
  },
  {
    t: 'IV',
    name: 'Fault tolerant',
    what: 'Survives any single failure, at any time, with no outage. Needs independent, physically separated systems and continuous cooling, not just a second path on paper.',
    like: '2N and 2N+1 built with full separation',
  },
];

function Tiers() {
  return (
    <>
      <p className="lede">
        The four-level tier idea is the common shorthand for how much a site can survive. Formal tier ratings are issued
        by an outside body (for example, the Uptime Institute) after reviewing the whole site. This simulator only models the
        power path, so its "Tier" labels are the closest idea, not a rating.
      </p>
      <ol className="tier-ladder">
        {TIERS.map((x) => (
          <li key={x.t} className={`tier-step t-${x.t}`}>
            <div className="tier-num">{x.t}</div>
            <div>
              <h2 className="h-card">{x.name}</h2>
              <p>{x.what}</p>
              <p className="tier-like">
                <strong>In this simulator:</strong> {x.like}
              </p>
            </div>
          </li>
        ))}
      </ol>
      <div className="callout callout-warn">
        <strong>Why III vs IV is hard: </strong>
        both need two paths. The difference is whether a fire, a leak, or a technician's mistake in one room can reach the
        other path. Separation, compartments, and discipline (MOPs, keys, LOTOTO) are what turn a second path into fault
        tolerance.
      </div>
    </>
  );
}

function Pue({ sim, units }: { sim: Simulation; units: Units }) {
  const b = powerBreakdown(sim);
  const pue = b.itKw > 0 ? b.totalKw / b.itKw : NaN;
  void units;
  const parts = [
    { key: 'it', label: 'IT (servers, GPUs)', kw: b.itKw },
    { key: 'cool', label: 'Cooling', kw: b.coolingKw },
    { key: 'loss', label: 'UPS and transformer losses', kw: b.lossesKw },
  ];
  return (
    <>
      <p className="lede">
        PUE (power usage effectiveness) is total facility power divided by IT power. 1.0 would mean every watt reaches a
        server. These numbers come live from the plant in the Simulator, so change the weather or fail a chiller there and
        come back.
      </p>
      <div className="card pue-card">
        <div className="pue-big">
          <span className="pue-num">{isFinite(pue) ? pue.toFixed(2) : '—'}</span>
          <span className="pue-cap">PUE right now · {sim.thermal.readout.weatherLabel}</span>
        </div>
        <div className="stack" role="img" aria-label={parts.map((p) => `${p.label} ${fmtKw(p.kw)}`).join(', ')}>
          {parts.map((p) => (
            <span key={p.key} className={`seg-${p.key}`} style={{ flexGrow: Math.max(0.001, p.kw) }} />
          ))}
        </div>
        <ul className="stack-legend">
          {parts.map((p) => (
            <li key={p.key}>
              <i className={`seg-${p.key}`} aria-hidden="true" /> {p.label}
              <strong>{fmtKw(p.kw)}</strong>
              <span>{b.totalKw ? Math.round((p.kw / b.totalKw) * 100) : 0}%</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="card">
        <h2 className="h-card">Cooling, piece by piece</h2>
        <ul className="bars">
          {b.cooling.map((c) => (
            <li key={c.group}>
              <span className="bar-label">{c.group}</span>
              <span className="bar-track" aria-hidden="true">
                <span style={{ width: `${b.coolingKw ? (c.kw / b.coolingKw) * 100 : 0}%` }} />
              </span>
              <strong>{fmtKw(c.kw)}</strong>
            </li>
          ))}
        </ul>
      </div>
      <div className="callout">
        <strong>How sites lower PUE: </strong>
        free cooling when it is cold outside, warmer chilled water within the ASHRAE range, liquid cooling for GPUs, and UPS
        systems sized so they don't run nearly empty. None of it is worth a single dropped rack, so every change still goes
        through change management.
      </div>
    </>
  );
}

interface Props {
  sim: Simulation;
  version: number;
  units: Units;
  onTry: (t: Topology) => void;
}

export function DesignsTab({ sim, units, onTry }: Props) {
  const [section, setSection] = useState<Section>('compare');
  return (
    <div className="tab-panel">
      <PageHead eyebrow="Designs & PUE" title="How much can it survive?">
        N, N+1, 2N, distributed, block. See what each design survives, what it costs in equipment, and where every kilowatt
        goes.
      </PageHead>
      <SectionTabs label="Design sections" sections={SECTIONS} value={section} onChange={setSection} />
      <div key={section} className="section-body">
        {section === 'compare' && <Compare onTry={onTry} />}
        {section === 'tiers' && <Tiers />}
        {section === 'pue' && <Pue sim={sim} units={units} />}
      </div>
    </div>
  );
}
