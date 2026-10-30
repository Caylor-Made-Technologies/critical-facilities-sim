/**
 * React binding for the simulation engine. The engine is mutable and lives
 * in a ref; a version counter tells React when to re-render.
 */
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { buildPlant, Simulation, type Topology } from '../sim';

/** Real-time tick interval (ms). Each tick advances `speed × tick` sim seconds. */
const TICK_MS = 250;

export function useSimulation(initial: Topology = '2N') {
  const [topology, setTopologyState] = useState<Topology>(initial);
  const simRef = useRef<Simulation>(new Simulation(buildPlant(initial)));
  const [version, bump] = useReducer((x: number) => x + 1, 0);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      simRef.current.advance((TICK_MS / 1000) * speed);
      bump();
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [running, speed]);

  /** Rebuild the plant from scratch, optionally in a new topology. */
  const reset = useCallback((t?: Topology) => {
    const next = t ?? simRef.current.meta.topology;
    simRef.current = new Simulation(buildPlant(next));
    setTopologyState(next);
    bump();
  }, []);

  /** Swap in a prepared simulation (used by the guided walkthroughs). */
  const load = useCallback((next: Simulation) => {
    simRef.current = next;
    setTopologyState(next.meta.topology);
    setRunning(false);
    bump();
  }, []);

  /** Run an operator action against the engine and re-render. */
  const act = useCallback(<R,>(fn: (sim: Simulation) => R): R => {
    const r = fn(simRef.current);
    bump();
    return r;
  }, []);

  return {
    sim: simRef.current,
    version,
    topology,
    running,
    setRunning,
    speed,
    setSpeed,
    reset,
    load,
    act,
  };
}

export type SimHandle = ReturnType<typeof useSimulation>;
