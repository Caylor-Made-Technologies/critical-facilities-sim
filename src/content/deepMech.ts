/**
 * Mechanical deep dives (Phase 7b). Generic training content; see deepdive.ts.
 * US floors read °F, psi and gpm; °C is given alongside. Standards by number only.
 */
import type { DeepDive } from './deepdive';

export const MECH_DEEP: DeepDive[] = [
  // --------------------------------------------------------------------
  {
    id: 'chiller',
    topics: [
      {
        h: 'The refrigeration cycle (CCME)',
        p: [
          'Compressor: squeezes low-pressure refrigerant gas into hot, high-pressure gas.',
          'Condenser: that gas gives its heat to condenser water (or outdoor air) and condenses to a liquid.',
          'Metering device (expansion valve or orifice): drops the pressure, so the liquid flashes cold.',
          'Evaporator: the cold refrigerant boils by pulling heat out of the chilled water, then returns to the compressor as a gas.',
        ],
      },
      {
        h: 'Superheat, subcooling and approach',
        p: [
          'Superheat: how many degrees the suction gas is above its boiling (saturation) temperature. Too low risks liquid reaching the compressor; too high means a starved evaporator (low charge, restriction). Commonly 8–12 °F on direct-expansion units; flooded chiller evaporators run much lower.',
          'Subcooling: how many degrees the liquid leaving the condenser is below its condensing temperature. Commonly 10–15 °F on many systems. Low subcooling often means low charge.',
          'Approach: the gap between the water leaving a barrel and the refrigerant saturation temperature in it. A clean barrel runs a small approach (often 1–3 °F). A rising approach over months = fouled tubes or low charge.',
        ],
        verify: true,
      },
      {
        h: 'Lift and efficiency',
        p: [
          'Lift is the difference between condensing and evaporating pressure (roughly, condenser water temperature minus chilled water temperature). More lift = more compressor work = more kW per ton.',
          'Warmer chilled water and cooler condenser water both lower lift. That is why modern halls run chilled water in the 55–65 °F range and why towers are pushed to make cold water when it is cool outside, within the chiller’s minimum condenser water limit.',
          'A water-cooled plant commonly runs about 0.4–0.7 kW/ton at the chiller at full load, less at part load in mild weather.',
        ],
        verify: true,
      },
      {
        h: 'Safeties and restart',
        p: [
          'Chillers protect themselves: low evaporator pressure (freeze), high condenser pressure (head), low oil pressure, motor overload, low flow (flow switch). A trip usually needs a cause found and a manual reset.',
          'Anti-short-cycle timers stop a compressor restarting too soon. During a cooling emergency the restart takes minutes, which is why stored cold (TES) and staging matter.',
          'Only EPA Section 608-certified technicians handle refrigerant. Never vent it.',
        ],
        verify: true,
      },
    ],
    readings: [
      { what: 'Chilled water supply temperature', normal: 'At setpoint ±1 °F (commonly 45–65 °F / 7–18 °C, by design)', act: 'Rising above setpoint: check chiller staging, alarms, flow. Note the trend start time.' },
      { what: 'Chilled water ΔT (return − supply)', normal: 'Near design, commonly 10–16 °F (6–9 °C)', act: 'Low ΔT: too much flow or bypassing coils. Report; it wastes pumping and chiller capacity.' },
      { what: 'Condenser water entering', normal: 'Commonly 65–85 °F (18–29 °C), above the chiller’s minimum', act: 'High: tower problem, high head pressure risk. Too cold at startup: can trip on low lift.' },
      { what: 'Evaporator and condenser approach', normal: 'Small and steady (often 1–3 °F clean)', act: 'Rising over weeks: tubes fouling or charge low. Trend it and plan tube cleaning.' },
      { what: 'Compressor amps / % load', normal: 'Steady, under rated load amps', act: 'Hunting or at the limit: check load, lift and alarms.' },
      { what: 'Oil pressure, oil temp, sight glass', normal: 'In the manufacturer’s range; no bubbles or foam where the manual says a full sight glass', act: 'Out of range: pre-alarm. Never override an oil safety.' },
      { what: 'Purge run time (low-pressure machines)', normal: 'Low and steady', act: 'Rising: air leaking in. Report for a leak check.' },
    ],
    failures: [
      { mode: 'High head pressure trip', signs: 'Condenser water hot, tower fans maxed, fouled condenser tubes, approach rising.', then: 'Chiller trips; CHW supply rises; standby chiller or TES must pick up.' },
      { mode: 'Low evaporator pressure / freeze protection', signs: 'Low CHW flow, low charge, CHW setpoint too low.', then: 'Trip to protect tubes from freezing; a frozen tube bundle is a long, costly repair.' },
      { mode: 'Loss of flow', signs: 'Pump trip, closed valve, clogged strainer; flow switch opens.', then: 'Chiller trips on flow. Respect the minimum evaporator flow before restart.' },
      { mode: 'Refrigerant leak', signs: 'Low subcooling, rising superheat, refrigerant monitor alarm in the plant room.', then: 'Capacity drops; refrigerant in the room can displace oxygen. Follow the room alarm procedure.' },
      { mode: 'Short cycling', signs: 'Frequent starts, anti-short-cycle lockouts, load too small for the chiller.', then: 'Motor and compressor wear; long waits when you actually need it.' },
    ],
    tips: ['memory-ccme-the-refrigeration-circle', 'memory-superheat-suction-subcooling-liquid', 'refrig-high-head-pressure-suspects', 'refrig-rising-approach-dirty-tubes', 'refrig-respect-anti-short-cycle-timers', 'refrig-never-vent-refrigerant', 'refrig-too-cold-condenser-water-hurts-too'],
    practice: [
      { kind: 'lesson', id: 'chiller-cycle' },
      { kind: 'proc', id: 'mop-chiller-pm' },
      { kind: 'proc', id: 'drill-chiller' },
    ],
    quiz: [
      { id: 'dd-ch-1', q: 'In CCME, what does the metering device do?', choices: ['Raises refrigerant pressure', 'Drops refrigerant pressure so it gets cold', 'Rejects heat to condenser water', 'Boils refrigerant using chilled water heat'], answer: 1, why: 'Compressor → Condenser → Metering device (pressure drop) → Evaporator.' },
      { id: 'dd-ch-2', q: 'Condenser approach has crept up 3 °F over two months. Most likely:', choices: ['Normal aging, ignore', 'Fouled condenser tubes (or a refrigerant problem): trend it and plan cleaning', 'Chilled water too warm', 'A bad flow switch'], answer: 1, why: 'Approach is the heat-transfer health check. Rising approach = dirty tubes or charge issues.' },
      { id: 'dd-ch-3', q: 'Which change lowers chiller kW/ton?', choices: ['Colder chilled water and hotter condenser water', 'Warmer chilled water and cooler condenser water', 'More pumps running', 'Higher lift'], answer: 1, why: 'Both reduce lift, so the compressor does less work per ton.' },
      { id: 'dd-ch-4', q: 'Superheat is measured on the:', choices: ['Liquid line leaving the condenser', 'Suction line leaving the evaporator', 'Condenser water return', 'Discharge line'], answer: 1, why: 'Superheat = suction; subcooling = liquid line.' },
    ],
  },
  // --------------------------------------------------------------------
  {
    id: 'heat-rejection',
    topics: [
      {
        h: 'Wet bulb, range and approach',
        p: [
          'An evaporative cooling tower can only cool water toward the outdoor wet-bulb temperature, never below it.',
          'Range = hot water in minus cold water out (often about 10 °F at design). Approach = cold water out minus wet bulb (often 5–10 °F). A rising approach at the same load and wet bulb means lost capacity: fouled fill, clogged nozzles, a fan problem.',
        ],
        verify: true,
      },
      {
        h: 'Waterside economizer and plate heat exchanger',
        p: [
          'When the wet bulb is low enough, tower water can cool the chilled water directly through a plate-and-frame heat exchanger, with chillers off or helping. That is free cooling.',
          'A plate HX runs a small approach (often 2–4 °F). Watch the pressure drop across each side: a rising drop means plates are fouling and need cleaning.',
          'Dry coolers and air-cooled condensers use outdoor dry-bulb instead; they use no water but lose capacity on hot days.',
        ],
        verify: true,
      },
      {
        h: 'Water treatment',
        p: [
          'Evaporation leaves minerals behind. Cycles of concentration (commonly about 3–6) compare tower water with make-up water. Blowdown bleeds off concentrated water to control scale; chemicals control corrosion and biology.',
          'Biological control matters for health: sites keep a water management program for Legionella (ASHRAE 188 is the common standard). Follow your treatment program and log the readings.',
          'Closed chilled water loops get their own inhibitor program and should lose almost no water; steady make-up to a closed loop means a leak.',
        ],
        verify: true,
      },
      {
        h: 'Winter operation',
        p: [
          'Basin heaters, bypass to the basin, and fan cycling keep ice off. Watch for ice on the fill and inlet louvers; ice can collapse fill or block air.',
        ],
      },
    ],
    readings: [
      { what: 'Tower leaving water temperature', normal: 'At setpoint, and about 5–10 °F above wet bulb at full load', act: 'Approach growing at the same wet bulb: check fill, nozzles, fans.' },
      { what: 'Fan speed / VFD', normal: 'Following the leaving-water setpoint; no fault', act: 'VFD fault: run per the site plan (bypass if allowed); report.' },
      { what: 'Basin level and make-up valve', normal: 'Steady at the normal mark; make-up valve not stuck open', act: 'Low: check make-up supply and leaks. Overflowing: valve stuck.' },
      { what: 'Conductivity (blowdown control)', normal: 'Inside the treatment program’s band', act: 'High: blowdown not working; scale risk. Tell the treatment provider.' },
      { what: 'Vibration switch / gearbox oil', normal: 'No trip; oil at the mark, clean', act: 'Vibration trip: look before reset (loose blade, bearing).' },
      { what: 'Plate HX pressure drop (each side)', normal: 'Close to the commissioning value', act: 'Rising: fouling; plan cleaning.' },
    ],
    failures: [
      { mode: 'Lost capacity on a hot day', signs: 'Approach rising, fans at 100%, condenser water climbing.', then: 'Chiller head pressure climbs to a trip.' },
      { mode: 'Fan or VFD failure', signs: 'Vibration trip, VFD fault, motor overload.', then: 'That cell stops rejecting heat; others must cover.' },
      { mode: 'Scale and biofouling', signs: 'Conductivity high, deposits on fill, slime, chemical feed alarms.', then: 'Lost heat transfer, health risk, chiller tube fouling.' },
      { mode: 'Basin low / make-up lost', signs: 'Level falling, make-up valve or supply problem.', then: 'Pumps cavitate and trip on low level.' },
      { mode: 'Freezing', signs: 'Ice on louvers and fill, basin heater fault.', then: 'Fill damage, blocked airflow, broken lines.' },
    ],
    tips: ['towers-wet-bulb-sets-the-floor', 'towers-vibration-trip-look-first', 'towers-blowdown-keeps-water-clean', 'towers-fouled-fill-loses-capacity', 'towers-watch-the-make-up-valve', 'towers-follow-the-water-program', 'pinch-tower-fan-vfd-faulted'],
    practice: [
      { kind: 'lesson', id: 'heat-path' },
      { kind: 'proc', id: 'drill-towers' },
    ],
    quiz: [
      { id: 'dd-tw-1', q: 'Wet bulb is 75 °F. What is the lowest leaving water an evaporative tower can make?', choices: ['About 65 °F', 'Somewhat above 75 °F', 'Exactly the dry bulb', 'Any temperature with enough fan'], answer: 1, why: 'A tower cools toward wet bulb and always runs some approach above it.' },
      { id: 'dd-tw-2', q: 'Approach rose from 7 °F to 12 °F at the same load and wet bulb. Check:', choices: ['Chiller oil', 'Fill, nozzles and fans', 'UPS load', 'CRAH filters'], answer: 1, why: 'Higher approach at the same conditions means the tower lost capacity.' },
      { id: 'dd-tw-3', q: 'Blowdown controls:', choices: ['Fan speed', 'Mineral concentration (cycles) to limit scale', 'Chilled water temperature', 'Basin heater'], answer: 1, why: 'Bleeding concentrated water keeps dissolved solids in the program’s band.' },
      { id: 'dd-tw-4', q: 'A closed chilled water loop needs steady make-up water. That means:', choices: ['Normal evaporation', 'A leak somewhere in the loop', 'Good treatment', 'The tower is working hard'], answer: 1, why: 'A closed loop should lose almost nothing. Find the leak.' },
    ],
  },
  // --------------------------------------------------------------------
  {
    id: 'pumps',
    topics: [
      {
        h: 'VFD pumps and differential pressure',
        p: [
          'Most chilled water pumps run on VFDs that hold a differential pressure (DP) setpoint, measured near the far end of the loop, so the farthest coil always has enough pressure.',
          'Affinity laws: flow follows speed, head follows speed squared, power follows speed cubed. Running at 80% speed takes about half the power.',
        ],
        verify: true,
      },
      {
        h: 'Cavitation and NPSH',
        p: [
          'If suction pressure falls too low, water flashes to vapor at the impeller and the bubbles collapse: it sounds like gravel. Causes: low tank or basin level, clogged suction strainer, a throttled suction valve, hot water.',
          'Cavitation eats impellers and seals. Fix the suction side; never throttle the suction valve to control flow.',
        ],
      },
      {
        h: 'Valves, strainers, expansion tank, air',
        p: [
          'Strainers: watch the pressure drop across them; clean when it rises well above the clean value (for example, when it doubles).',
          'Expansion tank: absorbs the water’s expansion and holds the system pressure. Its air side is precharged to the fill pressure at the tank. A waterlogged tank makes pressure swing with temperature and lifts relief valves.',
          'Air in the loop gurgles, blocks coils and hurts pumps. Vent the high points after work.',
          'Close big valves slowly to avoid water hammer. Seals: a mechanical seal should not drip; packing is meant to drip a few drops a minute.',
        ],
        verify: true,
      },
    ],
    readings: [
      { what: 'Loop DP at the remote sensor', normal: 'At setpoint (example: about 15 psi / 100 kPa)', act: 'Low with pump at 100%: a stuck bypass, closed valve or failing pump.' },
      { what: 'Pump suction and discharge pressure', normal: 'Steady; difference matches the pump curve at that flow', act: 'Suction low or swinging: strainer, level or air. Listen for cavitation.' },
      { what: 'VFD speed and motor amps', normal: 'Speed follows load; amps under motor FLA', act: 'Amps high at low speed: mechanical binding or wrong rotation after work.' },
      { what: 'Strainer pressure drop', normal: 'Near its clean value (a few psi)', act: 'About double the clean value: schedule cleaning (isolate per procedure).' },
      { what: 'Expansion tank / system fill pressure', normal: 'Steady at the design fill pressure', act: 'Swinging with temperature: tank may be waterlogged; report.' },
      { what: 'Seal / bearing', normal: 'Mechanical seal dry; bearings warm, not hot; no new noise', act: 'Dripping seal or hot bearing: report and plan a swap to standby.' },
    ],
    failures: [
      { mode: 'Pump trip', signs: 'VFD fault, motor overload, low suction pressure.', then: 'Standby pump should start; if it doesn’t, flow drops and chillers trip on flow.' },
      { mode: 'Cavitation', signs: 'Gravel noise, swinging pressure, low suction.', then: 'Impeller and seal damage, then failure.' },
      { mode: 'Seal leak', signs: 'Water at the pump base, stream from the seal.', then: 'Leak grows; water near electrical gear; loop loses pressure.' },
      { mode: 'Air-bound loop', signs: 'Gurgling, coils not cooling at the high points, DP unstable.', then: 'Lost cooling in parts of the hall.' },
    ],
    tips: ['water-cavitation-sounds-like-gravel', 'water-watch-strainer-pressure-drop', 'water-vent-the-high-points', 'water-low-delta-t-means-too-much-flow', 'water-close-valves-slowly', 'water-check-the-expansion-tank', 'water-check-rotation-after-work', 'pinch-standby-pump-won-t-start'],
    practice: [
      { kind: 'lesson', id: 'cooling-failure' },
      { kind: 'proc', id: 'drill-chiller' },
    ],
    quiz: [
      { id: 'dd-pump-1', q: 'A pump running at 80% speed uses roughly what share of full-speed power?', choices: ['80%', 'About 64%', 'About 51%', '20%'], answer: 2, why: 'Power follows speed cubed: 0.8³ ≈ 0.51.' },
      { id: 'dd-pump-2', q: 'A pump sounds like it is pumping gravel. Most likely:', choices: ['Bearing grease', 'Cavitation from low suction pressure', 'Normal at high speed', 'Air in the motor'], answer: 1, why: 'Vapor bubbles collapsing at the impeller. Check strainer, level and suction valve.' },
      { id: 'dd-pump-3', q: 'Why is the DP sensor usually near the far end of the loop?', choices: ['Easier wiring', 'So the farthest coil always has enough pressure', 'Code requires it', 'To read pump head'], answer: 1, why: 'Holding DP at the far end guarantees flow to the hardest coil to reach, at the lowest pump speed.' },
    ],
  },
  // --------------------------------------------------------------------
  {
    id: 'tes',
    topics: [
      {
        h: 'Stratified tank and thermocline',
        p: [
          'A chilled water storage tank keeps cold water at the bottom and warm water at the top, separated by a thin mixing layer: the thermocline.',
          'Charging pushes cold water in at the bottom; discharging draws it out to the loop. Sensors up the tank show where the thermocline is, which tells you how much cold is left.',
        ],
      },
      {
        h: 'Ride-through',
        p: [
          'On a chiller trip or power event, the tank carries the cooling load while chillers restart (anti-short-cycle timers and restart sequences take minutes).',
          'Know how many minutes of full load your tank holds at the current charge. Recharge before the next event.',
        ],
        verify: true,
      },
    ],
    readings: [
      { what: 'Charge %', normal: 'Near full in normal operation', act: 'Low and not recharging: check chiller capacity and valves.' },
      { what: 'Tank bottom / top temperatures', normal: 'Bottom near CHW supply; top near return', act: 'Bottom warming: thermocline has moved down; little cold left.' },
      { what: 'Charge/discharge flow', normal: 'Matches the mode on the BMS', act: 'Discharging with chillers healthy: a mode or valve problem.' },
    ],
    failures: [
      { mode: 'Mixing', signs: 'Thermocline thickens; temperatures blur up the tank.', then: 'Usable cold drops; ride-through shorter than planned.' },
      { mode: 'Not recharged after an event', signs: 'Charge stays low after chillers return.', then: 'The next event finds an empty tank.' },
    ],
    tips: ['pinch-chiller-down-use-the-stored-cold', 'refrig-chillers-restart-slowly'],
    practice: [
      { kind: 'proc', id: 'drill-chiller' },
      { kind: 'lesson', id: 'cooling-failure' },
    ],
    quiz: [
      { id: 'dd-tes-1', q: 'What is the thermocline?', choices: ['The tank’s level sensor', 'The thin mixing layer between cold water below and warm water above', 'The discharge valve', 'The chilled water setpoint'], answer: 1, why: 'Its position tells you how much cold water is left.' },
      { id: 'dd-tes-2', q: 'Why does a site need tank ride-through if it has standby chillers?', choices: ['It doesn’t', 'Chillers take minutes to restart and load (anti-short-cycle, sequences)', 'Chillers can’t run on generator', 'Code requires tanks'], answer: 1, why: 'The tank covers the gap while chillers restart.' },
    ],
  },
  // --------------------------------------------------------------------
  {
    id: 'air-handling',
    topics: [
      {
        h: 'CRAC, CRAH, in-row and rear-door',
        p: [
          'CRAH: a chilled water coil and fans. CRAC: has its own compressor (direct expansion) and a condenser outside or a glycol loop.',
          'In-row coolers sit between racks and take hot air straight from the hot aisle. Rear-door heat exchangers (RDHx) put a coil on the back of the rack so exhaust air is cooled before it leaves.',
        ],
      },
      {
        h: 'Air management',
        p: [
          'Every empty U gets a blanking panel; every floor cutout is sealed; perforated tiles only in cold aisles; containment doors closed.',
          'Recirculation (hot air back into server inlets) raises inlet temps; bypass (cold air back to the units without passing through IT) wastes fan energy. Measure inlets at the bottom, middle and top of racks.',
          'Control on supply air (or rack inlet) temperature is steadier than control on return air.',
        ],
      },
      {
        h: 'Humidity and dew point',
        p: [
          'Dew point is the humidity number that matters in a data hall: it doesn’t change as the air warms through the servers, unlike relative humidity.',
          'ASHRAE TC 9.9 gives recommended and allowable envelopes by class (A1–A4) in temperature and dew point; recent editions recommend about 64–81 °F (18–27 °C) inlet with an upper dew point near 59 °F (15 °C). Your site sets its own limits.',
          'A coil colder than the air’s dew point condenses water: keep condensate pans and pumps flowing.',
        ],
        verify: true,
      },
    ],
    readings: [
      { what: 'Supply air temperature', normal: 'At setpoint (commonly about 65–75 °F / 18–24 °C)', act: 'High with valve 100% open: check CHW supply temp and flow.' },
      { what: 'Return air temperature / coil air ΔT', normal: 'Commonly 15–25 °F above supply with good containment', act: 'Low ΔT: bypass air or oversupply; check containment and fan speed.' },
      { what: 'Filter pressure drop', normal: 'Under the filter’s change point (e.g. clean ~0.2–0.3 in. w.c.)', act: 'At the change point: schedule a filter change per MOP.' },
      { what: 'Fan speed', normal: 'Following demand (e.g. 40–90%)', act: 'One unit at 100% and others low: a local hot spot or failed neighbor.' },
      { what: 'Rack inlet (bottom / middle / top)', normal: 'Inside the site’s limits; top within a few °F of bottom', act: 'Top much hotter: recirculation. Check blanking and containment.' },
      { what: 'Condensate pan / pump', normal: 'Dry or draining; pump cycling', act: 'Water in the pan or a pump alarm: clear it before it overflows.' },
    ],
    failures: [
      { mode: 'Unit trip / fan failure', signs: 'Unit alarm, local hot spot, neighbors ramp up.', then: 'Nearby racks heat up; with too many down, the hall overheats.' },
      { mode: 'Clogged filters', signs: 'Filter ΔP rising, fans at higher speed for the same air.', then: 'Less airflow, higher fan energy.' },
      { mode: 'Condensate overflow', signs: 'Water around the unit, leak detection alarm, pump alarm.', then: 'Water under the floor near power cables.' },
      { mode: 'Recirculation', signs: 'Hot rack tops, missing blanking panels, open containment doors.', then: 'Servers throttle or shut down even though units are fine.' },
    ],
    tips: ['air-watch-filter-pressure-drop', 'air-blank-every-empty-u', 'air-seal-floor-cutouts', 'air-measure-inlets-at-three-heights', 'air-dew-point-is-the-humidity-number', 'air-close-the-containment-doors', 'pinch-ec-fans-lost-speed-signal-full-speed'],
    practice: [
      { kind: 'lesson', id: 'crah-crac' },
      { kind: 'proc', id: 'mop-crah-filters' },
      { kind: 'proc', id: 'drill-ups-room' },
    ],
    quiz: [
      { id: 'dd-air-1', q: 'What is the difference between a CRAH and a CRAC?', choices: ['Size only', 'CRAH uses a chilled water coil; CRAC has its own compressor', 'CRAC is for humidity only', 'CRAH has no fans'], answer: 1, why: 'CRAH = chilled water air handler; CRAC = direct-expansion unit with a compressor.' },
      { id: 'dd-air-2', q: 'Rack tops run 12 °F hotter than bottoms. First check:', choices: ['Chiller setpoint', 'Blanking panels and containment (recirculation)', 'Generator', 'Water treatment'], answer: 1, why: 'Hot tops point to hot air wrapping back into inlets.' },
      { id: 'dd-air-3', q: 'Why use dew point instead of RH in a data hall?', choices: ['It is easier to measure', 'Dew point stays the same as air warms; RH changes', 'RH is not allowed', 'Dew point is always lower'], answer: 1, why: 'The same air has different RH at the inlet and exhaust, but one dew point.' },
    ],
  },
  // --------------------------------------------------------------------
  {
    id: 'cdu',
    topics: [
      {
        h: 'Liquid cooling basics',
        p: [
          'High-density racks move heat with liquid: cold plates on chips, or rear-door coils. A coolant distribution unit (CDU) separates the facility water loop from a clean secondary loop that goes to the racks.',
          'The CDU’s heat exchanger, pumps and controls hold the secondary supply temperature and pressure. Many systems run warm water (commonly about 86–113 °F / 30–45 °C supply on the secondary).',
        ],
        verify: true,
      },
      {
        h: 'Coolant quality and filtration',
        p: [
          'Secondary coolant is often treated water or a propylene glycol mix. Fine filters protect tiny cold-plate channels. Check glycol strength, conductivity and filter pressure drop per the program.',
        ],
        verify: true,
      },
      {
        h: 'Leak detection',
        p: [
          'Leak detection cable runs under the CDU, along manifolds and under racks. It alarms by zone and often by distance along the cable. A leak alarm is never a nuisance until someone has looked.',
          'Ride-through is short: chips heat up within seconds to minutes without flow, so pump redundancy and power to the CDU matter.',
        ],
      },
    ],
    readings: [
      { what: 'Secondary supply temperature', normal: 'At setpoint (example: 86–113 °F / 30–45 °C, by design)', act: 'Rising: check facility water, valve and pumps.' },
      { what: 'Secondary flow and DP', normal: 'At design; redundant pump in standby', act: 'Low: filter, air or pump problem; servers heat fast.' },
      { what: 'Filter pressure drop', normal: 'Under the change point', act: 'Rising: schedule a change per the procedure.' },
      { what: 'Reservoir level / make-up', normal: 'Steady', act: 'Falling: leak somewhere on the secondary loop.' },
      { what: 'Leak detection panel', normal: 'Normal, no zone alarms or cable faults', act: 'Alarm: go look at that zone now.' },
    ],
    failures: [
      { mode: 'Pump failure', signs: 'Pump alarm, flow drop, standby start.', then: 'If the standby fails, rack temps climb within minutes.' },
      { mode: 'Leak', signs: 'Leak alarm, falling reservoir, drips at quick-disconnects.', then: 'Water on IT gear; affected racks may need shutdown.' },
      { mode: 'Facility water problem', signs: 'Primary supply hot or flow low; secondary temp rises.', then: 'CDU can’t hold its setpoint.' },
    ],
    tips: ['water-leak-alarms-are-never-nuisance', 'water-test-glycol-strength', 'pinch-water-on-the-floor'],
    practice: [
      { kind: 'lesson', id: 'liquid-cooling' },
      { kind: 'proc', id: 'drill-cdu' },
    ],
    quiz: [
      { id: 'dd-cdu-1', q: 'Why does a CDU keep a separate secondary loop?', choices: ['To save water', 'So clean, controlled coolant reaches the racks, apart from facility water', 'Code requires two loops everywhere', 'To make the water colder than chilled water'], answer: 1, why: 'The heat exchanger isolates facility water from the clean, filtered rack loop.' },
      { id: 'dd-cdu-2', q: 'Leak detection alarms in zone 3. You:', choices: ['Silence it, it’s often wet floor cleaning', 'Go look at zone 3 now', 'Wait for a second alarm', 'Shut down the CDU'], answer: 1, why: 'Every leak alarm gets eyes on it. Then act per the site response.' },
    ],
  },
  // --------------------------------------------------------------------
  {
    id: 'doas',
    topics: [
      {
        h: 'What the DOAS does',
        p: [
          'A dedicated outdoor air system brings in filtered, conditioned outdoor air to keep the hall slightly positive (so dust stays out) and to control humidity.',
          'Energy recovery wheels or plates pre-condition the outdoor air with exhaust or return air.',
        ],
      },
      {
        h: 'Pressure and dew point',
        p: [
          'Hall pressure is usually held a small amount positive to the surrounding spaces (a few hundredths of an inch of water column).',
          'The DOAS controls dew point: dehumidify in humid weather, humidify (if the site does) in very dry weather.',
        ],
        verify: true,
      },
    ],
    readings: [
      { what: 'Hall pressure', normal: 'Slightly positive (e.g. +0.01 to +0.05 in. w.c.)', act: 'Negative: doors propped, DOAS off or exhaust running. Dust and humidity get in.' },
      { what: 'Hall dew point', normal: 'Inside the site’s envelope', act: 'Drifting: check DOAS mode, coil and wheel.' },
      { what: 'Filters and wheel', normal: 'ΔP below change point; wheel turning', act: 'Wheel stopped: belt or motor; report.' },
    ],
    failures: [
      { mode: 'DOAS trip', signs: 'Pressure falls toward zero, dew point drifts.', then: 'Dust and humidity creep in; corrosion and static risks grow over time.' },
      { mode: 'Wheel failure', signs: 'Wheel stopped, supply air off temperature.', then: 'Higher energy use; may not hold dew point.' },
    ],
    tips: ['air-dew-point-is-the-humidity-number', 'air-keep-condensate-flowing'],
    practice: [{ kind: 'lesson', id: 'doas-humidity' }],
    quiz: [
      { id: 'dd-doas-1', q: 'Why keep the hall slightly positive?', choices: ['To cool it', 'So air leaks out, keeping dust and humid air from leaking in', 'For fire suppression', 'Code requires negative'], answer: 1, why: 'Positive pressure pushes air out through gaps, keeping contaminants out.' },
      { id: 'dd-doas-2', q: 'Hall pressure reads slightly negative. A likely cause:', choices: ['Chiller trip', 'A propped-open door or the DOAS off', 'UPS on bypass', 'High CHW supply'], answer: 1, why: 'Open doors and a stopped DOAS are the usual causes.' },
    ],
  },
];
