# Bugs

Found in the Phase 3 audit (started 2026-11-05) and later. S1/S2 get a regression test and a fix
before anything else; S3/S4 move to the overhaul phase named in **Phase**.

Severity: **S1** broken or unsafe content · **S2** wrong result · **S3** visual/UX · **S4** polish.

## Baseline (main b38f01b, 2026-11-05)
- `npm test` 215 pass · `npm run typecheck` clean · `npm run build` ok.
- `npm run e2e` 103 pass + 1 perf pass (49 skipped by design), 12 min.
- Lighthouse Home (serve-dist, 3 runs): performance 92 / 92 / 94 → **median 92**; accessibility 100 ×3.
- Main chunk 544.7 kB (179.2 kB gzip). Perf: 213 draw calls, 33.8k triangles (SwiftShader).
- Sweep of 101 views (20 tabs × phone/laptop × light/dark in 3D, plus 2D and Low/High/Auto on the 3D-heavy tabs):
  0 console errors, 0 sideways scroll, 0 unnamed controls, 1 h1 per tab, 0 broken internal links, 1 duplicate id.
- Played in the browser: all 7 MOPs, all 8 drills, all 4 rounds sheets (new `tests/e2e/playall.spec.ts`);
  IST and all 10 Life of a DC stages (existing `lifecycle.spec.ts`); all 7 Field Tools checked by hand.

## List

| ID | Sev | Area | Steps | Expected | Actual | Phase | Status |
|---|---|---|---|---|---|---|---|
| B-001 | S2 | Offline / updates | Visit, deploy a new build, visit again, go offline, open a tab never opened | Every tab of the new version works offline | `public/sw.js` is byte-identical between builds, so no new worker installs: the new build's lazy files are never precached, and old files stay in the cache forever | 3 (audit-b) | **Fixed**: `sw.js` is now built from `src/pwa/sw.template.js` with a cache name hashed from the build (`src/pwa/swBuild.ts`, unit tests); e2e deploys a new version into a private copy of the site and checks the old cache is gone and an unvisited tab works offline |
| B-002 | S2 | App shell | A tab's code fails to load (missing chunk, offline before precache) or a tab throws while drawing | Only that tab shows an error with Retry | No error boundary anywhere: the whole app goes blank | 3 (audit-b) | **Fixed**: `TabBoundary` around each tab (Reload / Try again / Home); e2e blocks a tab's file and checks the rest of the app works |
| B-003 | S3 | Updates | Deploy while the app is open | "New version ready, reload" note | Nothing; old version runs until a full reload | 3 (audit-b) | **Fixed**: updates wait, then a "new version ready" bar with Reload / Later (`src/ui/swUpdate.ts`); open tabs keep their files until you choose |
| B-004 | S4 | Saved data | Look at saved progress (`cfs-progress-v1`) | Schema version + migration step | No version field (backup files have one). `sanitize()` does keep bad data out | 3 (audit-b) | **Fixed**: saves carry `schema: 2`; `migrate()` upgrades older saves step by step; test with a real v1 save fixture |
| B-005 | S1 | Drills | Start "Two cooling towers lost on a 105 °F day", take more than a few seconds on question 1 | Step 2 finishes once the backup chillers carry the plant | Step 2 waited for "tank stops discharging", which never happens at 105 °F (backups ~11 kW short), so the drill could not be finished. Answering instantly skipped it before anything tripped. The engine test only answered instantly, so it missed this | 3 (audit-a) | **Fixed**: check is now "CH-01 and CH-02 tripped and 2+ chillers running"; engine tests replay every drill at 0 s and 45 s per step; browser test plays it to 100 |
| B-006 | S3 | Tips (a11y) | Tips tab on a day the random tip is also in the list | Unique ids | Random-tip card and list card shared `id="tip-…"`, so `aria-labelledby` pointed at two headings | 3 (audit-a) | **Fixed** + every-tab duplicate-id check in `tabs.spec.ts` |
| B-007 | S4 | Field Tools | Generator fuel card | Formula line matches the math | Showed "kW × 0.27 L/kWh (10% idle floor)", but the math uses rated kW and a linear idle-to-full curve (correct, 104.1 gal/h at 1,400 of 2,000 kW) | 3 (audit-a) | **Fixed** (label only) |
| B-008 | S3 | Simulator | Simulator, 3D on | One legend per diagram | A second legend (A/B/C system, catcher, de-energized, moving dashes) sits outside and below the 3D plant card, repeating the one inside | 6c | **Fixed** (Phase 6a, 2026-11-09): the 2D legend hides in 3D |
| B-009 | S4 | Simulator (phone) | Event log on a phone with no events | Card sized to content | 634 px tall card that says only "All quiet" | 6c | **Fixed** (Phase 6a): the off-screen placeholder was 600 px (content-visibility); now 140 px for the log card |
| B-010 | S4 | Never Do / Equipment | Red rules | Icon marks | Decorative "!!" before and after rules (hidden from screen readers) | 6a | **Fixed** (Phase 6a): one warning icon instead of "!!" marks |
| B-011 | S4 | About, Feedback | Radio/checkbox rows | 44 px tap rows | Inputs are 13–20 px; the label is tappable, but rows are not checked for 44 px | 6a | **Fixed** (Phase 6a): every `.check` row is at least 44 px tall; 3D quality options were already 44+ px |
| B-012 | S2 | Backup restore | Restore a file that has our app name but no progress in it (e.g. hand-edited) | "Not a backup, nothing changed" | It was accepted as empty progress and wiped everything | 3 (audit-b) | **Fixed**: `parseBackup()` refuses it; unit tests for bad, old, newer, empty and huge files |
| B-013 | S2 | 3D memory | Visit Simulator (3D) and another tab, back and forth | Memory stays flat | Every closed 3D scene stayed in memory (~1.1 MB per Simulator visit; heap 12.6 → 29.6 MB over 10 rounds). Two causes in three.js cleanup: OrbitControls removed its keyboard listener from the detached canvas instead of the page, and the shared DFG lookup texture kept a listener from every old renderer | 3 (audit-b) | **Fixed** in `src/ui/three/core.ts` dispose; e2e: 10 rounds through the 3D tabs must grow the heap < 8 MB (now ~4 MB, levels off) |
| B-014 | S2 | Content: tiers | Codes ratings table, glossary "Fault tolerant", a lesson | Tier IV = survives any single unplanned failure; protection can be reduced while equipment is out for maintenance | Said it survives any failure "even during maintenance" | 3 (audit-c) | **Fixed** (3 places) + REVIEW-QUEUE |
| B-015 | S2 | Content: hot work | Safety Center → Hot work permits | Fire-watch time per site program; newer editions of the hot work standard call for at least 60 min | "At least 30 minutes (many sites require 60)" read as if 30 is always enough; "35 feet" with no qualifier | 3 (audit-c) | **Fixed**: per program, commonly 30–60, newer editions ≥ 60, Verify note; clearance "per permit (commonly 35 ft)" + REVIEW-QUEUE |
| B-016 | S4 | Content: refrigerant | Never Do, a quiz explanation | "Most refrigerants are heavier than air" | "Refrigerant is heavier than air" (not true of all, e.g. ammonia) | 3 (audit-c) | **Fixed** (Safety already said "most") |
| B-017 | S4 | Generic-only rule | Tips | Generic tool names | A tip was titled with a brand name for insulation testers | 3 (audit-c) | **Fixed**; new `generic.test.ts` bans ~50 vendor/operator names in all 79 content and UI files (career issuers allowed by the 2026-11-02 rule) |
| B-018 | S4 | Content: codes | Equipment → EPO guide | Standards named at concept level | Cited a specific article number of the electrical code | 3 (audit-c) | **Fixed** (concept wording + Verify note). Whether the Codes tab keeps standard numbers is the owner's call |
| B-019 | S4 | Rounds (motion) | Tap readings on a sheet right as the page opens (seen once in 4 live runs, laptop) | Every tap flags the reading | One tap seemed not to register, likely during the card entrance animation | 6 (UI v2 motion) | **Fixed** (Phase 6b, 2026-11-09): every page's sections slid 14 px up over 0.5 s as they appeared, so a quick tap aimed where the button was. The entrance is now a fade only; e2e checks no timed animation moves the readings |
| B-020 | S2 | Simulator v1 thermal (free play) | (a) Lose 3–4 of 8 CRAHs; (b) lose every CRAH, let IT trip | (a) Hall settles warmer (coil capacity rises with return air); (b) hall stays hot with no cooling, racks stay down | (a) v1 coil capacity is fixed, so any shortfall runs away to a trip (~57 min with 3 down); (b) v1 hall relaxes back to 24 °C with zero cooling once IT trips, racks restart by themselves and cycle | 4c (engine v2) | **Fixed on v2** (2026-11-08): the v2 air side owns hall trips and has neither fault (`airside.test.ts`, `airparity.test.ts`). v1 (still the default engine until 4e) left as is; goes away when v1 is deleted |
| B-021 | S1 | Engine v2 (4c part 2, before merge) | Towers drill in the browser on `?engine=v2` | Backups take over, drill finishes | Wrapping the prepared plant ran chiller staging and trip protection during start-up: CH-01–03 tripped before the first tick and the drill could not finish | 4c | **Fixed** before merge: start-up only settles temperatures; new unit parity on the browser path (prepared plant + `wrap`) for all drills |
| B-022 | S2 | Engine v2 (4c part 2, before merge) | Any time no water-cooled chiller is loaded | Condenser water settles toward the tower leaving temperature | CW flow was zero, so the condenser loop froze hot (106 °F) and any chiller that started tripped on high head | 4c | **Fixed** before merge: the CW pump starts with the chiller start sequence; the range is added only while a chiller rejects heat |
| B-023 | S4 | Procedures (v2 default, laptop) | Chiller drill, first multiple-choice step, right after the page opens | The click counts | Once in a full e2e:v2 run the click did not advance the step; passed on rerun alone. Likely the re-render when the v2 engine chunk finishes loading | 6 (UI v2) | **Fixed** (Phase 6b): not the engine. The tab slide (a browser view transition) starts ~0.27 s after the tap and runs ~0.22 s; the browser sends every tap during it to the page root, so it was lost. A tap now ends the slide and is replayed on the control under it. Also closed a related race: the scoring effect could build on the run from before a click (now one ref holds the latest run). e2e reproduces it with a delayed engine chunk |
| B-024 | S4 | 3D tags (e2e) | `polish.spec` "selected device keeps its tag", laptop-light, full e2e while other browser runs shared the CPU | UPS-A2's tag visible after the camera flies to it | Tag list empty once; passed 4/4 on rerun alone | 6 | Flake (load): watch; if it repeats, wait for the tag declutter pass after the fly instead of a fixed 600 ms |

## Deferred (with reason)
- `npm audit`: vite advisory cleared (vite 6.4.5). Remaining vitest / tinypool / @vitest/mocker advisories only clear with vitest 5 (a major upgrade). Dev-only: the test runner is never shipped and runs headless (`vitest run`, no UI or server). Planned as its own task.

## Content accuracy pass (audit-c, 2026-11-06): what was covered
- Read in full: Safety Center articles (`safety.ts`), safety tools and boundary explorer (`safetyTools.ts`), Never Do, rounds sheets, Codes. Hand-checked every Field Tools formula and every numeric rule of thumb in Tips.
- Scanned all content + UI: vendor/operator names (now a test), clause-level code references, spelling (0 real typos), internal links (0 broken, from the audit-a sweep).
- Not read line by line in this pass: Equipment guides, lessons, quiz, glossary, case studies, ladder/career, Life of a DC (reviewed when written in Phase 2). They are in `docs/REVIEW-QUEUE.md` for the expert, and get re-read in Phase 7 (deep dives) when each area is expanded.

## Not bugs (checked)
- Blank areas in full-page screenshots (Simulator hall card, 2D rack grid): 3D draws only while on screen and
  off-screen sections skip paint; both render correctly in the viewport.
- Remaining ~30 kB per Simulator visit after B-013: Chrome's CSS gradient cache holds the last detached page; it levels off (6.9 → 7.9 MB over 32 visits).
- Timers, animation frames and listeners: every repeating one is cleared on unmount (checked by reading every file that sets one); one-shot frames are harmless.
- Focus: changing tabs moves focus to the page; 0 unnamed controls in the 101-view sweep; axe covers names and contrast.
- CDU drill drops GPU racks if you take 2 minutes per step: intended ("seconds, not minutes").
