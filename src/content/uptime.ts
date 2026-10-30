/** Uptime tab: habits and practices that keep the load running. */
import type { Article } from './types';

export const UPTIME: Article[] = [
  {
    id: 'why',
    group: 'Start here',
    title: 'Where outages come from',
    intro: 'Most outages are not caused by equipment simply wearing out. Industry surveys consistently point to human error and process failures as major contributors. Good habits are the best redundancy.',
    blocks: [
      { ul: [
        'Changes and switching done in the wrong order or on the wrong device.',
        'Redundancy quietly lost: equipment left in manual, on bypass, or out of service.',
        'Maintenance skipped or deferred until something fails.',
        'Alarms ignored because there were too many nuisance alarms.',
        'Procedures out of date, or not followed.',
      ] },
    ],
  },
  {
    id: 'human',
    group: 'Human performance',
    title: 'Human performance tools',
    intro: 'Simple habits that catch mistakes before they reach the plant.',
    blocks: [
      { ul: [
        'STAR: Stop, Think, Act, Review, before every step that changes plant state.',
        'Peer check: a second qualified person watches and confirms the right device before you touch it.',
        'Three-way communication: "Open breaker UOB-A." / "Open breaker UOB-A, understood." / "Correct."',
        'Procedure use: read the step, do the step, check it off. Never work from memory on critical gear.',
        'Pre-job brief: scope, risks, hold points, back-out plan, who to call. Post-job debrief: what surprised us?',
        'Stop when unsure. A paused job costs minutes; a wrong breaker can cost the site.',
      ] },
    ],
  },
  {
    id: 'electrical',
    group: 'Electrical',
    title: 'Electrical uptime practices',
    intro: 'Keep every backup path real, not just on paper.',
    blocks: [
      { ul: [
        'Know the normal breaker lineup by heart, and check it on rounds.',
        'Keep 2N sides below 50% load, and each cord of a dual-corded rack low enough for its partner to take over.',
        'Generators: monthly exercise under real load, keep fuel quality tested, keep starting batteries healthy.',
        'UPS batteries: trend ohmic values and temperatures; replace weak jars before they fail a discharge.',
        'IR scan connections every year under load. Loose connections show up hot long before they fail.',
        'Track time spent at reduced redundancy (e.g. a UPS on bypass) and keep it short.',
      ] },
    ],
  },
  {
    id: 'mechanical',
    group: 'Mechanical',
    title: 'Mechanical uptime practices',
    intro: 'Cooling failures move fast, especially with high-density GPU racks.',
    blocks: [
      { ul: [
        'Know your thermal ride-through: how many minutes the TES tank buys at today\'s load.',
        'Test standby pumps and chillers: rotate lead/lag and prove auto-start on a schedule.',
        'Watch approach temperatures on chillers and towers; a rising trend is an early warning of fouling.',
        'Keep CDU filters, coolant chemistry, and leak detection in good shape. GPU racks give you seconds, not minutes.',
        'Keep containment tight: blanking panels in, doors closed, floor tiles where they belong.',
        'Plan for hot days: check towers and condensers before a heat wave, not during it.',
      ] },
    ],
  },
  {
    id: 'operations',
    group: 'Operations',
    title: 'Operations & maintenance',
    intro: 'The routines that keep a site healthy year after year.',
    blocks: [
      { ul: [
        'Rounds with readings, not just a walk-through. Trends catch failing equipment early.',
        'Alarm management: every alarm should mean something and have a response.',
        'Preventive maintenance on schedule, plus predictive tools: IR, vibration, oil analysis, battery ohmic trending.',
        'Critical spares on site (fuses, breakers, UPS boards, pump seals) with known locations.',
        'Written SOPs, MOPs, and EOPs that match the plant as it is today.',
        'Training and drills: practice EOPs with tabletop and live drills.',
        'Root cause analysis after every incident and near miss. Fix the system, not just the person.',
      ] },
    ],
  },
  {
    id: 'emergency',
    group: 'Emergencies',
    title: 'When something goes wrong',
    intro: 'Emergencies are where training shows. EOPs exist so you don\'t have to invent the response under stress.',
    blocks: [
      { ol: [
        'Protect people first. If there is fire, smoke, an injury, or an arc flash, follow life-safety procedures.',
        'Assess: what is the alarm, what is at risk, and how much time do you have (UPS runtime, inlet temperatures)?',
        'Communicate: notify the control room or lead immediately using the escalation list. Say what you see, not what you guess.',
        'Stabilize using the EOP: restore redundancy or capacity (e.g. bring standby equipment online). Don\'t chase every alarm; find the first one.',
        'Don\'t make it worse: no improvised switching, no defeated interlocks, no resetting trips without understanding them.',
        'Document: times, actions, readings. It feeds the root cause analysis.',
      ] },
      { callout: 'The first alarm usually points closest to the root cause. Sort the event log by time and start there.', title: 'Tip' },
    ],
  },
];
