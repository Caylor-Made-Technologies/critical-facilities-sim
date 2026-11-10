/**
 * Electrical deep dives (Phase 7a). Generic training content; see deepdive.ts.
 * Code and standard references are by name/number only, never clause text.
 */
import type { DeepDive } from './deepdive';

export const ELEC_DEEP: DeepDive[] = [
  // --------------------------------------------------------------------
  {
    id: 'utility-mv',
    topics: [
      {
        h: 'Two services and the MV lineup',
        p: [
          'Many sites take two utility feeds from different substations or feeders. Each lands on its own main breaker in the medium-voltage (MV) switchgear, often with a tie breaker between them: main-tie-main.',
          'Normally both mains are closed and the tie is open, so each side carries its half of the site. If one service is lost, the tie can close (manually or by an automatic scheme) so the other service carries everything, if it is sized for it.',
        ],
      },
      {
        h: 'Protective relays and device numbers',
        p: [
          'Relays watch current, voltage and frequency and tell the breaker to trip. Their functions use the standard device numbers from IEEE C37.2, which you will see on drawings and relay screens:',
          '50/51 = instantaneous / time overcurrent, 50N/51N or 51G = ground overcurrent, 27 = undervoltage, 59 = overvoltage, 81 = frequency, 86 = lockout relay, 52 = the breaker itself.',
          'An 86 lockout must be reset by hand on purpose. It holds the breaker open after a serious fault so nobody (and no automatic scheme) closes back into it. Never reset an 86 until engineering has found the cause.',
        ],
        verify: true,
      },
      {
        h: 'Power quality: what the grid does to you',
        p: [
          'Sag (dip): voltage drops for a few cycles to a few seconds, usually from a fault somewhere else on the grid. The most common event a site sees. UPS rides through; chillers and VFDs may trip.',
          'Swell: short rise in voltage, e.g. when a large load drops off or during a ground fault on another phase.',
          'Transient (surge): very fast spike from lightning or switching. Surge protection devices (SPDs) at the service clamp them; check their status lights.',
          'Single-phasing: one phase lost (blown MV fuse, broken conductor). Three-phase motors overheat fast. Phase-loss relays and drives should trip them.',
          'Imbalance and harmonics: unequal phase voltages and distorted waveforms. Keep voltage imbalance under about 2%; harmonics heat transformers and neutrals.',
        ],
        verify: true,
      },
      {
        h: 'The DC trip battery',
        p: [
          'MV breakers trip and close using DC control power, often a 125 V DC battery and charger. If that battery fails, a relay can see a fault and the breaker cannot trip. The fault is then cleared further upstream, taking out far more.',
          'That is why the trip battery, its charger and the "loss of DC" alarm are on every MV round.',
        ],
      },
    ],
    readings: [
      { what: 'Service voltage (metering screen, per phase)', normal: 'Within about ±5% of nominal, e.g. 12.47 kV → about 11.8–13.1 kV (ranges come from ANSI C84.1 and your utility)', act: 'Log it. Repeated or sustained excursions: tell your lead; the utility may need a power quality study.' },
      { what: 'Frequency', normal: '60.00 Hz, normally steady within about ±0.05 Hz on a stable grid', act: 'Anything outside about ±0.1 Hz is unusual on the grid; note the time and check the event log.' },
      { what: 'Voltage imbalance between phases', normal: 'Under about 2% (1% is better)', act: 'Over 2%: report it. Motors heat up quickly with imbalance.' },
      { what: 'DC trip battery charger (125 V DC system)', normal: 'Float about 130–135 V DC, no ground-fault or AC-fail alarm', act: 'Charger alarm or low voltage: report at once. Breakers may not trip without DC.' },
      { what: 'Relay front panels', normal: 'Healthy LED on, no targets, no alarm', act: 'Any target: do not reset. Photograph it, record the event, call your lead.' },
      { what: 'Surge protection (SPD) status', normal: 'All "protected" lights on', act: 'Light out: the SPD may have done its job and be spent. Report for replacement.' },
    ],
    failures: [
      { mode: 'Utility outage', signs: 'Lights flicker, UPS goes to battery, generators start, ATS timing.', then: 'Generators pick up in about 10 s; UPS batteries carry the gap. If a generator fails to start, battery time is all you have.' },
      { mode: 'Voltage sag', signs: 'Short "on battery" UPS events, a chiller or VFD trips, all at the same timestamp.', then: 'IT rides through on UPS; mechanical gear may need restarts. Restarts on a hot day matter.' },
      { mode: 'Single-phasing (one MV fuse blown)', signs: 'One phase reads low or zero; motors hum, run hot, trip on phase loss.', then: 'Motors without phase-loss protection burn up. Transfer to the other source per procedure.' },
      { mode: 'Trip battery or charger failure', signs: 'Charger alarm, low DC voltage, "loss of trip power" on relays.', then: 'A fault on that lineup is not cleared locally; an upstream breaker or the utility trips instead, a much bigger outage.' },
      { mode: 'Insulation breakdown (partial discharge)', signs: 'Ozone smell, crackling or hissing, tracking marks, PD survey readings rising.', then: 'Eventually a flashover inside the gear: arc flash and a long outage.' },
    ],
    tips: ['electrical-keep-voltage-imbalance-under-2', 'electrical-single-phasing', 'electrical-a-breaker-that-trips-twice-is-talking', 'trouble-what-changed'],
    practice: [
      { kind: 'lesson', id: 'utility-outage' },
      { kind: 'proc', id: 'drill-utility' },
      { kind: 'proc', id: 'drill-double' },
    ],
    quiz: [
      { id: 'dd-mv-1', q: 'A relay shows a target and an 86 lockout is tripped. What do you do first?', choices: ['Reset the 86 and reclose so the load comes back', 'Record the targets and event log, leave it locked out, call your lead', 'Reset only the relay target', 'Rack the breaker out and back in'], answer: 1, why: 'An 86 holds the breaker open after a serious fault. It is reset on purpose, only after the cause is found.' },
      { id: 'dd-mv-2', q: 'Which power quality event does a data center see most often?', choices: ['Long outage', 'Voltage sag lasting cycles to seconds', 'Frequency drift', 'Lightning strike on the building'], answer: 1, why: 'Sags from faults elsewhere on the grid are by far the most common. UPS rides through them; mechanical gear may trip.' },
      { id: 'dd-mv-3', q: 'Why is the 125 V DC charger on every MV round?', choices: ['It runs the lights', 'Breakers need DC control power to trip; no DC means a fault may not clear locally', 'It charges the generator batteries', 'It powers the BMS'], answer: 1, why: 'Without DC trip power, the breaker cannot open on a fault, so something upstream clears it and takes out more.' },
      { id: 'dd-mv-4', q: 'IEEE device number 27 on a relay means:', choices: ['Overcurrent', 'Undervoltage', 'Lockout', 'Frequency'], answer: 1, why: '27 = undervoltage, 59 = overvoltage, 50/51 = overcurrent, 81 = frequency, 86 = lockout.' },
    ],
  },
  // --------------------------------------------------------------------
  {
    id: 'transformer',
    topics: [
      {
        h: 'Liquid-filled vs dry-type',
        p: [
          'Liquid-filled (oil or natural ester) units sit outside, often pad-mounted. The liquid insulates and carries heat to the fins or radiators. Watch level, temperature, pressure and leaks.',
          'Dry-type units are indoors (cast coil or ventilated). Air does the cooling, sometimes with fans that start on winding temperature. Keep the vents clear and the room cool.',
        ],
      },
      {
        h: 'Temperature gauges and the drag hand',
        p: [
          'Liquid units have a top-oil gauge and often a winding temperature indicator. Each has a black pointer (now) and a red "drag" pointer that stays at the highest reading since the last reset.',
          'On rounds: record both, then reset the drag hand if your site does that. A drag hand much higher than "now" means something got hot since the last round: find out when and why.',
          'Dry-type units use winding sensors with a monitor: one setpoint starts fans, a higher one alarms, a higher one trips. Your site sets these from the nameplate insulation class.',
        ],
        verify: true,
      },
      {
        h: 'Taps',
        p: [
          'Most building transformers have a de-energized tap changer: commonly two steps of 2.5% above and below nominal. Moving one step changes the secondary voltage by about 2.5%.',
          'Taps are only changed with the transformer de-energized, locked out and tested, under a change record (MOC). Never touch a tap on a live unit.',
        ],
        verify: true,
      },
      {
        h: 'K-factor and harmonics',
        p: [
          'Non-linear loads (power supplies, drives) draw distorted current. Harmonic currents heat windings more than their amps suggest. A K-factor rating (e.g. K-13 or K-20) says the transformer is built to carry that extra heat.',
          'Third-harmonic currents add up in the neutral, which is why PDU transformers often have a 200% neutral.',
        ],
        verify: true,
      },
      {
        h: 'Grounding and bonding: the XO bond',
        p: [
          'A delta-wye transformer creates a new "separately derived" system. Its neutral (XO) is bonded to ground at one point, at the transformer or first disconnect, and tied to the building grounding electrode system.',
          'Grounding connects to earth (lightning, static, a reference). Bonding ties all metal together so a fault has a low-impedance path back to the source and trips the breaker fast. That fault path is bonding, not the earth.',
          'One bond point only. A second neutral-to-ground bond downstream puts normal current on ground wires and conduit. Never lift or add a bond without engineering. Some 480 V sites use high-resistance grounding (HRG): a first ground fault only alarms, so find it before a second one trips.',
        ],
        verify: true,
      },
    ],
    readings: [
      { what: 'Secondary voltage (480 V system)', normal: 'About 456–504 V (±5%), phases within 2% of each other', act: 'Out of range on all phases: maybe the utility or a tap. Report; taps change only de-energized under MOC.' },
      { what: 'Top-oil temperature (liquid units)', normal: 'Commonly 40–75 °C at normal load; well under the alarm setpoint', act: 'Rising with no load change: check fans/fins, level, IR scan. Near alarm: tell your lead.' },
      { what: 'Drag (max) pointer', normal: 'Close to the current reading', act: 'Much higher than now: something got hot since the last reset. Check the trend and event log.' },
      { what: 'Liquid level gauge', normal: 'At the mark for the current oil temperature', act: 'Low: look for leaks and stains; report. Never top off yourself.' },
      { what: 'Pressure / vacuum gauge (sealed tank)', normal: 'Near 0, a few psi either way with temperature', act: 'Stuck at 0 always may mean a leak; high pressure may mean internal gassing. Report.' },
      { what: 'Dry-type winding temperature', normal: 'Well under the fan-start setpoint at normal load', act: 'Fans running at light load or an alarm: check vents, room temp and loading.' },
      { what: 'Loading (kVA ÷ nameplate)', normal: 'Under 80%; on a 2N site each side usually under 50%', act: 'Over 50% per side on 2N: one side can no longer carry both. Tell capacity planning.' },
    ],
    failures: [
      { mode: 'Overheating', signs: 'Top-oil or winding temp creeping up, fans always on, drag hand high, discolored paint.', then: 'Insulation ages fast (roughly doubles its aging rate for every ~6–10 °C over rating), then fails.' },
      { mode: 'Loose or failing connection', signs: 'Hot spot on an IR scan, discolored lugs, smell.', then: 'Connection burns open or flashes over.' },
      { mode: 'Internal insulation breakdown', signs: 'Combustible gases rising in oil analysis (DGA), pressure rising, humming changes.', then: 'Internal fault: relay trip, possible tank rupture or fire.' },
      { mode: 'Leak / low liquid', signs: 'Wet fins, stains on the pad, level below the mark.', then: 'Poor cooling, exposed windings, environmental spill.' },
      { mode: 'Wrong tap or a lost neutral bond', signs: 'Voltage high or low on every phase; current on ground conductors; odd neutral-to-ground voltage.', then: 'Equipment stressed or tripping; shock risk on metal parts.' },
    ],
    tips: ['electrical-kw-vs-kva', 'electrical-neutrals-can-run-hot', 'electrical-bonding-vs-grounding', 'meters-infrared-compare-like-to-like', 'electrical-keep-voltage-imbalance-under-2'],
    practice: [
      { kind: 'lesson', id: 'power-path' },
      { kind: 'proc', id: 'mop-mtm' },
    ],
    quiz: [
      { id: 'dd-tx-1', q: 'The top-oil gauge reads 55 °C but the red drag pointer sits at 88 °C. What does that tell you?', choices: ['The gauge is broken', 'It got much hotter sometime since the drag hand was last reset: find out when and why', 'Normal: the drag hand always reads high', 'The transformer is overloaded right now'], answer: 1, why: 'The drag hand holds the highest reading since reset. A big gap means a past event worth checking in the trend.' },
      { id: 'dd-tx-2', q: 'When can a tap on a building transformer be changed?', choices: ['Any time, it is just a knob', 'Under load if done slowly', 'Only de-energized, locked out and tested, under a change record', 'Only by the utility'], answer: 2, why: 'Most building units have de-energized tap changers. Changing one live can cause a fault.' },
      { id: 'dd-tx-3', q: 'Why does a PDU transformer often have a 200% neutral?', choices: ['For a future second load', 'Third-harmonic currents from IT power supplies add up in the neutral', 'Code requires double size for all neutrals', 'To reduce voltage drop on the phases'], answer: 1, why: 'Triplen harmonics add in the neutral instead of cancelling, so it can carry more than a phase.' },
      { id: 'dd-tx-4', q: 'You find current flowing on a ground wire downstream of the transformer. A likely cause is:', choices: ['Normal operation', 'A second neutral-to-ground bond downstream', 'High load', 'A K-13 rating'], answer: 1, why: 'There should be one bond point. A second one lets normal neutral current share the ground path.' },
    ],
  },
  // --------------------------------------------------------------------
  {
    id: 'generator',
    topics: [
      {
        h: 'Governor and AVR: frequency and voltage',
        p: [
          'The governor controls fuel to hold speed, and speed sets frequency (60 Hz). Isochronous = holds exactly 60 Hz whatever the load; droop = speed sags slightly as load rises, which lets units share load.',
          'The automatic voltage regulator (AVR) controls the field current in the alternator to hold voltage. A failing AVR shows as voltage that hunts or will not build.',
        ],
      },
      {
        h: 'Start sequence and load steps',
        p: [
          'On utility loss the ATS signals start. Crank, fire, build voltage and frequency, then "ready to accept load", commonly within about 10 s on emergency/standby systems that must meet that time.',
          'When load lands in one big block, frequency dips and voltage sags, then recover in a few seconds. Sites stagger loads (UPS walk-in, chillers restarting later) so the steps stay small.',
        ],
        verify: true,
      },
      {
        h: 'Paralleling and synchronizing',
        p: [
          'Paralleled generators share one bus. Before a breaker closes onto a live bus, the incoming unit must match voltage, frequency and phase angle. A synchroscope or sync-check relay shows the slip; the breaker closes inside a small window near 12 o’clock.',
          'Once paralleled, governors share kW and AVRs share kVAR. A unit that "motors" (draws power) trips on reverse power.',
        ],
      },
      {
        h: 'Block heater, batteries and fuel',
        p: [
          'The jacket-water block heater keeps the engine warm (commonly about 90–120 °F) so it fires fast and takes load. A cold block = slow start and a bigger dip. Feel the hose or read the gauge on rounds.',
          'Starting batteries (often 24 V DC) and their charger are the number one cause of failed starts. A charger alarm is a no-start risk.',
          'Diesel ages: water, microbes and sludge. Drain the water separator, sample and polish fuel per program, and know your runtime at load (about 7 gal/h per 100 kW at full load, as a rule of thumb).',
        ],
        verify: true,
      },
      {
        h: 'Wet stacking and testing under load',
        p: [
          'Running a diesel lightly loaded for long periods leaves unburned fuel and soot in the exhaust ("wet stacking"): black oily drips at the stack, smoke, lost power.',
          'NFPA 110 sets the testing program for emergency and standby systems (for example a monthly exercise with minimum load or exhaust temperature conditions). Sites use building load or a load bank so engines run loaded. Follow your site’s program and adopted edition.',
        ],
        verify: true,
      },
    ],
    readings: [
      { what: 'Control switch', normal: 'AUTO, no alarms or pre-alarms', act: 'Not in AUTO = it will not start on utility loss. Treat as an urgent alarm and tell your lead.' },
      { what: 'Jacket-water (block heater) temperature, standby', normal: 'Commonly about 90–120 °F; heater hose warm', act: 'Cold block: check heater breaker and thermostat. Report: slower start, larger load-step dip.' },
      { what: 'Starting battery voltage (24 V system, on float)', normal: 'About 26.5–27.5 V DC, charger normal', act: 'Low or charger alarm: no-start risk. Report at once.' },
      { what: 'Fuel level (day tank and main)', normal: 'At or above the site minimum hours; day tank pump in auto', act: 'Below minimum: start the fuel plan (delivery, priority loads).' },
      { what: 'Running: frequency / voltage', normal: '60 Hz, steady within about ±0.5%; voltage within about ±1–2% of setpoint', act: 'Hunting or drifting: governor or AVR problem; report with readings.' },
      { what: 'Running: oil pressure and coolant temperature', normal: 'In the engine panel’s normal band (commonly oil 40–80 psi, coolant 180–210 °F)', act: 'Out of band or rising: pre-alarm. Follow the site response; shutdowns protect the engine.' },
      { what: 'Running: load %', normal: 'Commonly 30% or more of nameplate on tests (or per program)', act: 'Long light-load runs: watch for wet stacking; plan a load bank run.' },
    ],
    failures: [
      { mode: 'Fail to start (overcrank)', signs: 'Weak batteries, charger alarm, cold block, fuel filter restriction, air in fuel.', then: 'UPS batteries carry the load until they run out. Overcrank alarm stops further cranking.' },
      { mode: 'Starts, then shuts down', signs: 'Low oil pressure, high coolant temp, overspeed, low coolant level alarm.', then: 'Load drops back to batteries; protective shutdown needs reset and a cause found.' },
      { mode: 'Fuel problem', signs: 'Water in the separator, dark or cloudy samples, day-tank pump alarms, power loss under load.', then: 'Engine stalls under load when it is needed most.' },
      { mode: 'Wet stacking', signs: 'Black oily residue at the exhaust, smoke on start, slobber at joints.', then: 'Lost capacity, fire risk in the exhaust, engine damage.' },
      { mode: 'Left out of AUTO', signs: '"Not in auto" alarm after maintenance or a test.', then: 'No start on the next outage. The most avoidable failure there is.' },
    ],
    tips: ['gen-end-every-job-in-auto', 'gen-feel-for-the-block-heater', 'gen-charger-alarm-no-start-risk', 'gen-run-them-loaded', 'gen-about-7-gallons-per-hour-per-100-kw', 'gen-drain-the-water-separator'],
    practice: [
      { kind: 'proc', id: 'mop-gen-test' },
      { kind: 'proc', id: 'drill-utility' },
      { kind: 'proc', id: 'drill-fuel' },
    ],
    quiz: [
      { id: 'dd-gen-1', q: 'What does the governor control?', choices: ['Voltage', 'Speed, and so frequency', 'Battery charging', 'Coolant temperature'], answer: 1, why: 'Governor = fuel = speed = frequency. The AVR controls voltage.' },
      { id: 'dd-gen-2', q: 'On rounds the block heater hose is cold. Why does it matter?', choices: ['It doesn’t, the engine warms when it runs', 'A cold engine starts slower and dips more when load lands', 'It means the fuel is low', 'It means the generator is running'], answer: 1, why: 'The heater keeps the engine ready to fire fast and accept load within the required time.' },
      { id: 'dd-gen-3', q: 'Black oily drips at the exhaust stack after many light-load runs point to:', choices: ['A coolant leak', 'Wet stacking', 'Normal operation', 'A bad AVR'], answer: 1, why: 'Unburned fuel builds up when a diesel runs lightly loaded. Loaded tests or a load bank prevent it.' },
      { id: 'dd-gen-4', q: 'Before closing a generator breaker onto a live bus, which three things must match?', choices: ['Voltage, frequency and phase angle', 'Voltage, current and power factor', 'Frequency, oil pressure and fuel level', 'kW, kVAR and kVA'], answer: 0, why: 'Synchronizing matches voltage, frequency and phase angle, then closes in a small window.' },
    ],
  },
  // --------------------------------------------------------------------
  {
    id: 'ats',
    topics: [
      {
        h: 'Transition types',
        p: [
          'Open transition (break-before-make): drops the load briefly while it switches. The most common.',
          'Delayed transition: pauses in a center-off position so motors spin down before reconnecting, avoiding a big out-of-phase inrush.',
          'Closed transition (make-before-break): both sources are paralleled for a very short time (commonly under about 100 ms) on retransfer so the load never blinks. Needs the sources in sync.',
          'In-phase monitor: an open-transition switch waits until both sources are nearly in phase before switching motor loads.',
        ],
        verify: true,
      },
      {
        h: 'Timers you will see',
        p: [
          'Engine-start delay (ignores very short blips, often a few seconds), transfer-to-emergency delay, retransfer delay (normal must be stable for minutes, often 5–30, before going back), and engine cool-down (the generator runs unloaded for a few minutes after retransfer).',
          'Timer settings are part of the design. Changing one is a change (MOC), not a tweak.',
        ],
        verify: true,
      },
      {
        h: 'Bypass-isolation ATS',
        p: [
          'Critical sites often use bypass-isolation switches: a manual bypass carries the load while the automatic part is racked out for maintenance. Know which source the bypass is on before you isolate.',
        ],
      },
    ],
    readings: [
      { what: 'Mode', normal: 'AUTO, no alarms', act: 'Not in auto or inhibited: it will not transfer. Report.' },
      { what: 'Source available lights', normal: 'Normal available; emergency available only when the generator runs', act: 'Normal not available with utility up: check sensing, fuses, control power.' },
      { what: 'Switch position', normal: 'On normal (matches the one-line)', act: 'On emergency with utility healthy: find out why (test? failed retransfer?).' },
      { what: 'Timers and exerciser', normal: 'As set in the site’s settings sheet', act: 'Different from the sheet: do not "fix" it, report. Settings change under MOC.' },
    ],
    failures: [
      { mode: 'Fails to transfer', signs: 'Generator ready, ATS stays on dead normal; control power or mechanism alarm.', then: 'Load runs on UPS batteries until they are gone.' },
      { mode: 'Fails to retransfer', signs: 'Utility back and stable but switch stays on emergency long past the timer.', then: 'Generator keeps running on fuel; a generator trip now drops the load.' },
      { mode: 'Worn or pitted contacts', signs: 'Hot spot on IR, discoloration, chatter on transfer.', then: 'Contacts weld or burn open.' },
      { mode: 'Wrong timer setting', signs: 'Transfer or retransfer far faster or slower than design; nuisance starts on blips.', then: 'Unneeded transfers or exposure during unstable utility.' },
    ],
    tips: ['gen-end-every-job-in-auto', 'trouble-look-upstream-and-downstream', 'rounds-check-modes-not-just-numbers'],
    practice: [
      { kind: 'lesson', id: 'utility-outage' },
      { kind: 'proc', id: 'drill-utility' },
    ],
    quiz: [
      { id: 'dd-ats-1', q: 'Which transition type parallels both sources briefly so the load never blinks?', choices: ['Open transition', 'Delayed transition', 'Closed transition', 'In-phase monitor'], answer: 2, why: 'Closed transition is make-before-break for a very short time, with the sources in sync.' },
      { id: 'dd-ats-2', q: 'Why does an ATS wait minutes before retransferring to utility?', choices: ['To save fuel', 'To be sure the utility is stable before moving the load back', 'Code requires exactly 30 minutes', 'To charge the generator batteries'], answer: 1, why: 'Utility often flickers several times after an event. The retransfer timer avoids bouncing the load.' },
      { id: 'dd-ats-3', q: 'You find a retransfer timer set different from the settings sheet. You:', choices: ['Set it back to the sheet', 'Report it; settings change only under MOC', 'Leave it, nobody will notice', 'Set it to zero'], answer: 1, why: 'Settings are design decisions. Record and report; the change goes through MOC.' },
    ],
  },
  // --------------------------------------------------------------------
  {
    id: 'switchboard',
    topics: [
      {
        h: 'Breaker types',
        p: [
          'Molded-case (MCCB): sealed, smaller, mostly fixed settings, common on feeders and panels.',
          'Insulated-case (ICCB): larger, adjustable electronic trip units, often drawout.',
          'Low-voltage power circuit breakers (LVPCB): heavy-duty, drawout, stored-energy springs, maintainable. Common for mains, ties and big feeders.',
        ],
      },
      {
        h: 'LSIG: reading a trip unit',
        p: [
          'L = Long-time: overload. Pickup (e.g. 0.4–1.0 × the rating plug) and a delay band. Trips in seconds to minutes.',
          'S = Short-time: higher currents with a short, set delay, so the breaker nearest a fault trips first (coordination).',
          'I = Instantaneous: very high current, no intentional delay. Clears bolted faults in cycles.',
          'G = Ground fault: current leaking to ground. NEC 230.95 calls for ground-fault protection on larger 480Y/277 V services; settings come from the coordination study.',
          'Many trip units also have a maintenance / arc energy reduction switch (NEC 240.87) that lowers the instantaneous setting while people work nearby. Turn it on and off exactly as the procedure says.',
        ],
        verify: true,
      },
      {
        h: 'Racking a drawout breaker',
        p: [
          'Positions: Connected (in service), Test (control power on, main contacts apart, so you can trip and close it safely), Disconnected (fully out).',
          'Interlocks stop you racking a closed breaker; the breaker must be open (and springs usually discharged) first. Use the remote racking device if the site has one, wear the PPE on the label, and stand to the side.',
          'Racking is high-risk work for qualified people under a procedure. Know which positions your MOP calls for before you start.',
        ],
        verify: true,
      },
      {
        h: 'Kirk key interlocks and main-tie-main',
        p: [
          'On a main-tie-main lineup, two keys for three breakers means only two can be closed at once, so the two sources are never paralleled through the tie.',
          'A key comes out only when its breaker is open and locked. Never copy keys, carry spares, or force a lock; a key that won’t turn is the system working.',
          '"Kirk key" is the common trade term (credited on the About page and in the glossary).',
        ],
      },
    ],
    readings: [
      { what: 'Bus voltage (480 V)', normal: 'About 456–504 V, phases within 2%', act: 'Out of range: compare with the transformer and utility readings; report.' },
      { what: 'Current per phase vs trip setting', normal: 'Under 80% of the breaker’s long-time setting for continuous load', act: 'Over 80%: tell your lead; on 2N each side should stay under 50% of what one side could carry.' },
      { what: 'Trip unit display', normal: 'No alarm, no trip history since last round', act: 'Trip record: photograph, log, do not clear until your lead says.' },
      { what: 'Breaker flags', normal: 'Open/closed and charged/discharged match the normal one-line', act: 'Mismatch: stop and verify before anything else changes.' },
      { what: 'Kirk keys', normal: 'Each key in the lock the key schedule says for normal', act: 'Key missing or in the wrong lock: report at once.' },
    ],
    failures: [
      { mode: 'Nuisance trip', signs: 'Trip with no fault found; settings differ from the study; trend shows load near pickup.', then: 'Unplanned loss of a side; on 2N the other side carries all.' },
      { mode: 'Fails to trip', signs: 'Stiff mechanism, overdue maintenance, trip unit dark or in error.', then: 'Upstream breaker clears the fault instead: a much bigger outage.' },
      { mode: 'Loose connection', signs: 'IR hot spot, discolored bus or lugs, smell.', then: 'Arcing fault in the lineup.' },
      { mode: 'Racking mishap', signs: 'Breaker forced, shutters stuck, wrong position.', then: 'Arc flash at the worker’s position. The most dangerous moment in switchgear work.' },
    ],
    tips: ['electrical-a-breaker-that-trips-twice-is-talking', 'electrical-the-80-rule', 'electrical-breakers-protect-wire-not-loads', 'electrical-tripped-breaker-handle', 'electrical-torque-don-t-guess', 'safety-stand-to-the-side'],
    practice: [
      { kind: 'lesson', id: 'kirk-mtm' },
      { kind: 'proc', id: 'mop-mtm' },
      { kind: 'proc', id: 'mop-tie-return' },
    ],
    quiz: [
      { id: 'dd-sb-1', q: 'In LSIG, which setting mainly protects against long overloads?', choices: ['L (long-time)', 'S (short-time)', 'I (instantaneous)', 'G (ground fault)'], answer: 0, why: 'Long-time handles overloads over seconds to minutes. S and I handle faults; G handles current to ground.' },
      { id: 'dd-sb-2', q: 'In the Test position of a drawout breaker:', choices: ['Main contacts are connected', 'Control power works but the main contacts are apart', 'The breaker is fully removed', 'It can carry load for testing'], answer: 1, why: 'Test lets you operate the breaker without connecting it to the bus.' },
      { id: 'dd-sb-3', q: 'Main-tie-main with two keys for three breakers ensures:', choices: ['All three can close together', 'Only two can be closed at once, so sources are never paralleled', 'The tie is always closed', 'Keys can be shared between lineups'], answer: 1, why: 'The key count is the interlock: one breaker must be open and locked to free a key.' },
      { id: 'dd-sb-4', q: 'A Kirk key will not turn. You:', choices: ['Use a little force', 'Stop: the interlock is telling you a breaker is in the wrong state', 'Get the spare key', 'Remove the lock'], answer: 1, why: 'A key that won’t turn is the system working. Check the breaker states against the MOP.' },
    ],
  },
  // --------------------------------------------------------------------
  {
    id: 'ups',
    topics: [
      {
        h: 'UPS types',
        p: [
          'Double conversion (online): AC → DC → AC all the time. The load always runs on the inverter; the cleanest output; about 94–97% efficient.',
          'Eco / high-efficiency mode: the load runs on bypass and the inverter jumps in on a disturbance. More efficient, slightly less isolation. A site decision.',
          'Line-interactive: smaller units; regulates voltage, goes to battery on bigger events.',
          'Rotary / flywheel: stored energy in a spinning mass; seconds of ride-through, often paired with fast-start generators.',
        ],
        verify: true,
      },
      {
        h: 'Bypass paths',
        p: [
          'Static bypass (inside the UPS): an electronic switch that moves the load to the bypass source in a fraction of a cycle if the inverter faults or is overloaded. On bypass there is no battery protection.',
          'Maintenance bypass (external): a wrap-around set of breakers (e.g. MBB, MIB/RIB) so the whole UPS can be isolated. Transfer to static bypass first, confirm "on bypass" and sync, close MBB, then open the output/input. Follow the MOP exactly.',
        ],
      },
      {
        h: 'Batteries: VRLA, flooded, lithium-ion',
        p: [
          'VRLA (valve-regulated lead-acid): sealed, no watering, about 5–10 years design life, often less if hot. Trend internal resistance/impedance per block against its baseline.',
          'Flooded (vented) lead-acid: check electrolyte level and specific gravity, water with distilled water, ventilate hydrogen, eyewash nearby. Longest life, most upkeep.',
          'Lithium-ion: smaller and lighter, wider temperature range, longer life; its own battery management system (BMS) protects each module. Its alarms are real.',
        ],
        verify: true,
      },
      {
        h: 'Float, equalize, temperature and thermal runaway',
        p: [
          'Float: the charger holds a steady voltage that keeps cells full (for VRLA commonly about 2.25–2.30 V per cell at 77 °F / 25 °C). Equalize: a higher charge to balance cells, mostly for flooded batteries and only per the manufacturer.',
          'Heat kills lead-acid batteries: life roughly halves for every ~15 °F (8 °C) above 77 °F. Keep the room near 77 °F.',
          'Thermal runaway: a hot VRLA cell draws more float current, gets hotter, draws more. Signs: rising temperature, swelling, sulfur ("rotten egg") smell, high float current. Temperature-compensated charging helps. Report swelling at once.',
        ],
        verify: true,
      },
    ],
    readings: [
      { what: 'UPS mode', normal: 'Normal / online (double conversion), no alarms', act: 'On bypass or battery: find out why now. On bypass = no battery protection.' },
      { what: 'Load per module / per side', normal: 'Within rating; on 2N each side under 50%', act: 'Over 50% on 2N: one side can’t carry both. Report to capacity planning.' },
      { what: 'Output voltage and frequency', normal: 'Nominal (e.g. 480 V ±1–2%), 60.0 Hz', act: 'Off nominal on inverter: UPS fault; check alarms and call service.' },
      { what: 'Battery room temperature', normal: 'About 77 °F (25 °C), commonly 68–80 °F', act: 'Hot: check room cooling. Every 15 °F over 77 °F about halves lead-acid life.' },
      { what: 'DC bus / float voltage (example: 240-cell VRLA string)', normal: 'About 540–552 V DC on float (2.25–2.30 V per cell)', act: 'Off float or high ripple: charger or cell problem; report.' },
      { what: 'Block internal resistance (from the monitor or annual test)', normal: 'Within about 20–30% of each block’s baseline', act: 'Rising blocks: plan replacement. The weakest block sets the string’s runtime.' },
    ],
    failures: [
      { mode: 'Inverter fault', signs: 'Alarm, transfer to static bypass, load still up.', then: 'Load runs unprotected on bypass; a utility event now drops it.' },
      { mode: 'Weak or open battery string', signs: 'Rising resistance, failed discharge test, one block hot or low.', then: 'Battery time far shorter than expected, or none, on the next outage.' },
      { mode: 'Thermal runaway', signs: 'Swelling, heat, sulfur smell, high float current.', then: 'Venting, fire risk; the string must be isolated per procedure.' },
      { mode: 'Capacitor / fan aging', signs: 'Fan alarms, rising internal temps, ripple increasing with age.', then: 'Inverter or rectifier failure; plan replacements per the manufacturer.' },
      { mode: 'Overload', signs: 'Load near or over 100%, especially after a failover on 2N.', then: 'Transfer to static bypass, then breaker trip if it keeps rising.' },
    ],
    tips: ['ups-bypass-means-no-backup', 'ups-77-f-is-battery-heaven', 'ups-weakest-jar-wins', 'ups-report-swelling-right-away', 'ups-sync-before-you-switch', 'ups-under-50-in-2n', 'ups-runtime-isn-t-linear', 'ups-lithium-alarms-are-real'],
    practice: [
      { kind: 'lesson', id: 'ups-bypass' },
      { kind: 'proc', id: 'mop-ups-bypass' },
      { kind: 'proc', id: 'mop-ups-return' },
    ],
    quiz: [
      { id: 'dd-ups-1', q: 'The UPS is on static bypass. What protection does the load have?', choices: ['Full battery protection', 'None from the batteries: a utility event drops it', 'Generator only, instantly', 'Double protection'], answer: 1, why: 'On bypass the load is fed straight from the bypass source. Find out why and fix it quickly.' },
      { id: 'dd-ups-2', q: 'Battery room runs at 92 °F for a year. Expected effect on lead-acid life?', choices: ['None', 'About half', 'Doubles', 'About 10% less'], answer: 1, why: 'Rule of thumb: life halves for every ~15 °F over 77 °F.' },
      { id: 'dd-ups-3', q: 'A VRLA block is warm, swollen and smells like rotten eggs. This points to:', choices: ['Normal aging', 'Thermal runaway risk: report at once', 'Low float voltage', 'An inverter fault'], answer: 1, why: 'Heat, swelling and sulfur smell are runaway signs. Isolate per procedure.' },
      { id: 'dd-ups-4', q: 'Before closing the maintenance bypass breaker, the UPS should be:', choices: ['On battery', 'On static bypass and in sync', 'Turned off', 'In eco mode'], answer: 1, why: 'Static bypass first, confirm sync, then close the maintenance bypass, per the MOP.' },
    ],
  },
  // --------------------------------------------------------------------
  {
    id: 'bess',
    topics: [
      {
        h: 'What a BESS adds',
        p: [
          'A battery energy storage system stores energy in large battery racks (often lithium-ion) with its own inverters. Sites use it for ride-through, peak shaving or grid services.',
          'Each rack has a battery management system watching cell voltage and temperature. Fire detection, ventilation or deflagration venting, and spacing are part of the design.',
        ],
      },
      {
        h: 'State of charge and health',
        p: [
          'State of charge (SOC) = how full right now. State of health (SOH) = how much capacity is left compared with new. Both trend down over years.',
          'Many systems keep SOC in a middle band to slow aging. Know the minimum SOC your site needs for ride-through.',
        ],
        verify: true,
      },
    ],
    readings: [
      { what: 'System status', normal: 'Ready / standby, no BMS alarms', act: 'Any BMS alarm: follow the site response; lithium alarms are real.' },
      { what: 'State of charge', normal: 'In the site’s set band', act: 'Below the ride-through minimum: report.' },
      { what: 'Cell / module temperatures', normal: 'Even across racks, in the manufacturer’s range', act: 'One module hotter than its neighbors: report; do not open the enclosure.' },
      { what: 'Enclosure HVAC and detection', normal: 'Running, no faults', act: 'HVAC fault: battery temperature will climb; report.' },
    ],
    failures: [
      { mode: 'Cell imbalance', signs: 'BMS warnings, one module low or high.', then: 'Reduced capacity; modules taken offline.' },
      { mode: 'Thermal event', signs: 'Rising temperature, off-gas detection, smoke.', then: 'Thermal runaway can spread module to module. Evacuate and follow the emergency plan; never open the doors.' },
      { mode: 'Enclosure cooling failure', signs: 'HVAC alarm, temps climbing.', then: 'Faster aging, then derate or shutdown.' },
    ],
    tips: ['ups-lithium-alarms-are-real', 'ups-report-swelling-right-away', 'safety-know-two-ways-out'],
    practice: [
      { kind: 'lesson', id: 'power-path' },
      { kind: 'proc', id: 'drill-utility' },
    ],
    quiz: [
      { id: 'dd-bess-1', q: 'State of health (SOH) tells you:', choices: ['How full the battery is now', 'How much capacity remains compared with new', 'The charger mode', 'The room temperature'], answer: 1, why: 'SOC is "how full now"; SOH is "how much is left of the original capacity".' },
      { id: 'dd-bess-2', q: 'Off-gas detection alarms in a BESS container. You:', choices: ['Open the doors to vent it', 'Follow the emergency plan; do not open the enclosure', 'Reset the alarm', 'Check each module by hand'], answer: 1, why: 'Opening the doors can feed a thermal event or expose you to gases. Follow the plan.' },
    ],
  },
  // --------------------------------------------------------------------
  {
    id: 'sts',
    topics: [
      {
        h: 'How an STS switches so fast',
        p: [
          'A static transfer switch uses SCRs (thyristors) instead of moving contacts. It can move the load from the preferred to the alternate source in about a quarter cycle (around 4 ms at 60 Hz), which IT power supplies ride through.',
          'It is break-before-make: it turns off one side’s SCRs before firing the other, so it never parallels the sources.',
        ],
        verify: true,
      },
      {
        h: 'When it won’t transfer',
        p: [
          'An STS will not transfer into a source that is out of phase beyond its window, or that is not healthy.',
          'It also blocks transfer on a downstream fault: moving a fault to the good source would just take that side down too.',
        ],
      },
    ],
    readings: [
      { what: 'Preferred source', normal: 'On the preferred source, both sources available', act: 'On alternate with preferred healthy: find out why (auto retransfer off? fault?).' },
      { what: 'Phase difference between sources', normal: 'Small, inside the transfer window', act: 'Large: transfers will be blocked; check upstream.' },
      { what: 'Load', normal: 'Within rating', act: 'Near rating: report to capacity planning.' },
    ],
    failures: [
      { mode: 'SCR failure', signs: 'Alarm, unit locked to one source, fan/heat sink alarms.', then: 'Loss of the fast-transfer protection; manual bypass needed for repair.' },
      { mode: 'Transfer blocked', signs: 'Sources out of phase, downstream fault, alternate not available.', then: 'A loss of the preferred source drops the load.' },
    ],
    tips: ['trouble-look-upstream-and-downstream', 'electrical-check-both-cords'],
    practice: [{ kind: 'lesson', id: 'sts' }],
    quiz: [
      { id: 'dd-sts-1', q: 'About how long does an STS take to transfer?', choices: ['10 seconds', 'About a quarter cycle (a few ms)', 'One minute', 'Half a second'], answer: 1, why: 'SCRs switch in about 4 ms, fast enough for IT power supplies to ride through.' },
      { id: 'dd-sts-2', q: 'Why does an STS block transfer on a downstream fault?', choices: ['To save the SCRs', 'Moving the fault would take down the good source too', 'The sources would be paralleled', 'It cannot detect faults'], answer: 1, why: 'A fault follows the load. Transferring it only spreads the outage.' },
    ],
  },
  // --------------------------------------------------------------------
  {
    id: 'distribution',
    topics: [
      {
        h: 'PDU, RPP, busway, rack PDU',
        p: [
          'PDU: a floor unit with a transformer (e.g. 480 V to 208/120 V or 415/240 V) and branch breakers. RPP: a remote panel of branch breakers without a transformer.',
          'Overhead busway: a bus duct with tap-off (plug-in) boxes for each rack, so power can be added without new cable runs. Follow the site rule for installing or removing tap-off boxes; many require the box’s breaker off first.',
          'Rack PDU: the power strip in the rack, often metered per outlet or per phase.',
        ],
      },
      {
        h: 'A/B feeds and the 50% rule',
        p: [
          'In 2N each rack gets an A feed and a B feed from separate paths. Dual-corded servers share load across both.',
          'If either side fails, the other carries everything. So each side must stay under about 50% of what it could carry, or the surviving side trips on overload: a cascade.',
          'Single-corded gear needs a rack transfer switch, or it is only as good as one side.',
        ],
        verify: true,
      },
      {
        h: 'Branch circuits',
        p: [
          'Continuous loads are commonly kept to 80% of the breaker rating. Spread single-phase loads so the three phases stay balanced; imbalance raises neutral current and transformer heating.',
        ],
        verify: true,
      },
    ],
    readings: [
      { what: 'PDU output voltage (208/120 V system)', normal: 'About 198–218 V phase-to-phase', act: 'Out of range: check upstream and the PDU transformer.' },
      { what: 'Phase currents', normal: 'Within about 10–20% of each other', act: 'Unbalanced: plan to move circuits at the next change.' },
      { what: 'Neutral current', normal: 'Lower than the phase currents with balanced load', act: 'Neutral as high as or higher than phases: harmonics or imbalance; report.' },
      { what: 'Branch breaker loading', normal: 'Under 80% of rating; A+B together under 100% of one breaker', act: 'A+B over one breaker’s rating: a side failure will trip the survivor.' },
    ],
    failures: [
      { mode: 'Branch breaker trip', signs: 'Rack shows one cord dark; servers on one PSU.', then: 'Redundancy lost for those servers until it is reset or fixed.' },
      { mode: 'Overloaded pair (cascade risk)', signs: 'A + B load per circuit over one breaker’s rating.', then: 'Lose A, then B trips on overload: the rack goes down.' },
      { mode: 'Tap-off box or connection hot spot', signs: 'IR hot spot, discolored plug, smell.', then: 'Arcing at the busway; loss of a feed.' },
    ],
    tips: ['electrical-the-80-rule', 'electrical-check-both-cords', 'electrical-neutrals-can-run-hot', 'ups-under-50-in-2n'],
    practice: [
      { kind: 'lesson', id: 'redundancy' },
      { kind: 'lesson', id: 'sts' },
    ],
    quiz: [
      { id: 'dd-dist-1', q: 'A rack draws 12 A on A and 12 A on B, both from 20 A breakers. Lose A: what happens?', choices: ['Nothing: B carries 12 A', 'B carries about 24 A and trips: the rack goes down', 'The UPS goes to bypass', 'The STS transfers'], answer: 1, why: 'A+B (24 A) is over one 20 A breaker. Keep each pair’s total under one breaker’s rating.' },
      { id: 'dd-dist-2', q: 'What is an RPP?', choices: ['A PDU with a transformer', 'A remote panel of branch breakers, without a transformer', 'A rack power strip', 'A busway tap-off'], answer: 1, why: 'RPPs extend branch circuits from a PDU, with no transformer inside.' },
      { id: 'dd-dist-3', q: 'Why balance single-phase loads across the three phases?', choices: ['It looks neater', 'Imbalance raises neutral current and transformer heating', 'Code requires exact balance', 'It increases voltage'], answer: 1, why: 'Balanced phases keep neutral current low and spread heat evenly.' },
    ],
  },
  // --------------------------------------------------------------------
  {
    id: 'racks',
    topics: [
      {
        h: 'Dual-corded IT gear',
        p: [
          'Most servers have two power supplies, one on A and one on B. They share the load; if one side drops, the other supply takes all of it without a blink.',
          'Check both cords are plugged in and both PSUs show healthy. A server with one PSU failed is one event away from going down.',
        ],
      },
      {
        h: 'Inlet temperature',
        p: [
          'The number that matters is the air entering the server (rack inlet), not the room. ASHRAE TC 9.9 gives recommended and allowable inlet ranges by class; your site sets its own limits.',
        ],
        verify: true,
      },
    ],
    readings: [
      { what: 'Rack PDU load (per feed)', normal: 'Similar on A and B; each under its site limit', act: 'One side zero: a cord, breaker or PSU is out. Find which.' },
      { what: 'Rack inlet temperature', normal: 'Inside the site’s limit (often inside ASHRAE’s recommended range)', act: 'High at the top of the rack: check blanking panels and recirculation.' },
      { what: 'PSU status lights', normal: 'All green', act: 'Amber/off: tell the IT owner; it’s their equipment.' },
    ],
    failures: [
      { mode: 'One feed lost', signs: 'Rack PDU dark on one side; servers alarm on PSU redundancy.', then: 'Running on one side: no redundancy until fixed.' },
      { mode: 'Hot inlet', signs: 'Missing blanking, open doors, hot air recirculating over the top.', then: 'Servers throttle, then shut down.' },
    ],
    tips: ['electrical-check-both-cords', 'rounds-tiles-in-place', 'ups-under-50-in-2n'],
    practice: [
      { kind: 'lesson', id: 'redundancy' },
      { kind: 'lesson', id: 'power-path' },
    ],
    quiz: [
      { id: 'dd-rack-1', q: 'One rack PDU reads 0 A while the other reads double its normal. Most likely:', choices: ['Normal', 'One feed (cord, breaker or upstream) is out; the rack is on one side', 'The servers are idle', 'The meter is broken'], answer: 1, why: 'Dual-corded gear moves all load to the surviving side. Find the lost feed.' },
      { id: 'dd-rack-2', q: 'Which temperature matters most for a server?', choices: ['Room average', 'Return air at the CRAH', 'Air entering the server (rack inlet)', 'Hot aisle'], answer: 2, why: 'Servers care about inlet air. That is what limits and alarms are based on.' },
    ],
  },
];
