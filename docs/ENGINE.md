# Simulation engine (v1, plus the v2 core from Phase 4a)

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

## Engine v2 core (Phase 4a, 2026-11-06)

Built beside v1 (strangler pattern) in `src/sim/v2/`. Turned on with `?engine=v2` in the URL
(internal switch in `src/ui/useSimulation.ts`); v1 stays the default until Phase 4e.

- `units.ts`: branded unit types (`Kw`, `Kva`, `Kwt`, `DegC`, `DegF`, `Seconds`, …). Mixing units fails
  `npm run typecheck` (tested with `@ts-expect-error`). Electrical relations (PF, 3-phase amps) and
  display conversions (°F, gal, gpm, tons, psi) with hand-worked tests.
- `rng.ts`: seeded `Rng` (mulberry32), state saved in snapshots.
- `queue.ts`: `EventQueue`, ordered by time then insertion; plain data, snapshot/restore.
- `engine.ts`: `EngineV2`
  - fixed `TICK_S = 1`; `advanceReal(realS, speed)` turns frame time into whole ticks, carries the
    leftover (returned 0–1 for drawing in between), absorbs float error, caps a backlog at 600 ticks;
  - typed `Action` list (open/close/fail/restore/maint, UPS mode, keys, generator test, EPO, weather,
    battery age, skip); `apply()` logs every action with its time and result; unknown ids are refused;
  - `schedule(at, action)` for timed events; `snapshot()` / `fromSnapshot()` / `copy()` / `replay()`;
  - physics is still the v1 `Simulation` (`engine.sim`), so MOP scoring and every screen read it unchanged.
- `Simulation.snapshot()` / `restoreSnapshot()` (v1 file) give the whole plant as JSON.

Tests: `v2core.test.ts`, `v2engine.test.ts` (v1/v2 parity, replay, snapshot mid-run, copy
independence, frame timing no longer changes results, all 8 drills score the same on v1 and v2).
Browser: `npm run e2e:v2` plays every MOP, drill, rounds sheet and the IST to 100/100 on v2.

Not yet (next sub-phases): UI actions still call `Simulation` methods directly instead of going
through `EngineV2.apply`, so the action log only covers queued and test actions (wire up in 4d with
the alarm/time controls). Electrical and thermal models are still v1 (4b, 4c).

## Engine v2 electrical model (Phase 4b, part 1, 2026-11-07)

`src/sim/v2/electrical.ts` (`ElectricalModel`, owned by `EngineV2` as `engine.elec`), formulas in
`physics.ts` (`ELEC`, `kvaOf`, `kvarOf`, `lineAmps`, `phaseImbalancePct`, `transformerRiseC`,
`approach`, `breakerTripTimeS`). Simplified; not a load-flow or coordination study.

- `read(sim, id)` → voltage, kW, kVA, PF, line amps, per-phase amps, imbalance %, loading of nameplate.
  Voltages: MV service 12.47 kV, LV 480 V, rack level 415 V (below a PDU). PF is the kW-weighted mix of
  the loads below (IT 0.98, VFD motors 0.95); a UPS not on static bypass shows its 0.99 input PF upstream.
- Each rack gets a small seeded phase split (±6 %) from the engine Rng, so imbalance is realistic and
  replayable; mechanical loads are balanced.
- `step()` each tick: transformer rise follows `transformerRiseC(loading)` with a 1 h lag; each closed
  breaker's thermal memory heats by dt / trip time while above pickup and cools (10 min) otherwise;
  at 1 it calls `Simulation.tripBreaker()` (an `alarm` event "TRIPPED: …", not a `Blocked:` warning).
- State (`split`, `txRise`, `heat`) is in `EngineSnapshot.elec`. Tick cost ~0.3 ms (budget test < 4 ms).
- Normal operation and every drill/MOP never come near a trip (parity tests unchanged).

## Engine v2 sources detail (Phase 4b part 2, 2026-11-07)

`src/sim/v2/sources.ts` (`SourcesModel`, `engine.sources`), formulas in `physics.ts` (`SOURCES`,
`genStage`, `stepFrequencyHz`, `batteryTempFactor`, `slipAngleDeg`).

- `genStage(sim, id)`: off / crank (0–3 s) / build-vf (3–8 s) / ready (8 s+) / online, inside v1's 10 s start.
- Scenario switches (typed actions, logged and replayable): `blockHeater` (off adds 15 s to a start),
  `failToStart` (seeded chance; a generator that rolls "no" keeps cranking and is declared failed by
  overcrank at 45 s), `eco` (UPS system on eco mode: efficiency readout).
- `busFrequencyHz(sim, bus)`: dip after a load step (> 5% of online generator capacity), first-order recovery.
- `ups(sim, id)`: mode (double conversion / eco / battery / static bypass / off), battery state
  (float / discharge / recharge / off), SOC, runtime derated for age (v1) and UPS-room temperature, efficiency.
- `ats(sim, id)`: position, normal available, slip angle and in-phase flag while both sources are live.
- Parity: defaults (heater on, chance 0) never change generator state, UPS mode or ATS position, so every
  drill/MOP scores as on v1. State is in `EngineSnapshot.sources`.

Not modeled yet (later phases): closed-transition retransfer that actually waits for the in-phase window,
STS sub-cycle transfer timing, eco-mode transfer on a utility event, paralleling-gear sync and load sharing.

## Engine v2 air side (Phase 4c part 1, 2026-11-07)

`src/sim/v2/airside.ts` (`AirsideModel`, `engine.air`), formulas in `physics.ts` (`AIR`,
`heatFlowKw`, `massFlowForKw`, `airVolumeM3s`, `affinity`, `relaxExact`, `nodeTauS`,
`coilEffectiveness`, `coilMaxKw`, `mixC`, `inletClassBand`, `airPaths`). Simplified; not a CFD model.

**Nodes** (lumped, one per hall): cold aisle → rack inlet → rack outlet → hot aisle → room/return → CRAH.
Thermal masses (kJ/K) cold 1,500 · rack in 500 · rack out 12,000 (server metal) · hot 3,000 · room 3,000,
adding up to v1's 20,000 so a fully uncooled hall heats at the same rate.

**Update.** Airflows are fixed for the tick, then each node moves with the exact step
`T += (Tss − T)(1 − e^(−dt/τ))`, `τ = C / (ṁ·cp)` (no flow → τ = ∞ → no change). If `dt/τ > 1` for any
node the tick is split into sub-steps (≤ 50) so every update has `dt/τ ≤ 1` (tested). Normal ops need 1.

**Airflows.**
- IT: `ṁ_it = Q_air / (cp × 12 K)` (server ΔT ≈ 22 °F). GPU racks put 20% of their heat in the air (v1 rule).
  Idle racks still pass 10% of design airflow when the CRAHs run (cold-aisle pressure), carrying no heat.
- CRAH fans hold the cold-aisle pressure: `ṁ_crah = ṁ_it × 1.05 / (1 − bypass)`, speed N clamped 0.3–1;
  when the coil valves are wide open and still short, fans ramp up to the speed whose coil capacity covers
  IT + fan heat (valve-then-fan, τ 30 s). Fan kW = 8 × N³ per unit (affinity laws); fan heat goes into the supply air.
- Containment sets base recirculation / bypass: full 3% / 5%, door open 15% / 15%, none 25% / 30%.
  Missing blanking adds up to +10% recirculation; tile open area above need adds bypass (0.2 per unit
  excess); too few tiles cap the cold air delivered, so racks pull room air (starved cold aisle).
- Mass balance: rack intake = cold air used + hot-aisle leak + starved room air; bypass returns to the room.

**Coil.** `Q_max = ε(N) × ṁ_crah × cp × (T_return − T_chws) × CHW flow fraction`,
`ε = 1 − e^(−NTU)`, `NTU = −ln(1 − 0.75) × N^(−0.4)` (ε 0.75 at full fan, higher when slower;
168 kW per unit at 36 °C return / 18 °C water, ~12% over the 150 kW nameplate: Verify). The valve holds the
rack inlet at 24 °C (supply colder to offset recirculation) but never below CHW + 1 K. CHW supply and
flow are read from v1 thermal until the hydronic model (4c part 2) replaces them.

**Checks.** Inlet band against ASHRAE TC 9.9 values: recommended 18–27 °C; allowable A1 15–32, A2 10–35,
A3 5–40, A4 5–45 (class A1 by default). Rack-inlet trip at 40 °C, clear below 27 °C (same as v1).

**Invariants (tests).** Steady state: IT air heat + fan heat = coil heat, ±1%, in 7 air-path settings.
Snapshot → JSON → restore and replay from the action log give identical air state. Full v2 tick < 4 ms
(measured ~0.2 ms). No NaN with everything off (EPO).

**What it shows (2N plant, mild day):** inlet 24.0 °C, supply 23.2 °C, return 34.5 °C, fans 79% (31 kW
for 8 units), coils at 87% of capacity. Door open: fans 43 kW, return 31.6 °C, supply 21.4 °C, inlet held.
No containment: fans 100% (64 kW), coils maxed, inlet 25.7 °C. Two CRAHs down: fans 100%, inlet held.
Three down: inlet ~25.7 °C (above setpoint, inside recommended). All CHW pumps lost: supply air reaches
return temperature within a minute, inlet trip in ~4 min.

**New typed actions** (logged, replayable, off by default): `containment` (full / door-open / none),
`blanking` (share missing 0–1), `tiles` (open-area ratio 0.2–3).

**Who trips racks.** Since 2026-11-08 the default is `tripSource: 'v2'` (owner's OK after the parity
results below): `ThermalPlant.hallTripExternal` is set, v1 skips its hall trip/clear, and the air model trips
and clears racks with the same messages and thresholds. It also writes its rack inlet into the v1 readout
(`hallInletC`), so every screen shows the temperature that decides the trip. `setTripSource(sim, 'v1')`
puts v1 back (v2 then only records `tripAt` / `clearAt`, used by the canonical parity cases).

**Parity (2026-11-07), `airparity.test.ts`:**
- Scoring: all 8 drills score the same (score, done, racks down) with v2 owning the trip. The 7 MOPs, the IST
  and 23 of 24 auto-played runs (incl. surprise picks) also matched in a one-off probe; the one miss was a
  surprise utility loss left unrepaired for ~7.5 h (one side's generators run out of fuel, 4 of 8 CRAHs stop):
  v1 runs away and trips at 31,382 s, v2 holds below the trip.
- Canonical cases: trip / no-trip agree for N+2 (2 CRAHs down), 1 chiller down, all CHW pumps down, all CRAHs down.
- **Differences (kept on v1):** (1) on total cooling loss v2 trips sooner, ~45% of v1's time (CHW pumps: 251 s vs
  567 s), because supply air jumps to return temperature at once while v1 rises linearly from 24 °C;
  (2) with 3–4 of 8 CRAHs down v2 settles at a higher inlet (coil capacity rises with return air), v1 runs
  away to a trip (fixed coil capacity, B-020). Both are v2 being closer to a real floor. Switched to v2 on 2026-11-08 (owner's OK).

Limits: one lumped hall (no per-row or per-rack hot spots, so missing blanking shows up as more coil
and fan work, not a hot rack); no stratification; no humidity or latent load on the CRAH coil; no
heat loss to the building; the valve controller is ideal (no PI tuning, no hunting).
