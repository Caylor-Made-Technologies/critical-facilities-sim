import type { Component, Edge, EdgeKind } from './types';

/**
 * A directed graph of plant components.
 * Pure data plus lookups — no simulation logic lives here.
 */
export class PlantGraph {
  readonly nodes = new Map<string, Component>();
  readonly edges: Edge[] = [];
  private inbound = new Map<string, Edge[]>();
  private outbound = new Map<string, Edge[]>();

  add(component: Component): Component {
    if (this.nodes.has(component.id)) {
      throw new Error(`Duplicate component id: ${component.id}`);
    }
    this.nodes.set(component.id, component);
    this.inbound.set(component.id, []);
    this.outbound.set(component.id, []);
    return component;
  }

  connect(from: string, to: string, kind: EdgeKind = 'power', port?: string): Edge {
    if (!this.nodes.has(from)) throw new Error(`Unknown component: ${from}`);
    if (!this.nodes.has(to)) throw new Error(`Unknown component: ${to}`);
    const edge: Edge = { id: `${from}->${to}${port ? `:${port}` : ''}`, from, to, kind, port };
    this.edges.push(edge);
    this.inbound.get(to)!.push(edge);
    this.outbound.get(from)!.push(edge);
    return edge;
  }

  get(id: string): Component {
    const node = this.nodes.get(id);
    if (!node) throw new Error(`Unknown component: ${id}`);
    return node;
  }

  /** Edges feeding into a node, optionally filtered by kind. */
  inEdges(id: string, kind?: EdgeKind): Edge[] {
    const list = this.inbound.get(id) ?? [];
    return kind ? list.filter((e) => e.kind === kind) : list;
  }

  /** Edges leaving a node, optionally filtered by kind. */
  outEdges(id: string, kind?: EdgeKind): Edge[] {
    const list = this.outbound.get(id) ?? [];
    return kind ? list.filter((e) => e.kind === kind) : list;
  }

  upstream(id: string, kind?: EdgeKind): Component[] {
    return this.inEdges(id, kind).map((e) => this.get(e.from));
  }

  downstream(id: string, kind?: EdgeKind): Component[] {
    return this.outEdges(id, kind).map((e) => this.get(e.to));
  }

  byKind(...kinds: Component['kind'][]): Component[] {
    return [...this.nodes.values()].filter((n) => kinds.includes(n.kind));
  }

  /** Deep copy so a scenario can be reset without rebuilding. */
  clone(): PlantGraph {
    const copy = new PlantGraph();
    for (const n of this.nodes.values()) {
      copy.add({ ...n, state: { ...n.state }, explainer: { ...n.explainer } });
    }
    for (const e of this.edges) copy.connect(e.from, e.to, e.kind, e.port);
    return copy;
  }
}
