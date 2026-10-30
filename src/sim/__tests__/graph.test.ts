import { PlantGraph } from '../graph';
import { buildPlant } from '../plant/builder';

describe('PlantGraph', () => {
  it('rejects duplicate ids and unknown endpoints', () => {
    const g = buildPlant('N').graph;
    const dup = { ...g.get('UPS-A1') };
    expect(() => g.add(dup)).toThrow(/Duplicate/);
    expect(() => g.connect('UPS-A1', 'NOPE')).toThrow(/Unknown/);
  });

  it('clones deeply', () => {
    const g = buildPlant('2N').graph;
    const c = g.clone();
    c.get('MB-A').state.closed = false;
    expect(g.get('MB-A').state.closed).toBe(true);
    expect(c.edges.length).toBe(g.edges.length);
    expect(c).toBeInstanceOf(PlantGraph);
  });

  it('uses only generic tags and gives every node an explainer', () => {
    const g = buildPlant('BLOCK').graph;
    for (const n of g.nodes.values()) {
      expect(n.tag).toMatch(/^[A-Z]+(-[A-Z0-9]+)+$/);
      expect(n.explainer.what.length).toBeGreaterThan(20);
    }
  });
});
