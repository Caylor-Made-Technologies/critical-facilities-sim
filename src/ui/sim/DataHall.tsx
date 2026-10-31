/** Data hall floor: one tile per rack, showing which cords are live. */
import { ROWS, type Simulation } from '../../sim';
import { fmtTemp, tempColor } from '../format';
import type { Units } from '../prefs';

interface Props {
  sim: Simulation;
  selected: string | null;
  onActivate: (id: string) => void;
  units: Units;
}

const pad = (n: number) => String(n).padStart(2, '0');

export function DataHall({ sim, selected, onActivate, units }: Props) {
  const th = sim.thermal.readout;
  const sol = sim.solution;
  const g = sim.graph;

  const cordLive = (rackId: string, port: string) => {
    const edge = g.inEdges(rackId, 'power').find((e) => e.port === port);
    return !!edge && sol.energized.has(edge.from) && (sol.feeders.get(rackId) ?? []).includes(edge.from);
  };

  return (
    <section className="card hall" aria-labelledby="hall-h">
      <h2 id="hall-h" className="h-card hall-title">
        Data hall: 36 racks, 2,100 kW
        <span className="chip" style={{ borderColor: tempColor(th.hallInletC), color: 'var(--text-heading)' }}>
          inlet {fmtTemp(th.hallInletC, units, 1)}
        </span>
      </h2>
      <div className="hall-rows">
        {ROWS.map((row) => (
          <div className="hall-row" key={row.row}>
            <div className="hall-row-label">
              Row {row.row}
              <br />
              {row.kind === 'gpu' ? 'GPU · liquid' : 'General'}
            </div>
            <div className="racks" role="list">
              {[...row.dual, ...row.single].map((num) => {
                const id = `R-${pad(num)}`;
                const r = g.get(id);
                const powered = sol.energized.has(id);
                const hot = !!r.state.thermalTrip;
                const up = powered && !hot;
                const rowState = r.highDensity ? th.gpuRows[Math.ceil(num / 4) - 1] : undefined;
                const throttled = !!rowState?.throttled && up;
                const single = row.single.includes(num);
                const a = cordLive(id, 'A');
                const b = !single && cordLive(id, 'B');
                const label = `${r.tag}, ${r.name}, ${r.state.demandKw} kilowatts. ${!powered ? 'NO POWER' : hot ? 'THERMAL SHUTDOWN' : throttled ? 'Throttling (too hot)' : 'Running'}. ${single ? 'Single-corded' : `Cord A ${a ? 'live' : 'dead'}, cord B ${b ? 'live' : 'dead'}`}.`;
                return (
                  <div role="listitem" key={id}>
                    <button
                      type="button"
                      className={`rack${r.highDensity ? ' gpu' : ''}${up ? '' : ' down'}${hot && powered ? ' hot' : ''}${throttled ? ' throttled' : ''}${selected === id ? ' selected' : ''}`}
                      aria-label={label}
                      aria-pressed={selected === id}
                      onClick={() => onActivate(id)}
                    >
                      <span>{num}</span>
                      <span className="cords" aria-hidden="true">
                        <span className="cord" style={a ? { background: 'var(--side-a)' } : undefined} />
                        {!single && <span className="cord" style={b ? { background: 'var(--side-b)' } : undefined} />}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="legend" aria-hidden="true">
        <span>
          <i style={{ background: 'var(--side-a)' }} /> cord A live
        </span>
        <span>
          <i style={{ background: 'var(--side-b)' }} /> cord B live
        </span>
        <span>
          <i style={{ background: 'var(--dead)' }} /> cord dead
        </span>
        <span>
          <i style={{ background: 'var(--alarm)' }} /> rack down (power or heat)
        </span>
        <span>
          <i style={{ background: 'var(--warn)' }} /> GPUs throttling
        </span>
      </div>
    </section>
  );
}
