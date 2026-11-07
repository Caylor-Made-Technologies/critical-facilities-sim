# Review queue

Claims that need a qualified person (electrical/mechanical engineer, safety professional,
or attorney) to check before anyone relies on them. The app labels all of these as generic
training content; this list says what to review first. Add a line whenever new
safety-critical, code-related or numeric content ships.

| Area | Where | What to check | Status |
|---|---|---|---|
| Safety Center | `src/content/` safety articles, boundary explorer, emergency cards | Approach boundary wording, LOTOTO order, first-response steps, hot work, fire system impairments | Open |
| Batteries | Safety + Equipment (UPS, BESS) | Battery hazards, ventilation, thermal runaway notes | Open |
| Rounds ranges | Procedures → Rounds | Every "normal" range is generic and plausible | Open |
| Case studies | Case Studies tab | Composite incidents are realistic and fair | Open |
| Certifications | Career → Data center certs, `src/content/issuers.ts` | Names, issuers, prerequisites vs. current issuer rules | Open |
| Policy pages | About (privacy, terms) | Templates until an attorney reviews | Open |
| Generator test MOP | `src/content/procedures.ts` (`mop-gen-test`) | Walkdown items and "unloaded test" wording vs. common practice | Open |
| Cutaways | `src/ui/three/models.ts` (`CUTAWAYS`): UPS, chiller, CRAH inner parts | Part names, flow order (CCME) and one-line descriptions are correct and generic | Open |
| Hall airflow | 3D data hall particles | Hot/cold aisle flow picture is a fair simplification (supply up from tiles, through racks, exhaust up the hot aisle) | Open |
| Life of a DC: site selection | `src/content/lifecycleA.ts` (`life-site`) | Utility diversity, lead times, floodplain, air-permit and noise statements | Open |
| Life of a DC: design | `life-design` | Redundancy and tier-style wording, density ranges, floor loading, 1 ton = 3.517 kW | Open |
| Life of a DC: construction | `life-build` | Construction sequence, torque marking, hydrostatic testing, flushing, grounding grid | Open |
| Life of a DC: commissioning | `life-cx`, `IST_L5` in `src/content/lifecycle.ts` | Level 1–5 definitions, load bank notes, IST steps and acceptance criteria | Open |
| Life of a DC: operations | `src/content/lifecycleB.ts` (`life-ops`) | Shift patterns, alarm triage buckets, PUE/WUE/MTBF/MTTR definitions | Open |
| Life of a DC: maintenance | `life-pm` | PM calendar buckets (monthly/quarterly/yearly) are fair typical starting points; wet stacking, IR and battery trend notes | Open |
| Life of a DC: capacity | `life-cap` | Counting capacity at redundancy, A/B planning, breaker loading and nameplate notes | Open |
| Life of a DC: incidents | `life-incident` | Incident roles, RCA tools (5 whys, fishbone categories) | Open |
| Life of a DC: decommissioning | `life-decom` | Battery, refrigerant, e-waste, data destruction and fluid disposal statements; lithium-ion shipping note | Open |
| Hot work (audit 2026-11-06) | `src/content/safety.ts` (`hot-work`) | Fire-watch time now "per your program, commonly 30–60 min, newer editions at least 60" and clearance "commonly 35 ft": confirm wording against current editions | Open |
| Tier IV wording (audit 2026-11-06) | `codes.ts` ratings table, glossary "Fault tolerant", `lessons.ts` | Changed "survives any failure even during maintenance" to "protection can be reduced while equipment is out for maintenance": confirm | Open |
| Codes table | `src/content/codes.ts` | Standard names/numbers and one-line summaries (e.g. generator weekly inspection + monthly exercise, battery maintenance standards, EPA engine-hour rules) are fair; owner to decide if standard numbers stay (see Phase 3 report) | Open |
| Field Tools | `src/ui/tabs/FieldToolsTab.tsx`, `src/sim/physics.ts` | Rules of thumb: 0.27 L/kWh diesel with 10% idle floor, UPS runtime t = rated × (1/load)^1.2, battery life halves per 15 °F over 77 °F, 1.08 / 500 / 3.517 constants | Open |
| Tips numbers | `src/content/tips.ts` | Rules of thumb (80% continuous, 2% voltage imbalance, GFCI ~5 mA, motor FLA ≈ 1.4 × HP at 460 V, 0.07 gal/kWh, BMS-down 15-min logging, EC fan fail-to-full behavior) | Open |
| Equipment guides | `src/content/equipment.ts` (19 guides) | PM interval tables ("typical"), rounds checks, troubleshooting trees, hazards, EPO code-path note | Open |
| Simulator engine constants | `src/sim/physics.ts`, `thermal.ts` | Trip points and timings (head-pressure trip, server shutdown inlet, generator start ~10 s, retransfer 5 min, TES size, CDU ride-through): plausible for training; labeled simplified. Full review again after engine v2 (Phase 4) | Open |
| Electrical model v2 (Phase 4b) | `src/sim/physics.ts` (`ELEC`, `breakerTripTimeS`, `transformerRiseC`), `src/sim/v2/electrical.ts` | Example values: 12.47 kV / 480 V / 415 V, PF 0.98 IT / 0.95 VFD / 0.99 UPS input, ±6% rack phase skew, 80 °C rated rise with exponent 1.6 and 1 h time constant, LSI trip curve (long-time 10 s band at 6×, short-time 6× / 0.3 s, instantaneous 10× / 0.05 s, 10 min cool-down). Simplified, not a load-flow or coordination study | Open |
