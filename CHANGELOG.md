# Changelog

All notable changes to the Critical Facilities Simulator. Dates are when the change went live.

## 1.0.0 — 2026-11-12

First numbered release. Everything below is in it.

### Practice (Phase 9)
- 20 scored MOPs (was 7): every MOP opens with a MOP sheet — risk, prerequisites, stop-work points, rollback.
- 15 emergency drills (was 8), including an alarm flood (find the first-out), UPS on static bypass in a storm sag,
  hot spots after two CRAHs fail, voltage imbalance, generators failing to start, cold-start block heaters, and a
  voltage sag with UPS eco mode.
- Verification hold points: signing off before the plant shows it costs points.
- Live rounds: walk seven stations on the live plant, read analog gauges, write the values and flag what's out of range.
- Shift mode: an 8-hour shift in about 15 minutes with random events and a scored hand-off.

### Simulation depth (Phase 8)
- Utility power quality: sags, swells, lost phase and imbalance, with UPS, ATS, generator and chiller responses.
- Per-rack heat: hot spots at row ends, behind missing blanking panels and near failed air handlers, shown in 2D and 3D.
- Engine v2 is the only cooling model when it runs; chiller, pump and tower loads follow it.

### Deep dives (Phase 7)
- Every equipment guide (21) has Overview, Deep dive, Normal readings, How it fails, Tips & practice and a quiz.
- New 3D cutaways: transformer, generator, switchboard breaker, cooling tower, pump.
- Quick search finds deep-dive topics.

### Earlier
- Phase 6: navigation groups, phone quick bar, taps never lost during animations, consistency sweep.
- Phase 5: graphics read engine v2 (alarm rings, air path, trends, PUE bar).
- Phase 4: engine v2 (fixed 1 s ticks, electrical and hydronic models, alarms, fault library).
- Phases 0–3: 3D practice, 3D polish, Life of a Data Center, audit.
