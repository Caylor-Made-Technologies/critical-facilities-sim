/**
 * MOP practice and emergency drills. Generic training sequences for a
 * generic plant. Not a site procedure: real MOPs are written, reviewed and
 * approved for each site and each piece of equipment.
 */
import type { Procedure, Simulation } from '../sim';
import { DEEPER } from './deeper';

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
          'Confirm every rack still has power, then apply locks and tags to the open breakers under your LOTOTO program and test for absence of voltage before anyone touches the UPS.',
        why: 'An open breaker is not proof of a dead circuit. Test before touch, every time.',
        confirm: 'Load verified, LOTOTO applied, absence of voltage tested',
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
        confirm: 'Work signed off, area clear, LOTOTO removed',
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
  {
    id: 'mop-gen-test',
    kind: 'mop',
    title: 'Monthly generator test run',
    summary: 'Start a standby generator, check it runs right, and put it back in automatic. The test that proves the backup will be there.',
    level: 'Beginner',
    minutes: 4,
    topology: '2N',
    run: true,
    steps: [
      PRE_JOB,
      {
        title: 'Walk down the generator before you start it',
        detail: 'Before any start, walk around the unit. What are you looking for?',
        why: 'Most failed starts are found on a walkdown: a closed fuel valve, a dead battery charger, a leak.',
        focus: 'GEN-A1',
        choices: [
          { text: 'Fuel level and valves, oil and coolant levels, battery charger on, no leaks, nothing loose or blocking the air flow', correct: true, why: 'Right. Five minutes of looking prevents a failed start during a real outage.' },
          { text: 'Nothing, the controller would alarm if something was wrong', correct: false, why: 'Controllers miss closed manual valves, rags in the radiator and slow leaks. Eyes on the unit, every time.' },
          { text: 'Just the fuel gauge', correct: false, why: 'Fuel matters, but so do oil, coolant, batteries and air flow.' },
        ],
      },
      {
        title: 'Start GEN-A1 for a test run',
        detail: 'Select GEN-A1 and press "Start test run". It runs unloaded; the utility still carries the plant.',
        why: 'An unloaded run proves the engine starts and reaches speed. Load bank tests (separately scheduled) prove it can carry real load.',
        hint: 'Tap GEN-A1 on the one-line, then "Start test run". Keep the clock running.',
        focus: 'GEN-A1',
        check: (s) => s.graph.get('GEN-A1').state.genState === 'running' && !!s.graph.get('GEN-A1').state.manualRun,
      },
      {
        title: 'Record the readings',
        detail: 'Log oil pressure, coolant temperature, voltage, frequency and battery charge against the expected ranges.',
        why: 'Trends catch problems early: a coolant temperature creeping up month after month is a radiator or thermostat on its way out.',
        confirm: 'Readings logged and in range',
      },
      {
        title: 'Stop the test run',
        detail: 'Press "Stop test run". The generator cools down and goes back to automatic standby.',
        why: 'Leaving a generator in manual or off after a test is a classic way to lose the backup without anyone knowing.',
        hint: 'Tap GEN-A1, then "Stop test run".',
        focus: 'GEN-A1',
        check: (s) => s.graph.get('GEN-A1').state.genState === 'off' && !s.graph.get('GEN-A1').state.manualRun,
      },
      {
        title: 'Back in automatic',
        detail: 'Confirm the controller is in AUTO, top up the day tank if needed, and log the test as complete.',
        why: 'The test is only useful if the generator ends it ready for the next real outage.',
        confirm: 'Controller in AUTO, fuel checked, test logged',
      },
    ],
    debrief: [
      'Walk down the unit before every start.',
      'Record readings every month, because the trend is what catches failing parts.',
      'End every test in AUTO. A generator left in manual is no backup at all.',
    ],
  },
  {
    id: 'mop-tie-return',
    kind: 'mop',
    title: 'Return switchboard A to its own utility',
    summary: 'Utility work is done. Open the tie, move the key home, and close Main A, without ever paralleling the two services.',
    level: 'Advanced',
    minutes: 5,
    topology: '2N',
    setup: (s) => {
      s.openBreaker('MB-A');
      s.removeKey('L-MB-A');
      s.insertKey('K-MTM-1', 'L-TIE-AB');
      s.closeBreaker('TIE-AB');
      s.advance(30);
    },
    steps: [
      {
        title: 'Utility clearance returned',
        detail: 'The utility crew has released their clearance and confirms service A is energized and normal.',
        why: 'Never switch toward a source someone else still has locked out.',
        confirm: 'Utility clearance released, service A verified energized',
      },
      {
        title: 'Open transition or closed?',
        detail: 'To move switchboard A back, you will open the tie, then close Main A. What does that mean for the load?',
        why: 'Knowing what the load will see before you switch is how you avoid surprises.',
        choices: [
          { text: 'A short break on switchboard A; UPS A and the battery yard carry it for a few seconds', correct: true, why: 'Right. Open transition, break before make. The UPS is there for exactly this.' },
          { text: 'Nothing, close Main A first so there is no break', correct: false, consequence: (s) => s.closeBreaker('MB-A'),  why: 'That would tie utility A and utility B together. The interlock blocks it because it can cause a huge fault.' },
          { text: 'Every rack drops for a moment', correct: false, why: 'The racks are on UPS power. They never see the gap.' },
        ],
      },
      {
        title: 'Open the tie breaker',
        detail: 'Open TIE-AB.',
        why: 'Break first. Switchboard A goes dead for a moment and UPS A rides on battery.',
        hint: 'Tap TIE-AB, then "Open breaker".',
        focus: 'TIE-AB',
        check: (s) => !isClosed(s, 'TIE-AB'),
      },
      {
        title: 'Move the key from the tie back to Main A',
        detail: 'Remove key MTM from the tie lock and insert it into the Main A lock.',
        why: 'The tie is now locked open, so the two services can never be tied by mistake.',
        hint: 'Tap TIE-AB, "Remove key". Tap MB-A, "Insert key MTM".',
        focus: 'TIE-AB',
        check: (s) => keyIn(s, 'L-MB-A'),
      },
      {
        title: 'Close Main A',
        detail: 'Close MB-A. Switchboard A is back on its own utility.',
        why: 'Move quickly but carefully: the UPS battery is covering the gap.',
        hint: 'Tap MB-A, then "Close breaker".',
        focus: 'MB-A',
        check: (s) => isClosed(s, 'MB-A') && s.solution.energized.has('MSB-A'),
      },
      {
        title: 'Back to normal',
        detail: 'Check both switchboards are on their own utility, the tie is open with its lock empty, and alarms are clear.',
        why: 'The plant is only back to normal when it looks exactly like the normal one-line.',
        confirm: 'Normal line-up verified, MOP closed out',
      },
    ],
    debrief: [
      'Never switch toward a source until its owner releases it.',
      'Break before make on main-tie-main. The UPS covers the gap.',
      'Finish with the normal line-up: both mains closed, tie open, keys home.',
    ],
  },
  {
    id: 'mop-chiller-pm',
    kind: 'mop',
    title: 'Take a chiller out for maintenance',
    summary: 'Lock out the lead chiller for PM and confirm the plant stages around it without the data hall warming up.',
    level: 'Intermediate',
    minutes: 5,
    topology: '2N',
    run: true,
    steps: [
      PRE_JOB,
      {
        title: 'Check the plant can run without CH-01',
        detail: 'CH-01 is the lead chiller. What do you check before you take it out?',
        why: 'Taking out a chiller turns N+1 into N. You want to know that before, not after.',
        view: 'mechanical',
        focus: 'CH-01',
        choices: [
          { text: 'The other chillers are available, the storage tank is full, and the weather forecast is mild', correct: true, why: 'Right. Spares, stored cooling and the weather decide how much risk you are taking.' },
          { text: 'Nothing, the BMS will sort it out', correct: false, why: 'The BMS can only use what is available. You check that it is.' },
          { text: 'Shut every chiller down so the plant is quiet for the tech', correct: false, consequence: (s) => ['CH-01', 'CH-02', 'CH-03', 'ACH-04'].forEach((id) => s.setMaintenance(id)), consequenceS: 600,  why: 'That would heat the data hall in minutes. Only the unit being worked on comes out.' },
        ],
      },
      {
        title: 'Take CH-01 out of service',
        detail: 'Select CH-01 and press "Take out of service". The BMS starts the next chiller; the storage tank covers the gap.',
        why: 'A chiller takes about two minutes to start. That gap is what the storage tank is for.',
        hint: 'In the Mechanical view, tap CH-01, then "Take out of service".',
        view: 'mechanical',
        focus: 'CH-01',
        check: (s) => s.graph.get('CH-01').status === 'maintenance',
      },
      {
        title: 'Watch the next chiller take the load',
        detail: 'Let the clock run until the BMS has another chiller running.',
        why: 'Do not leave until you have seen the plant settle on its new line-up.',
        hint: 'Press Run, or set 10× speed.',
        view: 'mechanical',
        check: (s) => Object.entries(s.thermal.readout.chillers).some(([id, m]) => id !== 'CH-01' && m === 'running') && s.thermal.readout.tesDischargeKwt === 0,
      },
      {
        title: 'Lock out and isolate',
        detail: 'Apply your lock at the chiller disconnect, close and tag the water valves, and verify zero energy before the tech opens anything.',
        why: 'Water and refrigerant are stored energy too. Electrical LOTOTO alone is not enough on a chiller.',
        confirm: 'Electrical and water isolation locked, tagged and verified',
      },
    ],
    debrief: [
      'Check spares, stored cooling and weather before you take capacity out.',
      'Watch the plant settle before you walk away.',
      'Mechanical LOTOTO covers water and refrigerant, not just the breaker.',
    ],
  },
  {
    id: 'mop-crah-filters',
    kind: 'mop',
    title: 'Air handler filter change',
    summary: 'Take one air handler out for a filter change, confirm the hall stays in range, and bring it back.',
    level: 'Beginner',
    minutes: 3,
    topology: '2N',
    run: true,
    steps: [
      PRE_JOB,
      {
        title: 'Take CRAH-101 out of service',
        detail: 'Select CRAH-101 and press "Take out of service".',
        why: 'With spare air handlers (N+2 here), one out for an hour changes nothing. Still, it is a change, so it is planned.',
        hint: 'In the Mechanical view, tap CRAH-101, then "Take out of service".',
        view: 'mechanical',
        focus: 'CRAH-101',
        check: (s) => s.graph.get('CRAH-101').status === 'maintenance',
      },
      {
        title: 'Change the filters',
        detail: 'Fan off and locked out, swap the filters, and write the date on the new ones.',
        why: 'Dirty filters cut air flow, so the fans work harder and the hall runs warmer.',
        confirm: 'Filters changed and dated',
      },
      {
        title: 'Return CRAH-101 to service',
        detail: 'Remove your lock, then press "Return to service".',
        why: 'An air handler left off after maintenance silently removes your spare.',
        hint: 'Tap CRAH-101, then "Return to service".',
        view: 'mechanical',
        focus: 'CRAH-101',
        check: (s) => s.graph.get('CRAH-101').status !== 'maintenance',
      },
      {
        title: 'Check the hall',
        detail: 'Confirm the rack inlet temperature is in the ASHRAE range and the unit shows no alarms.',
        why: 'Every job ends with checking that the plant is back to normal.',
        confirm: 'Inlet in range, no alarms, work order closed',
      },
    ],
    debrief: ['Small jobs still get planned and closed out.', 'Return equipment to service the moment the work is done.', 'Date your filters so the next tech knows the history.'],
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
          { text: 'Close the tie breaker to feed A from B', correct: false, consequence: (s) => s.closeBreaker('TIE-AB'),  why: 'The Kirk-key interlock blocks it with both mains closed, and switching during an automatic transfer causes outages.' },
          { text: 'Press the EPO to protect the equipment', correct: false, consequence: (s) => s.emergencyPowerOff(), consequenceS: 30,  why: 'EPO kills the whole data hall. It is only for life safety (fire, electrocution).' },
          { text: 'Transfer UPS A to bypass so the battery lasts longer', correct: false, consequence: (s) => s.setUpsSystemMode('A', 'static-bypass'),  why: 'Bypass is fed from the same dead source. That would drop the A side immediately.' },
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
          { text: 'Try to parallel side A and B generators through the tie', correct: false, consequence: (s) => s.closeBreaker('TIE-AB'),  why: 'Never parallel unsynchronized sources. The interlock exists to stop exactly this.' },
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
  {
    id: 'drill-cdu',
    kind: 'drill',
    title: 'Liquid cooling unit (CDU) failure',
    summary: 'The coolant unit for GPU row 1 stops. The chips heat up in seconds, not minutes. Act fast.',
    level: 'Intermediate',
    minutes: 3,
    topology: '2N',
    run: true,
    setup: (s) => {
      s.fail('CDU-1');
    },
    steps: [
      {
        title: 'Alarm: CDU-1 fault, GPU row 1 temperature rising',
        detail: 'The coolant unit for GPU row 1 has stopped pumping. What do you do first?',
        why: 'Cold plates hold very little heat. GPUs throttle in about 30 seconds and shut down soon after.',
        view: 'mechanical',
        focus: 'CDU-1',
        choices: [
          { text: 'Go to the CDU, switch to the standby pump, and warn the customer their GPUs may throttle', correct: true, why: 'Right. Speed matters here, and the customer needs to know their jobs may slow down.' },
          { text: 'Turn up the air handlers to cool the GPUs', correct: false, consequence: () => undefined, consequenceS: 150,  why: 'Liquid-cooled GPUs reject most of their heat to water. Air cannot make up for it.' },
          { text: 'Wait and see if it clears on its own', correct: false, consequence: () => undefined, consequenceS: 150,  why: 'You have seconds. Waiting means tripped GPUs and lost customer work.' },
        ],
        after: (s) => {
          s.restore('CDU-1');
        },
      },
      {
        title: 'Standby pump running: watch row 1 recover',
        detail: 'Coolant is flowing again. Let the clock run until the row 1 GPUs are back to normal temperature.',
        why: 'Confirm the fix worked before you call it done.',
        hint: 'Keep the clock running.',
        view: 'mechanical',
        check: (s) => s.thermal.readout.gpuRows.every((r) => !r.throttled && !r.tripped && r.tempC < 70),
      },
      {
        title: 'Follow-up',
        detail: 'The lead pump failed and you are on the standby. What now?',
        why: 'You just lost your spare pump.',
        choices: [
          { text: 'Open a priority work order, report the lost redundancy, and check coolant level and filters', correct: true, why: 'Right. Running on the spare is running at N.' },
          { text: 'Nothing, it works now', correct: false, why: 'If the standby pump fails, there is no backup left.' },
        ],
      },
    ],
    debrief: ['Liquid cooling gives you seconds. Know where the standby pump switch is before you need it.', 'Tell the customer early.', 'Running on a spare means you have lost redundancy. Report it.'],
  },
  {
    id: 'drill-ups-room',
    kind: 'drill',
    title: 'UPS room cooling lost',
    summary: 'The air conditioner for the UPS and battery room fails. Batteries hate heat. What do you do?',
    level: 'Beginner',
    minutes: 3,
    topology: '2N',
    run: true,
    setup: (s) => {
      s.fail('CRAC-201');
    },
    steps: [
      {
        title: 'Alarm: CRAC-201 failed, UPS room warming',
        detail: 'The UPS room temperature is climbing slowly. Why does it matter?',
        why: 'UPS rooms hold batteries, and battery life is very sensitive to heat.',
        view: 'mechanical',
        focus: 'CRAC-201',
        choices: [
          { text: 'Hot batteries age fast (about half the life for every 8–10 °C above 25 °C) and the UPS can overheat', correct: true, why: 'Right. A hot week can cost years of battery life.' },
          { text: 'It does not, UPSs are rated for heat', correct: false, why: 'Electronics derate and batteries age much faster when hot.' },
          { text: 'Only because the room gets uncomfortable', correct: false, why: 'The equipment is the concern, not comfort.' },
        ],
      },
      {
        title: 'Your response',
        detail: 'A technician is on the way. What do you do meanwhile?',
        why: 'You buy time and watch the temperature trend.',
        choices: [
          { text: 'Set up approved temporary cooling, keep doors closed unless the plan says otherwise, and watch room and battery temperatures', correct: true, why: 'Right. Follow the site plan and keep an eye on the trend.' },
          { text: 'Put the UPS on bypass to make less heat', correct: false, consequence: (s) => s.setUpsSystemMode('A', 'static-bypass'),  why: 'That removes battery protection from the load. Not for a slow temperature rise.' },
          { text: 'Open the battery cabinets to let the heat out', correct: false, why: 'Opening energized battery cabinets is a shock and arc-flash hazard.' },
        ],
        after: (s) => {
          s.restore('CRAC-201');
        },
      },
      {
        title: 'CRAC repaired: watch the room recover',
        detail: 'The technician reset the unit. Let the clock run until the UPS room is back near 75 °F (24 °C).',
        why: 'Confirm the fix with the trend, not the technician\'s word alone.',
        hint: 'Set 60× speed and press Run.',
        view: 'mechanical',
        check: (s) => s.thermal.readout.upsRoomC < 24.5,
      },
    ],
    debrief: ['Batteries age fast in heat. UPS room cooling is critical cooling.', 'Never open energized battery cabinets to cool them.', 'Confirm repairs with the temperature trend.'],
  },
  {
    id: 'drill-fire',
    kind: 'drill',
    title: 'Fire alarm in the data hall',
    summary: 'A smoke detector in the data hall goes into alarm. Make the calls that keep people safe first.',
    level: 'Intermediate',
    minutes: 4,
    topology: '2N',
    steps: [
      {
        title: 'Alarm: smoke detector, data hall',
        detail: 'One smoke detector in the data hall is in alarm. The pre-action sprinkler system has armed but no water has been released. First move?',
        why: 'Life safety comes first, then the equipment.',
        focus: 'FACP-01',
        choices: [
          { text: 'Follow the site fire plan: notify the control room and fire department as required, and investigate only if it is safe and you are trained to', correct: true, why: 'Right. People first, by the plan.' },
          { text: 'Silence and reset the panel so the alarm stops', correct: false, why: 'Never silence or reset a fire alarm you have not investigated. That is for the fire department or the plan to decide.' },
          { text: 'Press the EPO to cut power to the hall', correct: false, consequence: (s) => s.emergencyPowerOff(), consequenceS: 30,  why: 'EPO is not a fire response by reflex. Your site plan says when, and it is rarely the first move.' },
        ],
      },
      {
        title: 'Clean agent warning in the UPS room',
        detail: 'A second alarm: the clean agent system in the UPS room is in its pre-discharge countdown, horns and strobes on. You are in that room.',
        why: 'Clean agent systems flood the room in seconds.',
        choices: [
          { text: 'Leave immediately and close the door behind you', correct: true, why: 'Right. Get out, and do not go back in until the room is cleared.' },
          { text: 'Press the abort button so you can finish your round', correct: false, why: 'Abort is only used per the site procedure, when there is clearly no fire. Never to keep working.' },
          { text: 'Find the source of the smoke first', correct: false, why: 'Not inside a room that is about to discharge. Leave.' },
        ],
      },
      {
        title: 'After the fire department clears the building',
        detail: 'It was an overheated power supply in one rack. Who decides when systems are reset?',
        why: 'Resetting fire systems is controlled for a reason.',
        choices: [
          { text: 'The fire department and the fire system contractor, per the plan, then the system is restored and tested', correct: true, why: 'Right. Fire systems go back into service through the proper people.' },
          { text: 'Whoever is on shift, to get things back to normal quickly', correct: false, why: 'A discharged or impaired fire system needs qualified restoration and an impairment notice.' },
        ],
      },
      {
        title: 'Report',
        detail: 'Log the event, file the impairment notice if any system was out of service, and send the incident report.',
        why: 'Fire events are reportable to the owner, the insurer and sometimes the authority having jurisdiction.',
        confirm: 'Event logged, impairments filed, report sent',
      },
    ],
    debrief: ['Life safety first, by the site fire plan.', 'Never silence or reset an alarm you have not investigated.', 'Leave a room in clean agent pre-discharge immediately.'],
  },
  {
    id: 'drill-towers',
    kind: 'drill',
    title: 'Two cooling towers lost on a 105 °F day',
    summary: 'Tower fans trip on a scorching afternoon. Condenser water climbs, chillers trip. Get the plant back.',
    level: 'Advanced',
    minutes: 6,
    topology: '2N',
    weather: 'hot-dry',
    run: true,
    setup: (s) => {
      s.fail('CT-01');
      s.fail('CT-02');
    },
    steps: [
      {
        title: 'Alarm: CT-01 and CT-02 fans tripped',
        detail: 'Condenser water temperature is climbing fast. What happens next if nothing changes?',
        why: 'Towers reject the heat the chillers pull out of the building. Without them, heat has nowhere to go.',
        view: 'mechanical',
        focus: 'CT-01',
        choices: [
          { text: 'Head pressure rises and the water-cooled chillers trip; the tank and the air-cooled chiller carry the load', correct: true, why: 'Right. That is why sites keep a different kind of backup, like an air-cooled chiller.' },
          { text: 'Nothing, the chillers will just run slower', correct: false, consequence: () => undefined, consequenceS: 240,  why: 'Chillers protect themselves. High head pressure trips them off.' },
          { text: 'The data hall loses power', correct: false, why: 'Power is fine. This is a cooling problem.' },
        ],
      },
      {
        title: 'Let the backup plant take over',
        detail: 'Let the clock run until CH-01 and CH-02 have tripped and the backup chillers are running and loaded. The storage tank covers any gap meanwhile; on a day this hot it may keep topping up a little.',
        why: 'Trust the backup and confirm it, before you start fixing the cause.',
        hint: 'Set 10× speed and press Run.',
        view: 'mechanical',
        // Not "tank stops discharging": at 105 °F the backups can fall a few kW short, so the tank keeps covering that gap.
        check: (s) =>
          s.graph.get('CH-01').status === 'failed' &&
          s.graph.get('CH-02').status === 'failed' &&
          Object.values(s.thermal.readout.chillers).filter((m) => m === 'running').length >= 2,
      },
      {
        title: 'Tower fans reset',
        detail: 'A tech finds both fan motors tripped on overload and resets them. Before you restart the tripped chillers, what do you check?',
        why: 'A restart into the same condition just trips again.',
        view: 'mechanical',
        choices: [
          { text: 'Towers running and condenser water back in range, then reset the chillers one at a time', correct: true, why: 'Right. Fix the cause, then restart in steps.' },
          { text: 'Reset everything at once to get back to normal faster', correct: false, why: 'Restarting everything at once can trip it all again, or overload the electrical service.' },
        ],
        after: (s) => {
          s.restore('CT-01');
          s.restore('CT-02');
        },
      },
      {
        title: 'Reset the tripped chillers',
        detail: 'Towers are back. Reset CH-01 and CH-02 (select each one and press "Restore").',
        why: 'A tripped chiller needs a manual reset after you understand why it tripped.',
        hint: 'In the Mechanical view, tap CH-01 and press "Restore", then do the same for CH-02.',
        view: 'mechanical',
        focus: 'CH-01',
        check: (s) => s.graph.get('CH-01').status !== 'failed' && s.graph.get('CH-02').status !== 'failed',
      },
    ],
    debrief: ['Towers are critical cooling, so watch their fans and water on hot days.', 'Keep a different kind of backup (air-cooled) for when the whole condenser loop struggles.', 'Fix the cause, then restart chillers one at a time.'],
  },
  {
    id: 'drill-fuel',
    kind: 'drill',
    title: 'Long outage: fuel math',
    summary: 'A storm takes both utilities for hours. The generators are fine, so now it is about fuel.',
    level: 'Intermediate',
    minutes: 4,
    topology: '2N',
    run: true,
    setup: (s) => {
      s.fail('UTIL-A');
      s.fail('UTIL-B');
    },
    steps: [
      {
        title: 'Wait for both sides to reach generator',
        detail: 'Let the clock run until both transfer switches are on generator.',
        why: 'Confirm the automation first.',
        hint: 'Press Run or "+10s".',
        check: (s) => s.graph.get('ATS-A').state.selected === 'emergency' && s.graph.get('ATS-B').state.selected === 'emergency',
      },
      {
        title: 'How long will the fuel last?',
        detail: 'Each generator has a 1,000 L day tank and is burning about 150 L per hour at this load. Ignoring the bulk tank, about how long until a day tank runs dry?',
        why: 'Fuel math is the core of every long outage plan.',
        focus: 'GEN-A1',
        choices: [
          { text: 'About 6½ hours (1,000 ÷ 150)', correct: true, why: 'Right. In real life the bulk tank refills the day tanks, so it is the bulk tank and the deliveries you watch next.' },
          { text: 'About 1½ hours', correct: false, why: 'Check the division: 1,000 ÷ 150 is about 6.7.' },
          { text: 'Days, generators barely use fuel', correct: false, why: 'Large generators burn hundreds of litres an hour under load.' },
        ],
      },
      {
        title: 'Your fuel plan',
        detail: 'The forecast says utility could be out for two days.',
        why: 'Deliveries take time to arrange, especially during a regional storm.',
        choices: [
          { text: 'Confirm the bulk tank level and transfer pumps, call the fuel supplier under the emergency contract now, and track burn rate hourly', correct: true, why: 'Right. Order early, verify the transfer system, and measure.' },
          { text: 'Wait until the tank is half empty before calling for fuel', correct: false, why: 'During a storm everyone calls at once. Order early.' },
          { text: 'Shut down half the generators to stretch the fuel', correct: false, consequence: (s) => (s.fail('GEN-A1'), s.fail('GEN-A2'), s.fail('GEN-B1')), consequenceS: 60,  why: 'That removes redundancy and the remaining units burn more each. Never trade redundancy for fuel without a plan.' },
        ],
      },
      {
        title: 'Hand off',
        detail: 'Log fuel levels and delivery times, and brief the next shift on the burn rate and the plan.',
        why: 'Long outages cross shift changes. The handoff is where plans get lost.',
        confirm: 'Fuel log started, next shift briefed',
      },
    ],
    debrief: ['Fuel math: tank size ÷ burn rate.', 'Order fuel early under the emergency contract.', 'Brief every shift change during a long outage.'],
  },
  // --- Phase 8c: scenarios that turn on the engine's typed switches ---------------------------------
  {
    id: 'drill-gen-overcrank',
    kind: 'drill',
    title: 'Utility A lost, A generators fail to start',
    summary: 'Utility A drops and every A generator cranks without firing. Hold the site on side B and the UPS batteries, then recover.',
    level: 'Advanced',
    minutes: 8,
    topology: '2N',
    run: true,
    scenario: [{ at: 0, action: { a: 'failToStart', p: 1 } }],
    setup: (s) => {
      s.fail('UTIL-A');
    },
    steps: [
      {
        title: 'Alarm: Utility A lost, UPS A on battery',
        detail: 'UPS A is on battery and the A generators are cranking. What is your first move?',
        why: 'Verify the automation and the redundant side before you touch anything.',
        focus: 'ATS-A',
        choices: [
          { text: 'Confirm side B is carrying, watch the A generators start and the ATS transfer', correct: true, why: 'Right. Same first move as any utility loss.' },
          { text: 'Close the tie breaker to feed A from B', correct: false, consequence: (s) => s.closeBreaker('TIE-AB'), why: 'The Kirk-key interlock blocks it, and switching during an automatic transfer causes outages.' },
          { text: 'Put UPS A on static bypass to save the batteries', correct: false, consequence: (s) => s.setUpsSystemMode('A', 'static-bypass'), why: 'Bypass is fed from the same dead source: the A side would drop at once.' },
        ],
      },
      {
        title: 'Watch the generators',
        detail: 'Let the plant run. Watch the A generators: do they reach speed?',
        why: 'A start normally takes about 10 s. A controller gives up after a set crank time (overcrank) and locks the engine out.',
        hint: 'Make sure the clock is running, or press "+10s" a few times.',
        focus: 'GEN-A1',
        check: (s) => ['GEN-A1', 'GEN-A2', 'GEN-A3'].every((id) => !s.graph.nodes.has(id) || s.graph.get(id).status === 'failed'),
      },
      {
        title: 'Overcrank: the A generators failed to start. What now?',
        detail: 'UPS A is still on battery and its runtime is counting down. Side B is healthy.',
        why: 'On a 2N site the other side is built to carry everything. Your job is to protect it and buy time on A.',
        focus: 'UPS-A1',
        choices: [
          { text: 'Confirm B carries everything, send someone to the generators, and track UPS A runtime', correct: true, why: 'Right. Protect what is working, find the cause at the engines, and know your clock.' },
          { text: 'Reset the overcrank from the screen and crank again right away', correct: false, why: 'An overcrank lockout means something is wrong (fuel, batteries, air). Cranking again without a cause burns the starter and the batteries.' },
          { text: 'Close the tie breaker to feed A from B', correct: false, consequence: (s) => s.closeBreaker('TIE-AB'), why: 'Blocked by the interlock with both mains closed; and you never parallel through a tie during an event.' },
        ],
      },
      {
        title: 'UPS A runs out. What happens to the IT load?',
        detail: 'If utility A doesn\u2019t come back first, UPS A will reach the end of its battery.',
        why: 'Know what your topology does when one side goes dark before it happens.',
        focus: 'STS-4',
        choices: [
          { text: 'Dual-corded racks keep running on B; single-corded racks stay up through their STS', correct: true, why: 'Right. That is what 2N and the static transfer switches are for. Every rack is now on one source, so protect side B.' },
          { text: 'Every rack goes down', correct: false, why: 'Not on 2N: side B carries the whole load.' },
          { text: 'Nothing changes, the batteries last for hours', correct: false, why: 'UPS batteries are sized for minutes, not hours.' },
        ],
      },
      {
        title: 'Utility A is back. What do you check first?',
        detail: 'The utility restored the feed.',
        why: 'The ATS never transferred, so A comes straight back on utility.',
        focus: 'UPS-A1',
        choices: [
          { text: 'UPS A back on its inverter and recharging, A side PDUs energized, every rack on two cords again', correct: true, why: 'Right. Confirm redundancy is back before anything else.' },
          { text: 'Close the tie breaker to share load', correct: false, why: 'No reason to change the normal line-up.' },
          { text: 'Nothing, it fixed itself', correct: false, why: 'The generators are still locked out: the next outage would go the same way.' },
        ],
        after: (s) => {
          s.restore('UTIL-A');
        },
      },
      {
        title: 'Return the A generators to service',
        detail: 'The technician found the cause (in this story, a clogged fuel filter on the shared supply) and fixed it. Restore GEN-A1, GEN-A2 and GEN-A3 so they are back in automatic standby.',
        why: 'A generator locked out after overcrank stays out until someone resets it on purpose.',
        hint: 'Select each A generator and press Restore.',
        focus: 'GEN-A1',
        check: (s) => ['GEN-A1', 'GEN-A2', 'GEN-A3'].every((id) => !s.graph.nodes.has(id) || s.graph.get(id).status !== 'failed'),
      },
      {
        title: 'After the event',
        detail: 'Log it, plan a loaded test run of the A generators, and review fuel filtering and starting-battery tests.',
        why: 'A common-cause failure (one problem that stops every engine) is the one to design out.',
        confirm: 'Event logged, generator test planned, fuel and batteries on the review list',
      },
    ],
    debrief: [
      'Overcrank = the engine cranked for its full time without firing. Find the cause before you crank again.',
      'On 2N the other side is your plan B; protect it.',
      'Know your UPS runtime before you need it.',
    ],
  },
  {
    id: 'drill-cold-start',
    kind: 'drill',
    title: 'Utility A lost with the block heaters off',
    summary: 'Same outage as Utility A lost, but the A generators are cold. Watch how long the batteries carry the load.',
    level: 'Intermediate',
    minutes: 6,
    topology: '2N',
    run: true,
    scenario: [
      { at: 0, action: { a: 'blockHeater', id: 'GEN-A1', on: false } },
      { at: 0, action: { a: 'blockHeater', id: 'GEN-A2', on: false } },
      { at: 0, action: { a: 'blockHeater', id: 'GEN-A3', on: false } },
    ],
    setup: (s) => {
      s.fail('UTIL-A');
    },
    steps: [
      {
        title: 'Alarm: Utility A lost, UPS A on battery',
        detail: 'UPS A is on battery and the A generators are cranking.',
        why: 'First move is always the same: verify the automation and the other side.',
        focus: 'ATS-A',
        choices: [
          { text: 'Confirm side B is carrying, watch the A generators start and the ATS transfer', correct: true, why: 'Right.' },
          { text: 'Press the EPO to protect the equipment', correct: false, consequence: (s) => s.emergencyPowerOff(), consequenceS: 30, why: 'EPO is for life safety only.' },
        ],
      },
      {
        title: 'Wait for the transfer',
        detail: 'Let the plant run until ATS A transfers to the generators. Note the time.',
        why: 'Compare it with a normal start (about 13 s from the outage to transfer here).',
        hint: 'Make sure the clock is running, or press "+10s".',
        focus: 'ATS-A',
        check: (s) => s.graph.get('ATS-A').state.selected === 'emergency' && s.solution.energized.has('MSB-A'),
      },
      {
        title: 'That took about 28 s, not 13. Why?',
        detail: 'The event log shows "cold start (block heater off): slow to build speed".',
        why: 'Diesels start and take load faster when the jacket water is kept warm.',
        focus: 'GEN-A1',
        choices: [
          { text: 'The block heaters were off, so the engines were cold and slow to build speed', correct: true, why: 'Right. Feel the heater hose or read the jacket-water gauge on every round.' },
          { text: 'The ATS start delay is set too long', correct: false, why: 'The ATS sent the start signal on time; the engines were slow.' },
          { text: 'The UPS batteries are weak', correct: false, why: 'The UPS carried the load fine; the delay was at the engines.' },
        ],
      },
      {
        title: 'What does a slow start cost you?',
        detail: 'Think about the UPS and the load step.',
        why: 'Every second the engines take is a second on battery.',
        choices: [
          { text: 'More time on UPS battery and a harder load step on a cold engine; with weak batteries the gap could become an outage', correct: true, why: 'Right. Heaters protect the start time the whole design depends on.' },
          { text: 'Nothing, as long as it starts eventually', correct: false, why: 'Battery runtime is minutes, and it shrinks as batteries age.' },
        ],
        after: (s) => {
          s.restore('UTIL-A');
        },
      },
      {
        title: 'Utility A is restored. Let the ATS retransfer',
        detail: 'The utility reports the feed is back. Let the clock run until ATS A goes back to utility (5 minutes here). Speed it up with 60× if you like.',
        why: 'The retransfer timer proves the utility stable first.',
        hint: 'Set speed to 60× and press Run.',
        focus: 'ATS-A',
        check: (s) => s.graph.get('ATS-A').state.selected === 'normal' && s.solution.energized.has('MSB-A'),
      },
      {
        title: 'After the event',
        detail: 'Find out why the heaters were off (tripped breaker, failed thermostat, left off after work), restore them, and check the jacket-water temperature on the next rounds.',
        why: 'A heater left off after maintenance is a classic way to lose start time without anyone noticing.',
        confirm: 'Heaters restored and checked, event logged',
      },
    ],
    debrief: ['A cold engine starts slower and dips more when the load lands.', 'Block heaters are on every generator round: feel the hose or read the gauge.', 'End every job with the heater breaker on and the generator in AUTO.'],
  },
  {
    id: 'drill-sag',
    kind: 'drill',
    title: 'Voltage sag on utility A',
    summary: 'A half-second sag hits utility A while UPS A runs in eco mode. Work out who rode through and who didn\u2019t.',
    level: 'Intermediate',
    minutes: 6,
    topology: '2N',
    run: true,
    scenario: [
      { at: 0, action: { a: 'eco', system: 'A', on: true } },
      { at: 5, action: { a: 'utilityEvent', id: 'UTIL-A', kind: 'sag', pct: 60, s: 0.5 } },
    ],
    steps: [
      {
        title: 'Watch for the event',
        detail: 'Let the plant run for a few seconds.',
        why: 'Most power quality events are over before anyone looks. The EPMS captures them.',
        hint: 'Make sure the clock is running.',
        focus: 'UTIL-A',
        check: (s) => s.events.some((e) => /power quality event/.test(e.message)),
      },
      {
        title: 'A 0.5 s sag to 60% on utility A. What happened to the IT load?',
        detail: 'The EPMS shows all three phases at 60% for half a second. UPS A went to battery for the event and came straight back.',
        why: 'This is the UPS doing exactly its job.',
        focus: 'UPS-A1',
        choices: [
          { text: 'Nothing: the UPS carried it. In eco mode the inverter takes the load within a few milliseconds', correct: true, why: 'Right. Servers ride through a few milliseconds; the batteries cover the sag.' },
          { text: 'Every rack on side A rebooted', correct: false, why: 'Not with a healthy UPS. Check the rack logs if you doubt it, but the UPS covers this.' },
          { text: 'The generators took the load', correct: false, why: 'The sag was over long before the generators could even be asked to start.' },
        ],
      },
      {
        title: 'A chiller dropped offline. What now?',
        detail: 'The event log says a chiller dropped on the voltage dip and will restart on its timer.',
        why: 'Motors and drives have much less ride-through than the UPS.',
        choices: [
          { text: 'Watch it restart on its timer; confirm storage and the other chillers carry the load; reset only if it doesn\u2019t come back', correct: true, why: 'Right. Most chillers restart by themselves after a dip, but it takes minutes.' },
          { text: 'Bypass the anti-short-cycle timer to restart it now', correct: false, why: 'Never defeat a compressor safety; the timer protects the motor.' },
          { text: 'Transfer side A to the generators', correct: false, why: 'The utility is fine again; transferring now adds risk for nothing.' },
        ],
      },
      {
        title: 'Wait for the chiller to come back',
        detail: 'Let the clock run until no chiller is restarting (about 3 minutes). Speed it up if you like.',
        why: 'Confirm recovery with your own eyes before you close the event.',
        hint: 'Set speed to 60× and press Run.',
        check: (s) => s.t > 200 && Object.values(s.thermal.readout.chillers).every((m) => m !== 'starting'),
      },
      {
        title: 'Why didn\u2019t the generators start?',
        detail: 'The ATS saw the sag too.',
        why: 'Start delays exist for exactly this.',
        focus: 'ATS-A',
        choices: [
          { text: 'The sag lasted 0.5 s, shorter than the ATS engine-start delay (2 s here)', correct: true, why: 'Right. The delay rides through blips so the engines don\u2019t start for every dip.' },
          { text: 'The generators were not in AUTO', correct: false, why: 'They were in AUTO; the ATS never asked them to start.' },
          { text: 'Eco mode stops the generators from starting', correct: false, why: 'Eco mode is a UPS setting; it has nothing to do with the ATS.' },
        ],
      },
      {
        title: 'After the event',
        detail: 'Log it with the EPMS capture, check every drive and pump restarted, and report repeated sags to the utility and engineering.',
        why: 'One sag is weather; a pattern is a problem worth chasing.',
        confirm: 'Event logged with the capture, restarts checked',
      },
    ],
    debrief: ['The UPS covers sags; motors and drives often don\u2019t.', 'ATS start delays ride through short events.', 'Log power quality events: patterns matter.'],
  },
];

export const PROCEDURES: Procedure[] = [...MOPS, ...DRILLS];
for (const p of PROCEDURES) p.deeper = DEEPER[p.id];

/** Failures the surprise drill can pick from: what fails, and what an operator sees first. */
const SURPRISES: { id: string; clue: string }[] = [
  { id: 'UTIL-A', clue: 'UPS A on battery, generators A starting' },
  { id: 'UTIL-B', clue: 'UPS B on battery, generators B starting' },
  { id: 'CH-01', clue: 'Chilled water supply temperature rising, storage tank discharging' },
  { id: 'CDU-2', clue: 'GPU row 2 coolant temperature climbing' },
  { id: 'CRAC-201', clue: 'UPS room temperature slowly rising' },
  { id: 'CHWP-01', clue: 'Chilled water flow alarm, standby pump starting' },
  { id: 'TX-A', clue: 'Switchboard A lost normal power, ATS A timing' },
  { id: 'DOAS-01', clue: 'Hall dew point and pressure drifting' },
];

/**
 * Surprise drill: a random failure, found from the event log and the
 * plant, then repaired. `pick` chooses the failure (random by default).
 */
export function surpriseDrill(pick: number = Math.floor(Math.random() * SURPRISES.length)): Procedure {
  const k = ((pick % SURPRISES.length) + SURPRISES.length) % SURPRISES.length;
  const target = SURPRISES[k]!;
  const others = SURPRISES.filter((x) => x.id !== target.id);
  // Three distractors, spread through the list so the answer moves around.
  const distractors = [others[k % others.length]!, others[(k + 2) % others.length]!, others[(k + 5) % others.length]!];
  const options = [target, ...distractors].sort((a, b) => a.id.localeCompare(b.id));
  const mech = !['UTIL-A', 'UTIL-B', 'TX-A'].includes(target.id);
  return {
    id: 'drill-surprise',
    kind: 'drill',
    title: 'Surprise drill',
    summary: 'Something random fails. Read the event log and the plant, find it, and get it repaired.',
    level: 'Advanced',
    minutes: 4,
    topology: '2N',
    run: true,
    setup: (s) => {
      s.fail(target.id);
    },
    steps: [
      {
        title: 'Something just failed',
        detail: `Alarms are coming in: ${target.clue}. Read the event log and the status bar. What failed?`,
        why: 'The first alarm in the log is usually closest to the root cause. Later alarms are the plant reacting.',
        view: mech ? 'mechanical' : 'electrical',
        choices: options.map((o) => ({
          text: o.id,
          correct: o.id === target.id,
          why: o.id === target.id ? `Right. The first critical line in the event log names ${target.id}.` : `${o.id} would show "${o.clue}". Look for the first FAILED line in the log.`,
        })),
      },
      {
        title: `Get ${target.id} repaired`,
        detail: `A technician has fixed ${target.id}. Return it to service: select it and press "Restore".`,
        why: 'Equipment only comes back once someone has found and fixed the cause.',
        hint: `Tap ${target.id} (${mech ? 'Mechanical' : 'Electrical'} view), then "Restore".`,
        view: mech ? 'mechanical' : 'electrical',
        focus: target.id,
        check: (s) => s.graph.get(target.id).status !== 'failed',
      },
      {
        title: 'Close out',
        detail: 'Confirm alarms are clearing, log what failed and when, and open a work order for the root cause.',
        why: 'Every failure gets logged, even the ones the plant rode through.',
        confirm: 'Alarms clearing, event logged, work order opened',
      },
    ],
    deeper: DEEPER['drill-surprise'],
    debrief: ['Find the first alarm, not the loudest one.', 'The status bar tells you what is wrong now; the event log tells you what happened first.', 'Log every failure, even when nothing went down.'],
  };
}

export const SURPRISE_COUNT = SURPRISES.length;
