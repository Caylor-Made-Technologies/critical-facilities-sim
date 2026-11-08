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
| Sources detail v2 (Phase 4b part 2) | `src/sim/physics.ts` (`SOURCES`, `genStage`, `stepFrequencyHz`, `batteryTempFactor`, `slipAngleDeg`), `src/sim/v2/sources.ts` | Example values: start sequence crank 0–3 s / build V-F 3–8 s / ready 8–10 s, +15 s cold start with block heater off, overcrank declared at 45 s, 10% frequency dip per 100% load step recovering with τ 2 s, UPS efficiency 96% double conversion / 99% eco / 99.5% bypass, battery capacity −1%/°C below 25 °C, 0.1 Hz slip with a ±10° in-phase window | Open |
| Air side v2 (Phase 4c part 1) | `src/sim/physics.ts` (`AIR`, `coilEffectiveness`, `airPaths`, `inletClassBand`), `src/sim/v2/airside.ts` | Example values: server ΔT 12 K, CRAH 12.4 kg/s (≈ 22,000 CFM) and 8 kW fan at full speed, min speed 30%, coil ε 0.80 at full fan with NTU ∝ airflow^−0.4, 5% airflow margin, recirculation/bypass 3/5% contained, 15/15% door open, 25/30% uncontained, +10% recirculation with all blanking missing, idle-rack airflow 10%, node masses (cold 1,500 / rack in 500 / rack out 12,000 / hot 3,000 / room 3,000 kJ/K); ASHRAE TC 9.9 recommended and A1–A4 allowable ranges (values only). Simplified, not a CFD model | Open |
| Hydronic v2 (Phase 4c part 2) | `src/sim/physics.ts` (`HYD`, pump/system curves, `chillerLiftFactor`, `partLoadPowerFrac`, `tesDeliverable`), `src/sim/v2/hydronic.ts` | Example values: pump 41.8 kg/s at 250 kPa (≈ 660 gpm, 84 ft), shutoff 1.25×, η 0.75, DP setpoint 100 kPa (≈ 15 psi), capacity −1.2%/K of lift above 17 K (0.7–1.1), minimum lift 10 K, part-load curve 0.17 + 0.32·PLR + 0.51·PLR², min evaporator flow 40% for 10 s, anti-short-cycle 10 min start-to-start, 10 min minimum run, thermocline at 10% charge, tank discharge ≤ 2,500 kW, tower leaving ≥ 5 °C, loop masses 85,000 + 85,000 / condenser 40,000 kJ/K. Results to sanity-check: 0.32 kW/ton mild, 0.46 kW/ton at 105 °F with 18 °C CHW | Open |
| Efficiency v2 (Phase 4c part 3) | `src/sim/physics.ts` (`EFF`, psychrometric functions, `econModeNext`, `upsLossKw`, `transformerLossKw`), `src/sim/v2/efficiency.ts`, Simulator "how it adds up" panel | Economizer thresholds (wb 12.5 / 20.5 °C), 1 K deadband, 15 min dwell; Magnus + humidity ratio + enthalpy formulas (shown with Verify); CW pump head 200 kPa; tower fan 15 kW × load³; transformer loss 0.3% + 1% × loading²; UPS loss from mode efficiency; resulting PUE 1.17 / 1.24 / 1.32 (winter / mild / 105 °F) | Open |
| Alarms and faults v2 (Phase 4d) | `src/sim/physics.ts` (`ALARM`), `src/sim/v2/alarms.ts`, `src/content/faults.ts` | Alarm priorities and setpoints (UPS low battery 25%, fuel low 25%, CHW supply +2 K, CHW flow < 90%, tank < 20%, condenser water 37 °C, UPS room 30 °C, inlet 27 / 32 °C), delays and deadbands, chattering (3 in 60 s) and flood (> 10 in 10 min) rules, shelving limit 8 h; the 15 fault entries (causes, trend signatures, responses) | Open |
