/**
 * Safety tab. Plain-language summaries of public standards. Not legal
 * advice: editions change, and the authority having jurisdiction (AHJ)
 * decides what applies.
 */
import type { Article } from './types';

export const SAFETY: Article[] = [
  {
    id: 'start',
    group: 'Start here',
    title: 'Why safety comes first',
    intro: 'Critical facilities run energized, high-consequence equipment 24/7. The rules exist because people were hurt or sites went dark. Learn the why and the rules make sense.',
    blocks: [
      { callout: 'These are summaries of publicly available standards, for learning. Your site\'s written programs, the current edition of each standard, and your authority having jurisdiction (AHJ) always take precedence.', title: 'Read this first', tone: 'warn' },
      { h: 'The three priorities, in order' },
      { ol: ['People: nobody gets hurt. No uptime target is worth an injury.', 'The critical load: keep IT running.', 'The equipment: protect the asset.'] },
      { p: 'If you ever feel those are in conflict, stop and call your lead. Every team member has stop-work authority.' },
      { callout: 'The Never Do tab lists the hard stops: things you must not do under any circumstances.', title: 'Also see' },
    ],
  },

  // -------------------------------- Electrical --------------------------------
  {
    id: 'electrical-safety',
    group: 'Electrical',
    title: 'Shock & arc flash (NFPA 70E, OSHA)',
    intro: 'The most serious hazards on site are shock and arc flash. NFPA 70E is the standard for electrical safety in the workplace; OSHA 1910 Subpart S is the law it supports.',
    blocks: [
      { h: 'Rule #1: work de-energized' },
      { p: 'Put equipment in an electrically safe work condition (ESWC) before working on it. Energized work is only justified when de-energizing creates a greater hazard or is infeasible, and it needs an energized electrical work permit, a risk assessment, and the right PPE.' },
      { h: 'Establishing an electrically safe work condition' },
      { ol: [
        'Identify every source of energy using up-to-date drawings and labels (including back-feed, generators, UPS, batteries, capacitors).',
        'Interrupt the load and open the disconnecting device for each source.',
        'Visually verify the disconnect is open (blades open, or racked-out breaker) wherever possible.',
        'Release stored energy (capacitors, springs) and apply locks and tags per the lockout program.',
        'Test for absence of voltage with a properly rated meter: test the meter on a known live source, test the circuit phase-to-phase and phase-to-ground, then test the meter again ("live-dead-live").',
        'Apply temporary protective grounds where induced voltage or re-energizing is possible.',
      ] },
      { h: 'Boundaries' },
      { ul: [
        'Arc flash boundary: the distance where an arc could cause a second-degree burn. Anyone inside needs arc-rated PPE.',
        'Limited approach boundary: unqualified people stay out unless escorted by a qualified person.',
        'Restricted approach boundary: only qualified people with a plan and shock protection.',
      ] },
      { h: 'Arc flash labels' },
      { p: 'Equipment labels show the nominal voltage, arc flash boundary, and either incident energy (cal/cm²) at a working distance or a PPE category. Labels come from an arc flash study, which must be reviewed at least every 5 years and whenever a major change happens.' },
      { callout: 'If the label is missing, unreadable, or the equipment was changed since the study, treat the hazard as unknown and ask before opening anything.', tone: 'danger', title: 'No label = no work' },
      { h: 'Qualified person' },
      { p: 'A person trained to recognize and avoid the hazards of the specific equipment and task, and who has shown that skill. Being an electrician on one system doesn\'t make you qualified on another.' },
    ],
  },
  {
    id: 'loto',
    group: 'Electrical',
    title: 'Lockout/tagout, step by step (OSHA 1910.147)',
    intro: 'LOTO keeps machines and circuits from being energized while someone is working on them. It applies to electrical, mechanical, hydraulic, pneumatic, chemical, and thermal energy, so it covers the mechanical side too.',
    blocks: [
      { h: 'Applying lockout' },
      { ol: [
        'Prepare: know every energy source and how to control it (use the written procedure for that equipment).',
        'Notify everyone affected that the equipment is being shut down and locked out.',
        'Shut down the equipment using the normal stopping procedure.',
        'Isolate every energy source (breakers, valves, disconnects).',
        'Apply your personal lock and tag to each isolation point. One lock per person per point, or a group lockbox.',
        'Release or restrain stored energy: bleed pressure, discharge capacitors, block parts that can move.',
        'Verify isolation: try to start it (then return controls to off), and test for absence of voltage.',
      ] },
      { h: 'Removing lockout' },
      { ol: [
        'Make sure tools are removed, guards are back, and the work area is clear.',
        'Make sure everyone is clear and notify affected people.',
        'Each person removes only their own lock.',
        'Re-energize per the procedure and verify normal operation.',
      ] },
      { callout: 'Only the person who put a lock on removes it. If someone left with a lock still on, the program has a specific supervisor procedure. Never cut a lock yourself.', tone: 'danger', title: 'Your lock, your life' },
      { h: 'Data center specifics' },
      { ul: ['UPS and battery systems are separate energy sources: open the battery breaker too.', 'Generators can start automatically: put the controller in OFF and lock it out, not just "manual".', 'VFDs and UPS units store energy in capacitors: wait the labeled time and verify.', 'Kirk keys are interlocks, not lockout devices. You still apply your own lock.'] },
    ],
  },
  {
    id: 'battery-safety',
    group: 'Electrical',
    title: 'Battery rooms & energy storage',
    intro: 'UPS batteries and BESS yards store huge amounts of energy that you can\'t switch off at a breaker.',
    blocks: [
      { ul: [
        'DC arcs don\'t self-extinguish like AC arcs. Use insulated tools, and remove rings and watches.',
        'Lead-acid batteries hold sulfuric acid and can give off hydrogen: ventilation, no sparks or flames, face shield, acid-rated gloves and apron.',
        'An eyewash station must be ready wherever corrosive electrolyte is present (OSHA 1910.151).',
        'Lithium-ion can go into thermal runaway: know the alarm response, never open a container in alarm, and follow NFPA 855 site plans.',
        'Battery strings stay energized even with the UPS off. Open the battery disconnect and verify.',
      ] },
    ],
  },

  // -------------------------------- Mechanical --------------------------------
  {
    id: 'mechanical-safety',
    group: 'Mechanical',
    title: 'Mechanical hazards',
    intro: 'Chillers, pumps, towers, and air handlers carry their own hazards: moving parts, pressure, chemicals, and heights.',
    blocks: [
      { table: {
        head: ['Hazard', 'Where', 'Control'],
        rows: [
          ['Rotating equipment', 'Pumps, fans, couplings, belts', 'Guards in place; LOTO before touching; VFDs and automation can restart equipment on their own.'],
          ['Stored pressure', 'Chilled water, condenser water, glycol, refrigerant', 'Isolate, then bleed to zero and verify before opening anything. Never open a hot pressurized cap.'],
          ['Refrigerant', 'Chiller rooms, CRAC units', 'Leak monitors and alarms; leave and ventilate on alarm; only EPA 608–certified techs handle refrigerant.'],
          ['Hot surfaces', 'Generator exhaust, chiller discharge lines, reheat coils', 'Gloves, let it cool, don\'t touch to "check temperature".'],
          ['Confined spaces', 'Tanks, vaults, pits, tower basins', 'Permit program (OSHA 1910.146), atmospheric testing, an attendant, a rescue plan.'],
          ['Falls', 'Roofs, cooling towers, ladders', 'Fall protection (OSHA 1910.28), guardrails, three points of contact.'],
          ['Legionella', 'Cooling towers, evaporative equipment', 'Water management program (ASHRAE 188); respirator for some tower work.'],
          ['Water near electricity', 'CRAH coils, CDUs, leaks under racks', 'Leak detection, drip trays, isolate and clean up before touching wet gear.'],
        ],
      } },
    ],
  },
  {
    id: 'mechanical-loto',
    group: 'Mechanical',
    title: 'Isolating mechanical systems',
    intro: 'Mechanical lockout is LOTO plus valves: you are controlling fluid and pressure as well as electricity.',
    blocks: [
      { ol: [
        'Lock out the motor starter or VFD feeding the equipment.',
        'Close and lock the isolation valves on both sides (double block where the procedure requires).',
        'Open the drain and vent valves to bleed pressure to zero, into a container or drain as the procedure says.',
        'Verify zero pressure on a gauge and that no fluid flows from the vent.',
        'Watch for gravity and thermal effects: water above you can still drain down, and warming fluid can re-pressurize.',
      ] },
      { callout: 'On a running loop, closing the wrong valve can starve coils plant-wide. Valve operations on critical loops go in a MOP.', tone: 'warn', title: 'Critical loop' },
    ],
  },

  // -------------------------------- Everyone --------------------------------
  {
    id: 'other-hazards',
    group: 'Everyone',
    title: 'Hazards everyone meets',
    intro: 'Electrical and mechanical hazards get the headlines, but these hurt people too.',
    blocks: [
      { table: {
        head: ['Hazard', 'Where', 'Control'],
        rows: [
          ['Noise', 'Generators, chillers, pump rooms', 'Hearing protection; OSHA 1910.95 hearing conservation program.'],
          ['Heat stress', 'Hot aisles, generator yards in summer, roofs', 'Hydration, breaks, buddy system; know the signs of heat illness.'],
          ['Chemicals', 'Water treatment, glycol, fuel, battery acid', 'Safety data sheets (HazCom 1910.1200), the right PPE, spill kits.'],
          ['Slips & trips', 'Raised floors, wet mechanical rooms, cable runs', 'Replace floor tiles, clean up spills, keep walkways clear.'],
          ['Lifting', 'Batteries, filters, floor tiles, parts', 'Team lifts and carts; batteries are heavier than they look.'],
          ['Working alone', 'Night shift rounds', 'Check-in calls; tell someone where you are going.'],
        ],
      } },
      { h: 'Personal protective equipment basics' },
      { ul: ['Safety glasses everywhere on the plant floor.', 'Hearing protection in posted areas.', 'Arc-rated clothing and gear per the label for electrical work.', 'Gloves matched to the task (cut, chemical, insulating).', 'Hard hat where overhead work or hazards exist.'] },
    ],
  },
];
