/**
 * Equipment guide: one entry per equipment family.
 *
 * Generic, publicly documented practice only. Intervals are typical
 * starting points; the manufacturer's manual, the site's maintenance
 * program (e.g. one built on NFPA 70B) and the AHJ always win.
 */
import type { ComponentKind } from '../sim';

export interface Troubleshoot {
  symptom: string;
  causes: string[];
  checks: string[];
}

export interface EquipmentGuide {
  id: string;
  title: string;
  group: 'Electrical' | 'Mechanical' | 'Life safety';
  kinds: ComponentKind[];
  summary: string;
  howItWorks: string[];
  rounds: string[];
  pm: { interval: string; task: string }[];
  troubleshooting: Troubleshoot[];
  neverDo: string[];
  hazards: string[];
  changeTriggers: string[];
}

export const EQUIPMENT: EquipmentGuide[] = [
  // ======================================================================
  // ELECTRICAL
  // ======================================================================
  {
    id: 'utility-mv',
    title: 'Utility service & MV switchgear',
    group: 'Electrical',
    kinds: ['utility', 'mv-switchgear'],
    summary: 'Where the building takes power from the grid, usually at medium voltage (e.g. 12.47 kV or higher), through protective relays and breakers.',
    howItWorks: [
      'The utility delivers medium-voltage power to the site. Many sites take two services from different substations or feeders, so one utility event does not take out both.',
      'MV switchgear holds the breakers and protective relays. Relays watch current and voltage and trip a breaker within cycles if they see a fault, isolating the problem before it spreads.',
      'Relay settings come from a coordination study, so the breaker closest to a fault trips first and everything upstream stays closed.',
    ],
    rounds: [
      'Relay front panels: no targets/flags, no alarm LEDs, healthy self-test status.',
      'Breaker position indicators match the normal one-line (open/closed as expected).',
      'DC control battery and charger for the trip circuits: charger in float, no ground-fault alarm.',
      'Room: no unusual noise (buzzing, crackling), smell of ozone or burning, water intrusion, or pests.',
      'Space heaters (in outdoor gear) working to keep out condensation.',
      'Note utility voltage and frequency on the meter; record any sags in the log.',
    ],
    pm: [
      { interval: 'Monthly', task: 'Visual inspection; trip-circuit battery and charger check.' },
      { interval: 'Annually', task: 'Infrared (thermographic) scan under load, done by qualified staff in proper PPE or through IR windows.' },
      { interval: '1–3 years', task: 'Breaker exercise, clean and inspect; insulation resistance tests; partial discharge survey; relay testing/calibration by a qualified testing firm (shutdown required for much of this).' },
      { interval: 'After any fault', task: 'Inspect and test the breaker that interrupted the fault before returning it to service.' },
    ],
    troubleshooting: [
      {
        symptom: 'Relay target / breaker tripped',
        causes: ['Downstream fault', 'Utility disturbance', 'Relay misoperation or wrong setting'],
        checks: ['Do NOT reclose blindly', 'Record relay targets and event records before resetting', 'Get qualified electrical staff and engineering involved; find and clear the cause first'],
      },
      {
        symptom: 'Partial discharge or ozone smell',
        causes: ['Insulation breakdown', 'Contamination or moisture on insulators'],
        checks: ['Treat as a potential arc-flash risk: limit entry', 'Schedule an outage for inspection', 'Check space heaters and HVAC humidity'],
      },
    ],
    neverDo: [
      'Never open MV switchgear doors or rack MV breakers unless you are qualified, authorized, and wearing the PPE the arc-flash label requires.',
      'Never reclose a breaker that tripped on a fault without finding the cause.',
      'Never defeat a relay, interlock, or trip circuit to "keep the lights on".',
      'Never assume a feeder is dead because the utility says so. Test for absence of voltage yourself.',
    ],
    hazards: ['Arc flash and arc blast (highest incident energy on site)', 'Shock from MV and induced/back-fed voltage', 'Stored energy in breaker springs'],
    changeTriggers: ['Any relay setting change', 'Utility rate/service changes', 'Adding load or new feeders', 'Breaker replacement with a different model'],
  },
  {
    id: 'transformer',
    title: 'Transformers',
    group: 'Electrical',
    kinds: ['transformer'],
    summary: 'Step medium voltage down to building voltage (commonly 480 V). Liquid-filled units sit outdoors; dry-type units sit indoors.',
    howItWorks: [
      'Two windings on an iron core: AC current in the primary creates a changing magnetic field that induces a lower voltage in the secondary.',
      'Losses become heat. Liquid-filled units cool with oil and radiators (sometimes fans); dry types use air and fans.',
      'Heat is what ages insulation. Running hot shortens life far more than running near rated load at normal temperature.',
    ],
    rounds: [
      'Winding/oil temperature gauge and max-temp drag pointer; reset only after logging.',
      'Cooling fans running when they should be; radiators clear of debris.',
      'Oil level and pressure/vacuum gauge in normal range; no leaks under the unit.',
      'No unusual humming or vibration; enclosure doors locked.',
    ],
    pm: [
      { interval: 'Annually', task: 'Infrared scan of connections; oil sample for dissolved gas analysis (liquid-filled).' },
      { interval: '3–5 years', task: 'Insulation resistance, turns ratio and winding resistance testing (outage required); clean and torque connections (dry type).' },
    ],
    troubleshooting: [
      {
        symptom: 'High temperature alarm',
        causes: ['Overload', 'Fan failure', 'Blocked radiators or vents', 'Harmonic heating'],
        checks: ['Compare load to nameplate', 'Verify fans run (test switch)', 'Clear airflow', 'Ask engineering to review harmonics'],
      },
      {
        symptom: 'Rising combustible gases in oil sample',
        causes: ['Internal arcing or overheating'],
        checks: ['Increase sampling frequency', 'Plan replacement or internal inspection with engineering'],
      },
    ],
    neverDo: [
      'Never open a transformer enclosure while energized unless you are qualified and in the PPE the label requires.',
      'Never ignore a drag pointer that hit high temperature. Log it and find out why.',
      'Never top off or sample oil from an energized unit without the procedure and qualification.',
    ],
    hazards: ['Arc flash at terminals', 'Hot surfaces', 'Fire risk with mineral oil'],
    changeTriggers: ['Load additions', 'Tap setting changes', 'Replacement with different impedance (changes fault current and arc-flash labels)'],
  },
  {
    id: 'generator',
    title: 'Standby generators & paralleling switchgear',
    group: 'Electrical',
    kinds: ['generator', 'paralleling-bus'],
    summary: 'Diesel engines driving alternators that carry the site when the utility is lost. Paralleling gear syncs several gensets onto one bus.',
    howItWorks: [
      'On a start signal, the starter cranks the engine. Once it reaches rated speed and voltage, the paralleling controller matches frequency, voltage and phase angle with the bus and closes the generator breaker. A typical target is under 10 seconds.',
      'Load is shared between running units. If one unit fails, load-shed logic may drop lower-priority loads so the rest are not overloaded.',
      'Block heaters keep the engine warm so it can accept load quickly. Starting batteries are the most common cause of a failure to start.',
      'Fuel flows from bulk tanks to a day tank on or near each engine. Fuel quality matters: diesel degrades and grows microbes if left untreated.',
    ],
    rounds: [
      'Control panel in AUTO, no alarms; engine not in "off" or "manual".',
      'Block heater on and jacket water warm to the touch (check the gauge, don\'t touch).',
      'Starting battery voltage and charger status; no corrosion on terminals.',
      'Day tank and bulk tank levels; fuel transfer pumps in auto; no leaks or fuel smell.',
      'Coolant level, oil level (if checkable without running), belts, hoses, and any fluid on the floor.',
      'Air intake and radiator clear; louvers/dampers free to open.',
    ],
    pm: [
      { interval: 'Weekly', task: 'Inspection per NFPA 110 (levels, batteries, heaters, leaks, alarms).' },
      { interval: 'Monthly', task: 'Exercise under load for at least 30 minutes (NFPA 110 calls for monthly exercise at a set minimum load or exhaust temperature). Record data.' },
      { interval: 'Annually', task: 'Load bank test if monthly loading is light; fuel quality test; oil and coolant analysis; full service by the manufacturer\'s technician.' },
      { interval: 'Every 3 years (Level 1)', task: 'Extended-duration load test per NFPA 110, commonly 4 hours.' },
    ],
    troubleshooting: [
      {
        symptom: 'Fail to start',
        causes: ['Weak/dead starting batteries', 'Control not in AUTO', 'Fuel supply issue or air in fuel lines', 'Emergency stop latched'],
        checks: ['Check panel mode and alarms first', 'Check battery voltage', 'Verify day tank level and fuel valves open', 'Escalate per EOP; manually start only if the procedure allows'],
      },
      {
        symptom: 'Fail to sync / won\'t close to bus',
        causes: ['Governor or voltage regulator problem', 'Sync controller fault'],
        checks: ['Check paralleling controller alarms', 'Remaining units may still carry load; check load-shed status'],
      },
      {
        symptom: 'High coolant temperature',
        causes: ['Radiator blocked', 'Fan belt failure', 'Low coolant', 'Hot day plus heavy load'],
        checks: ['Check louvers open and airflow clear', 'Check coolant level once safe (never open a hot cap)', 'Reduce load if possible'],
      },
      {
        symptom: 'Wet stacking (black, oily exhaust)',
        causes: ['Running at light load for long periods'],
        checks: ['Load bank test to burn off unburned fuel', 'Adjust testing to reach minimum load'],
      },
    ],
    neverDo: [
      'Never leave a generator out of AUTO without a tag, a reason, and the control room knowing.',
      'Never open a radiator cap on a hot engine.',
      'Never stand in line with rotating parts or exhaust during a start.',
      'Never bypass emissions-related run-hour limits. Non-emergency running time for emergency engines is regulated by the EPA.',
      'Never refuel or transfer fuel without spill controls in place.',
    ],
    hazards: ['Rotating machinery that can start automatically at any moment', 'Hot surfaces and exhaust (CO)', 'High noise: hearing protection', 'Fuel spills and fire', 'Battery acid and hydrogen'],
    changeTriggers: ['Load-shed priority changes', 'Controller software or setting changes', 'Fuel system modifications', 'Adding loads to the emergency system'],
  },
  {
    id: 'ats',
    title: 'Automatic transfer switches (ATS)',
    group: 'Electrical',
    kinds: ['ats'],
    summary: 'Senses loss of the normal source, calls the generators, and transfers load to the emergency source, then back when the utility is stable.',
    howItWorks: [
      'Voltage and frequency sensors watch both sources. A short time delay rides through blips before the generator start signal is sent.',
      'Once the emergency source is in tolerance, the switch transfers. Open transition is break-before-make: a short outage that the UPS covers. Closed transition briefly parallels the sources (make-before-break) and needs sync checking.',
      'After utility returns, a retransfer timer (often 5–30 minutes) proves it is stable before switching back. The generators then cool down unloaded.',
    ],
    rounds: [
      'Both source-available lights as expected; switch position matches the normal one-line.',
      'Controller in AUTO, no alarms, no "inhibit" or "test" active.',
      'Note transfer counter; any change means an event happened. Find out why.',
    ],
    pm: [
      { interval: 'Monthly', task: 'Transfer test together with the generator exercise, under load where the procedure allows.' },
      { interval: 'Annually', task: 'Inspect, clean, and torque; check contact wear; IR scan; verify timer settings against the settings record.' },
    ],
    troubleshooting: [
      {
        symptom: 'Did not transfer during outage',
        causes: ['Controller not in AUTO', 'Emergency source out of tolerance', 'Mechanism failure'],
        checks: ['Check controller mode and alarms', 'Check generator status', 'Manual transfer only per the EOP and with the right PPE'],
      },
      {
        symptom: 'Nuisance transfers',
        causes: ['Pickup/dropout settings too tight', 'Utility voltage sags'],
        checks: ['Compare settings to the record', 'Review power-quality meter data'],
      },
    ],
    neverDo: [
      'Never manually operate an ATS under load unless the procedure and the equipment allow it.',
      'Never change timer settings without a change record. They are part of the site\'s design.',
      'Never leave a switch in "test" or "inhibit".',
    ],
    hazards: ['Two sources inside one enclosure: both must be locked out to work inside', 'Arc flash'],
    changeTriggers: ['Timer or setpoint changes', 'Controller firmware', 'Load additions'],
  },
  {
    id: 'switchboard',
    title: 'Switchboards, breakers & main-tie-main',
    group: 'Electrical',
    kinds: ['breaker', 'bus'],
    summary: 'Low-voltage switchboards distribute power through main, tie, and feeder breakers. Main-tie-main lets one source feed both buses during maintenance.',
    howItWorks: [
      'Each bus normally has its own main breaker and source; the tie breaker is open.',
      'To maintain one source, operators open that main and close the tie, so the other source carries both buses. Kirk-key interlocks make sure only two of the three breakers can be closed, so the two sources are never paralleled.',
      'Breaker trip units are set from a coordination study so only the breaker closest to a fault trips. Arc-flash labels are calculated from the same study.',
    ],
    rounds: [
      'Breaker positions match the normal one-line; Kirk keys where they should be.',
      'Trip-unit displays: no alarms or pickups; record ammeter readings for trending.',
      'No heat, smell, buzzing; doors closed and latched; working space clear (36"+ in front, no storage).',
      'Arc-flash labels present and readable.',
    ],
    pm: [
      { interval: 'Annually', task: 'IR scan under load.' },
      { interval: '1–3 years', task: 'Breaker exercise, trip-unit test (primary or secondary injection), clean and torque, insulation resistance. Frequency depends on condition per NFPA 70B.' },
    ],
    troubleshooting: [
      {
        symptom: 'Feeder breaker tripped',
        causes: ['Overload', 'Short circuit or ground fault downstream'],
        checks: ['Read the trip-unit cause (long-time, short-time, instantaneous, ground)', 'Do not reset until the cause is understood'],
      },
      {
        symptom: 'Hot spot on IR scan',
        causes: ['Loose or corroded connection', 'Overloaded conductor'],
        checks: ['Rank severity by temperature rise', 'Schedule repair; urgent if severe'],
      },
    ],
    neverDo: [
      'Never cheat a Kirk-key interlock (spare keys, removing locks, forcing mechanisms).',
      'Never reset a breaker that tripped on short circuit or ground fault without investigating.',
      'Never store anything in front of electrical gear.',
      'Never operate a breaker you were not assigned in the switching order.',
    ],
    hazards: ['Arc flash during racking and operating', 'Back-feed through ties', 'Stored spring energy'],
    changeTriggers: ['Any breaker setting change', 'Adding feeders', 'Re-labeling or re-keying interlocks', 'Changing the normal breaker lineup'],
  },
  {
    id: 'ups',
    title: 'UPS systems & batteries',
    group: 'Electrical',
    kinds: ['ups'],
    summary: 'Double-conversion UPS modules give the critical load clean, uninterrupted power and carry it on battery until generators pick up.',
    howItWorks: [
      'Rectifier: AC to DC, which feeds the inverter and charges the battery. Inverter: DC back to clean AC. The load always runs through the inverter, so utility disturbances never reach it.',
      'If input fails, the battery feeds the inverter instantly; there is no transfer. Runtime depends on load: halving the load more than doubles runtime.',
      'Static bypass: a solid-state switch that connects the load directly to the bypass source if the inverter faults or is overloaded. The load stays up but is unprotected.',
      'Maintenance bypass: breakers that route around the UPS completely so it can be isolated for work. Kirk keys make sure this happens make-before-break while the UPS is already on static bypass.',
      'Batteries: VRLA lead-acid or lithium-ion strings. Battery failure is the most common cause of UPS failure to carry load.',
    ],
    rounds: [
      'Every module in NORMAL (inverter) mode; no alarms on the display.',
      'Load per module and per system: compare to the redundancy limit (e.g. in 2N, each side under 50%).',
      'Battery monitoring: string voltage, cell/jar voltages and temperatures, ohmic values trending.',
      'Battery room: temperature near 77 °F (25 °C), ventilation running, eyewash station ready, spill kit present, no swollen or leaking jars.',
      'Breaker lineup (input, bypass input, output, maintenance bypass) matches the normal one-line.',
    ],
    pm: [
      { interval: 'Monthly', task: 'Battery visual inspection and voltages (IEEE 1188 for VRLA, IEEE 450 for flooded).' },
      { interval: 'Quarterly', task: 'Ohmic (internal resistance) measurements per cell; trending.' },
      { interval: 'Semi-annual to annual', task: 'Manufacturer\'s preventive maintenance: filters, fans, capacitors check, firmware review, transfer tests; IR scan.' },
      { interval: 'As needed', task: 'Battery load (capacity) test when trending shows weakness; replace fans and capacitors on the maker\'s schedule (often 5–7 years).' },
    ],
    troubleshooting: [
      {
        symptom: 'UPS on battery',
        causes: ['Input power lost (utility, ATS, upstream breaker)', 'Rectifier fault'],
        checks: ['Check upstream: is the generator coming?', 'Watch runtime remaining', 'Follow the EOP: escalate early, don\'t wait for 2 minutes left'],
      },
      {
        symptom: 'UPS on static bypass',
        causes: ['Inverter fault', 'Overload', 'Commanded to bypass and left there'],
        checks: ['Check load %', 'Read the alarm log', 'Get the manufacturer involved; the load is unprotected'],
      },
      {
        symptom: 'High cell temperature or low ohmic value',
        causes: ['Failing jar', 'Room HVAC problem', 'Charger over-voltage'],
        checks: ['Check room temperature', 'Check float voltage', 'Plan jar replacement'],
      },
    ],
    neverDo: [
      'Never close a maintenance bypass breaker unless the UPS is on static bypass, and only in the order the MOP lists.',
      'Never open a UPS output breaker while it is carrying load with no other path. That drops the critical load.',
      'Never work on battery terminals without insulated tools, a face shield, and acid-rated gloves. DC arcs don\'t self-extinguish like AC.',
      'Never assume a UPS is dead because it is off. Capacitors and batteries hold energy.',
      'Never load a 2N system above what one side can carry alone.',
    ],
    hazards: ['DC arc flash and shock from battery strings', 'Stored energy in capacitors', 'Acid and hydrogen (VRLA/flooded), thermal runaway (Li-ion)'],
    changeTriggers: ['Firmware updates', 'Battery replacements (especially chemistry changes)', 'Adding load', 'Changing bypass settings'],
  },
  {
    id: 'bess',
    title: 'Battery energy storage (BESS)',
    group: 'Electrical',
    kinds: ['bess'],
    summary: 'A grid-scale battery yard with inverters. It can ride through utility sags, bridge to the generators, or peak-shave.',
    howItWorks: [
      'Battery racks (usually lithium-ion) connect to bidirectional power conversion systems (PCS) that charge from the grid or discharge into the bus.',
      'A battery management system (BMS) tracks state of charge (SOC), cell voltages and temperatures, and protects the cells.',
      'Sites keep a reserve SOC so there is always enough energy for ride-through, even if the BESS also earns money peak-shaving.',
    ],
    rounds: [
      'SOC and reserve setpoint; PCS status and alarms.',
      'Container HVAC running; cell temperature spread small.',
      'Fire detection and gas detection panels normal; access clear for fire department.',
    ],
    pm: [
      { interval: 'Monthly', task: 'Alarm and event review; HVAC filters; visual inspection.' },
      { interval: 'Annually', task: 'Capacity/health test per manufacturer; IR scan; fire-protection system testing per NFPA 855 and the AHJ.' },
    ],
    troubleshooting: [
      {
        symptom: 'Cell temperature rising',
        causes: ['HVAC failure', 'Failing cell'],
        checks: ['Check HVAC', 'Follow the manufacturer emergency procedure; know the thermal-runaway response plan'],
      },
      {
        symptom: 'SOC below reserve',
        causes: ['Recent discharge', 'Charging disabled'],
        checks: ['Verify charging is allowed', 'Tell operations that ride-through time is reduced'],
      },
    ],
    neverDo: [
      'Never enter a BESS container during an alarm or after a thermal event. Wait for the fire department and the manufacturer\'s procedure; toxic and flammable gases can build up.',
      'Never disable gas detection or ventilation.',
    ],
    hazards: ['Thermal runaway, fire and explosion', 'DC shock', 'Toxic off-gas'],
    changeTriggers: ['SOC reserve changes', 'Control mode changes (e.g. enabling peak-shave)', 'Firmware updates'],
  },
  {
    id: 'sts',
    title: 'Static transfer switches (STS)',
    group: 'Electrical',
    kinds: ['sts'],
    summary: 'Solid-state switches that move single-corded loads between two sources in about a quarter cycle.',
    howItWorks: [
      'SCRs (thyristors) conduct from the preferred source. If it fails, the STS switches to the alternate source in about 4 ms, too fast for IT power supplies to notice.',
      'The STS blocks transfers when the two sources are too far out of phase, to protect the load and the sources.',
      'The STS itself becomes a single point of failure for everything downstream, which is why dual-corded IT gear is preferred.',
    ],
    rounds: [
      'Both sources available and in sync; preferred source selected.',
      'No alarms; transfer counter unchanged (if it changed, find out why).',
      'Fans running; load within rating.',
    ],
    pm: [{ interval: 'Annually', task: 'Manufacturer\'s maintenance, IR scan, transfer test with load where the procedure allows.' }],
    troubleshooting: [
      {
        symptom: 'On alternate source',
        causes: ['Preferred source lost or out of tolerance'],
        checks: ['Find the upstream cause', 'Check retransfer settings'],
      },
      {
        symptom: 'Transfer inhibited',
        causes: ['Sources out of phase', 'Internal fault'],
        checks: ['Check upstream sources (one may be on generator or static bypass)'],
      },
    ],
    neverDo: ['Never use STS bypass switches without the MOP. Some positions drop the load.', 'Never assume the STS protects from its own failure.'],
    hazards: ['Two sources inside one cabinet', 'Arc flash'],
    changeTriggers: ['Setting changes', 'Source reassignments'],
  },
  {
    id: 'distribution',
    title: 'PDUs, RPPs & busway',
    group: 'Electrical',
    kinds: ['pdu', 'rpp', 'busway'],
    summary: 'The last stage of distribution on the data hall floor, feeding rack circuits.',
    howItWorks: [
      'A PDU usually contains a transformer (480 V to 208/120 V or 415/240 V) and panelboards. An RPP is a panelboard without a transformer.',
      'Busway runs overhead with plug-in tap boxes, making high-density rows quick to reconfigure.',
      'In 2N, each rack cord comes from a different side. Each cord must stay below about half its breaker\'s safe limit so it can carry the whole rack if its partner cord drops.',
    ],
    rounds: [
      'Branch circuit loads vs. limits (watch for any cord above ~40% in 2N).',
      'A and B side loads roughly balanced; investigate big differences.',
      'No hot smell, discolored breakers, or tripped branch breakers; labels match.',
    ],
    pm: [{ interval: 'Annually', task: 'IR scan, torque check on accessible connections, monitoring calibration, label audit.' }],
    troubleshooting: [
      {
        symptom: 'Branch breaker tripped',
        causes: ['Rack overload', 'Failed server power supply', 'Inrush on power-up'],
        checks: ['Coordinate with IT before resetting', 'Check the partner cord isn\'t now overloaded'],
      },
      {
        symptom: 'A/B imbalance',
        causes: ['Failed power supplies in servers', 'Single-corded gear plugged into one side'],
        checks: ['Ask IT to check power supply health', 'Audit the rack'],
      },
    ],
    neverDo: [
      'Never let either cord of a dual-corded rack go above the level its partner can absorb.',
      'Never re-label or move circuits without updating the records.',
      'Never open a PDU panel energized without being qualified and in PPE.',
    ],
    hazards: ['Arc flash at panelboards', 'Shock from branch circuits'],
    changeTriggers: ['New circuits or moves', 'Rack density increases', 'Changing breaker sizes'],
  },
  {
    id: 'racks',
    title: 'IT racks & white space',
    group: 'Electrical',
    kinds: ['rack'],
    summary: 'The reason the facility exists. Dual-corded racks survive losing one feed; GPU racks also need liquid cooling.',
    howItWorks: [
      'Servers have redundant power supplies, one per cord. Each supply is normally half loaded and can take the full load.',
      'Air-cooled racks take cold air in the front from the cold aisle and exhaust hot air out the back into the hot aisle. Containment keeps the two from mixing.',
      'High-density GPU racks reject most of their heat to liquid through cold plates fed by a CDU; the rest goes to air.',
    ],
    rounds: [
      'Inlet temperatures within the ASHRAE recommended range (64.4–80.6 °F / 18–27 °C).',
      'Blanking panels in place; containment doors closed; no gaps.',
      'No leaks under GPU racks; leak-detection cable alarms clear.',
      'Cords plugged into the right side (A to A, B to B), no daisy-chained power strips.',
    ],
    pm: [{ interval: 'Ongoing', task: 'Airflow management audits, leak-detection tests, power-cord audits with IT.' }],
    troubleshooting: [
      {
        symptom: 'Hot inlet temperature',
        causes: ['Missing blanking panels', 'Containment door open', 'Local cooling problem', 'Recirculation'],
        checks: ['Check containment and blanking', 'Check the nearest CRAH and floor tiles', 'Escalate if rising fast'],
      },
    ],
    neverDo: ['Never touch customer IT equipment unless that is your role and you have authorization.', 'Never prop containment doors open.'],
    hazards: ['Hot aisle heat stress', 'Liquid near electrical equipment'],
    changeTriggers: ['New racks or density increases (power and cooling capacity review)', 'Containment changes'],
  },

  // ======================================================================
  // MECHANICAL
  // ======================================================================
  {
    id: 'chiller',
    title: 'Chillers (water-cooled & air-cooled)',
    group: 'Mechanical',
    kinds: ['chiller-water-cooled', 'chiller-air-cooled'],
    summary: 'Refrigeration machines that make chilled water by moving heat from the building into condenser water or outside air.',
    howItWorks: [
      'Compressor: squeezes low-pressure refrigerant vapor into high-pressure, hot vapor.',
      'Condenser: the hot vapor gives up heat (to condenser water or outdoor air) and condenses to a liquid.',
      'Expansion valve: drops the pressure suddenly, so the liquid becomes very cold.',
      'Evaporator: the cold refrigerant boils by absorbing heat from the chilled water, and the cycle repeats.',
      '"Lift" is the difference between condenser and evaporator pressure. Hotter condenser water means more lift, more kW per ton, and on very hot days a high head pressure trip.',
    ],
    rounds: [
      'Leaving chilled water temperature at setpoint; entering/leaving condenser water temps.',
      'Evaporator and condenser approach temperatures (rising approach means fouled tubes or low refrigerant).',
      'Oil pressure and temperature, compressor amps / % load, no alarms.',
      'Refrigerant leak monitor in the mechanical room reading normal.',
      'Flow switches proven on both evaporator and condenser.',
    ],
    pm: [
      { interval: 'Daily/shift', task: 'Log readings for trending (the log is how you catch slow problems).' },
      { interval: 'Quarterly', task: 'Leak check; review oil analysis results.' },
      { interval: 'Annually', task: 'Manufacturer service, oil and filter change, vibration analysis, controls calibration, refrigerant leak inspection per EPA Section 608 rules.' },
      { interval: '1–3 years', task: 'Eddy-current tube testing and tube brushing (condenser tubes yearly in many plants).' },
    ],
    troubleshooting: [
      {
        symptom: 'High head pressure trip',
        causes: ['Hot condenser water (tower problem, hot/humid day)', 'Condenser water flow lost', 'Fouled condenser tubes', 'Non-condensables in refrigerant'],
        checks: ['Check tower fans and condenser water temperature', 'Check CW pump and valves', 'Stage on another chiller, then investigate', 'Reset only per the manufacturer\'s guidance'],
      },
      {
        symptom: 'Low evaporator pressure / freeze protection',
        causes: ['Low chilled water flow', 'Low refrigerant charge', 'Setpoint too low'],
        checks: ['Verify chilled water pump and flow switch', 'Call refrigeration tech for charge'],
      },
    ],
    neverDo: [
      'Never vent refrigerant. It is illegal, and handling it requires EPA Section 608 certification.',
      'Never jumper a flow switch or safety to keep a chiller running.',
      'Never enter a mechanical room in a refrigerant alarm without following the alarm procedure; refrigerant displaces oxygen.',
      'Never reset a chiller repeatedly after safety trips without finding the cause.',
    ],
    hazards: ['Refrigerant asphyxiation and frostbite', 'Rotating equipment', 'High-pressure systems', 'Arc flash at starters and VFDs'],
    changeTriggers: ['Setpoint changes (CHW temperature, staging logic)', 'Refrigerant changes or retrofits', 'Controls programming'],
  },
  {
    id: 'heat-rejection',
    title: 'Cooling towers & dry coolers',
    group: 'Mechanical',
    kinds: ['cooling-tower', 'dry-cooler'],
    summary: 'Reject the building\'s heat to the outdoors, either by evaporating water (towers) or through dry coils (dry coolers).',
    howItWorks: [
      'Cooling towers spray warm condenser water over fill while fans pull air through. A little water evaporates and cools the rest to within a few degrees of the wet-bulb temperature ("approach").',
      'Makeup water replaces evaporation; blowdown removes water to control mineral buildup. Water treatment controls scale, corrosion, and biological growth.',
      'Dry coolers are closed coils with fans. They use no water but can only cool toward the dry-bulb temperature, so they lose capacity on hot days.',
      'On cold days, cold tower water can cool chilled water directly through a plate heat exchanger: the economizer, or "free cooling".',
    ],
    rounds: [
      'Leaving water temperature vs. wet bulb (approach); fan VFD speeds.',
      'Basin level, makeup valve working, no overflow; drift eliminators intact.',
      'Water treatment controller readings (conductivity, chemical feed) and pumps running.',
      'Fan vibration switches; unusual gearbox noise; freeze protection in winter (basin heaters).',
    ],
    pm: [
      { interval: 'Monthly', task: 'Inspect fill, nozzles, and eliminators; check gearbox oil; test vibration switches.' },
      { interval: 'Per water management plan', task: 'Legionella risk management per ASHRAE 188: sampling, disinfection, and documentation.' },
      { interval: 'Semi-annual / annual', task: 'Clean basins, align and service fans and gearboxes, inspect structure.' },
    ],
    troubleshooting: [
      {
        symptom: 'High condenser water temperature',
        causes: ['Fan off or VFD fault', 'Clogged fill or nozzles', 'Very high wet bulb', 'Tower bypass valve stuck'],
        checks: ['Verify all fans run at expected speed', 'Inspect distribution', 'Bring another tower cell online'],
      },
    ],
    neverDo: [
      'Never work on fans without locking out the motor (VFDs can restart fans automatically).',
      'Never skip the water treatment program. Legionella is a public health risk.',
      'Never climb tower structures without fall protection.',
    ],
    hazards: ['Legionella exposure (aerosols)', 'Falls from heights', 'Rotating fans', 'Chemical treatment handling'],
    changeTriggers: ['Water treatment program changes', 'Fan control setpoints', 'Adding tower cells'],
  },
  {
    id: 'pumps',
    title: 'Chilled & condenser water pumps',
    group: 'Mechanical',
    kinds: ['pump-chw', 'pump-cw'],
    summary: 'Move water around the chilled water and condenser water loops. Usually VFD-driven and N+1.',
    howItWorks: [
      'Chilled water pumps hold a differential pressure setpoint across the far end of the loop, so every coil gets the flow it needs; VFDs speed up as valves open.',
      'Condenser water pumps move water between chiller condensers and cooling towers.',
      'Standby pumps should auto-start on lead pump failure. Test that they actually do.',
    ],
    rounds: [
      'Differential pressure at setpoint; VFD speed and amps; lead/lag status.',
      'Mechanical seal: no leaks (a few drips can be normal on packed seals; mechanical seals should be dry).',
      'Bearings: no unusual noise or heat; vibration readings if monitored.',
      'Strainer differential pressure; isolation valves fully open on running pumps.',
    ],
    pm: [
      { interval: 'Monthly', task: 'Rotate lead/lag, test standby auto-start.' },
      { interval: 'Quarterly', task: 'Vibration analysis; lubricate bearings per manufacturer (don\'t over-grease).' },
      { interval: 'Annually', task: 'Alignment check, motor insulation test, VFD cleaning and fan check, strainer cleaning.' },
    ],
    troubleshooting: [
      {
        symptom: 'Low flow / low DP',
        causes: ['Clogged strainer', 'Closed or partly closed valve', 'Air in the loop', 'Pump wear'],
        checks: ['Check strainer DP', 'Verify valve positions', 'Vent air at high points'],
      },
      {
        symptom: 'Noise like gravel (cavitation)',
        causes: ['Low suction pressure', 'Clogged suction strainer'],
        checks: ['Check expansion tank and fill pressure', 'Clean strainer'],
      },
    ],
    neverDo: ['Never run a pump dead-headed (discharge valve shut).', 'Never close a valve on a running loop without the MOP. It can starve every coil downstream.', 'Never work on a VFD-driven motor without locking out the VFD supply and verifying zero energy.'],
    hazards: ['Rotating couplings', 'Pressurized water', 'Stored energy in VFD capacitors'],
    changeTriggers: ['DP setpoint changes', 'Lead/lag logic changes', 'Valve lineup changes'],
  },
  {
    id: 'tes',
    title: 'Chilled water storage (TES) tank',
    group: 'Mechanical',
    kinds: ['tes-tank'],
    summary: 'A large tank of chilled water that carries the cooling load for minutes while chillers restart after a power transfer.',
    howItWorks: [
      'Cold water sits at the bottom and warm water at the top (stratification). During a chiller outage, pumps draw cold water from the tank to the loop.',
      'Ride-through minutes = stored energy ÷ load. A bigger usable delta-T and a well-stratified tank both mean more minutes.',
      'Chillers often take several minutes to restart after a power blip; the tank covers that gap.',
    ],
    rounds: ['Temperature at several tank heights (the thermocline); charge state.', 'Valve positions match normal; no leaks.'],
    pm: [{ interval: 'Annually', task: 'Inspect diffusers, valves, and sensors; verify discharge sequence in a controlled test.' }],
    troubleshooting: [{ symptom: 'Short ride-through', causes: ['Poor stratification (mixing)', 'Tank not fully charged'], checks: ['Check temperatures at each height', 'Check charge sequence'] }],
    neverDo: ['Never change tank valve lineups without the MOP. You can drain the cold water you are counting on.'],
    hazards: ['Confined space (tank entry needs a permit per OSHA 1910.146)'],
    changeTriggers: ['Control sequence changes', 'Load growth (ride-through gets shorter)'],
  },
  {
    id: 'air-handling',
    title: 'CRAH & CRAC units',
    group: 'Mechanical',
    kinds: ['crah', 'crac'],
    summary: 'Air units that cool the data hall. A CRAH uses chilled water; a CRAC has its own compressor.',
    howItWorks: [
      'CRAH (computer room air handler): fans push air across a chilled-water coil. A control valve adjusts water flow to hold supply air temperature. No compressor; it depends on the chiller plant.',
      'CRAC (computer room air conditioner): a self-contained DX unit with its own compressor, condenser (often remote), and refrigerant circuit. It works without chilled water but is less efficient at scale.',
      'Fans usually modulate to hold a pressure or delta-T across the containment.',
    ],
    rounds: [
      'Supply and return air temperatures; delta-T across the coil.',
      'Valve position (CRAH) or compressor status (CRAC); fan speed.',
      'Filter differential pressure; condensate drain and leak detection clear.',
      'No alarms; unit in auto.',
    ],
    pm: [
      { interval: 'Quarterly', task: 'Filters (or by DP), belts, condensate pans and drains, leak detection test.' },
      { interval: 'Annually', task: 'Coil cleaning, fan and motor service, sensor calibration; for CRAC: refrigerant leak check by certified tech.' },
    ],
    troubleshooting: [
      {
        symptom: 'Supply air too warm',
        causes: ['Valve stuck or actuator failed', 'No chilled water flow', 'Dirty coil', 'CRAC: compressor or refrigerant issue'],
        checks: ['Check valve command vs. position', 'Check CHW supply temperature at the unit', 'Inspect coil'],
      },
      { symptom: 'Water under the unit', causes: ['Clogged condensate drain', 'Coil or valve leak'], checks: ['Clear drain', 'Isolate the unit per MOP if leaking'] },
    ],
    neverDo: ['Never turn off multiple air units at once without a capacity check.', 'Never disable leak detection.'],
    hazards: ['Fans that start automatically', 'Electrical panels inside units'],
    changeTriggers: ['Setpoint changes', 'Turning units off for "efficiency"', 'Containment changes'],
  },
  {
    id: 'cdu',
    title: 'Coolant distribution units (CDU)',
    group: 'Mechanical',
    kinds: ['cdu'],
    summary: 'Deliver liquid coolant to GPU cold plates, separated from the facility water loop by a heat exchanger.',
    howItWorks: [
      'Facility water (FWS) flows through one side of a plate heat exchanger. The technology cooling system (TCS) loop on the other side runs through the cold plates on the chips.',
      'Redundant pumps move TCS fluid; filters protect the tiny cold-plate channels. Fluid chemistry (often treated water or glycol) must stay clean.',
      'Cold plates hold very little coolant, so if flow stops, GPUs reach thermal limits in seconds to a minute. That is much faster than air-cooled racks.',
    ],
    rounds: [
      'TCS supply temperature and flow; differential pressure across the racks.',
      'Pump status (lead/standby), filter DP, reservoir level.',
      'Leak detection clear under CDU and racks; no drips at quick-disconnects.',
      'Facility water supply temperature and valve position.',
    ],
    pm: [
      { interval: 'Monthly', task: 'Filter DP check, leak detection test, pump rotation.' },
      { interval: 'Quarterly', task: 'Coolant sample: chemistry, conductivity, particulates.' },
      { interval: 'Annually', task: 'Manufacturer service, sensor calibration, pump inspection.' },
    ],
    troubleshooting: [
      {
        symptom: 'Low TCS flow',
        causes: ['Pump failure', 'Clogged filter', 'Air in loop', 'Closed rack valve'],
        checks: ['Verify standby pump started', 'Check filter DP', 'Alert IT immediately: GPUs may throttle'],
      },
      { symptom: 'Rising TCS supply temperature', causes: ['Facility water too warm or low flow', 'HX fouling'], checks: ['Check FWS temperature and valve', 'Check HX approach'] },
    ],
    neverDo: ['Never disconnect TCS quick-disconnects under pressure unless the procedure says how.', 'Never top off with the wrong fluid.', 'Never take a CDU pump out of service without confirming the standby is healthy.'],
    hazards: ['Liquid near energized IT gear', 'Pressurized fluid', 'Chemical exposure (coolant)'],
    changeTriggers: ['Coolant chemistry changes', 'Adding racks to a CDU', 'Setpoint changes'],
  },
  {
    id: 'doas',
    title: 'Dedicated outdoor air system (DOAS)',
    group: 'Mechanical',
    kinds: ['doas'],
    summary: 'Brings in a controlled amount of fresh air, dries it, and keeps the data hall slightly pressurized.',
    howItWorks: [
      'Outdoor-air damper and filters: bring in only as much fresh air as needed for ventilation and pressurization.',
      'Energy-recovery wheel: a slowly rotating wheel that pre-cools or pre-heats incoming air using the exhaust air, saving energy.',
      'Chilled-water cooling coil: cools air below its dew point so moisture condenses out (dehumidification). The air leaving the coil is nearly saturated at the coil temperature.',
      'Reheat: warms the dry air back to a neutral temperature so it doesn\'t overcool the room.',
      'Supply fan: delivers the air and holds a small positive pressure in the data hall, so dust and humid outdoor air leak out rather than in.',
      'Humidity matters: too humid risks condensation and corrosion; too dry raises static-discharge risk. ASHRAE gives a recommended dew point band.',
    ],
    rounds: [
      'Supply air dew point and temperature vs. setpoint; data hall dew point in the ASHRAE recommended band.',
      'Data hall differential pressure slightly positive.',
      'Wheel rotating (belt intact); damper positions; filter DP.',
      'Coil condensate draining; no water carryover.',
    ],
    pm: [
      { interval: 'Quarterly', task: 'Filters (by DP), belts, wheel seals and drive, condensate drain.' },
      { interval: 'Annually', task: 'Coil cleaning, humidity sensor calibration (sensors drift), damper and actuator stroke test.' },
    ],
    troubleshooting: [
      { symptom: 'Data hall humidity high', causes: ['Coil not cold enough (valve, CHW temp)', 'Too much outdoor air', 'Sensor drift'], checks: ['Check coil leaving air temperature', 'Check damper position', 'Verify sensor with a calibrated meter'] },
      { symptom: 'Data hall pressure negative', causes: ['DOAS fan off', 'Doors propped open', 'Exhaust running too high'], checks: ['Check fan status', 'Walk the envelope'] },
    ],
    neverDo: ['Never shut off the DOAS without telling the control room; humidity and pressure drift slowly and get missed.', 'Never trust one humidity sensor without verification.'],
    hazards: ['Fans that start automatically', 'Heater elements'],
    changeTriggers: ['Ventilation rate changes (ASHRAE 62.1)', 'Dew point setpoint changes', 'Sequence of operations changes'],
  },

  // ======================================================================
  // LIFE SAFETY
  // ======================================================================
  {
    id: 'fire',
    title: 'Fire alarm & suppression',
    group: 'Life safety',
    kinds: ['fire-alarm', 'preaction', 'clean-agent'],
    summary: 'Detects fire early and suppresses it while protecting people and IT gear.',
    howItWorks: [
      'Fire alarm panel (NFPA 72): monitors detectors, including very early smoke detection (aspirating systems) in data halls, and reports alarm, supervisory, and trouble signals.',
      'Pre-action sprinklers (NFPA 13): pipes stay dry. A detector must confirm fire to open the valve, and a head must also fuse before water flows.',
      'Clean agent (NFPA 2001): a gas that puts out fire without residue. It needs a tight room to hold concentration; pre-discharge alarms give people time to get out.',
    ],
    rounds: [
      'Panel normal: no alarm, supervisory, or trouble conditions.',
      'Pre-action valve: supervisory air pressure normal, valve set.',
      'Clean agent: cylinder pressure gauges in the green; abort stations intact.',
      'Exit paths and extinguishers clear and inspected.',
    ],
    pm: [
      { interval: 'Per NFPA 72 / 25 / 2001 and AHJ', task: 'Inspection, testing and maintenance by licensed contractors. Keep records; impairments need a written impairment procedure and fire watch.' },
    ],
    troubleshooting: [
      { symptom: 'Trouble signal', causes: ['Device or wiring fault', 'Ground fault', 'Power supply issue'], checks: ['Note the zone and device', 'Call the fire alarm contractor', 'Start impairment procedure if coverage is lost'] },
    ],
    neverDo: [
      'Never silence or disable a fire system without an impairment permit and notifying the monitoring company and AHJ as required.',
      'Never block or prop open fire-rated doors in clean-agent rooms.',
      'Never stay in a room after a clean-agent pre-discharge alarm.',
    ],
    hazards: ['Oxygen displacement / agent exposure', 'Accidental discharge during testing'],
    changeTriggers: ['Room changes that affect agent concentration', 'Detection changes', 'Sequence changes (e.g. EPO tie-in)'],
  },
  {
    id: 'epo',
    title: 'Emergency power off (EPO)',
    group: 'Life safety',
    kinds: ['epo'],
    summary: 'A protected button that de-energizes data hall equipment for firefighter safety.',
    howItWorks: [
      'When pressed, EPO opens breakers or shunt-trips equipment feeding the space, and may also shut down HVAC.',
      'Whether an EPO is required depends on the code path the site follows (the electrical code rules for IT equipment rooms and the fire standard for IT equipment, in the editions the site adopts) and the AHJ. Many modern sites design to avoid it. Verify with the qualified person at the site and the current code edition.',
      'Accidental EPO activation is a well-known cause of outages, so buttons are guarded with covers and signs.',
    ],
    rounds: ['Cover intact and labeled; button not obstructed; supervisory signal normal.'],
    pm: [{ interval: 'Per site program', task: 'Functional test only during a planned shutdown with an approved MOP.' }],
    troubleshooting: [{ symptom: 'EPO activated', causes: ['Accidental press', 'Real emergency', 'Wiring fault'], checks: ['Life safety first', 'Follow the EOP for restoring power in a controlled sequence'] }],
    neverDo: ['Never test an EPO live without an approved procedure.', 'Never remove the protective cover.'],
    hazards: ['Massive simultaneous load drop'],
    changeTriggers: ['Any change to EPO wiring or what it trips'],
  },
];

export function guideForKind(kind: ComponentKind): EquipmentGuide | undefined {
  return EQUIPMENT.find((g) => g.kinds.includes(kind));
}
