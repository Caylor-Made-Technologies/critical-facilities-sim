# Critical Facilities Redundancy Simulator

An interactive, offline simulator of a generic hyperscale-style data center: how the plant keeps IT load powered and cooled, and what happens when components fail or are taken out for maintenance.

> Educational simulation of generic data center infrastructure. Not a site procedure. Always follow your facility's approved MOPs/EOPs and LOTO program.

**Live:** https://caylor-made-technologies.github.io/critical-facilities-sim/

**Status:** Engine, electrical simulator (Explore + Failure modes), Kirk-key operation, guided walkthroughs, equipment guide, safety & codes, and change management are built. Mechanical plant view, MOP scoring, scenarios/quiz and glossary are next.

## What's in the app
| Tab | What it does |
|---|---|
| **Simulator** | Pan/zoom one-line from utility to rack with animated power flow. Tap anything for live readings and an explainer. Failure mode: tap to break it and watch transfers, battery countdowns and generator starts in the event log. Operate breakers and Kirk keys from the component card. Switch between 7 redundancy designs. |
| **Learn** | Step-by-step walkthroughs that drive the simulator: power path, utility outage, N vs N+1 vs 2N, STS, Kirk keys, UPS maintenance bypass MOP, LOTO, rounds. Every step has an "I don't get it, explain simpler" button. |
| **Equipment** | For each of 19 equipment families: how it works, what to check on rounds, typical PM intervals, troubleshooting by symptom, never-do list, hazards, and when a change record is required. Searchable. |
| **Safety & Codes** | Electrical safety (NFPA 70E, OSHA), LOTO step by step, a reference table of the standards you'll hear about, other site hazards, uptime practices, and emergency response. |
| **Change Mgmt** | Management of change: what counts as a change, the MOC lifecycle, risk rating, anatomy of a MOP, records, change windows, and a practice quiz. |

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
src/content/      lessons, equipment guide, safety and change articles (plain data)
src/ui/           React UI: app shell, simulator views, tabs
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

## Run it
```
npm install
npm run dev        # local dev server
npm test           # 73 unit tests (engine, lessons, layout)
npm run build      # production build in dist/
```
Pushing to `main` runs the tests and deploys to GitHub Pages.

## Quality checks
- Automated axe accessibility scan of every tab, light and dark, phone and laptop: 0 violations.
- No console errors under the strict Content Security Policy.
- Keyboard: skip link, every component and control reachable, arrow keys pan and +/- zoom the diagram.
- Respects `prefers-reduced-motion` and `prefers-color-scheme`.

## Notes
- All tags (`UPS-A1`, `CH-02`, `CRAH-104`) and layouts are invented and generic.
- Tier references are plain-language explanations of public concepts, not certification claims.
- See `docs/CHECKLIST.md` for how the project meets the security and legal/quality checklist.

Built by Caylor Made Technologies, Hereford, TX. MIT License.
