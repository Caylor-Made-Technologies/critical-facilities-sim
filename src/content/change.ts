/**
 * Management of Change (MOC): the process that controls every change to
 * critical systems. Generic industry practice.
 */
import type { Article } from './types';

export const CHANGE: Article[] = [
  {
    id: 'what',
    group: 'Basics',
    title: 'What is Management of Change?',
    intro: 'Management of Change (MOC) is the formal process for proposing, reviewing, approving, doing, and documenting any change to a critical system. In this industry it is not optional: changes are where outages and injuries come from.',
    blocks: [
      { p: 'A large share of data center outages trace back to a change: someone switched the wrong breaker, a setting was edited, a "quick fix" skipped a step, or a drawing was out of date. MOC slows changes down just enough that risks are seen before they happen.' },
      { h: 'What counts as a change?' },
      { ul: [
        'Any switching away from the normal lineup (breakers, valves, transfer switches).',
        'Any setpoint, sequence, timer, firmware, or controls programming edit.',
        'Adding, removing, or moving equipment or load (including new racks).',
        'Replacing a part with something that isn\'t identical ("replacement in kind" is usually exempt, but a different model or rating is a change).',
        'Temporary changes: jumpers, bypasses, temporary generators, cooling units, or hoses.',
        'Changes to procedures, alarm settings, labels, or staffing that affect how the plant is run.',
      ] },
      { callout: 'If you have to ask "does this need a change record?", it does.', title: 'Rule of thumb' },
      { h: 'Change types' },
      { table: {
        head: ['Type', 'Example', 'Approval'],
        rows: [
          ['Standard (pre-approved)', 'Routine filter change with a proven procedure', 'Pre-approved template; still scheduled and logged.'],
          ['Normal', 'UPS module maintenance, controls update, new rack row', 'Full review and approval (change board), scheduled in a window.'],
          ['Emergency', 'Isolating a leaking valve, replacing a failed breaker', 'Fast approval by the on-call authority; full documentation afterward.'],
        ],
      } },
    ],
  },
  {
    id: 'lifecycle',
    group: 'Basics',
    title: 'The MOC lifecycle, step by step',
    intro: 'Every site\'s forms differ, but the flow is the same.',
    blocks: [
      { ol: [
        'Request: describe what, why, where, when, and who. Attach drawings and the draft MOP.',
        'Risk assessment: what could go wrong, how likely, how bad? What redundancy is lost during the work? Which customers are affected?',
        'Review: engineering, operations, safety, and (when needed) customers and vendors review it. Questions get answered in writing.',
        'Approve: the change board or designated authority signs. No approval, no work.',
        'Schedule: pick a maintenance window; respect change freezes; tell everyone affected.',
        'Prepare: pre-job brief, verify parts and tools on hand, confirm the plant is in the expected starting state, check weather (generators!).',
        'Execute: follow the MOP step by step with peer checks, initials, and times. Stop at hold points.',
        'Back out if needed: if anything doesn\'t match the MOP, stop and use the rollback plan. Never improvise.',
        'Verify: confirm the system is back to normal (or to the new design), alarms are clear, and redundancy is restored.',
        'Close out: update drawings (one-lines, P&IDs), labels, arc flash study if needed, BMS/EPMS points, spare parts, training, and the asset record. Hold a short lessons-learned.',
      ] },
    ],
  },
  {
    id: 'risk',
    group: 'Basics',
    title: 'Rating the risk',
    intro: 'A simple likelihood × impact grid helps teams agree on how careful to be.',
    blocks: [
      { table: {
        head: ['Likelihood ↓ / Impact →', 'Minor (no load impact)', 'Moderate (redundancy lost)', 'Severe (load at risk)'],
        rows: [
          ['Likely', 'Medium', 'High', 'Critical'],
          ['Possible', 'Low', 'Medium', 'High'],
          ['Unlikely', 'Low', 'Low', 'Medium'],
        ],
      } },
      { ul: [
        'Low: standard change, normal supervision.',
        'Medium: change board approval, peer-checked MOP.',
        'High: senior review, customer notification, vendor on site, extra hold points.',
        'Critical: redesign the work to reduce risk, or don\'t do it.',
      ] },
      { h: 'Questions every risk review asks' },
      { ul: [
        'What is the redundancy level during the work? (2N becomes N while one side is down.)',
        'What happens if a second, unrelated failure occurs during the window?',
        'How long is the exposure? Can we shorten it?',
        'Is the back-out plan tested and quick?',
        'Does this change affect arc flash levels, protective settings, or interlocks?',
      ] },
    ],
  },
  {
    id: 'mop',
    group: 'Procedures',
    title: 'Anatomy of a good MOP',
    intro: 'A Method of Procedure is the step-by-step script for a planned change. A good one can be followed by a qualified person who has never done the task, under stress, at 2 a.m.',
    blocks: [
      { h: 'Header' },
      { ul: ['Title, MOC number, revision, authors, reviewers, approvers.', 'Scope: exactly what equipment, by tag.', 'Risk level and redundancy during the work.', 'Customer and team notifications.'] },
      { h: 'Prerequisites' },
      { ul: ['Required starting state (breaker and valve lineup) and how to confirm it.', 'Parts, tools, PPE, test equipment (with calibration dates).', 'Weather, load limits, no other work in progress on the same system.'] },
      { h: 'Steps' },
      { table: {
        head: ['#', 'Action', 'Expected result', 'Initials / time'],
        rows: [
          ['1', 'Verify UPS-A on inverter, load < X kW on display', 'Mode: NORMAL', '___'],
          ['2', 'Transfer UPS-A to static bypass from the front panel', 'Bypass lamp ON, load unchanged', '___'],
          ['3', 'HOLD POINT: confirm with control room before continuing', 'Verbal OK', '___'],
          ['...', '...', '...', '...'],
        ],
      } },
      { ul: ['One action per step. Name the exact device by tag.', 'Every step says what you should see afterward.', 'Hold points before any irreversible or high-risk step.', 'A back-out section for every stage, not just the end.'] },
      { h: 'Close-out' },
      { ul: ['Return-to-normal steps, verification readings, alarm check.', 'Sign-offs and document updates.'] },
      { callout: 'Try it: the UPS maintenance bypass walkthrough in the Learn tab follows a real MOP structure, and the simulator checks every step.', title: 'Practice' },
    ],
  },
  {
    id: 'documents',
    group: 'Procedures',
    title: 'Keep the records current',
    intro: 'The next person relies on your documents. Stale drawings are one of the classic root causes of switching errors.',
    blocks: [
      { ul: [
        'Electrical one-lines and panel schedules: red-line during the work, update the master afterward.',
        'Mechanical P&IDs and valve lineups.',
        'Equipment labels, arc flash labels, and Kirk-key schedules.',
        'Protective device settings records and the coordination / arc flash study.',
        'BMS and EPMS points, alarms, and graphics.',
        'Asset records: model, serial, firmware, install date, warranty.',
        'SOPs, MOPs, and EOPs that reference the changed equipment.',
        'Training material and the onboarding checklist.',
      ] },
    ],
  },
  {
    id: 'freeze',
    group: 'Procedures',
    title: 'Change windows & freezes',
    intro: 'When changes happen matters as much as how.',
    blocks: [
      { ul: [
        'Maintenance windows: agreed times with the lowest business risk and full staffing.',
        'Change freezes: periods (major customer events, holidays, severe weather) when only emergency changes are allowed.',
        'One change at a time on a system, so if something goes wrong you know which change caused it.',
        'Never start a change near shift change unless the handoff is planned.',
      ] },
    ],
  },
];

/** "Is this a change?" practice questions. */
export const CHANGE_QUIZ: { q: string; answer: boolean; why: string }[] = [
  { q: 'Replacing a CRAH filter with the same filter type, using the standard procedure.', answer: false, why: 'Replacement in kind with a pre-approved standard procedure. Still log it as a standard change if your site requires.' },
  { q: 'Raising the chilled water supply setpoint by 2 °F to save energy.', answer: true, why: 'Setpoint changes affect capacity and ride-through. They need review, a plan, and monitoring.' },
  { q: 'Swapping a failed breaker for a different brand with the same rating.', answer: true, why: 'Different model: trip curves, arc flash, and interlock fit may differ. Engineering must review it.' },
  { q: 'Putting a generator controller in OFF to change its oil.', answer: true, why: 'It removes redundancy. It needs a scheduled, approved window and a return-to-auto verification.' },
  { q: 'Adding two new GPU racks to an existing row.', answer: true, why: 'Adds power and cooling load. Capacity, redundancy, and branch circuit loading must be checked.' },
  { q: 'Updating UPS firmware during the weekly maintenance window.', answer: true, why: 'Firmware changes behavior. Vendor instructions, back-out plan, and approval required.' },
];
