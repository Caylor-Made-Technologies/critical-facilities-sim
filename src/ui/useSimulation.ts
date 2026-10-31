/**
 * React binding for the simulation engine. The engine is mutable and lives
 * in a ref; a version counter tells React when to re-render.
 */
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { buildPlant, Simulation, type Topology } from '../sim';

/** Target time between screen updates (ms). The engine advances by real elapsed time, so the clock never drifts. */
const FRAME_MS = 120;
/** Longest real gap counted in one step (ms), so a backgrounded tab doesn't jump minutes ahead. */
const MAX_GAP_MS = 500;

export function useSimulation(initial: Topology = '2N') {
  const [topology, setTopologyState] = useState<Topology>(initial);
  const simRef = useRef<Simulation>(new Simulation(buildPlant(initial)));
  const [version, bump] = useReducer((x: number) => x + 1, 0);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    if (!running) return;
    // Animation-frame loop: smooth, pauses itself when the tab is hidden, and
    // re-renders only every FRAME_MS so phones stay cool.
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const loop = (now: number) => {
      const gap = Math.min(MAX_GAP_MS, now - last);
      last = now;
      acc += gap;
      if (acc >= FRAME_MS) {
        simRef.current.advance((acc / 1000) * speed);
        acc = 0;
        bump();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
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
