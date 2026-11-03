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
    title: 'LOTOTO: lock out, tag out, try out (OSHA 1910.147)',
    intro: 'LOTOTO keeps machines and circuits from being energized while someone is working on them. OSHA calls it lockout/tagout (LOTO); "try out" is the step that proves your isolation actually works. It applies to electrical, mechanical, hydraulic, pneumatic, chemical, and thermal energy, so it covers the mechanical side too.',
    blocks: [
      { h: 'Lock out, tag out' },
      { ol: [
        'Prepare: know every energy source and how to control it (use the written procedure for that equipment).',
        'Notify everyone affected that the equipment is being shut down and locked out.',
        'Shut down the equipment using the normal stopping procedure.',
        'Isolate every energy source (breakers, valves, disconnects).',
        'Apply your personal lock and tag to each isolation point. One lock per person per point, or a group lockbox.',
        'Release or restrain stored energy: bleed pressure, discharge capacitors, block parts that can move.',
      ] },
      { h: 'Try out' },
      { ol: [
        'Try to start the equipment from every control point (local start, BMS, HAND position). Nothing should move or energize.',
        'Return every control to OFF so nothing starts when the locks come off later.',
      ] },
      { h: 'Test: rated meter, then live-dead-live' },
      { ol: [
        'Check your meter is rated for the job before any test: CAT category (CAT III or IV for switchgear and panels) and a voltage rating at or above the circuit, on the meter and on the leads and probes.',
        'Inspect the leads and probes: no cracks, no exposed metal, tip shields on. Use the site\'s required tester, within its test or calibration date.',
        'Live: prove the meter on a known live source.',
        'Dead: test the isolated circuit phase to phase and phase to ground on every conductor (and DC where present).',
        'Live: prove the meter on the known source again. Only then is "dead" trusted.',
      ] },
      { callout: 'A meter or leads rated below the circuit can fail violently on a voltage spike. No rating, wrong rating, or damaged leads means no test.', tone: 'danger', title: 'Check the rating first' },
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
        'Lithium-ion off-gas or smoke means leave the area, keep doors shut, call the fire department, and tell them the battery type. The gases can be toxic and flammable.',
        'Batteries are heavy: a single block can weigh 60 lb or more. Use lifting aids.',
      ] },
    ],
  },

  {
    id: 'eewp',
    group: 'Electrical',
    title: 'Energized work permits (when de-energizing isn\'t possible)',
    intro: 'Energized work is the exception, not the plan. When it truly can\'t be avoided, NFPA 70E expects a written permit that forces the team to think it through first.',
    blocks: [
      { h: 'Valid reasons (and the one that isn\'t)' },
      { ul: [
        'De-energizing would create a greater hazard (for example, it would shut off life-safety ventilation or alarms).',
        'De-energizing is infeasible because of the equipment design or the task itself (for example, some diagnostic testing).',
        'Not a valid reason: "the customer doesn\'t want the downtime" or "it\'s faster". Redundancy exists so you can de-energize.',
      ] },
      { h: 'What a permit covers' },
      { ol: [
        'The circuit and equipment, and where it is.',
        'What work will be done, and why it must be done energized.',
        'The safe work practices that will be used.',
        'Shock risk: voltage, limited and restricted approach boundaries, and the shock PPE.',
        'Arc flash risk: incident energy or PPE category, the arc flash boundary, and the arc-rated PPE.',
        'How unqualified people will be kept out (barricades, attendant).',
        'Proof a job briefing was held, including what to do if something goes wrong.',
        'Approval signatures from the people your program names.',
      ] },
      { callout: 'Testing, troubleshooting and voltage measuring by qualified people usually don\'t need a permit, but they still need a risk assessment, the right PPE, and boundaries.', title: 'Testing is different', tone: 'info' },
      { callout: 'Many programs simply forbid energized work above a set incident energy (often 40 cal/cm²). There is no PPE that makes that safe. De-energize.', title: 'Too much energy', tone: 'danger' },
    ],
  },
  {
    id: 'switching',
    group: 'Electrical',
    title: 'Switching & racking safely',
    intro: 'Operating breakers, racking them in and out, and closing transfer switches are the moments an arc flash is most likely. These habits keep you out of the blast.',
    blocks: [
      { ol: [
        'Have the approved switching order in hand. Read each step out loud, and have a second person check the device tag before you touch it.',
        'Look at the arc flash label and put on the PPE it calls for before you open a door or operate.',
        'Use remote racking tools and remote operators wherever they are provided. Distance is the best PPE.',
        'Stand to the side of the device, not in front of it, where the procedure allows.',
        'Keep doors closed and latched for operations designed to be done that way.',
        'After each step, verify the result on the meter, indicator or EPMS, not just the handle position.',
        'If anything sounds, smells or looks wrong (buzzing, burning, a stuck handle), stop and back away. Don\'t force it.',
      ] },
      { callout: 'A breaker that won\'t rack or close is telling you something. Forcing it is how arcs start. Stop and call your lead.', title: 'Never force it', tone: 'danger' },
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
          ['Rotating equipment', 'Pumps, fans, couplings, belts', 'Guards in place; LOTOTO before touching; VFDs and automation can restart equipment on their own.'],
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
    intro: 'Mechanical lockout is LOTOTO plus valves: you are controlling fluid and pressure as well as electricity.',
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

  {
    id: 'generator-fuel',
    group: 'Mechanical',
    title: 'Generators & diesel fuel',
    intro: 'Standby generators can start on their own at any second, run hot and loud, and sit next to thousands of gallons of fuel.',
    blocks: [
      { ul: [
        'Assume a generator in AUTO can start at any moment: a utility blip or a test schedule will start it with you on the engine.',
        'Before hands-on work, put the controller in OFF, lock it out, and open the starter battery or charger supply as the procedure says.',
        'Exhaust contains carbon monoxide. Never run an engine with the enclosure or exhaust path blocked, and never sleep in or near a running unit.',
        'Exhaust, turbochargers and manifolds stay hot long after a run. Let them cool.',
        'Diesel spills are slip and fire hazards. Use the spill kit, keep containment drains closed, and report spills.',
        'Fuel deliveries follow a written procedure with someone watching the fill the whole time. Overfilled tanks spill.',
        'Wear hearing protection near running units. A generator can be loud enough to damage hearing in minutes.',
      ] },
      { callout: 'Ending a test or job in OFF instead of AUTO leaves the site with no backup. Ending it in AUTO while someone is still on the engine can kill them. Every job ends with a deliberate, checked return to AUTO.', title: 'OFF vs AUTO', tone: 'warn' },
    ],
  },
  {
    id: 'refrigerant-chem',
    group: 'Mechanical',
    title: 'Refrigerant & water treatment chemicals',
    intro: 'Chiller rooms and tower yards hold chemicals that can choke, burn or poison you, often with no warning smell.',
    blocks: [
      { ul: [
        'Most refrigerants are heavier than air and pool low. A big leak can push out the oxygen in a chiller room.',
        'On a refrigerant alarm: leave, close the door, let the emergency exhaust run, and report it. Don\'t go back in to "find the leak".',
        'Liquid refrigerant causes frostbite on contact. Only certified technicians open refrigerant circuits.',
        'Water treatment chemicals (biocides, inhibitors, acids) need the PPE on their safety data sheet, usually goggles, face shield and chemical gloves.',
        'Never mix treatment chemicals or pour one container into another. Some combinations release toxic gas.',
        'Every container is labeled. An unlabeled jug is treated as unknown and reported.',
      ] },
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
  {
    id: 'stop-work',
    group: 'Everyone',
    title: 'Stop work & the pre-task brief',
    intro: 'Most injuries happen on routine jobs where something changed and nobody stopped to talk about it.',
    blocks: [
      { h: 'Stop-work authority' },
      { p: 'Anyone on site, on their first day or their thousandth, can stop a job they believe is unsafe. No one is punished for a good-faith stop. Stopping is part of the job, not a failure.' },
      { h: 'When to stop' },
      { ul: [
        'The procedure doesn\'t match what you see (wrong tag, extra breaker, different valve).',
        'Something changed: new people, new tools, the scope grew, weather turned.',
        'You don\'t know how to do the next step, or you\'re rushed, tired or distracted.',
        'Someone is inside a boundary without the right PPE or training.',
      ] },
      { h: 'The pre-task brief (2 to 5 minutes)' },
      { ol: [
        'What are we doing, and what is the worst thing that could happen?',
        'Which energy sources are here, and how is each one controlled?',
        'What PPE, boundaries and permits does this need?',
        'Who does what, and how do we talk (radio channel, hand signals, read-back)?',
        'Where are the exits, eyewash, extinguisher and AED? What is the emergency number?',
        'What will make us stop?',
      ] },
      { callout: 'The Practice section has a pre-task brief builder you can fill in and print.', title: 'Try it' },
    ],
  },
  {
    id: 'heights',
    group: 'Everyone',
    title: 'Ladders, lifts & roofs',
    intro: 'Falls are one of the most common causes of serious injury at work, and data centers have ladders, raised floors, lifts and roofs.',
    blocks: [
      { ul: [
        'Use non-conductive (fiberglass) ladders near electrical equipment. Never a metal ladder.',
        'Set extension ladders at about 1 foot out for every 4 feet up, extended 3 feet above the landing, and tied off.',
        'Keep three points of contact. Carry tools in a belt or hoist them, not in your hands.',
        'Aerial and scissor lifts need training. Wear a harness where the lift type or site rules require it.',
        'On roofs, stay behind guardrails or use fall protection near the edge. Watch for skylights.',
        'Open floor tiles are holes: barricade them and never leave one open and unattended.',
      ] },
    ],
  },
  {
    id: 'hot-work',
    group: 'Everyone',
    title: 'Hot work permits',
    intro: 'Welding, cutting, brazing and grinding throw sparks that can smolder for an hour before they catch. Hot work in a live facility needs a permit.',
    blocks: [
      { ol: [
        'Ask first: can the work be done another way (cold cutting, bolting) or moved outside?',
        'Get a hot work permit signed by the person your program names.',
        'Move or cover combustibles within 35 feet, and cover floor and wall openings.',
        'If detectors must be covered to prevent false alarms, that is a fire system impairment: follow the impairment process and notifications.',
        'Have a charged extinguisher and a trained fire watch during the work.',
        'Keep the fire watch for at least 30 minutes after the work ends (many sites require 60), then check the area again later.',
      ] },
      { callout: 'Ending the fire watch when the welding stops. Sparks that landed out of sight are the classic cause of hot-work fires.', title: 'Most common mistake', tone: 'warn' },
    ],
  },
  {
    id: 'escort',
    group: 'Everyone',
    title: 'Contractors, escorts & visitors',
    intro: 'Vendors and visitors don\'t know your plant. Whoever escorts them owns their safety.',
    blocks: [
      { ul: [
        'Every contractor job has an approved MOP or work order, a pre-task brief, and the site safety orientation.',
        'Contractors apply their own locks too, alongside yours, on every isolation point they work behind.',
        'Keep visitors out of limited approach boundaries, battery rooms and generator enclosures unless the job requires it.',
        'Watch for tailgating at secure doors. Safety and security go together.',
        'If a contractor does something unsafe, stop the job. Their schedule doesn\'t outrank anyone\'s safety.',
      ] },
    ],
  },

  // -------------------------------- Life safety --------------------------------
  {
    id: 'fire-systems',
    group: 'Life safety',
    title: 'Fire detection & suppression',
    intro: 'Data halls usually have very early smoke detection, pre-action sprinklers, and sometimes a clean-agent gas system. Each one changes what you do in an alarm.',
    blocks: [
      { table: {
        head: ['System', 'What it does', 'What you do'],
        rows: [
          ['Aspirating smoke detection', 'Samples air through pipes and spots smoke long before a normal detector.', 'Treat an alert as real. Investigate with a partner and follow the alarm procedure.'],
          ['Pre-action sprinklers', 'Pipes stay dry until detection opens a valve, then a head must also open from heat.', 'Never hang anything from or bump sprinkler heads. Report damaged heads.'],
          ['Clean agent (gas)', 'Floods a room with agent that stops a fire without water damage.', 'Leave on the pre-discharge alarm. Close doors behind you. Don\'t re-enter until it is cleared.'],
          ['Fire alarm panel', 'Collects alarms and calls for help; may shut down air handlers.', 'Only trained people silence or reset, and only per procedure.'],
        ],
      } },
      { h: 'Impairments' },
      { p: 'Any time a fire system is out of service (a covered detector, a closed valve, a disabled panel zone), it is an impairment. It needs a permit, notifications (fire alarm monitoring, often the fire department and insurer), extra precautions such as a fire watch, and a record of when it was restored.' },
      { callout: 'Clean-agent and inert-gas discharges can make a room unsafe to breathe. Wait for responders to clear and ventilate the room.', title: 'After a discharge', tone: 'danger' },
    ],
  },
  {
    id: 'epo-evac',
    group: 'Life safety',
    title: 'EPO buttons & evacuation',
    intro: 'The emergency power off (EPO) button drops power to a whole room. It is for saving lives, and pressing it by accident is one of the classic causes of outages.',
    blocks: [
      { ul: [
        'Use the EPO only when someone is in danger (for example, someone being shocked, or fire with people at risk) and it is the fastest safe way to remove power.',
        'Know where every EPO is, and keep its cover in place so it can\'t be bumped.',
        'If an EPO is pressed by accident, say so right away. Quick, honest reporting gets the load back faster.',
        'Know two ways out of every room you work in, and where the muster point is.',
        'On an evacuation alarm, walk out, close doors behind you, and report to the muster point so you can be counted.',
        'Never go back in for tools, phones or to "finish up".',
      ] },
    ],
  },
  {
    id: 'first-response',
    group: 'Life safety',
    title: 'First response basics',
    intro: 'Know your site emergency number, where the AED and first-aid kits are, and who is trained in CPR. The Emergency cards in Practice walk through common events.',
    blocks: [
      { ol: [
        'Make sure the scene is safe for you first. Two victims don\'t help anyone.',
        'Call for help: 911 and your site emergency number, or have someone else call while you act.',
        'Remove the hazard if you safely can (open the breaker, stop the machine).',
        'Give the care you are trained to give: CPR, AED, bleeding control.',
        'Send someone to meet responders at the door and guide them in.',
        'Afterwards, report it and preserve the scene for the investigation.',
      ] },
      { callout: 'This is general awareness, not first-aid training. Take a certified first aid, CPR and AED course.', title: 'Get trained', tone: 'info' },
    ],
  },
];
