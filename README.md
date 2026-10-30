# Critical Facilities Redundancy Simulator

An interactive, offline simulator of a generic hyperscale-style data center: how the plant keeps IT load powered and cooled, and what happens when components fail or are taken out for maintenance.

> Educational simulation of generic data center infrastructure. Not a site procedure. Always follow your facility's approved MOPs/EOPs and LOTO program.

**Status:** Phase 1 of 7 is done: the simulation engine with unit tests. The UI comes next.

## What the engine models
- **Electrical chain:** two utility feeds → MV switchgear → transformers → ATS → main-tie-main switchboards → BESS → UPS systems (rectifier/inverter, battery, static bypass, maintenance bypass) → STS → busway/PDU/RPP → 36 racks (2,100 kW, including 130 kW GPU racks).
- **Generators:** paralleling bus, ~10 s start-and-transfer, day-tank fuel burn, N / N+1 / N+2 / 2N counts.
- **Automatic controls:** ATS loss detection, generator start, transfer, retransfer timer, generator cooldown; UPS battery countdown; overload → static bypass; BESS bridging to generator.
- **Kirk-key interlocks:** main-tie-main (2 keys, 3 locks) and UPS maintenance bypass with a solenoid key release unit. The engine also refuses to parallel unsynchronized sources, even if someone uses a "cheater" key.
- **Redundancy topologies:** N, N+1, N+2, 2N, 2N+1, distributed redundant, and block redundant ("catcher"). Same IT load, different architecture.
- **Capacity math:** e.g. `4 × 750 kW UPS modules, 2,100 kW load → N+1 holds (70% of available)`.
- **Mechanical and DOAS (physics ready, plant UI in Phase 4):** chiller COP vs. lift, economizer modes, chilled-water storage ride-through, rack inlet heating, ASHRAE bands, dew point and humidity control for the dedicated outdoor air system.

## Code layout
```
src/sim/
  types.ts        component, edge, and event types
  graph.ts        directed plant graph
  physics.ts      every formula and tunable constant, documented
  power.ts        electrical solver: energization, load flow, UPS modes, paralleling check
  capacity.ts     N / N+1 / 2N capacity math
  interlocks.ts   Kirk-key trapped-key system
  engine.ts       time stepping, automatic controls, event log, operator actions
  plant/          reference plant builder (all 7 topologies) and explainer cards
  __tests__/      Vitest unit tests
```

## Run the tests
```
npm install
npm test
npm run typecheck
```

## Notes
- All tags (`UPS-A1`, `CH-02`, `CRAH-104`) and layouts are invented and generic.
- Tier references are plain-language explanations of public concepts, not certification claims.
- See `docs/CHECKLIST.md` for how the project meets the security and legal/quality checklist.

Built by Caylor Made Technologies, Hereford, TX. MIT License.
