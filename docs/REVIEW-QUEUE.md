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
