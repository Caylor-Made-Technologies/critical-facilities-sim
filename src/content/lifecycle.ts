/**
 * Life of a Data Center: the 10-stage learning path (in Learn), plus the
 * mini Level 5 integrated systems test that runs on the live simulator.
 */
import type { Procedure } from '../sim';
import { STAGES_A } from './lifecycleA';
import { STAGES_B } from './lifecycleB';
import type { LifeStage } from './lifecycleTypes';

export * from './lifecycleTypes';

export const LIFE_STAGES: LifeStage[] = [...STAGES_A, ...STAGES_B];

const bothUtilities = (s: Parameters<NonNullable<Procedure['setup']>>[0], status: 'failed' | 'online') =>
  s.graph.get('UTIL-A').status === status && s.graph.get('UTIL-B').status === status;

/**
 * Mini Level 5 IST: cut both utilities with the hall loaded, prove the UPS
 * rides through and the generators take over with no load dropped, then return
 * to utility. Generic and simplified; a real IST follows the project's script.
 */
export const IST_L5: Procedure = {
  id: 'life-ist',
  kind: 'drill',
  title: 'Mini Level 5 IST: pull the plug',
  summary: 'Commissioning test: cut both utilities under load and prove the backups carry everything with nothing dropped.',
  level: 'Intermediate',
  minutes: 6,
  topology: '2N',
  run: true,
  steps: [
    {
      title: 'Test script, witnesses and load',
      detail: 'The IST script is approved, witnesses are in place, the hall is loaded (load banks in a real IST), and the rollback plan is briefed.',
      why: 'An IST is a planned, witnessed test. Nobody improvises when the utility is cut on purpose.',
      confirm: 'Script approved, witnesses ready, load on, rollback briefed',
    },
    {
      title: 'Acceptance criteria',
      detail: 'Before you cut power, what has to be true for this test to pass?',
      why: 'Pass and fail are agreed before the test, so nobody argues about it afterwards.',
      choices: [
        { text: 'No IT load drops; UPS rides through; generators start, sync and take the load in the specified time; alarms show as designed', correct: true, why: 'Right. Those are written into the script with the expected times.' },
        { text: 'The generators make noise', correct: false, why: 'Starting is not enough. They must carry the load, in time, with no drop.' },
        { text: 'Nobody complains', correct: false, why: 'Pass and fail are measured, not felt.' },
      ],
    },
    {
      title: 'Pull the plug: fail both utilities',
      detail: 'Cut Utility A and Utility B. Select each one and press "Fail it" (or use Failure mode and tap them).',
      why: 'Losing both feeds at once is the worst normal case the backups are built for.',
      hint: 'Use "Jump to component" (3D) or tap UTIL-A on the one-line, press "Fail it", then do the same for UTIL-B.',
      focus: 'UTIL-A',
      check: (s) => bothUtilities(s, 'failed'),
    },
    {
      title: 'Watch the backups take over',
      detail: 'Let the clock run. The UPS carries the load on battery while the generators start and the ATSs transfer.',
      why: 'This is the moment the whole design exists for: no break in power to the racks.',
      hint: 'Keep the clock running, or press +10s a few times.',
      focus: 'ATS-A',
      check: (s) => s.graph.get('ATS-A').state.selected === 'emergency' && s.graph.get('ATS-B').state.selected === 'emergency' && s.solution.energized.has('MSB-A') && s.solution.energized.has('MSB-B') && s.itDownRacks().length === 0,
    },
    {
      title: 'Record the results',
      detail: 'What goes on the witness sheet now?',
      why: 'The record is the proof. It also becomes the baseline operations will compare against.',
      choices: [
        { text: 'Generator start and transfer times, voltage and frequency, UPS battery discharge, alarms seen, any deficiencies', correct: true, why: 'Right. Measured values against the expected values in the script.' },
        { text: 'Just "passed"', correct: false, why: 'A tick with no numbers cannot be checked or compared later.' },
        { text: 'Nothing until tomorrow', correct: false, why: 'Record during the test, while the readings are real.' },
      ],
    },
    {
      title: 'Restore the utilities',
      detail: 'Restore Utility A and Utility B. The ATSs wait for their retransfer timers before going back.',
      why: 'Returning to normal is part of the test: retransfer must work as well as transfer.',
      hint: 'Select UTIL-A and press "Restore", then UTIL-B.',
      focus: 'UTIL-A',
      check: (s) => bothUtilities(s, 'online'),
    },
    {
      title: 'Back on utility',
      detail: 'Let the clock run until both ATSs are back on utility. Speed it up if you like.',
      why: 'Generators cool down and return to standby only after a stable retransfer.',
      hint: 'Set speed to 60× and keep it running.',
      focus: 'ATS-A',
      check: (s) => s.graph.get('ATS-A').state.selected === 'normal' && s.graph.get('ATS-B').state.selected === 'normal' && s.itDownRacks().length === 0,
    },
    {
      title: 'Close out',
      detail: 'Log deficiencies, collect witness signatures, and put the plant back in its normal line-up.',
      why: 'Commissioning ends with paperwork that proves what was tested and what is still open.',
      confirm: 'Results signed, deficiencies logged, plant normal',
    },
  ],
  debrief: [
    'Agree pass/fail before the test, and record real numbers during it.',
    'Under load, with both utilities cut, nothing may drop.',
    'Retransfer is part of the test, not an afterthought.',
  ],
  deeper: [
    { q: 'Why test with load banks instead of real customer IT?', a: 'Load banks make the same heat and draw the same power without risking anyone\'s servers, and they can be pushed to full design load.' },
    { q: 'What would you do if one generator failed to start during the IST?', a: 'Follow the script\'s stop criteria: protect the load, log the deficiency, fix and retest. Redundancy should carry it, and that result is valuable too.' },
  ],
};
