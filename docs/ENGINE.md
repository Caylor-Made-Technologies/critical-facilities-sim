# Simulation engine (v1, as of 2026-11-06)

How the current engine works, written in the Phase 3 audit as the starting point for engine v2
(Phase 4). Everything here lives in `src/sim/`, which has no UI, DOM or three.js imports.

## Files

| File | Lines | Role |
|---|---|---|
| `types.ts` | 132 | Component kinds (electrical, mechanical, life safety), `Status`, `ComponentState`, `Edge` kinds (`power`, `chw`, `cw`, `tcs`, `air`), `SimEvent`, `ActionResult` |
| `graph.ts` | 72 | `PlantGraph`: nodes + directed edges with inbound/outbound lookups. Pure data, `clone()` |
| `plant/builder.ts` | 501 | `buildPlant(topology)` for the 7 designs (`N`, `N+1`, `N+2`, `2N`, `2N+1`, `DR`, `BLOCK`): components, ratings, rows/racks, UPS systems, generator groups, Kirk-key schemes |
| `power.ts` | 341 | `solvePower(graph)`: **pure** electrical solver (energized set and source, load per component, UPS mode, BESS discharge, paralleled sources). `loadFraction()` |
| `interlocks.ts` | 151 | `InterlockSystem`: locks (on breakers or SKRUs), keys, permissives. Blocks illegal closes and key moves |
| `thermal.ts` | 478 | `ThermalPlant`: chillers (staging, start delay, head-pressure trips), towers, pumps, economizer, chilled-water storage (TES), CRAH/CDU/GPU rows, DOAS humidity, UPS room, weather; `readout`, `snapshot()` / `restore()` |
| `physics.ts` | 563 | Every formula and constant (`PHYSICS`), each with a doc comment and unit tests: UPS/BESS SOC and runtime, fuel burn, battery aging, PUE, psychrometrics, tower approach, Life of a DC math |
| `engine.ts` | 601 | `Simulation`: owns graph + interlocks + thermal, advances time, automatic controls, operator actions, event log, `clone()` |
| `capacity.ts` | 90 | N-math: units required, redundancy label, what-if-lose-one |
| `designs.ts` | 95 | Design comparison table and PUE breakdown |
| `procedure.ts` | 246 | MOP/drill runner and scoring (reads the engine, never changes its rules) |

## State

`Simulation` holds:
- `graph: PlantGraph`: every component with `status` (`online` / `standby` / `offline` / `failed` / `maintenance`) and `state` (breaker `closed`, ATS `selected`, UPS `upsMode` and `soc`, generator `genState`, `genTimer`, `manualRun`, `fuelL`, BESS `soc`, …).
- `interlocks: InterlockSystem`: where each key is (in a lock or carried).
- `thermal: ThermalPlant`: its own private state (`chillers` mode and timers, `tesKj`, `chwSupplyC`, `hallInletC`, GPU row temps, humidity, flags) plus a computed `readout`.
- `solution: PowerSolution`: last result of `solvePower` (derived, not source of truth).
- `t` (seconds since start), `events: SimEvent[]` (append-only log), `batteryAge`, and private bookkeeping (ATS loss/restore timers, `homeStatus` for `restore()`, overload latches).

There is **no single serializable state object yet**: graph, interlocks and thermal each hold their own.
`clone()` copies all of them (used for "simulate the wrong answer on a copy" and what-if previews).
Saved progress does not include plant state.

## Time and the tick

```
advance(seconds)              // splits into steps of at most MAX_STEP_S = 1 s
  step(dt):
    t += dt
    runGenerators(dt)         // crank timer → running; fuel burn by load; out of fuel → off
    runTransferSwitches(dt)   // ATS loss timer → start gens → transfer; restore timer → retransfer → stop gens
    resolve()                 // re-solve power only if its inputs changed (solveKey cache); log changes
    runStorage(dt)            // UPS battery and BESS state of charge
    thermal.step(dt)          // mechanical plant + temperatures; may trip chillers / shut racks down
```

- **Deterministic today:** the engine itself uses no randomness and no wall clock. Same plant + same calls
  in the same order = same result. Randomness lives outside it: the surprise drill picks a failure with
  `Math.random()` (`surpriseDrill(pick)` in `content/procedures.ts` accepts a fixed pick for tests).
- **Not deterministic in the UI:** `useSimulation` advances by real elapsed time (`speed × gap`, gap ≤ 500 ms,
  about every 120 ms), so the step sizes depend on frame timing. Results are close but not bit-identical
  between runs. Engine v2's fixed timestep fixes this.
- Operator actions (`openBreaker`, `closeBreaker`, `setUpsSystemMode`, `insertKey`/`removeKey`, `fail`,
  `restore`, `setMaintenance`, `testGenerator`, `emergencyPowerOff`, `setWeather`, `setBatteryAge`)
  change state immediately, call `resolve()`, and return `ActionResult` (`ok`, or `ok: false` with a
  reason). Blocked actions also log a `warning` event whose message starts with `Blocked:`.
- Interlocks are enforced in the engine (`closeBreaker` asks `InterlockSystem`), not the UI.

## Events

`SimEvent = { t, severity: 'info' | 'warning' | 'alarm' | 'critical', source, message }`.
Logged by `resolve()` (rack power lost/restored, UPS mode changes, BESS discharge, overload once per
crossing, unsynchronized paralleling), by the automatic controls, by thermal (`once()` latches so an alarm
fires once per condition), and by actions. The UI reads `events` directly (event log, status banner).

## How MOP / drill scoring reads the engine (`procedure.ts`)

- `procedureSim(p)` builds the plant for `p.topology`, applies `p.weather` (then settles 600 s) and `p.setup`.
- `startRun` records `eventIdx = events.length` and `racksDown = itDownRacks().length`.
- `evaluate(p, run, sim)` after every engine change:
  1. each new `warning` event starting `Blocked:` → −5 (`SCORE.blocked`);
  2. more racks down than before → −30 (`SCORE.dropped`);
  3. auto-finishes consecutive steps whose `check(sim)` is true (steps with `confirm` or `choices` wait
     for the operator); events from a step's `after()` hook are story, not scored.
- `confirmStep` (hold points), `choose` (wrong answer −10 once per choice), `takeHint` (−5 once per step).
- Score starts at 100, clamped 0–100. The IST (`IST_L5`) uses the same runner.
- So the scoring contract engine v2 must keep: the `Blocked:` warning convention, `itDownRacks()`,
  `events` append-only with `t`, the action method names, and every step `check` predicate
  (they read `graph.get(id).status/state`, `solution.energized`, `thermal.readout`).

## Known limits (inputs for Phase 4)

- Variable step size in the UI (above). No seeded RNG. No event queue for scheduled future events
  (drills schedule story beats with `after()` hooks and timers inside components).
- State is spread over three objects; no versioned snapshot for saves/undo.
- Electrical: energization and kW flow only. No kVA/PF, per-phase current, imbalance, protection curves.
- Thermal: lumped single-node temperatures with first-order steps; no mass-flow balance at each coil.
- Alarms: severity only; no deadband/delay, acknowledge, shelve or first-out.
- Tick cost is small today (power solve is cached on an input signature); measure before and after v2.
- Bugs found here are in `docs/BUGS.md` (e.g. B-005: a drill step waited for a condition the thermal model never reaches at 105 °F).
