import { CHANGE, CHANGE_QUIZ } from '../../content/change';
import { EQUIPMENT, guideForKind } from '../../content/equipment';
import { LESSONS, simForStep } from '../../content/lessons';
import { SAFETY } from '../../content/safety';
import { computeLayout } from '../../ui/sim/layout';
import { buildPlant, TOPOLOGIES, type ComponentKind, type Topology } from '../index';
import { EXPLAINERS } from '../plant/explainers';

describe('equipment guide', () => {
  it('covers every component kind', () => {
    for (const kind of Object.keys(EXPLAINERS) as ComponentKind[]) {
      expect(guideForKind(kind), kind).toBeDefined();
    }
  });
  it('every guide has rounds, PM, troubleshooting and never-do items', () => {
    for (const g of EQUIPMENT) {
      expect(g.rounds.length, g.id).toBeGreaterThan(0);
      expect(g.pm.length, g.id).toBeGreaterThan(0);
      expect(g.troubleshooting.length, g.id).toBeGreaterThan(0);
      expect(g.neverDo.length, g.id).toBeGreaterThan(0);
    }
  });
});

describe('articles', () => {
  it('have unique ids', () => {
    for (const set of [SAFETY, CHANGE]) {
      const ids = set.map((a) => a.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
    expect(CHANGE_QUIZ.length).toBeGreaterThan(3);
  });
});

describe('walkthroughs', () => {
  it('every step replays and every focus target exists', () => {
    for (const l of LESSONS) {
      l.steps.forEach((s, i) => {
        const sim = simForStep(l, i);
        if (s.focus) expect(sim.graph.nodes.has(s.focus), `${l.id} step ${i + 1} focus ${s.focus}`).toBe(true);
      });
    }
  });

  it('every step has a plain-words explanation', () => {
    for (const l of LESSONS) for (const s of l.steps) expect(s.simpler.length).toBeGreaterThan(10);
  });

  it('utility outage lesson ends back on utility with nothing dropped', () => {
    const l = LESSONS.find((x) => x.id === 'utility-outage')!;
    const sim = simForStep(l, 4);
    expect(sim.graph.get('ATS-A').state.selected).toBe('normal');
    expect(sim.droppedRacks()).toEqual([]);
  });

  it('UPS bypass MOP lesson isolates the UPS without dropping a rack', () => {
    const l = LESSONS.find((x) => x.id === 'ups-bypass')!;
    for (let i = 0; i < l.steps.length; i++) expect(simForStep(l, i).droppedRacks(), `step ${i + 1}`).toEqual([]);
    expect(simForStep(l, 5).graph.get('UPS-A1').status).toBe('maintenance');
  });

  it('Kirk-key lesson blocks the illegal close and then completes the legal one', () => {
    const l = LESSONS.find((x) => x.id === 'kirk-mtm')!;
    expect(simForStep(l, 1).graph.get('TIE-AB').state.closed).toBe(false);
    expect(simForStep(l, 4).graph.get('TIE-AB').state.closed).toBe(true);
  });
});

describe('one-line layout', () => {
  it.each(Object.keys(TOPOLOGIES) as Topology[])('%s: no overlapping nodes within a stage', (t) => {
    const layout = computeLayout(buildPlant(t).graph);
    const rows = new Map<number, { x: number; w: number }[]>();
    for (const b of layout.nodes.values()) {
      if (!rows.has(b.y)) rows.set(b.y, []);
      rows.get(b.y)!.push({ x: b.x, w: b.w });
    }
    for (const list of rows.values()) {
      list.sort((a, b) => a.x - b.x);
      for (let i = 1; i < list.length; i++) {
        expect(list[i]!.x - list[i - 1]!.x).toBeGreaterThanOrEqual((list[i]!.w + list[i - 1]!.w) / 2);
      }
    }
  });
});
