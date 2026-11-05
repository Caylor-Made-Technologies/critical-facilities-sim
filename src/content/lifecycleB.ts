/** Life of a Data Center, stages 6–10: operations, maintenance, capacity, incidents, decommissioning. Generic only. */
import type { LifeStage } from './lifecycleTypes';

export const STAGES_B: LifeStage[] = [
  {
    id: 'life-ops',
    n: 6,
    title: 'Operations',
    short: 'Shifts, rounds, alarms, procedures and the numbers that matter.',
    scene: 'ops',
    lesson: [
      {
        h: 'Always someone on watch',
        p: [
          'A data center is staffed or monitored every hour of the year. Shift patterns vary by site; many use rotating 12-hour shifts. Every shift starts with a handoff: what is out of normal, what work is planned, what to watch.',
          'Rounds are walks through the plant at set times, reading gauges and screens, looking, listening and smelling for anything off. Readings go on a log so trends show up.',
        ],
      },
      {
        h: 'Alarms and escalation',
        p: [
          'The BMS and power monitoring raise alarms by priority. Critical alarms get an immediate response; minor ones are logged and handled in order. Every site has an escalation tree: who to call, in what order, and when.',
          'Work follows written procedures: SOPs for routine tasks, MOPs for planned changes to critical systems, and EOPs for emergencies. Changes go through change management first.',
        ],
      },
      {
        h: 'Measuring the plant',
        p: [
          'PUE (power usage effectiveness) is total facility power divided by IT power: closer to 1.0 is more efficient. WUE is water used per kWh of IT. Availability, MTBF (mean time between failures) and MTTR (mean time to repair) track reliability.',
          'Customers get clear, calm updates: what happened, what it affects, what is being done, and when the next update comes.',
        ],
      },
    ],
    tour: [
      { anchor: 'noc', title: 'Operations center', text: 'Screens for the BMS, power monitoring and security. The shift lead sits here.' },
      { anchor: 'switchgear', title: 'Electrical rounds', text: 'Check breaker positions, meters, UPS status and battery room conditions.' },
      { anchor: 'chillers', title: 'Mechanical rounds', text: 'Check temperatures, pressures, flows, leaks and noise.' },
      { anchor: 'racks', title: 'White space walk', text: 'Look for hot spots, missing blanking panels, open containment doors, water.' },
      { anchor: 'genyard', title: 'Generator yard', text: 'Fuel levels, block heaters, battery chargers, controllers in AUTO.' },
    ],
    task: {
      kind: 'sort',
      title: 'Triage the alarm screen',
      prompt: 'Sort each alarm into how fast it needs a response. Assume generic site priorities.',
      buckets: [
        { id: 'now', label: 'Respond now' },
        { id: 'soon', label: 'This shift' },
        { id: 'log', label: 'Log and schedule' },
      ],
      items: [
        { text: 'UPS on battery, utility lost', bucket: 'now' },
        { text: 'Water detected under the raised floor', bucket: 'now' },
        { text: 'Fire alarm panel in alarm', bucket: 'now' },
        { text: 'One chiller tripped, spare running', bucket: 'soon' },
        { text: 'CRAH filter differential pressure high', bucket: 'soon' },
        { text: 'Generator day tank fuel low (not running)', bucket: 'soon' },
        { text: 'Light out in a corridor', bucket: 'log' },
        { text: 'Door held open alarm cleared on its own', bucket: 'log' },
      ],
      explain: 'Anything on battery, wet, or fire-related is now. A lost spare is urgent but the load is still protected. Comfort and housekeeping items get logged. Your site priority list always wins.',
    },
    details: [
      { title: 'PUE example', text: '1,300 kW total facility ÷ 1,000 kW IT = PUE 1.3. The extra 300 kW is cooling, losses and lighting.' },
      { title: 'Readings, not just ticks', text: 'Write the actual number on rounds. "OK" hides a slow drift that a trend would catch.' },
      { title: 'Shift handoff', text: 'Gear out of normal, open work, recent alarms, anything weird. Said out loud, and written down.' },
      { title: 'Nuisance alarms', text: 'An alarm that fires all the time teaches people to ignore it. Fix or tune it through change control; never just silence it.' },
    ],
    mistakes: [
      { mistake: 'Acknowledging alarms without reading them', why: 'Alarm fatigue is behind many outages. Read, act, then acknowledge.' },
      { mistake: 'Working from memory instead of the MOP', why: 'Critical work follows the approved document, step by step.' },
      { mistake: 'Going quiet with the customer', why: 'Silence makes an incident feel worse. Regular updates build trust even when the news is bad.' },
    ],
    quiz: [
      { id: 'lq-ops-1', q: 'PUE is…', choices: ['IT power ÷ total power', 'Total facility power ÷ IT power', 'Water ÷ power', 'Uptime in percent'], answer: 1, why: 'PUE = total ÷ IT; 1.0 would be perfect.' },
      { id: 'lq-ops-2', q: 'Which document do you follow for planned work on a critical system?', choices: ['A sticky note', 'An approved MOP', 'A vendor brochure', 'Memory'], answer: 1, why: 'MOPs are the step-by-step plan for critical changes.' },
      { id: 'lq-ops-3', q: 'Why write actual readings on rounds?', choices: ['To fill paper', 'Trends catch slow problems that "OK" hides', 'It is not needed', 'For the customer'], answer: 1, why: 'Numbers reveal drift over weeks.' },
      { id: 'lq-ops-4', q: 'MTTR stands for…', choices: ['Mean time to repair', 'Maximum temperature to rack', 'Minimum time to reboot', 'Main tie to return'], answer: 0, why: 'MTTR measures how fast things get fixed.' },
      { id: 'lq-ops-5', q: 'What is an EOP?', choices: ['Equipment order plan', 'Emergency operating procedure', 'Extra overtime pay', 'Electrical one-line page'], answer: 1, why: 'EOPs guide response during emergencies.' },
      { id: 'lq-ops-6', q: 'A nuisance alarm keeps firing. The right fix is…', choices: ['Disable it quietly', 'Find the cause and fix or tune it through change control', 'Unplug the panel', 'Ignore it'], answer: 1, why: 'Silencing alarms hides the next real event.' },
    ],
  },
  {
    id: 'life-pm',
    n: 7,
    title: 'Maintenance',
    short: 'PM, CM and predictive: keeping the plant healthy on purpose.',
    scene: 'built',
    lesson: [
      {
        h: 'Three kinds of maintenance',
        p: [
          'Preventive maintenance (PM) is planned work on a schedule: test, clean, tighten, replace before failure. Corrective maintenance (CM) fixes something that broke. Predictive maintenance uses measurements (infrared, vibration, oil analysis, battery impedance) to spot trouble early and fix it at a planned time.',
          'The goal is to do almost everything as planned work, under a MOP, in a change window, instead of as an emergency.',
        ],
      },
      {
        h: 'What gets checked',
        p: [
          'Electrical: infrared scans of connections, breaker exercising and testing, UPS service, battery inspections and impedance or conductance tests, generator test runs and annual load bank tests, fuel sampling and polishing.',
          'Mechanical: filter changes, belt checks, vibration analysis on pumps and fans, oil and coolant sampling, cooling tower and water treatment checks, coil cleaning.',
        ],
      },
      {
        h: 'Intervals come from the manual',
        p: [
          'The intervals in this lesson are common starting points. The real ones come from the manufacturer, the site program, the insurer and the codes your jurisdiction adopted. Write the readings down so the trend tells you when something is aging.',
        ],
      },
    ],
    tour: [
      { anchor: 'switchgear', title: 'Infrared scan', text: 'A thermal camera finds hot connections while gear is loaded, before they fail.' },
      { anchor: 'batteries', title: 'Battery testing', text: 'Visual checks, float voltages and internal resistance trends catch weak cells.' },
      { anchor: 'genyard', title: 'Generator testing', text: 'Regular test runs; a periodic load bank test proves it can carry real load.' },
      { anchor: 'fuel', title: 'Fuel care', text: 'Stored diesel ages. Sampling and polishing keep it clean enough to run.' },
      { anchor: 'chillers', title: 'Vibration and oil', text: 'Vibration and oil analysis on rotating gear spots wear early.' },
      { anchor: 'towers', title: 'Water treatment', text: 'Treatment and blowdown keep towers free of scale, corrosion and biological growth.' },
    ],
    task: {
      kind: 'sort',
      title: 'Build a PM calendar',
      prompt: 'Put each task at a typical interval. These are common starting points only; your manuals and site program set the real ones.',
      buckets: [
        { id: 'month', label: 'Monthly' },
        { id: 'quarter', label: 'Quarterly' },
        { id: 'year', label: 'Yearly' },
      ],
      items: [
        { text: 'Generator test run', bucket: 'month' },
        { text: 'Battery visual check and float voltages', bucket: 'month' },
        { text: 'Battery internal resistance (ohmic) test', bucket: 'quarter' },
        { text: 'Fan belt inspection', bucket: 'quarter' },
        { text: 'Vibration readings on pumps and fans', bucket: 'quarter' },
        { text: 'Infrared scan of switchgear connections', bucket: 'year' },
        { text: 'Breaker exercising', bucket: 'year' },
        { text: 'Generator load bank test', bucket: 'year' },
        { text: 'Fuel sampling', bucket: 'year' },
      ],
      explain: 'Monthly: quick checks that catch obvious problems. Quarterly: trend measurements. Yearly: deeper tests that need planning and often a change window. Many sites do some of these more often.',
    },
    details: [
      { title: 'PM vs CM ratio', text: 'Sites track how much work is planned versus reactive. More planned work usually means fewer surprises.' },
      { title: 'Wet stacking', text: 'Diesel generators run lightly loaded for long periods can build up unburned fuel in the exhaust. Load bank tests help burn it off.', verify: true },
      { title: 'IR needs load', text: 'Infrared scans are most useful when the gear carries a meaningful load. Scans are done by qualified people following arc flash rules.', verify: true },
      { title: 'Battery trend', text: 'A single reading means little. A cell whose internal resistance keeps rising compared to its neighbors is the one to watch.', verify: true },
      { title: 'Filters', text: 'Track filter pressure drop. Change on condition or schedule, whichever comes first.' },
    ],
    mistakes: [
      { mistake: 'Skipping PM because "it is running fine"', why: 'Running fine today is exactly when planned work is cheapest and safest.' },
      { mistake: 'Testing without recording', why: 'A test with no recorded result cannot show a trend.' },
      { mistake: 'Leaving a unit in manual or off after work', why: 'Equipment left out of AUTO after maintenance is a classic way to lose the backup.' },
    ],
    quiz: [
      { id: 'lq-pm-1', q: 'Predictive maintenance is…', choices: ['Fixing after failure', 'Using measurements to find problems early and fix them at a planned time', 'Guessing', 'Replacing everything yearly'], answer: 1, why: 'IR, vibration, oil and battery trends predict failures.' },
      { id: 'lq-pm-2', q: 'Why run an annual generator load bank test?', choices: ['To waste fuel', 'To prove the generator carries real load and burn off wet stacking', 'For the noise', 'It replaces fuel sampling'], answer: 1, why: 'No-load runs prove starting; load banks prove capacity.' },
      { id: 'lq-pm-3', q: 'An infrared scan of switchgear finds…', choices: ['Dust', 'Hot connections before they fail', 'Network faults', 'Water leaks only'], answer: 1, why: 'Heat shows loose or overloaded connections.' },
      { id: 'lq-pm-4', q: 'Where do real maintenance intervals come from?', choices: ['A random guess', 'Manufacturer manuals, the site program, insurers and adopted codes', 'The cafeteria menu', 'Whatever is fastest'], answer: 1, why: 'Typical intervals are starting points only.' },
      { id: 'lq-pm-5', q: 'Corrective maintenance is…', choices: ['Planned in advance', 'Fixing something that has failed', 'Painting', 'Training'], answer: 1, why: 'CM reacts to a failure.' },
      { id: 'lq-pm-6', q: 'After maintenance, a generator should be left…', choices: ['In OFF', 'In AUTO, ready for the next outage', 'In manual run', 'Unplugged'], answer: 1, why: 'Not in AUTO means no backup.' },
    ],
  },
  {
    id: 'life-cap',
    n: 8,
    title: 'Capacity & growth',
    short: 'Power, cooling and space: whichever runs out first sets the limit.',
    scene: 'growth',
    lesson: [
      {
        h: 'Three budgets',
        p: [
          'Every hall has a power budget, a cooling budget and a space budget. The one that runs out first is the real limit, and whatever is left of the other two is "stranded": paid for, but unusable.',
          'Example: plenty of power and floor space, but cooling maxes out at 80 racks. Twenty extra rack positions and some power sit stranded until cooling is added.',
        ],
      },
      {
        h: 'Count capacity at redundancy',
        p: [
          'Capacity is counted with the spares left out. An N+1 UPS system with four 750 kW modules can safely carry three modules\' worth of load, not four.',
          'Before adding a row, check the breaker and PDU capacity on both A and B sides, cooling at the hottest expected day, floor loading, and that a single failure still leaves enough.',
        ],
      },
      {
        h: 'Phased build-outs',
        p: [
          'Campuses grow in phases: build the shell and backbone, then fit out halls and plant in blocks as customers arrive. Expansion work next to live halls follows MOPs and change control, just like operations.',
        ],
      },
    ],
    tour: [
      { anchor: 'racks', title: 'Filled rows', text: 'Live racks drawing power and making heat.' },
      { anchor: 'growth', title: 'Empty rows', text: 'Reserved positions for the next customers, if power and cooling allow.' },
      { anchor: 'ups', title: 'Power headroom', text: 'Check what is left at redundancy, on both A and B.' },
      { anchor: 'chillers', title: 'Cooling headroom', text: 'Check capacity on the hottest day with a unit out.' },
      { anchor: 'field', title: 'Next phase', text: 'Land and utility capacity set aside for the next building.' },
    ],
    task: {
      kind: 'calc',
      calc: 'capacity',
      title: 'Find the stranded capacity',
      prompt: 'Set the usable power, usable cooling, rack positions and kW per rack. See which budget runs out first and what is stranded.',
      explain: 'Raising density strands floor space; adding racks at low density can strand power. Planning keeps the three budgets in step.',
    },
    details: [
      { title: 'Nameplate vs measured', text: 'Server nameplate power is a maximum. Planning usually uses measured draw with a safety margin.', verify: true },
      { title: 'Breaker loading', text: 'Continuous loads are often planned well below a breaker\'s rating. Your site standard sets the limit.', verify: true },
      { title: 'Both sides', text: 'A dual-corded rack must be able to run entirely on A or entirely on B. Plan each side to carry the full load.' },
      { title: 'Hot day', text: 'Cooling capacity drops as outdoor temperature rises. Plan for the design hot day with a unit out.' },
    ],
    mistakes: [
      { mistake: 'Counting the N+1 spare as room for growth', why: 'Then one failure drops load. Capacity is counted at redundancy.' },
      { mistake: 'Planning A and B as two halves', why: 'If each side carries half, losing one side overloads the other.' },
      { mistake: 'Adding dense racks to an air-cooled row without checking cooling', why: 'Hot spots and throttled servers follow.' },
    ],
    quiz: [
      { id: 'lq-cap-1', q: 'What is stranded capacity?', choices: ['Capacity used by the office', 'Capacity paid for but unusable because another resource ran out first', 'Spare parts', 'Extra fiber'], answer: 1, why: 'The limiting budget strands the others.' },
      { id: 'lq-cap-2', q: 'An N+1 UPS with four 750 kW modules can safely carry about…', choices: ['3,000 kW', '2,250 kW', '750 kW', '4,500 kW'], answer: 1, why: 'Leave the spare out: 3 × 750 = 2,250 kW.' },
      { id: 'lq-cap-3', q: 'Each side (A and B) of a dual-corded row should be planned to carry…', choices: ['Half the load', 'The full load on its own', 'No load', 'Double the load'], answer: 1, why: 'Either side must survive the loss of the other.' },
      { id: 'lq-cap-4', q: 'Which day sets cooling capacity planning?', choices: ['The coolest day', 'The design hot day, with a unit out', 'A random day', 'Holidays'], answer: 1, why: 'Cooling capacity is lowest when it is hottest.' },
      { id: 'lq-cap-5', q: 'Power for 100 racks, cooling for 80, space for 120. How many racks can you fill?', choices: ['120', '100', '80', '300'], answer: 2, why: 'The smallest budget wins.' },
      { id: 'lq-cap-6', q: 'Why build campuses in phases?', choices: ['To confuse customers', 'To match spending to demand while the backbone allows growth', 'Because permits forbid it', 'It is cheaper to build twice'], answer: 1, why: 'Phasing ties capital to real demand.' },
    ],
  },
  {
    id: 'life-incident',
    n: 9,
    title: 'Incidents',
    short: 'Stabilize, communicate, then find the real root cause.',
    scene: 'incident',
    lesson: [
      {
        h: 'During the incident',
        p: [
          'Safety first, then protect the load, then fix. One person leads (incident lead); others take clear roles: operations at the gear, communications to customers and management, and a scribe writing a timeline.',
          'Follow the EOPs. Avoid making several changes at once; each change should be deliberate and logged with the time.',
        ],
      },
      {
        h: 'After: root cause',
        p: [
          'Root cause analysis (RCA) asks why it happened until the answer is something you can fix in the system, not just "someone made a mistake".',
          'Two common tools: the 5 whys (ask "why?" again and again) and the fishbone diagram, which sorts causes into groups such as people, methods, machines, materials, measurements and environment.',
        ],
      },
      {
        h: 'The report',
        p: [
          'A post-incident report has a timeline, impact, root cause, contributing factors and corrective actions, each with an owner and a date. Blameless reviews get honest answers; blame gets silence.',
        ],
      },
    ],
    tour: [
      { anchor: 'incident', title: 'Where it failed', text: 'The failed equipment, highlighted. Make it safe and protect the load first.' },
      { anchor: 'noc', title: 'Incident lead', text: 'One leader, clear roles, a scribe keeping the timeline.' },
      { anchor: 'racks', title: 'Customer impact', text: 'What is affected, and what customers are told, and when.' },
      { anchor: 'switchgear', title: 'Evidence', text: 'Breaker positions, alarm logs and trends: capture them before they are lost.' },
    ],
    task: {
      kind: 'order',
      title: 'Build the 5 whys',
      prompt: 'A rack row lost its B-side power during maintenance. Put the "whys" in order, from what happened down to the root cause.',
      items: [
        'Row 4 lost B-side power during planned work',
        'Why? The B-side PDU breaker was opened by the crew',
        'Why? The crew followed a MOP written for the A side',
        'Why? The MOP was copied from the A version and not fully updated',
        'Why? There was no peer review step for MOPs copied from another one',
      ],
      explain: 'The root cause is a missing check in the process (peer review), not "a person made a mistake". Fix the process and it cannot happen the same way again.',
    },
    details: [
      { title: 'Timeline', text: 'Times from alarms, logs and the scribe. Use one clock reference so the sequence is clear.' },
      { title: 'Preserve evidence', text: 'Screenshot alarm screens and save trends early. Some systems overwrite logs.' },
      { title: 'Corrective actions', text: 'Each one has an owner, a due date and a way to check it worked.' },
      { title: 'Blameless', text: 'People report near misses when they are not punished for honesty. Near misses are free lessons.' },
    ],
    mistakes: [
      { mistake: 'Stopping at "human error"', why: 'Ask why the error was possible. The fix is in procedures, design or training.' },
      { mistake: 'Many changes at once during an event', why: 'You lose track of what fixed it, or what made it worse.' },
      { mistake: 'No owner on corrective actions', why: 'Actions without owners and dates do not happen.' },
    ],
    quiz: [
      { id: 'lq-inc-1', q: 'During an incident, what comes first?', choices: ['Writing the report', 'Safety of people, then protecting the load', 'Ordering parts', 'Finding someone to blame'], answer: 1, why: 'Safety, stabilize, then fix.' },
      { id: 'lq-inc-2', q: 'What does the scribe do?', choices: ['Fixes the gear', 'Keeps a timeline of actions and events', 'Calls the media', 'Nothing'], answer: 1, why: 'The timeline feeds the RCA.' },
      { id: 'lq-inc-3', q: 'A good root cause is…', choices: ['"Someone messed up"', 'Something in the system you can fix so it cannot happen the same way', 'Bad luck', 'The weather'], answer: 1, why: 'Fix the process, design or training.' },
      { id: 'lq-inc-4', q: 'A fishbone diagram groups causes into…', choices: ['Colors', 'Categories like people, methods, machines, materials, measurements and environment', 'Days of the week', 'Customers'], answer: 1, why: 'Those are the classic fishbone groups.' },
      { id: 'lq-inc-5', q: 'Every corrective action needs…', choices: ['A meeting', 'An owner and a due date', 'A new logo', 'Nothing'], answer: 1, why: 'Otherwise it never happens.' },
      { id: 'lq-inc-6', q: 'Why run blameless reviews?', choices: ['To avoid paperwork', 'People share the real story when they are not punished for honesty', 'Because nobody is responsible', 'It is required by law everywhere'], answer: 1, why: 'Honest input finds real causes.' },
    ],
  },
  {
    id: 'life-decom',
    n: 10,
    title: 'Refresh & decommissioning',
    short: 'End of life: move the load, make it safe, recycle it right.',
    scene: 'decom',
    lesson: [
      {
        h: 'Everything has an end of life',
        p: [
          'UPS systems, batteries, chillers and switchgear all age out. Refresh replaces them while the site stays live, usually one redundant unit at a time under MOPs.',
          'Before anything is removed: move or shut down the load it carries (with the customer\'s agreement), then isolate it with LOTOTO, release stored energy, and verify it is dead.',
        ],
      },
      {
        h: 'Data stays with its owner',
        p: [
          'Servers and drives belong to the customer. Wiping or destroying data-bearing devices follows the owner\'s data destruction process, with chain-of-custody records. Facilities staff do not handle customer data or media unless the site\'s process says exactly how.',
        ],
      },
      {
        h: 'Recycle it right',
        p: [
          'Batteries go to licensed battery recyclers; lithium-ion needs extra care (protect terminals, no damaged cells in normal shipping). Refrigerant is recovered by certified technicians, never vented. Electronics go to certified e-waste recyclers. Oils, coolants and fuel are disposed of as regulated waste. Keep the paperwork.',
        ],
      },
    ],
    tour: [
      { anchor: 'racks', title: 'Empty the hall', text: 'Customer IT moved or removed by its owner, following their process.' },
      { anchor: 'ups', title: 'Isolate and verify', text: 'LOTOTO, release stored energy, try out and test before removing gear.' },
      { anchor: 'batteries', title: 'Battery removal', text: 'Handled as hazardous material and sent to licensed recyclers.' },
      { anchor: 'chillers', title: 'Refrigerant recovery', text: 'Certified technicians recover refrigerant before the unit is cut out.' },
      { anchor: 'truck', title: 'Off to recyclers', text: 'Each load tracked with paperwork from the site to the recycler.' },
    ],
    task: {
      kind: 'sort',
      title: 'Where does it go?',
      prompt: 'Sort each item to the right end-of-life path.',
      buckets: [
        { id: 'battery', label: 'Licensed battery recycler' },
        { id: 'refrig', label: 'Refrigerant recovery (certified tech)' },
        { id: 'ewaste', label: 'Certified e-waste recycler' },
        { id: 'data', label: "Owner's data destruction process" },
        { id: 'fluid', label: 'Regulated fluid disposal' },
      ],
      items: [
        { text: 'VRLA UPS battery strings', bucket: 'battery' },
        { text: 'Lithium-ion battery cabinets', bucket: 'battery' },
        { text: 'Refrigerant in a retired chiller', bucket: 'refrig' },
        { text: 'Old PDU control boards and meters', bucket: 'ewaste' },
        { text: 'Customer server hard drives', bucket: 'data' },
        { text: 'Used generator engine oil', bucket: 'fluid' },
        { text: 'Drained glycol from a cooling loop', bucket: 'fluid' },
      ],
      explain: 'Each stream has its own rules and paperwork. Data-bearing media always follow the owner\'s process; refrigerant is never vented.',
    },
    details: [
      { title: 'Stored energy', text: 'UPS capacitors and battery strings can stay dangerous after the breaker opens. Release and verify per the manual and LOTOTO.', verify: true },
      { title: 'Refrigerant rules', text: 'Recovery is done by certified technicians with recovery equipment, and quantities are recorded.', verify: true },
      { title: 'Chain of custody', text: 'Every data-bearing device is tracked from rack to destruction with signatures.' },
      { title: 'Lithium-ion shipping', text: 'Damaged or swollen lithium cells have special handling and shipping rules. Ask the recycler before you pack.', verify: true },
    ],
    mistakes: [
      { mistake: 'Assuming "breaker open" means safe', why: 'Stored energy and back-feeds remain. Verify with LOTOTO and a rated meter.' },
      { mistake: 'Throwing drives in e-waste', why: 'Customer data must follow the owner\'s destruction process first.' },
      { mistake: 'Cutting refrigerant lines', why: 'Venting refrigerant is illegal in many places and harms the environment.' },
    ],
    quiz: [
      { id: 'lq-dec-1', q: 'Before removing a UPS, what comes first?', choices: ['Unbolt it', 'Move the load, then isolate with LOTOTO and verify dead', 'Call the recycler', 'Cut the cables'], answer: 1, why: 'Load off, then isolate and verify.' },
      { id: 'lq-dec-2', q: 'Who decides how customer drives are destroyed?', choices: ['Whoever is closest', "The owner's data destruction process", 'The recycler alone', 'Nobody'], answer: 1, why: 'Data belongs to its owner.' },
      { id: 'lq-dec-3', q: 'Refrigerant in a retired chiller should be…', choices: ['Vented outside', 'Recovered by certified technicians', 'Left in the unit for the scrapyard', 'Mixed with oil'], answer: 1, why: 'Recovery, never venting.' },
      { id: 'lq-dec-4', q: 'Used generator oil is…', choices: ['Poured in a drain', 'Disposed of as regulated waste', 'Burned in a barrel', 'Kept forever'], answer: 1, why: 'Oils and coolants are regulated wastes.' },
      { id: 'lq-dec-5', q: 'Why does "breaker open" not mean safe?', choices: ['It always does', 'Stored energy and back-feeds can remain', 'Breakers never open', 'Only on Tuesdays'], answer: 1, why: 'Release stored energy and verify.' },
      { id: 'lq-dec-6', q: 'What is chain of custody?', choices: ['A bike lock', 'A signed record tracking each device from rack to destruction', 'A type of cable', 'A shipping box'], answer: 1, why: 'It proves where every device went.' },
    ],
  },
];
