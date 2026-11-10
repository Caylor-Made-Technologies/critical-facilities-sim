/**
 * Life safety and building deep dives (Phase 7c). Generic training content; see deepdive.ts.
 * Fire and code content is awareness, not training: the site's fire program, the AHJ and
 * licensed contractors decide. Standards by number only, never clause text.
 */
import type { DeepDive } from './deepdive';

export const LIFE_DEEP: DeepDive[] = [
  // --------------------------------------------------------------------
  {
    id: 'fire',
    topics: [
      {
        h: 'Detection: spot, aspirating, heat',
        p: [
          'Spot smoke detectors on the ceiling (and sometimes under the floor or above the ceiling).',
          'Aspirating (air-sampling) smoke detection pulls air through pipes to a very sensitive detector. It gives early stages, often named Alert, Action, Fire 1 and Fire 2, so people can find a hot component before anything burns.',
          'Heat detectors respond to temperature or rate of rise; common in places where smoke detectors false-alarm.',
        ],
      },
      {
        h: 'Alarm, supervisory, trouble',
        p: [
          'Alarm: fire detected or water flowing. Evacuate per the plan.',
          'Supervisory: something that keeps the system from working is off-normal: a closed control valve, low air pressure on a pre-action system, a tamper switch.',
          'Trouble: a fault in the fire alarm system itself: wiring, ground fault, power supply. Coverage may be reduced.',
        ],
      },
      {
        h: 'Sprinklers: wet, dry, pre-action',
        p: [
          'Wet pipe: water in the pipes; a fused head sprays at once. Simple and reliable; not usually over IT gear.',
          'Pre-action (common in data halls, NFPA 13): pipes hold supervisory air, not water. Single-interlock: detection opens the valve and water fills the pipes; a head must also fuse to spray. Double-interlock: both detection and a fused head (air loss) are needed before water enters the pipes.',
          'Only fused heads spray. A sprinkler head is not a smoke detector, and one head is not the whole room.',
        ],
        verify: true,
      },
      {
        h: 'Clean agent',
        p: [
          'Clean agents (NFPA 2001) put out fire without water or residue. The room must be tight enough to hold the concentration for the hold time, which is why penetrations get sealed and doors close.',
          'Typical sequence: first detector = alarm; second (cross-zoned) detector = pre-discharge alarm and a countdown (often about 30 s); then discharge, usually within seconds. An abort switch, held, can pause the countdown per the site’s sequence. Leave the room on pre-discharge.',
        ],
        verify: true,
      },
      {
        h: 'Impairments',
        p: [
          'Any time a fire system is out of service (testing, a closed valve, a panel fault), the site follows its impairment procedure: notify the monitoring company and those the program requires, fire watch as required, and restore and test before closing it out.',
        ],
        verify: true,
      },
    ],
    readings: [
      { what: 'Fire alarm panel', normal: 'Normal: no alarm, supervisory or trouble', act: 'Any signal: read it, record zone and device, follow the site response.' },
      { what: 'Pre-action supervisory air pressure', normal: 'In the green band on the gauge (system specific)', act: 'Low: supervisory signal; check the compressor and for leaks. Report.' },
      { what: 'Pre-action valve and control valves', normal: 'Set; control valves open and locked or supervised', act: 'A closed control valve is an impairment. Report at once.' },
      { what: 'Clean agent cylinder pressure', normal: 'Needle in the green, adjusted for room temperature', act: 'Low: possible leak; report to the fire contractor.' },
      { what: 'Aspirating detector', normal: 'Normal, airflow in range, no fault', act: 'Airflow fault: pipe blocked or broken; detection may be reduced.' },
    ],
    failures: [
      { mode: 'Trouble on the panel', signs: 'Trouble LED and buzzer; a zone or device listed.', then: 'Part of the building may have no detection until fixed.' },
      { mode: 'Pre-action air loss', signs: 'Low-air supervisory, compressor running a lot.', then: 'On double-interlock, low air can look like a fused head; with detection, the valve may trip and fill the pipes.' },
      { mode: 'Room integrity lost', signs: 'Unsealed penetrations, doors propped, new cable holes.', then: 'Clean agent leaks out too fast to hold the fire out.' },
      { mode: 'Accidental discharge', signs: 'Work near detectors or releasing panels without the system disabled per procedure.', then: 'Agent dumped, possible outage, costly refill.' },
    ],
    tips: ['memory-race-for-a-fire', 'memory-pass-for-extinguishers', 'safety-know-two-ways-out', 'safety-report-near-misses'],
    practice: [{ kind: 'proc', id: 'drill-fire' }],
    quiz: [
      { id: 'dd-fire-1', q: 'A closed sprinkler control valve shows on the panel as:', choices: ['Alarm', 'Supervisory', 'Trouble', 'Normal'], answer: 1, why: 'Supervisory = something that stops the system working is off-normal (valve, air pressure, tamper).' },
      { id: 'dd-fire-2', q: 'In a pre-action system, what keeps water out of the pipes normally?', choices: ['Nothing, they are always wet', 'A valve that opens only on detection (and, for double-interlock, a fused head too)', 'Clean agent pressure', 'The EPO'], answer: 1, why: 'Pipes hold supervisory air until the release conditions are met.' },
      { id: 'dd-fire-3', q: 'The clean agent pre-discharge alarm sounds while you are in the room. You:', choices: ['Finish your task quickly', 'Leave the room now', 'Open the doors to vent it', 'Press the EPO'], answer: 1, why: 'Get out. The abort switch is used only per the site’s sequence, by those trained to.' },
      { id: 'dd-fire-4', q: 'Why must penetrations in a clean-agent room be sealed?', choices: ['For security', 'So the agent holds its concentration for the hold time', 'To keep heat in', 'For cable management'], answer: 1, why: 'Leaks let the agent escape before the fire is fully out.' },
    ],
  },
  // --------------------------------------------------------------------
  {
    id: 'epo',
    topics: [
      {
        h: 'EPO vs abort vs shutdown',
        p: [
          'EPO (emergency power off) de-energizes the IT equipment in a room, and often its HVAC, for firefighter and electrical safety.',
          'An abort switch on a clean-agent system pauses the agent countdown. It does not cut power.',
          'These are different buttons with different covers and signs. Know which is which in every room you work in.',
        ],
      },
      {
        h: 'When an EPO is required',
        p: [
          'Whether an IT room needs an EPO depends on the code path the site uses (the IT equipment room article of the electrical code, NEC 645, and the fire standard for IT equipment, NFPA 75) and the AHJ. Many modern sites are designed to avoid it. Verify with your site’s qualified person.',
        ],
        verify: true,
      },
      {
        h: 'After an EPO',
        p: [
          'Life safety first. Then a controlled restoration: find out why it was pressed, reset the EPO circuit, then bring power back in a set order (cooling before IT load), checking each step. Never just close everything at once.',
        ],
      },
    ],
    readings: [
      { what: 'EPO station', normal: 'Cover in place, labeled, not blocked', act: 'Cover missing or damaged: report and guard it right away.' },
      { what: 'EPO supervisory on the panel', normal: 'Normal', act: 'Fault: the EPO circuit may not work, or may trip on its own; report.' },
      { what: 'Signs and the other buttons nearby', normal: 'EPO, abort and door-release buttons clearly labeled and told apart', act: 'Confusing or missing labels: report so they are fixed before someone presses the wrong one.' },
    ],
    failures: [
      { mode: 'Accidental press', signs: 'Missing cover, button near a door or light switch, work nearby.', then: 'The whole room drops at once.' },
      { mode: 'Wiring fault', signs: 'Supervisory alarm, unexplained trip.', then: 'Unplanned outage, or an EPO that doesn’t work when needed.' },
    ],
    tips: ['safety-rushed-slow-down', 'safety-take-two-minutes'],
    practice: [{ kind: 'proc', id: 'drill-fire' }],
    quiz: [
      { id: 'dd-epo-1', q: 'What does a clean-agent abort switch do?', choices: ['Cuts power to the room', 'Pauses the agent countdown per the site’s sequence', 'Starts the generator', 'Silences all alarms'], answer: 1, why: 'Abort pauses discharge; EPO cuts power. Different buttons, different jobs.' },
      { id: 'dd-epo-2', q: 'After an EPO, power is restored:', choices: ['All at once to minimize downtime', 'In a controlled order, cooling before IT, after finding why it was pressed', 'Only by the utility', 'By resetting the UPS'], answer: 1, why: 'A controlled restart avoids inrush problems and a repeat event.' },
    ],
  },
  // --------------------------------------------------------------------
  {
    id: 'monitoring',
    topics: [
      {
        h: 'Alarm priorities',
        p: [
          'Most sites use three or four priorities: critical (act now, load at risk), high/urgent (act soon, redundancy lost), medium/warning (needs attention this shift), low/info.',
          'A good alarm needs a response. ISA-18.2 is the common standard for alarm management (rationalization, shelving, chattering, floods). Your site’s alarm philosophy comes first.',
        ],
        verify: true,
      },
      {
        h: 'Finding the first alarm',
        p: [
          'One upstream event (a utility sag, a pump trip) can raise dozens of alarms. Sort by time and find the first one; fix that cause and many others clear on their own.',
          'Chattering alarms (on/off/on) and standing alarms nobody acts on train people to ignore the list. Report them for proper fixes; don’t just shelve them forever.',
        ],
      },
      {
        h: 'Sensors, overrides and time',
        p: [
          'Sensors drift and fail. A 4–20 mA signal at 0 mA usually means a broken wire, not a zero reading.',
          'Hand/override is sometimes needed, but every override gets a tag, a reason and an end date, and goes back to auto.',
          'EPMS event records only line up if every clock agrees. Accurate time stamps turn a pile of trips into a sequence of events.',
        ],
      },
    ],
    readings: [
      { what: 'Active alarm count', normal: 'Low and understood; nothing critical unacknowledged', act: 'Unknown alarms: read each, find the first, act by priority.' },
      { what: 'Points in override / hand', normal: 'None, or each tagged with an end date', act: 'Untagged override: find the owner; return to auto per procedure.' },
      { what: 'Shelved / disabled alarms', normal: 'Few, each with a reason and expiry', act: 'Expired shelves: review with your lead.' },
      { what: 'Communication status', normal: 'All controllers and meters online', act: 'Device offline: you are blind there; add it to manual rounds.' },
    ],
    failures: [
      { mode: 'Monitoring down', signs: 'Screens frozen or stale values, comm-loss alarms.', then: 'Equipment keeps running, but problems go unseen. Manual rounds until restored.' },
      { mode: 'Alarm flood', signs: 'Dozens of alarms in minutes.', then: 'The one that matters gets missed.' },
      { mode: 'Forgotten override', signs: 'A valve or fan stuck in hand for weeks.', then: 'The sequence can’t respond in a failure.' },
      { mode: 'Failed sensor', signs: 'Flatline, impossible value, 0 mA.', then: 'Control acts on bad data (e.g. a valve opens fully or closes).' },
    ],
    tips: ['controls-find-the-first-alarm', 'controls-hand-off-auto-back-to-auto', 'controls-overrides-need-an-end-date', 'controls-sensors-fail-too', 'controls-4-20-ma-zero-isn-t-zero', 'controls-clocks-must-match', 'pinch-bms-is-down'],
    practice: [
      { kind: 'lesson', id: 'rounds' },
      { kind: 'proc', id: 'drill-double' },
    ],
    quiz: [
      { id: 'dd-mon-1', q: 'Which system mainly controls chillers, pumps and air handlers?', choices: ['EPMS', 'BMS', 'DCIM', 'Fire alarm panel'], answer: 1, why: 'BMS controls mechanical gear; EPMS monitors power; DCIM ties capacity together.' },
      { id: 'dd-mon-2', q: 'Forty alarms arrive in two minutes. First step:', choices: ['Acknowledge all', 'Sort by time and find the first alarm', 'Silence the horn and wait', 'Reboot the BMS'], answer: 1, why: 'The first alarm usually points to the cause; many others follow from it.' },
      { id: 'dd-mon-3', q: 'A 4–20 mA temperature signal reads 0 mA. Most likely:', choices: ['It is very cold', 'Broken wire or failed transmitter', 'Normal at night', 'The setpoint is zero'], answer: 1, why: 'Live zero is 4 mA. Zero current means the loop is open.' },
    ],
  },
  // --------------------------------------------------------------------
  {
    id: 'security-network',
    topics: [
      {
        h: 'Layers of physical security',
        p: [
          'Perimeter, building, data hall, cage, rack: each layer limits who gets closer to critical equipment. Badge plus PIN or biometric at inner layers; mantraps stop tailgating.',
          'Everyone is responsible: challenge an unbadged person politely and report per post orders.',
        ],
      },
      {
        h: 'Network basics for facilities',
        p: [
          'Controllers talk over facility protocols (BACnet and Modbus are common open protocols) on their own network, often in VLANs, separate from IT and the internet.',
          'Know the basics: an IP address and subnet, a switch port, a VLAN, a gateway. When a controller drops off, check power, link lights and the switch port before blaming the software.',
          'Remote access goes through approved, logged paths only. Facility systems are a cyber target because they move real equipment.',
        ],
      },
    ],
    readings: [
      { what: 'Doors on your route', normal: 'Closed and latched; no held-open alarms', act: 'Propped door: close it and report per post orders.' },
      { what: 'Visitors and contractors', normal: 'Badged, signed in, escorted where required', act: 'Unescorted visitor: follow post orders and tell security.' },
      { what: 'Facility network switch / cabinet', normal: 'Locked; link lights on for critical controllers', act: 'Link down: check power and cable; tell controls/IT support.' },
    ],
    failures: [
      { mode: 'Tailgating', signs: 'Someone follows through a door without badging.', then: 'An unknown person near energized equipment.' },
      { mode: 'Controller offline', signs: 'Comm-loss alarm, dark link light.', then: 'No monitoring or remote control of that equipment.' },
      { mode: 'Unapproved device or remote access', signs: 'Unknown laptop on a controller port, new remote tool.', then: 'Equipment exposed to misuse or malware.' },
    ],
    tips: ['safety-not-your-lock-not-your-control', 'shift-know-the-escalation-list'],
    practice: [{ kind: 'lesson', id: 'rounds' }],
    quiz: [
      { id: 'dd-sec-1', q: 'A friendly coworker without a badge asks you to hold the door. You:', choices: ['Hold it, you know them', 'Politely ask them to badge in (or follow post orders)', 'Let them in and log it later', 'Prop the door'], answer: 1, why: 'Every person badges at every layer. That is how access logs stay true.' },
      { id: 'dd-sec-2', q: 'Why keep BMS controllers off the IT network and the internet?', choices: ['They are too slow', 'Commands on that network move real equipment; separation limits misuse', 'Code requires it everywhere', 'To save IP addresses'], answer: 1, why: 'Facility networks control physical gear, so access is kept tight and separate.' },
    ],
  },
];
