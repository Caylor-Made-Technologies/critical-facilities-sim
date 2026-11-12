/** Phase 9d: live rounds — stations read the live plant; each hidden problem shows on its stations. */
import { describe, expect, it } from 'vitest';
import { outOfRange, planRound, ROUND_ISSUES, ROUND_WARMUP_S, scoreRound, STATIONS, toTick } from '../../content/liveRounds';
import { EngineV2 } from '../v2/engine';

const plant = (actions: { a: string }[] = []) => {
  const e = new EngineV2('2N');
  e.applyScenario([...actions, { a: 'skip', s: ROUND_WARMUP_S }].map((action) => ({ at: 0, action: action as never })));
  return e;
};

describe('live rounds', () => {
  it('every station points at real equipment and has a sane scale', () => {
    const e = new EngineV2('2N');
    for (const s of STATIONS) {
      expect(e.sim.graph.nodes.has(s.at), s.at).toBe(true);
      expect(s.normal[0]).toBeGreaterThanOrEqual(s.min);
      expect(s.normal[1]).toBeLessThanOrEqual(s.max);
    }
  });
  it('a healthy plant reads in range at every station', () => {
    const e = plant();
    for (const s of STATIONS) expect(outOfRange(s.read(e), s), `${s.id} = ${s.read(e)}`).toBe(false);
  });
  for (const issue of ROUND_ISSUES)
    it(`${issue.title}: shows out of range at ${issue.shows.join(', ')} after the warm-up, no racks down`, { timeout: 60_000 }, () => {
      const e = plant(issue.actions);
      for (const id of issue.shows) {
        const s = STATIONS.find((x) => x.id === id)!;
        expect(outOfRange(s.read(e), s), `${id} = ${s.read(e)}`).toBe(true);
      }
      expect(e.sim.droppedRacks()).toEqual([]);
    });
  it('plans are seeded: same seed, same issues; one or two different issues', () => {
    expect(planRound(9)).toEqual(planRound(9));
    for (let seed = 1; seed < 40; seed++) {
      const p = planRound(seed);
      expect(p.length).toBeGreaterThanOrEqual(1);
      expect(p.length).toBeLessThanOrEqual(2);
      expect(new Set(p.map((x) => x.id)).size).toBe(p.length);
    }
  });
  it('score (hand-worked): all right = 100; values right, flags all wrong = 60; nothing written, flags right = 40', () => {
    const truth = STATIONS.map((s) => (s.normal[0] + s.normal[1]) / 2);
    truth[0] = STATIONS[0]!.normal[1] + 5; // one out of range
    const right = STATIONS.map((s, i) => ({ value: toTick(truth[i]!, s), flagged: outOfRange(truth[i]!, s) }));
    expect(scoreRound(STATIONS, truth, right).score).toBe(100);
    expect(scoreRound(STATIONS, truth, right.map((x) => ({ ...x, flagged: !x.flagged }))).score).toBe(60);
    expect(scoreRound(STATIONS, truth, right.map((x) => ({ ...x, value: null }))).score).toBe(40);
  });
});
