/** The short live status under each device (shared by the 2D one-line and the 3D plant). */
import { loadFraction, type Component, type Simulation } from '../../sim';

export function subLine(sim: Simulation, n: Component): string {
  const sol = sim.solution;
  if (n.status === 'failed') return 'FAILED';
  if (n.status === 'maintenance') return 'MAINT';
  switch (n.kind) {
    case 'breaker':
      return n.state.closed ? 'closed' : 'open';
    case 'generator':
      return n.state.genState === 'running' ? `${Math.round(loadFraction(sim.graph, sol, n.id) * 100)}%` : n.state.genState ?? 'off';
    case 'ats':
      return n.state.selected === 'emergency' ? 'on GEN' : 'on UTIL';
    case 'ups': {
      const m = sol.upsMode.get(n.id);
      return m === 'normal' ? `${Math.round(loadFraction(sim.graph, sol, n.id) * 100)}%` : m === 'static-bypass' ? 'BYPASS' : m === 'battery' ? `BATT ${Math.round((n.state.soc ?? 0) * 100)}%` : 'OFF';
    }
    case 'bess':
      return sol.bessDischargeKw.has(n.id) ? `discharging ${Math.round((n.state.soc ?? 0) * 100)}%` : `SOC ${Math.round((n.state.soc ?? 0) * 100)}%`;
    default:
      if (!sol.energized.has(n.id)) return 'de-energized';
      return n.ratedKw ? `${Math.round(loadFraction(sim.graph, sol, n.id) * 100)}%` : '';
  }
}
