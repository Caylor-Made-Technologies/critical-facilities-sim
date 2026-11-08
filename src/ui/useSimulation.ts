/**
 * React binding for the simulation engine. The engine is mutable and lives
 * in a ref; a version counter tells React when to re-render.
 */
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { buildPlant, Simulation, type ActionResult, type Topology } from '../sim';
import { applyToSim, type Action } from '../sim/actions';
import type { EngineV2 } from '../sim/v2/engine';

/**
 * Internal switch for engine v2 (Phase 4, strangler pattern): add ?engine=v2 to the URL.
 * v2 advances the same plant in fixed 1 s ticks, so results no longer depend on frame timing.
 */
export const ENGINE_V2 = typeof location !== 'undefined' && /[?&]engine=v2\b/.test(location.search);

/** Target time between screen updates (ms). The engine advances by real elapsed time, so the clock never drifts. */
const FRAME_MS = 120;
/** Longest real gap counted in one step (ms), so a backgrounded tab doesn't jump minutes ahead. */
const MAX_GAP_MS = 500;

export function useSimulation(initial: Topology = '2N') {
  const [topology, setTopologyState] = useState<Topology>(initial);
  const simRef = useRef<Simulation>(new Simulation(buildPlant(initial)));
  // v2 code loads only when the switch is on, so the default bundle doesn't grow.
  const engineRef = useRef<EngineV2 | null>(null);
  const wrapRef = useRef<((sim: Simulation) => EngineV2) | null>(null);
  useEffect(() => {
    if (!ENGINE_V2) return;
    void import('../sim/v2/engine').then((m) => {
      wrapRef.current = (sim) => m.EngineV2.wrap(sim);
      engineRef.current = m.EngineV2.wrap(simRef.current);
      document.documentElement.dataset.engine = 'v2'; // lets tests confirm v2 is driving the clock
      bump();
    });
  }, []);
  const adopt = (sim: Simulation) => {
    simRef.current = sim;
    if (wrapRef.current) engineRef.current = wrapRef.current(sim);
  };
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
        if (engineRef.current) engineRef.current.advanceReal(acc / 1000, speed);
        else simRef.current.advance((acc / 1000) * speed);
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
    adopt(new Simulation(buildPlant(next)));
    setTopologyState(next);
    bump();
  }, []);

  /** Swap in a prepared simulation (used by the guided walkthroughs). */
  const load = useCallback((next: Simulation) => {
    adopt(next);
    setTopologyState(next.meta.topology);
    setRunning(false);
    bump();
  }, []);

  /**
   * Run plant-touching code that is not an operator action (the procedure runner's scoring and story
   * beats) and re-render. Operator actions use `apply`.
   */
  const act = useCallback(<R,>(fn: (sim: Simulation) => R): R => {
    const r = fn(simRef.current);
    bump();
    return r;
  }, []);

  /**
   * Every operator action goes through here as plain data (Phase 4d): on engine v2 it is applied, logged
   * and replayable through EngineV2.apply; on v1 it is done straight on the plant.
   */
  const apply = useCallback((action: Action): ActionResult => {
    const e = engineRef.current;
    const r = e ? e.apply(action) : (applyToSim(simRef.current, action) ?? { ok: false as const, reason: 'Needs engine v2.' });
    bump();
    return r;
  }, []);

  /** Advance exactly one second (one engine v2 tick) while paused. */
  const step = useCallback(() => {
    const e = engineRef.current;
    if (e) e.tick();
    else simRef.current.advance(1);
    bump();
  }, []);

  return {
    sim: simRef.current,
    apply,
    step,
    /** Engine v2 wrapper when ?engine=v2 is on (null on v1 or while v2 loads). */
    engine: engineRef.current,
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
