/**
 * MOP practice and emergency drills. Generic training sequences for a
 * generic plant. Not a site procedure: real MOPs are written, reviewed and
 * approved for each site and each piece of equipment.
 */
import type { Procedure, Simulation } from '../sim';

const upsModules = (sim: Simulation, sys: string) => sim.graph.downstream(`UIB-${sys}`).filter((n) => n.kind === 'ups');
const isClosed = (sim: Simulation, id: string) => !!sim.graph.get(id).state.closed;
const keyIn = (sim: Simulation, lock: string) => !!sim.interlocks.keyIn(lock);

const PRE_JOB: Procedure['steps'][number] = {
  title: 'Pre-job brief and approvals',
  detail:
    'Confirm the MOP is approved through change management, the work window is open, the control room and the customer have been notified, and everyone on the job has walked the steps together.',
  why: 'Most outages during planned work come from skipped communication or an unapproved change, not from the equipment.',
  confirm: 'MOP approved, team briefed, notifications sent',
};

export const MOPS: Procedure[] = [
  {
    id: 'mop-ups-bypass',
    kind: 'mop',
    title: 'Put UPS A on maintenance bypass',
    summary: 'Move the critical load off UPS A without a blip, using the key release unit and the maintenance bypass breaker.',
    level: 'Intermediate',
    minutes: 6,
    topology: 'N+1',
    steps: [
      PRE_JOB,
      {
        title: 'Verify the bypass source is healthy',
        detail: 'Before you lean on the bypass, check that the static bypass input breaker (SBB-A) is closed and its switchboard is energized.',
        why: 'On maintenance bypass the load sits on raw utility or generator power. If that source is weak, you are about to put the whole load on it.',
        focus: 'SBB-A',
        confirm: 'SBB-A closed and bypass source energized',
      },
      {
        title: 'Transfer UPS A to static bypass',
        detail: 'Select a UPS A module and press "UPS A to static bypass". All modules move together.',
        why: 'The key release unit only frees the bypass key once the UPS is on static bypass, so both paths are fed from the same source when you close MBB.',
        hint: 'Tap any UPS-A module on the one-line, then "UPS A to static bypass".',
        focus: 'UPS-A1',
        check: (s) => upsModules(s, 'A').every((m) => m.state.upsMode === 'static-bypass'),
      },
      {
        title: 'Remove the key from the key release unit',
        detail: 'Take key MBP-A out of the key release unit (SKRU).',
        why: 'The unit only lets go of the key because the UPS is on static bypass. That permissive is what makes the next step safe.',
        hint: 'On the UPS-A1 card, find "Key release unit L-SKRU-A" and press "Remove key".',
        focus: 'UPS-A1',
        check: (s) => !keyIn(s, 'L-SKRU-A'),
      },
      {
        title: 'Insert the key in the maintenance bypass breaker',
        detail: 'Put key MBP-A into the lock on MBB-A.',
        why: 'MBB-A is locked open until the key is in it. One key means the bypass can only close in the safe state.',
        hint: 'Tap MBB-A, then "Insert key MBP-A".',
        focus: 'MBB-A',
        check: (s) => keyIn(s, 'L-MBB-A'),
      },
      {
        title: 'Close the maintenance bypass breaker (MBB-A)',
        detail: 'Close MBB-A. Now the load has two paths from the same switchboard: through the UPS static switch and around it.',
        why: 'Make before break: the new path is closed before the old one opens, so the load never sees an interruption.',
        hint: 'Tap MBB-A, then "Close breaker".',
        focus: 'MBB-A',
        check: (s) => isClosed(s, 'MBB-A'),
      },
      {
        title: 'Open the UPS output breaker (UOB-A)',
        detail: 'Open UOB-A. The load now flows only through the maintenance bypass.',
        why: 'Opening the output before the bypass is closed would drop every rack on this single-path design. Order matters.',
        hint: 'Tap UOB-A, then "Open breaker".',
        focus: 'UOB-A',
        check: (s) => !isClosed(s, 'UOB-A'),
      },
      {
        title: 'Open the UPS input and bypass input breakers',
        detail: 'Open UIB-A and SBB-A to isolate the UPS from its sources.',
        why: 'Isolation is not done until every source is open. Batteries are still a source: on a real UPS you also open the battery breaker and verify.',
        hint: 'Tap UIB-A and press "Open breaker", then do the same on SBB-A.',
        focus: 'UIB-A',
        check: (s) => !isClosed(s, 'UIB-A') && !isClosed(s, 'SBB-A'),
      },
      {
        title: 'Verify the load and lock out',
        detail:
          'Confirm every rack still has power, then apply locks and tags to the open breakers under your LOTO program and test for absence of voltage before anyone touches the UPS.',
        why: 'An open breaker is not proof of a dead circuit. Test before touch, every time.',
        confirm: 'Load verified, LOTO applied, absence of voltage tested',
      },
    ],
    debrief: [
      'UPS on static bypass first, because the key release unit will not free the key otherwise.',
      'Close the maintenance bypass before opening the UPS output (make before break).',
      'Isolate every source, then lock, tag and test for absence of voltage.',
      'On a single-path design (N+1) one wrong breaker drops the whole data hall. That is why MOPs exist.',
    ],
  },
  {
    id: 'mop-ups-return',
    kind: 'mop',
    title: 'Return UPS A from maintenance bypass',
    summary: 'Bring UPS A back on line after maintenance and get the load back onto battery-protected inverter power.',
    level: 'Intermediate',
    minutes: 6,
    topology: 'N+1',
    setup: (s) => {
      s.setUpsSystemMode('A', 'static-bypass');
      s.removeKey('L-SKRU-A');
      s.insertKey('K-MBP-A', 'L-MBB-A');
      s.closeBreaker('MBB-A');
      s.openBreaker('UOB-A');
      s.openBreaker('UIB-A');
      s.openBreaker('SBB-A');
    },
    steps: [
      {
        title: 'Work complete, area clear, locks off',
        detail: 'Confirm the maintenance is signed off, tools and people are clear, and every lock and tag has been removed by the person who placed it.',
        why: 'Re-energizing with someone still inside the cabinet is how people get hurt.',
        confirm: 'Work signed off, area clear, LOTO removed',
      },
      {
        title: 'Close the UPS input and bypass input breakers',
        detail: 'Close UIB-A and SBB-A. The UPS powers up with its output still open.',
        why: 'The UPS needs both sources back before it can line up with the bypass and take the load.',
        hint: 'Tap UIB-A and press "Close breaker", then do the same on SBB-A.',
        focus: 'UIB-A',
        check: (s) => isClosed(s, 'UIB-A') && isClosed(s, 'SBB-A'),
      },
      {
        title: 'Verify the UPS is on static bypass',
        detail: 'Check the UPS A modules show static bypass. They stayed there from the last MOP.',
        why: 'Closing the output while the inverter is carrying load would parallel the inverter with the maintenance bypass.',
        focus: 'UPS-A1',
        confirm: 'UPS A reads static bypass',
      },
      {
        title: 'Close the UPS output breaker (UOB-A)',
        detail: 'Close UOB-A. The load is now fed through both the static bypass and the maintenance bypass, from the same source.',
        why: 'Make before break again: the UPS path is in before the maintenance bypass comes out.',
        hint: 'Tap UOB-A, then "Close breaker".',
        focus: 'UOB-A',
        check: (s) => isClosed(s, 'UOB-A'),
      },
      {
        title: 'Open the maintenance bypass breaker (MBB-A)',
        detail: 'Open MBB-A. The load is now only on the UPS path (still on static bypass).',
        why: 'The key is trapped in MBB-A while it is closed, so this also frees the key.',
        hint: 'Tap MBB-A, then "Open breaker".',
        focus: 'MBB-A',
        check: (s) => !isClosed(s, 'MBB-A'),
      },
      {
        title: 'Return the key to the key release unit',
        detail: 'Remove key MBP-A from MBB-A and put it back in the key release unit.',
        why: 'With the key home, MBB-A is locked open again and cannot be closed by mistake while the inverter runs.',
        hint: 'Tap MBB-A and "Remove key", then tap UPS-A1 and "Insert key MBP-A" on the key release unit.',
        focus: 'MBB-A',
        check: (s) => keyIn(s, 'L-SKRU-A'),
      },
      {
        title: 'Transfer UPS A back to inverter',
        detail: 'On a UPS A module, press "UPS A back to inverter".',
        why: 'Only now is the load back on clean, battery-protected power.',
        hint: 'Tap UPS-A1, then "UPS A back to inverter".',
        focus: 'UPS-A1',
        check: (s) => upsModules(s, 'A').every((m) => m.state.upsMode === 'auto'),
      },
      {
        title: 'Close out',
        detail: 'Check alarms are clear, battery is charging, and log the work. Tell the control room the MOP is complete.',
        why: 'A MOP is not done until the plant is back to normal and everyone knows it.',
        confirm: 'Alarms clear, MOP closed out, control room told',
      },
    ],
    debrief: [
      'The return is the bypass procedure in reverse, with the same make-before-break rule.',
      'Keys go home last, so the safety interlock is back in force before the inverter takes the load.',
      'Never leave a UPS on static bypass longer than needed: the load has no battery protection there.',
    ],
  },
  {
    id: 'mop-mtm',
    kind: 'mop',
    title: 'Feed switchboard A from B for utility work',
    summary: 'Use the main-tie-main Kirk-key scheme so the utility can work on service A while switchboard A stays up.',
    level: 'Advanced',
    minutes: 5,
    topology: '2N',
    steps: [
      PRE_JOB,
      {
        title: 'Check that side B can carry both boards',
        detail: 'Main switchboard B will feed both A and B through the tie. Check its rating against the combined load before you start.',
        why: 'The tie doubles the load on one service. If it cannot carry both, you will trip the main and lose both sides.',
        focus: 'MSB-B',
        choices: [
          { text: 'Check MSB-B and MB-B ratings against the A + B load', correct: true, why: 'Right. Capacity first, always. The B side can carry both in this design.' },
          { text: 'Skip it, the tie breaker is the same size', correct: false, why: 'The tie size is not the question. The B main and transformer have to carry everything.' },
          { text: 'Start the generators to share the load', correct: false, why: 'Generators do not parallel with utility here. The ATS uses one source at a time.' },
        ],
      },
      {
        title: 'Open Main A (MB-A)',
        detail: 'Open MB-A. Switchboard A loses utility. UPS A rides on battery and the battery yard bridges the gap.',
        why: 'This is an open transition: break before make. The two utilities must never be tied together.',
        hint: 'Tap MB-A, then "Open breaker".',
        focus: 'MB-A',
        check: (s) => !isClosed(s, 'MB-A'),
      },
      {
        title: 'Move the key from Main A to the tie',
        detail: 'Remove key MTM from MB-A, then insert it into the tie breaker lock.',
        why: 'Two keys, three breakers: at most two can ever be closed. Main A is now locked open.',
        hint: 'Tap MB-A, "Remove key". Then tap TIE-AB, "Insert key MTM".',
        focus: 'MB-A',
        check: (s) => keyIn(s, 'L-TIE-AB'),
      },
      {
        title: 'Close the tie breaker (TIE-AB)',
        detail: 'Close TIE-AB. Switchboard A is now fed from utility B.',
        why: 'Closing quickly keeps the UPS battery time used to a few seconds.',
        hint: 'Tap TIE-AB, then "Close breaker".',
        focus: 'TIE-AB',
        check: (s) => isClosed(s, 'TIE-AB') && s.solution.energized.has('MSB-A'),
      },
      {
        title: 'Verify and hand off',
        detail: 'Check both switchboards are energized, no racks are down, and UPS A is back off battery. Then give the utility crew the go-ahead under their own clearance.',
        why: 'Utility work has its own lockout. You confirm your side is safe; they confirm theirs.',
        confirm: 'Both boards energized, load verified, utility clearance issued',
      },
    ],
    debrief: [
      'Main-tie-main: two keys, three breakers. The interlock makes it impossible to parallel two utilities.',
      'Open transition: break before make, and let the UPS carry the few seconds in between.',
      'Check capacity before you double up the load on one service.',
    ],
  },
];

export const DRILLS: Procedure[] = [
  {
    id: 'drill-utility',
    kind: 'drill',
    title: 'Utility A lost',
    summary: 'The A-side utility drops. Watch the backups catch it, make the right calls, and bring it back.',
    level: 'Beginner',
    minutes: 5,
    topology: '2N',
    run: true,
    setup: (s) => {
      s.fail('UTIL-A');
    },
    steps: [
      {
        title: 'Alarm: Utility A lost, UPS A on battery',
        detail: 'The BMS lights up. UPS A is on battery and the A generators are starting. What is your first move?',
        why: 'The first minute is about confirming the automatic systems are doing their job, not about flipping breakers.',
        focus: 'ATS-A',
        choices: [
          { text: 'Confirm B side is carrying, watch the generators start and the ATS transfer', correct: true, why: 'Right. Verify the automation and the redundant side. Your EOP tells you when to step in.' },
          { text: 'Close the tie breaker to feed A from B', correct: false, why: 'The Kirk-key interlock blocks it with both mains closed, and switching during an automatic transfer causes outages.' },
          { text: 'Press the EPO to protect the equipment', correct: false, why: 'EPO kills the whole data hall. It is only for life safety (fire, electrocution).' },
          { text: 'Transfer UPS A to bypass so the battery lasts longer', correct: false, why: 'Bypass is fed from the same dead source. That would drop the A side immediately.' },
        ],
      },
      {
        title: 'Wait for the generators to take the load',
        detail: 'Let the plant run. The ATS transfers to the generators once they are up to voltage and frequency.',
        why: 'Generators take about 10 seconds to start and stabilize. The UPS battery carries the load meanwhile.',
        hint: 'Make sure the clock is running (Run), or press "+10s".',
        focus: 'ATS-A',
        check: (s) => s.graph.get('ATS-A').state.selected === 'emergency' && s.solution.energized.has('MSB-A'),
      },
      {
        title: 'On generator: what do you watch?',
        detail: 'The A side is on generator power. UPS A is back on its inverter and recharging.',
        why: 'Generators are now the single source for side A. You are watching for anything that could take them down.',
        focus: 'PB-A',
        choices: [
          { text: 'Generator load, fuel level, coolant temperature, and UPS battery recharge', correct: true, why: 'Right. Fuel and cooling are what take generators down on long outages.' },
          { text: 'Shut one generator down to save fuel', correct: false, why: 'Never reduce redundancy during an event. Capacity planning happens after.' },
          { text: 'Nothing, the system is automatic now', correct: false, why: 'Automatic is not unattended. Someone always watches the plant during an event.' },
        ],
      },
      {
        title: 'Utility A is restored. When does the ATS go back?',
        detail: 'The utility reports the feed is back.',
        why: 'Utilities often bounce several times right after a repair.',
        choices: [
          { text: 'After the retransfer timer proves the utility stable (5 minutes here)', correct: true, why: 'Right. The timer protects you from a utility that comes back and drops again.' },
          { text: 'Immediately, to save generator fuel', correct: false, why: 'A utility that bounces would hit the load twice. Let the timer prove it stable.' },
          { text: 'Never, stay on generator until the next maintenance window', correct: false, why: 'Generators are the backup, not the plan. Return to utility once it is proven stable.' },
        ],
        after: (s) => {
          s.restore('UTIL-A');
        },
      },
      {
        title: 'Let the ATS retransfer',
        detail: 'Let the clock run until ATS A goes back to utility. Speed it up with 60× if you like.',
        why: 'Once back on utility, the generators run unloaded to cool down, then stop.',
        hint: 'Set speed to 60× and press Run.',
        focus: 'ATS-A',
        check: (s) => s.graph.get('ATS-A').state.selected === 'normal' && s.solution.energized.has('MSB-A'),
      },
      {
        title: 'After the event',
        detail: 'Log the event, check generator fuel and refill, and confirm every alarm is cleared.',
        why: 'An event is not over until the plant is ready for the next one.',
        confirm: 'Event logged, fuel checked, alarms clear',
      },
    ],
    debrief: [
      'Verify the automation first, and only act when the EOP says to.',
      'EPO is for life safety only. It is never a way to "protect the equipment".',
      'Retransfer waits for a stable utility. Do not rush back.',
    ],
  },
  {
    id: 'drill-chiller',
    kind: 'drill',
    title: 'Chiller trip on a 105 °F day',
    summary: 'A running chiller trips on a hot afternoon. Keep the data hall cool while the standby chiller starts.',
    level: 'Intermediate',
    minutes: 5,
    topology: '2N',
    weather: 'hot-dry',
    run: true,
    setup: (s) => {
      s.fail('CH-01');
    },
    steps: [
      {
        title: 'Alarm: CH-01 tripped',
        detail: 'CH-01 tripped. The chilled water supply temperature is starting to climb. What do you check first?',
        why: 'The plant has a plan for this: a standby chiller and a storage tank. Your job is to confirm the plan is working.',
        view: 'mechanical',
        focus: 'CH-01',
        choices: [
          { text: 'Confirm the standby chiller is starting and the storage tank is discharging', correct: true, why: 'Right. The tank covers the gap while CH-03 goes through its start sequence.' },
          { text: 'Reset CH-01 right away and restart it', correct: false, why: 'Find out why it tripped first. Resetting into the same fault can damage the compressor.' },
          { text: 'Open the data hall doors to let heat out', correct: false, why: 'It is 105 °F outside. Outside air would make it worse and wreck humidity control.' },
        ],
      },
      {
        title: 'Wait for the standby chiller',
        detail: 'Let the clock run until CH-03 is running.',
        why: 'Chillers need about two minutes to start: oil pump, vanes, and loading.',
        hint: 'Press Run, or use 10× speed.',
        view: 'mechanical',
        focus: 'CH-03',
        check: (s) => s.thermal.readout.chillers['CH-03'] === 'running',
      },
      {
        title: 'Why did CH-01 trip?',
        detail: 'With CH-03 carrying the load, you check CH-01. On a hot day, what is the most likely cause?',
        why: 'Hot days push condenser water temperature, and head pressure, toward the trip limit.',
        view: 'mechanical',
        focus: 'CH-01',
        choices: [
          { text: 'High head pressure: hot condenser water from struggling towers', correct: true, why: 'Right. Check tower fans, fill and condenser water temperature before you reset.' },
          { text: 'Low chilled water temperature', correct: false, why: 'Possible in winter, but unlikely at 105 °F with high load.' },
          { text: 'The chiller is just old', correct: false, why: 'Trips have a cause. Read the alarm history and find it.' },
        ],
      },
      {
        title: 'Hand off',
        detail: 'Log the trip, the cause you suspect, and open a work order. Tell the control room the plant is on CH-02 and CH-03 with no spare until CH-01 is fixed.',
        why: 'The plant just lost its redundancy. Everyone needs to know.',
        confirm: 'Trip logged, work order opened, redundancy loss reported',
      },
    ],
    debrief: [
      'The storage tank buys time; the standby chiller is the fix.',
      'Never reset a tripped chiller before you know why it tripped.',
      'Losing a spare is a reportable change in risk, even if nothing went down.',
    ],
  },
  {
    id: 'drill-double',
    kind: 'drill',
    title: 'Both utilities lost, a generator fails',
    summary: 'A storm takes out both utility feeds and one generator fails to start. Do the capacity math under pressure.',
    level: 'Advanced',
    minutes: 5,
    topology: '2N',
    run: true,
    setup: (s) => {
      s.fail('UTIL-A');
      s.fail('UTIL-B');
      s.fail('GEN-A1');
    },
    steps: [
      {
        title: 'Alarm: both utilities lost, GEN-A1 failed to start',
        detail: 'Both sides are on UPS battery. Five of six generators are starting. Side A has two generators of 1,250 kW. Is that enough?',
        why: 'Capacity math is the first question in any failure: what is left, and can it carry the load?',
        focus: 'PB-A',
        choices: [
          { text: 'Yes: 2 × 1,250 kW = 2,500 kW, more than side A\'s share (about 1,400 kW)', correct: true, why: 'Right. Each side carries about half the load, so two generators hold with margin.' },
          { text: 'No: side A needs all three generators', correct: false, why: 'Three is N+1 for this side. With one gone you are at N, which still carries the load.' },
          { text: 'Doesn\'t matter, side B will carry everything', correct: false, why: 'Side B is also on generator. Each side has to hold its own share, and B could fail too.' },
        ],
      },
      {
        title: 'Wait for both sides to transfer',
        detail: 'Let the clock run until both ATSs are on generator.',
        why: 'The UPS batteries are counting down. Watch their runtime in the status bar.',
        hint: 'Press Run or "+10s".',
        focus: 'ATS-A',
        check: (s) =>
          s.graph.get('ATS-A').state.selected === 'emergency' &&
          s.graph.get('ATS-B').state.selected === 'emergency' &&
          s.solution.energized.has('MSB-A') &&
          s.solution.energized.has('MSB-B'),
      },
      {
        title: 'Side A is at N. What now?',
        detail: 'Side A is running with no spare generator.',
        why: 'One more failure on side A and the dual-corded racks lean on side B alone.',
        focus: 'GEN-A1',
        choices: [
          { text: 'Report the lost redundancy, call for generator support, and plan for fuel', correct: true, why: 'Right. Escalate early, protect the fuel supply, and get GEN-A1 fixed.' },
          { text: 'Shed load by turning off racks', correct: false, why: 'Load shedding is a customer decision in a written plan, not an operator reflex. You still have capacity.' },
          { text: 'Try to parallel side A and B generators through the tie', correct: false, why: 'Never parallel unsynchronized sources. The interlock exists to stop exactly this.' },
        ],
      },
      {
        title: 'Hand off',
        detail: 'Log the event with times, start the fuel plan, and update the control room every 15 minutes until utility returns.',
        why: 'Long outages are won on fuel and communication.',
        confirm: 'Event logged, fuel plan started, updates scheduled',
      },
    ],
    debrief: [
      'Capacity math first: count what is left and compare it to the load.',
      'Running at N is not a failure, but it is a reportable loss of redundancy.',
      'Never parallel unsynchronized sources, even in an emergency.',
    ],
  },
];

export const PROCEDURES: Procedure[] = [...MOPS, ...DRILLS];
