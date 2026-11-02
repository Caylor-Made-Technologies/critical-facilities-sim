# Critical Facilities Redundancy Simulator

An interactive, offline simulator of a generic hyperscale-style data center: how the plant keeps IT load powered and cooled, and what happens when components fail or are taken out for maintenance.

> Educational simulation of generic data center infrastructure. Not a site procedure. Always follow your facility's approved MOPs/EOPs and LOTO program.

**Live:** https://caylor-made-technologies.github.io/critical-facilities-sim/

**Status:** Tips & UI release (2026-11-02): Tips & Tricks tab (219 tips), quick-start grid, jump back in, text size, phone vibration on answers. Before that, the full app release (2026-11-01): new app icon, Field Tools, Career, daily challenge with streaks, badges, timed exam, flashcards, UPS battery aging, backup/restore and install button, on top of the Phase 100 Safety Center, quick search and motion pass, and phases 1–25: electrical and mechanical simulators, Kirk-key operation, scored MOP practice and emergency drills, design comparison and PUE breakdown, 14 walkthroughs, quiz, equipment guide, safety, codes, uptime, change management, offline install, and smooth page transitions.

## What's in the app
Every subject has its own tab, and inside each tab the electrical and mechanical sides have their own sections.

| Tab | What it does |
|---|---|
| **Home** | A **What do you want to do?** grid of big buttons, a **Jump back in** card for the last section you used, tip of the day (tap for the next one), hero with an **Install the app** button, the **daily challenge** (3 questions, the same for everyone that day, with a streak counter and a suggested drill), your growth path (XP and 5 levels), **15 badges**, the printable practice record, and a door into every subject. |
| **Simulator** | Two views. **Electrical:** pan/zoom one-line from utility to rack with animated power flow, breaker and Kirk-key operation, 7 redundancy designs. **Mechanical:** towers, pumps, chillers, free-cooling HX, storage tank, CRAHs, CDUs, DOAS, with pipes colored by water temperature. A BMS panel has an inlet trend against the ASHRAE band. Weather presets, UPS battery age (new, mid-life, end of life, overdue: runtime drops to match), °F/°C, Explore and Failure modes, event log. |
| **Procedures & Drills** | Scored practice on the live plant. **7 MOPs:** UPS to maintenance bypass and back, main-tie-main transfer and return, monthly generator test run, chiller out for PM, air handler filter change. **8 emergency drills:** utility loss, chiller trip at 105 °F, both utilities plus a generator, CDU failure, UPS room cooling loss, fire alarm, two towers lost at 105 °F, long-outage fuel math. **Surprise drill:** one of 8 random failures to find from the event log and repair. **Rounds:** 4 round sheets where you spot the readings that need action. Steps tick off when the engine sees the plant reach the right state; blocked actions, hints, wrong calls and dropped load cost points. A stopwatch saves best times, filters and a "recommended next" pick what to do, and Home has a printable practice record. **Wrong answers are simulated:** the choice runs on a copy of the live plant and shows what would really have happened (e.g. the EPO drops all 36 racks, the interlock refuses the tie). Every result screen ends with **Think deeper** questions and model answers. |
| **Career** | **Interview prep:** 20 common critical facilities interview questions as practice cards (say it out loud, flip, check the points a strong answer hits) or a full list. **Career path:** technician to chief engineer, what each role does and what to learn next. **Shift handoff:** a turnover report that fills itself in from the live simulator (status, gear out of normal, generators, recent alarms) plus your notes, ready to print. |
| **Case Studies** | Six composite incidents (bypass not closed, generator left in OFF, fuel gauge stuck, heat wave and fouled tubes, dual-corded racks on one side, alarm fatigue). Each has a timeline, a step-by-step "5 whys" to the root cause, contributing factors, what changed afterwards, discussion questions, and a link to practice the lesson. |
| **Tips & Tricks** | 219 quick tips in 16 topics: memory aids (CCME for the refrigeration cycle, BOY/BRB wire colors, LOTO order, PASS, RACE), in-a-pinch moves (EC fans going to full speed on a lost signal, VFD bypass, rinsing air-cooled coils, stretching fuel), quick math, electrical, meters, UPS, generators, refrigeration, air, water, towers, controls, troubleshooting, safety, rounds and career. Search, topic chips, a random-tip roller, and saved favorites. Risky moves carry an amber caution. Also in quick search. |
| **Field Tools** | Calculators: load to amps (3-phase and single-phase, kVA), UPS battery runtime by load and battery age, generator fuel runtime and burn rate, cooling tons / chilled-water gpm / airflow CFM, PUE, battery life vs room temperature, and °F/°C with the ASHRAE inlet band. Every formula is in `physics.ts` and shown under its calculator. |
| **Designs & PUE** | All 7 designs built and broken side by side (lose a module, lose a whole UPS system), the four-level tier idea in plain words, and a live PUE breakdown (IT, cooling by equipment group, losses). |
| **Learn** | 14 step-by-step walkthroughs in Electrical, Mechanical, and Safety sections. Electrical lessons drive the simulator; mechanical lessons use an animated refrigeration-cycle cutaway and heat-path figure. Every step has "I don't get it, explain simpler". |
| **Quiz** | 44 questions in Electrical, Mechanical, Safety, and Change sections. A wrong answer drops the explanation down automatically. **Timed exam:** 20 random questions in 15 minutes, no hints until the end, then a review of every miss; 80 passes. |
| **Equipment** | 19 equipment families split by Electrical / Mechanical / Life safety: how it works, rounds, PM, troubleshooting, hazards, MOC triggers, and a red NEVER list. |
| **Never Do** | 38 hard stops in red with warning marks, each with the reason, by Everyone / Electrical / Mechanical / Life safety. |
| **Glossary** | 63 searchable terms by section, plus **flashcards** that bring back the ones you miss (Leitner boxes). |
| **Safety Center** | **Golden rules** (10 life-saving rules). **Library:** 18 articles in Electrical, Mechanical, Everyone and Life safety (arc flash, LOTO, energized work permits, switching and racking, batteries, generators and fuel, refrigerant and chemicals, stop work and pre-task briefs, heights, hot work, contractors, fire systems and impairments, EPO and evacuation, first response). **Practice:** walk up to live 480 V gear and see which approach boundaries you may cross, 3 LOTO order drills, 5 hazard hunts, 8 emergency cards, and a pre-task brief builder that flags gaps and prints. Drills are scored and add XP. |
| **Codes & Standards** | Who writes the rules, then electrical, mechanical, fire & life safety, environmental, and tier-style ratings. |
| **Uptime** | Where outages come from, human performance tools, electrical and mechanical practices, operations, emergencies. |
| **Change Mgmt** | Management of change: lifecycle, risk rating, MOP anatomy, records, change windows. |
| **Feedback** | Builds a message and opens it in your own email app or as a GitHub issue. The site itself sends and stores nothing. |

## Easy to use
- **Text size:** the **Aa** button in the header steps through small, normal, large and extra large; the whole app scales with it.
- **Phone bottom bar:** Home, Sim, Learn, Tips, and More (everything else, including Quiz).
- **Vibration:** a short buzz on right and wrong answers on phones that support it (off with reduced motion).

## Motion and quick search
- **Quick search:** press Ctrl/⌘ + K, `/`, or tap Search to jump to any tab, walkthrough, MOP, drill, equipment guide, case study, safety topic or glossary term.
- **Motion:** section tabs slide a pill to the selected tab, cards rise in as you scroll and light up under a mouse, a scroll bar fills under the header, the theme switch grows from the button, XP counts up, and perfect scores get confetti. All of it is CSS or tiny DOM effects and turns off with reduced motion.

## What the engine models
- **Electrical chain:** two utility feeds → MV switchgear → transformers → ATS → main-tie-main switchboards → BESS → UPS systems (rectifier/inverter, battery, static bypass, maintenance bypass) → STS → busway/PDU/RPP → 36 racks (2,100 kW, including 130 kW GPU racks).
- **Generators:** paralleling bus, ~10 s start-and-transfer, day-tank fuel burn, N / N+1 / N+2 / 2N counts.
- **Automatic controls:** ATS loss detection, generator start, transfer, retransfer timer, generator cooldown; UPS battery countdown; overload → static bypass; BESS bridging to generator.
- **Kirk-key interlocks:** main-tie-main (2 keys, 3 locks) and UPS maintenance bypass with a solenoid key release unit. The engine also refuses to parallel unsynchronized sources, even if someone uses a "cheater" key.
- **Redundancy topologies:** N, N+1, N+2, 2N, 2N+1, distributed redundant, and block redundant ("catcher"). Same IT load, different architecture.
- **Capacity math:** e.g. `4 × 750 kW UPS modules, 2,100 kW load → N+1 holds (70% of available)`.
- **Mechanical plant (thermal.ts):** a simplified BMS stages chillers lead/lag (2-minute start, 3-minute restart after a power loss), uses water-side free cooling when the wet bulb allows, and checks tower loading and condenser water. Chillers trip on high head pressure or loss of condenser flow. The chilled-water storage tank covers shortfalls. CRAH capacity falls as chilled water warms. CDU loss makes GPU rows throttle in ~30 s and trip soon after. Hall inlet heats with thermal mass, and air-cooled IT shuts down above 104 °F. DOAS controls dew point and hall pressure, CRAC cools the UPS room, and mechanical kW updates live, so PUE moves with weather and staging.

## Code layout
```
src/content/      lessons, equipment guide, safety and change articles (plain data)
src/ui/           React UI: app shell, simulator views, tabs
src/sim/
  types.ts        component, edge, and event types
  graph.ts        directed plant graph
  physics.ts      every formula and tunable constant, documented
  thermal.ts      mechanical plant, BMS staging, thermal and humidity model
  power.ts        electrical solver: energization, load flow, UPS modes, paralleling check
  capacity.ts     N / N+1 / 2N capacity math
  procedure.ts    MOP / drill runner and scoring
  designs.ts      design comparison and PUE breakdown
  interlocks.ts   Kirk-key trapped-key system
  engine.ts       time stepping, automatic controls, event log, operator actions
  plant/          reference plant builder (all 7 topologies) and explainer cards
  __tests__/      Vitest unit tests
```

## Run it
```
npm install
npm run dev        # local dev server
npm test           # 171 unit tests (electrical, thermal, battery aging, procedures, designs, calculators, safety drills, tips, daily challenge, badges, search, content)
npm run build      # production build in dist/
```
Pushing to `main` runs the tests and deploys to GitHub Pages.

**App icon:** drawn in code (`assets-src/icon.svg`, a bolt inside a blue/cyan circuit ring in the brand colors) and rendered to every size with `node assets-src/render.cjs`. Maskable icons keep the art inside the safe zone so Android can crop it to any shape.

**Backup:** About → Download a backup saves your progress as a file on your device; Restore reads it back. The site never sees it.

**Offline:** after the first visit a small service worker (`public/sw.js`) keeps this site's own files in the browser cache, so the app opens with no signal and can be added to a phone's home screen. Pages load network-first, so updates arrive as soon as you are online.

## Quality checks
- Automated axe accessibility scan of every tab, light and dark, phone and laptop: 0 violations.
- No console errors under the strict Content Security Policy.
- Keyboard: skip link, every component and control reachable, arrow keys pan and +/- zoom the diagram.
- Respects `prefers-reduced-motion` and `prefers-color-scheme`.
- Performance: the power solver is skipped when none of its inputs changed, the event log re-renders only on new lines, diagram animations pause when scrolled off screen, and off-screen panels skip rendering. About 58 fps on a 4× CPU-throttled phone profile while the plant runs at 60×.

## Notes
- All tags (`UPS-A1`, `CH-02`, `CRAH-104`) and layouts are invented and generic.
- Tier references are plain-language explanations of public concepts, not certification claims.
- See `docs/CHECKLIST.md` for how the project meets the security and legal/quality checklist.

Built by Caylor Made Technologies, Hereford, TX. MIT License.
