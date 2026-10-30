/** Details card for the selected component: live readings, explainer and actions. */
import { useState } from 'react';
import { loadFraction, type ActionResult, type Component, type Lock, type Simulation } from '../../sim';
import { Icon } from '../icons';

interface Props {
  sim: Simulation;
  id: string;
  act: <R>(fn: (s: Simulation) => R) => R;
  onClose: () => void;
  onOpenGuide: (kind: Component['kind']) => void;
}

const kw = (v: number) => `${Math.round(v).toLocaleString('en-US')} kW`;
const fmtS = (s: number) => (!isFinite(s) ? '—' : s >= 3600 ? `${(s / 3600).toFixed(1)} h` : s >= 60 ? `${Math.floor(s / 60)} min ${Math.round(s % 60)} s` : `${Math.round(s)} s`);

function statusChip(n: Component, energized: boolean) {
  if (n.status === 'failed') return <span className="chip chip-alarm">Failed</span>;
  if (n.status === 'maintenance') return <span className="chip chip-warn">Maintenance</span>;
  if (n.status === 'standby') return <span className="chip chip-info">Standby</span>;
  if (n.domain === 'electrical' && !energized) return <span className="chip chip-alarm">De-energized</span>;
  return <span className="chip chip-ok">Online</span>;
}

export function ComponentCard({ sim, id, act, onClose, onOpenGuide }: Props) {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const n = sim.graph.get(id);
  const sol = sim.solution;
  const energized = sol.energized.has(id);
  const load = sol.loadKw.get(id) ?? 0;
  const frac = loadFraction(sim.graph, sol, id);

  const run = (fn: (s: Simulation) => ActionResult) => {
    const r = act(fn);
    setMsg(r.ok ? { ok: true, text: r.message ?? 'Done.' } : { ok: false, text: r.reason });
  };

  const rows: [string, string][] = [];
  if (n.ratedKw && n.domain === 'electrical') {
    rows.push(['Load', `${kw(load)} of ${kw(n.ratedKw)}`]);
  }
  if (n.kind === 'rack' || n.kind === 'cdu' || (n.domain === 'mechanical' && n.state.demandKw !== undefined)) {
    rows.push(['Demand', kw(n.state.demandKw ?? 0)]);
  }
  switch (n.kind) {
    case 'ups': {
      const mode = sol.upsMode.get(id) ?? 'off';
      rows.push(['Mode', mode === 'normal' ? 'Normal (inverter)' : mode === 'battery' ? 'ON BATTERY' : mode === 'static-bypass' ? 'Static bypass' : 'Off']);
      rows.push(['Battery', `${Math.round((n.state.soc ?? 0) * 100)}%`]);
      rows.push(['Runtime at this load', fmtS(sim.upsRuntimeS(id))]);
      break;
    }
    case 'generator':
      rows.push(['Engine', n.state.genState ?? 'off']);
      rows.push(['Day tank', `${Math.round(n.state.fuelL ?? 0)} L`]);
      break;
    case 'bess':
      rows.push(['State of charge', `${Math.round((n.state.soc ?? 0) * 100)}%`]);
      rows.push(['Discharge', kw(sol.bessDischargeKw.get(id) ?? 0)]);
      break;
    case 'ats':
    case 'sts':
      rows.push(['Selected source', String(n.kind === 'sts' ? (sol.feeders.get(id)?.[0] ?? 'none') : n.state.selected)]);
      break;
    case 'breaker':
      rows.push(['Position', n.state.closed ? 'Closed' : 'Open']);
      break;
    case 'rack': {
      const feeds = sol.feeders.get(id) ?? [];
      rows.push(['Fed from', feeds.length ? feeds.join(' + ') : 'NOTHING']);
      rows.push(['Type', n.highDensity ? 'GPU, liquid cooled' : 'Air cooled']);
      break;
    }
  }

  // Kirk-key locks on this breaker, or the key release unit on a UPS module's system.
  const locks: Lock[] = n.kind === 'breaker' ? sim.interlocks.locksOn(id) : [];
  if (n.kind === 'ups') {
    const sys = sim.graph.upstream(id).find((u) => u.id.startsWith('UIB-'))?.id.slice(4);
    if (sys) {
      try {
        locks.push(sim.interlocks.lock(`L-SKRU-${sys}`));
      } catch {
        /* no SKRU on this system */
      }
    }
  }
  const carried = sim.interlocks.carried();
  const upsSystem = n.kind === 'ups' ? sim.graph.upstream(id).find((u) => u.id.startsWith('UIB-'))?.id.slice(4) : undefined;

  return (
    <section className="card comp-card" aria-labelledby="comp-h">
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div className="eyebrow">{n.domain}</div>
          <h2 id="comp-h" className="h-card comp-title">
            {n.tag} {statusChip(n, energized)}
          </h2>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{n.name}</div>
        </div>
        <button className="btn btn-icon btn-ghost" type="button" onClick={onClose} aria-label="Close details">
          <Icon name="close" />
        </button>
      </div>

      {n.ratedKw > 0 && n.domain === 'electrical' && n.kind !== 'rack' && (
        <div className="meter" role="img" aria-label={`Load ${Math.round(frac * 100)} percent`}>
          <span style={{ width: `${Math.min(100, frac * 100)}%`, background: frac > 1 ? 'var(--alarm)' : frac > 0.8 ? 'var(--warn)' : 'var(--ok)' }} />
        </div>
      )}
      <dl>
        {rows.map(([k, v]) => (
          <div key={k} style={{ display: 'contents' }}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>

      {locks.length > 0 && (
        <div className="callout">
          <strong>Kirk-key interlock</strong>
          {locks.map((l) => {
            const key = sim.interlocks.keyIn(l.id);
            const fits = carried.find((k) => k.code === l.code);
            return (
              <div key={l.id} style={{ marginTop: 6, fontSize: '0.88rem' }}>
                {l.breakerId ? 'Lock' : 'Key release unit'} <code>{l.id}</code>: {key ? <>key <code>{key.code}</code> is in the lock</> : 'empty'}
                {l.permissive && <> · releases only when {l.permissive.label}</>}
                <div className="card-actions" style={{ marginTop: 6 }}>
                  {key && (
                    <button className="btn" type="button" onClick={() => run((s) => s.removeKey(l.id))}>
                      Remove key
                    </button>
                  )}
                  {!key && fits && (
                    <button className="btn" type="button" onClick={() => run((s) => s.insertKey(fits.id, l.id))}>
                      Insert key {fits.code}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {carried.length > 0 && (
            <div style={{ marginTop: 6, fontSize: '0.84rem' }}>
              Keys in your hand: {carried.map((k) => k.code).join(', ')}
            </div>
          )}
        </div>
      )}

      <div className="card-actions">
        {n.kind === 'breaker' &&
          (n.state.closed ? (
            <button className="btn" type="button" onClick={() => run((s) => s.openBreaker(id))}>
              Open breaker
            </button>
          ) : (
            <button className="btn" type="button" onClick={() => run((s) => s.closeBreaker(id))}>
              Close breaker
            </button>
          ))}
        {upsSystem &&
          (n.state.upsMode === 'static-bypass' ? (
            <button className="btn" type="button" onClick={() => run((s) => s.setUpsSystemMode(upsSystem, 'auto'))}>
              UPS {upsSystem} back to inverter
            </button>
          ) : (
            <button className="btn" type="button" onClick={() => run((s) => s.setUpsSystemMode(upsSystem, 'static-bypass'))}>
              UPS {upsSystem} to static bypass
            </button>
          ))}
        {n.status === 'failed' || n.status === 'maintenance' ? (
          <button className="btn btn-primary" type="button" onClick={() => run((s) => s.restore(id))}>
            Restore
          </button>
        ) : (
          <button className="btn btn-danger" type="button" onClick={() => run((s) => s.fail(id))}>
            Fail it
          </button>
        )}
        <button className="btn" type="button" onClick={() => onOpenGuide(n.kind)}>
          <Icon name="wrench" /> Equipment guide
        </button>
      </div>
      {msg && (
        <div className={`callout ${msg.ok ? '' : 'callout-warn'}`} role="status">
          {msg.ok ? <Icon name="check" /> : <Icon name="warning" />} {msg.text}
        </div>
      )}

      <div className="explain">
        <h3>What it does</h3>
        <p>{n.explainer.what}</p>
        <h3>What fails</h3>
        <p>{n.explainer.fails}</p>
        <h3>What operators watch</h3>
        <p>{n.explainer.watch}</p>
      </div>
    </section>
  );
}
