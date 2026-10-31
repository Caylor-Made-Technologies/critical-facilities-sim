/**
 * Plant status at a glance: one color-coded line that says whether the
 * plant is healthy, and if not, the most important things wrong right now.
 */
import { loadFraction, PHYSICS, TOPOLOGIES, type Simulation } from '../../sim';
import { fmtTemp } from '../format';
import type { Units } from '../prefs';

type Level = 'normal' | 'info' | 'warning' | 'alarm' | 'critical';
interface Issue {
  level: Level;
  text: string;
}

const RANK: Record<Level, number> = { normal: 0, info: 1, warning: 2, alarm: 3, critical: 4 };
const TITLE: Record<Level, string> = {
  normal: 'All systems normal',
  info: 'Running on backup',
  warning: 'Redundancy reduced',
  alarm: 'Alarm: act now',
  critical: 'CRITICAL: load at risk',
};

export function plantIssues(sim: Simulation, units: Units): Issue[] {
  const out: Issue[] = [];
  const sol = sim.solution;
  const th = sim.thermal.readout;
  const down = sim.itDownRacks().length;
  if (down) out.push({ level: 'critical', text: `${down} rack${down > 1 ? 's' : ''} down` });

  const battery = sim.graph.byKind('ups').filter((u) => sol.upsMode.get(u.id) === 'battery');
  if (battery.length) {
    const mins = Math.min(...battery.map((u) => sim.upsRuntimeS(u.id))) / 60;
    out.push({ level: 'alarm', text: `${battery.length} UPS on battery · ${mins < 1 ? '<1' : Math.floor(mins)} min left` });
  }
  const bypass = [...sol.upsMode.values()].filter((m) => m === 'static-bypass').length;
  if (bypass) out.push({ level: 'warning', text: `${bypass} UPS on static bypass` });

  const over = [...sim.graph.nodes.values()].filter((n) => n.ratedKw && n.kind !== 'rack' && loadFraction(sim.graph, sol, n.id) > 1);
  if (over.length) out.push({ level: 'alarm', text: `Overload: ${over.slice(0, 2).map((n) => n.tag).join(', ')}${over.length > 2 ? '…' : ''}` });

  if (th.hallInletC > PHYSICS.ashraeRecommendedC[1]) out.push({ level: 'alarm', text: `Rack inlet ${fmtTemp(th.hallInletC, units)}` });
  const gpuHot = th.gpuRows.filter((r) => r.throttled || r.tripped);
  if (gpuHot.length) out.push({ level: 'alarm', text: `GPU row${gpuHot.length > 1 ? 's' : ''} ${gpuHot.map((r) => r.row).join(', ')} overheating` });
  if (th.tesDischargeKwt > 0) out.push({ level: 'warning', text: `Storage tank discharging · ${Math.round(th.tesMinutes)} min left` });
  if (th.hallHumidity !== 'ok') out.push({ level: 'warning', text: `Humidity ${th.hallHumidity.replace('-', ' ')}` });

  const failed = [...sim.graph.nodes.values()].filter((n) => n.status === 'failed');
  if (failed.length) out.push({ level: 'warning', text: `${failed.length} failed: ${failed.slice(0, 3).map((n) => n.tag).join(', ')}${failed.length > 3 ? '…' : ''}` });
  const maint = [...sim.graph.nodes.values()].filter((n) => n.status === 'maintenance').length;
  if (maint) out.push({ level: 'warning', text: `${maint} in maintenance` });

  const gens = sim.graph.byKind('generator').filter((g) => g.state.genState === 'running').length;
  if (gens) out.push({ level: 'info', text: `${gens} generator${gens > 1 ? 's' : ''} carrying load` });
  const bess = sol.bessDischargeKw.size;
  if (bess) out.push({ level: 'info', text: 'Battery yard discharging' });

  return out.sort((a, b) => RANK[b.level] - RANK[a.level]);
}

export function StatusBanner({ sim, units }: { sim: Simulation; units: Units }) {
  const issues = plantIssues(sim, units);
  const level: Level = issues[0]?.level ?? 'normal';
  const pue = sim.pue();
  return (
    <section className={`status-banner lvl-${level}`} aria-label="Plant status">
      <span className="status-dot" aria-hidden="true" />
      <div className="status-main">
        <strong className="status-title">{TITLE[level]}</strong>
        <span className="status-meta">
          {TOPOLOGIES[sim.meta.topology].label} · {sim.thermal.readout.weatherLabel} · PUE {isFinite(pue) ? pue.toFixed(2) : '—'}
        </span>
      </div>
      {issues.length > 0 && (
        <ul className="status-issues">
          {issues.slice(0, 4).map((i) => (
            <li key={i.text} className={`issue lvl-${i.level}`}>
              {i.text}
            </li>
          ))}
          {issues.length > 4 && <li className="issue more">+{issues.length - 4} more</li>}
        </ul>
      )}
    </section>
  );
}
