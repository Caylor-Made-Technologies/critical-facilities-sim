/** Life of a Data Center, stages 1–5: why, site, design, construction, commissioning. Generic only. */
import type { LifeStage } from './lifecycleTypes';

export const STAGES_A: LifeStage[] = [
  {
    id: 'life-why',
    n: 1,
    title: 'Why data centers exist',
    short: "What's inside, who uses them, and what an hour of downtime costs.",
    scene: 'built',
    lesson: [
      {
        h: 'A building for computers',
        p: [
          'A data center is a building whose job is to keep computers powered, cooled, connected and safe, every minute of every day.',
          'The computers (servers, storage, network gear) live in racks in the "white space". Everything that keeps them alive (power gear, cooling plant, fire systems) lives in the "gray space" around it. Facilities techs mostly work in the gray space.',
        ],
      },
      {
        h: 'Who uses them',
        p: [
          'Colocation ("colo"): one company owns the building and rents space, power and cooling to many customers. Each customer brings their own servers.',
          'Enterprise: one company builds or leases a site for its own IT.',
          'Hyperscale: very large campuses run by the biggest cloud and internet companies, built in repeated blocks.',
          'Edge: small sites close to users (a cell tower base, a factory, a city block) where speed matters more than size.',
        ],
      },
      {
        h: 'Why uptime is everything',
        p: [
          'When a data center goes down, the websites, payments, phone apps and hospital records running inside it go down too. Customers pay for availability, and contracts often carry penalties when it is missed.',
          'Availability is usually quoted in "nines". 99.9% sounds high, but it still allows almost nine hours of downtime a year. That is why the plant is built with backups for its backups.',
        ],
      },
    ],
    tour: [
      { anchor: 'fence', title: 'Security perimeter', text: 'Fences, gates and cameras come first. Nobody walks in off the street.' },
      { anchor: 'hall', title: 'White space', text: 'The data hall: rows of racks holding the customer IT. This is what everything else exists to protect.' },
      { anchor: 'switchgear', title: 'Gray space: power', text: 'Switchgear, UPS systems and batteries keep clean power flowing to the hall.' },
      { anchor: 'chillers', title: 'Gray space: cooling', text: 'Chillers, pumps and air handlers carry the heat out of the hall.' },
      { anchor: 'genyard', title: 'Backup generators', text: 'If the utility fails, generators start and carry the site, with the UPS bridging the gap.' },
      { anchor: 'noc', title: 'Operations center', text: 'People watching the plant 24/7. That is the job you are training for.' },
    ],
    task: {
      kind: 'calc',
      calc: 'downtime',
      title: 'What do the nines really mean?',
      prompt: 'Pick an availability and an example cost per minute of downtime. See how much downtime a year that allows, and what it would cost.',
      explain: 'Each extra nine cuts allowed downtime by ten times. Cost per minute varies hugely by business; the number here is just an example to play with.',
    },
    details: [
      { title: 'Racks are measured in "U"', text: 'One rack unit (1U) is 1.75 in (44.45 mm) of height. A common full rack is 42U to 48U tall.' },
      { title: 'A and B power', text: 'Most IT gear has two power cords, fed from two separate paths (A and B). Lose one path and the server keeps running on the other.' },
      { title: 'Facilities vs IT', text: 'Facilities owns the building, power and cooling. IT (or the customer) owns what is in the racks. Techs never touch customer equipment beyond what the site allows.' },
      { title: 'Nines in minutes', text: '99.9% ≈ 526 minutes a year. 99.99% ≈ 53 minutes. 99.999% ≈ 5 minutes.' },
    ],
    mistakes: [
      { mistake: 'Thinking redundancy means "it can never go down"', why: 'Redundancy removes single points of failure in the design. People, procedures and maintenance still decide whether it stays up.' },
      { mistake: 'Treating the customer side as yours', why: 'In colocation, the servers belong to customers. Touching them without authorization can break contracts and trust.' },
      { mistake: 'Ignoring "small" alarms', why: 'Big outages usually start as small, ignored warnings that line up.' },
    ],
    quiz: [
      { id: 'lq-why-1', q: 'In a colocation data center, who usually owns the servers in the racks?', choices: ['The building owner', 'The customers who rent the space', 'The utility', 'The fire marshal'], answer: 1, why: 'Colo providers rent space, power and cooling. Customers bring and own their IT.' },
      { id: 'lq-why-2', q: 'Where do facilities technicians mostly work?', choices: ['Inside customer servers', 'In the gray space: power, cooling and life safety systems', 'Only in the parking lot', 'In software code'], answer: 1, why: 'Gray space is the plant that keeps the white space alive.' },
      { id: 'lq-why-3', q: 'About how much downtime per year does 99.99% availability allow?', choices: ['About 5 minutes', 'About 53 minutes', 'About 9 hours', 'About 3 days'], answer: 1, why: '0.01% of 525,600 minutes is about 52.6 minutes.' },
      { id: 'lq-why-4', q: 'Why do servers often have two power cords?', choices: ['To draw twice the power', 'So they can run from two separate power paths (A and B)', 'One is a spare to keep in a drawer', 'For lighting'], answer: 1, why: 'Dual-corded gear rides through the loss of one path.' },
      { id: 'lq-why-5', q: 'Which kind of site sits close to users and is usually small?', choices: ['Hyperscale', 'Edge', 'Enterprise campus', 'Colocation megasite'], answer: 1, why: 'Edge sites trade size for being near the users.' },
      { id: 'lq-why-6', q: 'How tall is one rack unit (1U)?', choices: ['1 inch', '1.75 inches', '3.5 inches', '1 foot'], answer: 1, why: '1U is 1.75 in (44.45 mm).' },
    ],
  },
  {
    id: 'life-site',
    n: 2,
    title: 'Site selection',
    short: 'Power, fiber, water, risk and permits: choosing where to build.',
    scene: 'site',
    lesson: [
      {
        h: 'Power first',
        p: [
          'A large data center can need as much power as a small town. The first question is whether the utility can deliver it, how soon, and from how many directions.',
          'The best sites can be fed from two separate substations or transmission lines, so one utility problem does not take out both feeds. New utility capacity can take years to build, so power availability often decides the site.',
        ],
      },
      {
        h: 'Fiber, water and roads',
        p: [
          'Data must get in and out: look for several fiber carriers arriving by physically separate routes, so one backhoe cannot cut them all.',
          'Water matters if the cooling design uses evaporative towers. Roads matter for delivering transformers, generators and chillers that can weigh many tons.',
        ],
      },
      {
        h: 'Risk and rules',
        p: [
          'Check flood maps, earthquake zones, tornado and hurricane exposure, wildfire, nearby airports, rail lines and chemical plants.',
          'Then the rules: zoning, building permits, air permits for generators, noise limits at the property line, and local tax treatment. Talking to the community early saves trouble later.',
        ],
      },
    ],
    tour: [
      { anchor: 'field', title: 'The empty site', text: 'Every campus starts as a field. Soil tests and surveys come before anything is built.' },
      { anchor: 'substation', title: 'Substation', text: 'Where high-voltage utility power steps down. Distance to it, and its spare capacity, are huge factors.' },
      { anchor: 'powerline', title: 'Utility feeds', text: 'Two feeds from separate sources are the goal, so one fault cannot take both.' },
      { anchor: 'fiber', title: 'Fiber routes', text: 'Diverse fiber paths entering on different sides of the building.' },
      { anchor: 'water', title: 'Water supply', text: 'Needed for evaporative cooling designs, plus fire protection.' },
      { anchor: 'flood', title: 'Flood zone', text: 'Low ground near a river: build out of it, or raise and protect critical gear.' },
      { anchor: 'road', title: 'Heavy-haul access', text: 'Big equipment arrives by truck. Bridges, turns and road weight limits matter.' },
    ],
    task: {
      kind: 'calc',
      calc: 'site',
      title: 'Score three candidate sites',
      prompt: 'Set how much each factor matters to your project, and see how three generic sites rank.',
      explain: 'There is no perfect site. Weighting factors makes the trade-offs visible; a site that wins on tax breaks can lose on power timing.',
    },
    details: [
      { title: 'Two feeds, two sources', text: 'Two feeds from the same substation still share that substation. True diversity means separate sources and separate routes.', verify: true },
      { title: 'Lead times', text: 'Large transformers, switchgear and new utility service can take a year or more to arrive. Order early.', verify: true },
      { title: 'Flood maps', text: 'Many owners avoid the 100-year floodplain and also look hard at the 500-year one. Check your local maps and insurer requirements.', verify: true },
      { title: 'Generator permits', text: 'Standby generators usually need air permits that limit run hours and testing. That shapes how often you can test.', verify: true },
      { title: 'Noise', text: 'Generators and cooling towers are loud. Local limits at the property line can force enclosures or setbacks.' },
    ],
    mistakes: [
      { mistake: 'Picking the cheapest land first', why: 'Cheap land with no power for three years is not cheap.' },
      { mistake: 'Two fiber carriers in the same trench', why: 'One dig cuts both. Diversity is about physical paths, not company names.' },
      { mistake: 'Ignoring the neighbors', why: 'Noise, traffic and water use complaints can stall permits.' },
    ],
    quiz: [
      { id: 'lq-site-1', q: 'Which factor most often decides whether a large data center site works?', choices: ['Parking spaces', 'Utility power capacity and how soon it can be delivered', 'Paint color', 'Distance to a coffee shop'], answer: 1, why: 'Power is the hardest thing to add later.' },
      { id: 'lq-site-2', q: 'What makes two fiber connections truly diverse?', choices: ['Two different company logos', 'Separate physical routes and building entrances', 'Two cables in one conduit', 'Different colors of fiber'], answer: 1, why: 'One backhoe should not be able to cut both.' },
      { id: 'lq-site-3', q: 'Why does water supply matter for some sites?', choices: ['For decorative fountains', 'Evaporative cooling towers use water, and fire protection needs it', 'Servers are water cooled by default', 'It does not matter'], answer: 1, why: 'Evaporative designs consume water; fire systems need supply too.' },
      { id: 'lq-site-4', q: 'Why are air permits a site question?', choices: ['They set office hours', 'They can limit generator run hours, which affects testing', 'They control the Wi-Fi', 'They are only for airports'], answer: 1, why: 'Permits shape how you run and test generators.' },
      { id: 'lq-site-5', q: 'Two utility feeds from the same substation are…', choices: ['Fully diverse', 'Better than one, but still share that substation as a single point', 'Illegal', 'The same as no feeds'], answer: 1, why: 'Diversity means separate sources, not just separate cables.' },
      { id: 'lq-site-6', q: 'Why check roads and bridges?', choices: ['For employee commutes only', 'Transformers, generators and chillers are very heavy deliveries', 'Data travels by truck', 'They are not relevant'], answer: 1, why: 'Heavy-haul access can rule a site out.' },
    ],
  },
  {
    id: 'life-design',
    n: 3,
    title: 'Design',
    short: 'Redundancy, density, white vs gray space, and the drawings.',
    scene: 'design',
    lesson: [
      {
        h: 'Redundancy in plain words',
        p: [
          'N means exactly enough. N+1 adds one spare unit, so one can fail or be maintained. 2N builds two complete, independent systems. 2N+1 is two systems, each with a spare.',
          'Distributed redundant spreads the load over three or more systems so any one can fail and the others absorb it. Block redundant ("catcher") keeps a spare block that takes over for whichever block fails.',
          'Tier-style ratings describe these levels in plain language: from basic capacity, to "concurrently maintainable" (any part can be taken out for work without dropping load), to "fault tolerant" (any single failure is ridden through automatically).',
        ],
      },
      {
        h: 'Density and space',
        p: [
          'Power density is kW per rack. Traditional air-cooled racks run a few kW to around 15 kW; AI and GPU racks can run many times that and usually need liquid cooling.',
          'White space holds the IT. Gray space holds electrical rooms, battery rooms, mechanical plant and generator yards. Racks are heavy, so the floor (raised or slab) must be designed for the load.',
        ],
      },
      {
        h: 'The drawings',
        p: [
          'The one-line diagram shows every electrical path from utility to rack on one page. The P&ID (piping and instrumentation diagram) does the same for pipes, valves, pumps and sensors.',
          'You will use both on shift: to plan a MOP, to isolate equipment, and to understand what happens when something fails.',
        ],
      },
    ],
    tour: [
      { anchor: 'shell', title: 'The building on paper', text: 'Design happens before a shovel hits the ground: every room, path and spare is drawn first.' },
      { anchor: 'switchgear', title: 'Electrical rooms', text: 'Sized for the IT load plus the chosen redundancy. A 2N design needs two of everything.' },
      { anchor: 'ups', title: 'UPS sizing', text: 'Module count follows the redundancy: N, N+1 or 2N.' },
      { anchor: 'chillers', title: 'Cooling plant', text: 'Sized for the heat the IT will make, plus spares and hot days.' },
      { anchor: 'hall', title: 'Rack density', text: 'kW per rack sets cooling type: air for most racks, liquid for dense GPU rows.' },
      { anchor: 'floor', title: 'Raised floor vs slab', text: 'Raised floors carry air and cable underneath; slab designs run them overhead. Both must carry heavy racks.' },
    ],
    task: {
      kind: 'calc',
      calc: 'design',
      title: 'Size the UPS and cooling',
      prompt: 'Pick racks, kW per rack, UPS module size and redundancy. See the IT load, how many UPS modules you need, and the cooling in tons.',
      explain: 'Redundancy multiplies equipment: the same IT load needs very different amounts of gear at N, N+1 and 2N.',
    },
    details: [
      { title: 'Concurrently maintainable', text: 'You can take any one component out for planned work without dropping the load. That is about maintenance, not failures.' },
      { title: 'Fault tolerant', text: 'Any single unplanned failure is ridden through automatically, with no operator action needed.' },
      { title: 'Cooling tons', text: 'One ton of cooling is about 3.517 kW of heat removed. Nearly every watt the IT draws becomes heat to remove.' },
      { title: 'Floor loading', text: 'A loaded rack can weigh well over a thousand pounds. Check the floor rating before adding heavy gear.', verify: true },
      { title: 'Labels match drawings', text: 'Equipment tags in the field should match the one-line exactly. Mismatched labels cause switching errors.' },
    ],
    mistakes: [
      { mistake: 'Counting the spare as capacity', why: 'In N+1, the +1 is not extra room for load. Fill it and you have no spare left.' },
      { mistake: 'Designing for today only', why: 'Densities rise. Leave room for growth in power paths, cooling and floor loading.' },
      { mistake: 'One shared component under a "2N" system', why: 'A single shared breaker, pipe or control panel quietly turns 2N back into a single point of failure.' },
    ],
    quiz: [
      { id: 'lq-des-1', q: 'What does N+1 mean?', choices: ['Two full systems', 'Exactly enough plus one spare unit', 'One unit only', 'Half capacity'], answer: 1, why: 'The +1 covers one failure or one unit out for maintenance.' },
      { id: 'lq-des-2', q: 'Concurrently maintainable means…', choices: ['Nothing ever fails', 'Any component can be taken out for planned work without dropping load', 'Maintenance only on weekends', 'Two technicians at all times'], answer: 1, why: 'It is about planned work, not unplanned failures.' },
      { id: 'lq-des-3', q: 'About how many kW is one ton of cooling?', choices: ['1 kW', '3.517 kW', '12 kW', '100 kW'], answer: 1, why: '1 ton ≈ 12,000 BTU/h ≈ 3.517 kW.' },
      { id: 'lq-des-4', q: 'Which drawing shows pipes, valves, pumps and sensors?', choices: ['One-line diagram', 'P&ID', 'Floor plan only', 'Org chart'], answer: 1, why: 'The P&ID is the mechanical counterpart of the one-line.' },
      { id: 'lq-des-5', q: 'At 2N, how many UPS modules does a load needing 3 modules get?', choices: ['3', '4', '6', '9'], answer: 2, why: '2N duplicates the whole set: 3 × 2 = 6.' },
      { id: 'lq-des-6', q: 'Very dense GPU racks usually need…', choices: ['More open windows', 'Liquid cooling (for example direct-to-chip)', 'Less power', 'No cooling'], answer: 1, why: 'Air alone struggles at very high kW per rack.' },
    ],
  },
  {
    id: 'life-build',
    n: 4,
    title: 'Construction',
    short: 'From grading the site to the final punch list.',
    scene: 'construction',
    lesson: [
      {
        h: 'The order of work',
        p: [
          'Site prep and grading, then underground work: foundations, duct banks for cables, the grounding grid and pipe runs. Then the steel and the shell, until the building is "dried in" (roof and walls keep weather out).',
          'Inside, crews rough in MEP (mechanical, electrical, plumbing): cable tray, conduit, pipe. Then the big gear is set: switchgear, UPS, generators, chillers. Cable is pulled and terminated, pipes are tested and flushed, everything is labeled.',
        ],
      },
      {
        h: 'Quality is in the small things',
        p: [
          'Every power connection is torqued to the manufacturer\'s value and marked. Every pipe system is pressure tested before it is insulated or hidden. Pipes are flushed so construction debris does not end up in chiller tubes.',
          'At the end, a punch list records everything not yet right. Items are fixed and signed off before commissioning testing.',
        ],
      },
      {
        h: 'Safety on a live campus',
        p: [
          'Later phases are often built next to halls that are already running. Construction then works under the same permits, LOTOTO and change control as operations, because a mistake can drop live customers.',
        ],
      },
    ],
    tour: [
      { anchor: 'foundation', title: 'Foundations and underground', text: 'Footings, slabs, duct banks and the grounding grid go in before anything stands up.' },
      { anchor: 'shell', title: 'Steel and shell', text: 'Steel frame, walls and roof. "Dried in" means weather stays out and inside work can start.' },
      { anchor: 'crane', title: 'Setting heavy gear', text: 'Cranes set generators, chillers and transformers onto pads and roofs.' },
      { anchor: 'switchgear', title: 'Terminations', text: 'Cables pulled, terminated and torqued to spec, then marked.' },
      { anchor: 'chillers', title: 'Pipe testing', text: 'Pressure tests and flushing before insulation goes on.' },
      { anchor: 'genyard', title: 'Generator yard', text: 'Generators, fuel tanks and their pads, ready for startup.' },
    ],
    task: {
      kind: 'order',
      title: 'Put the build in order',
      prompt: 'Drag (or use the arrow buttons) to put these construction steps in order.',
      items: [
        'Site prep and grading',
        'Foundations, duct banks and grounding grid',
        'Steel, walls and roof (dried in)',
        'MEP rough-in: tray, conduit and pipe',
        'Set switchgear, UPS, generators and chillers',
        'Pull cable, terminate and torque',
        'Pressure test and flush piping',
        'Labeling and punch list',
      ],
      explain: 'Underground before shell, shell before inside work, gear before cable, tests before hiding pipes, and the punch list last before commissioning.',
    },
    details: [
      { title: 'Torque and mark', text: 'Torque each lug to the manufacturer\'s value with a calibrated tool, then mark it (a paint line) so loosening is visible later.', verify: true },
      { title: 'Hydrostatic test', text: 'Pipes are filled and held at a test pressure for a set time to find leaks before they are hidden.', verify: true },
      { title: 'Flushing', text: 'New piping is full of weld slag and debris. Flush it before it reaches chiller and coil tubes.' },
      { title: 'Grounding grid', text: 'Buried copper that bonds the whole site together. It is tested before backfill because it can never be reached again.' },
      { title: 'Red-lines', text: 'Field changes are marked on the drawings ("red-lines") so the final as-built drawings match reality.' },
    ],
    mistakes: [
      { mistake: 'Insulating pipes before the pressure test', why: 'Leaks hide under insulation and get found later, often in the data hall.' },
      { mistake: 'Skipping torque marks', why: 'Without a mark, nobody can see a loose lug until infrared or a fire finds it.' },
      { mistake: 'Losing the red-lines', why: 'Operations inherits drawings that do not match the building.' },
    ],
    quiz: [
      { id: 'lq-bld-1', q: 'What goes in before the building shell?', choices: ['Server racks', 'Foundations, duct banks and the grounding grid', 'Carpet', 'Customer IT'], answer: 1, why: 'Underground work comes first; it is buried afterwards.' },
      { id: 'lq-bld-2', q: 'Why are pipes flushed after installation?', choices: ['To make them shiny', 'To clear construction debris before it reaches chiller and coil tubes', 'To test the paint', 'It is not needed'], answer: 1, why: 'Debris fouls and blocks heat exchangers.' },
      { id: 'lq-bld-3', q: 'What is the purpose of a torque mark?', choices: ['Decoration', 'Shows the connection was torqued and makes loosening visible', 'Marks the price', 'Counts the cables'], answer: 1, why: 'A shifted mark means a connection moved.' },
      { id: 'lq-bld-4', q: '"Dried in" means…', choices: ['The concrete is dry', 'Roof and walls keep the weather out so inside work can start', 'Pipes are drained', 'The paint is dry'], answer: 1, why: 'Interior MEP work needs a weather-tight building.' },
      { id: 'lq-bld-5', q: 'What is a punch list?', choices: ['A boxing schedule', 'The list of items not yet right, fixed before turnover', 'The list of employees', 'A parts order'], answer: 1, why: 'Punch items are closed out before commissioning and turnover.' },
      { id: 'lq-bld-6', q: 'Why does construction next to a live hall need change control?', choices: ['It does not', 'A construction mistake can drop live customer load', 'To slow the crew down', 'For paperwork only'], answer: 1, why: 'Live sites need the same discipline as operations.' },
    ],
  },
  {
    id: 'life-cx',
    n: 5,
    title: 'Commissioning',
    short: 'Levels 1–5, from the factory test to pulling the plug.',
    scene: 'commission',
    lesson: [
      {
        h: 'Proving it works, before customers move in',
        p: [
          'Commissioning (Cx) is the organized proof that every system works as designed, alone and together. It is usually described in five levels.',
          'Level 1: factory witness test (FWT), the gear is tested at the factory. Level 2: delivery and installation inspection on site. Level 3: startup and pre-functional checks by the vendors. Level 4: functional performance tests, one system at a time. Level 5: the integrated systems test (IST), the whole site together.',
        ],
      },
      {
        h: 'Scripts, witnesses and deficiencies',
        p: [
          'Every test follows a written script with expected results. Witnesses sign off each step. Anything that fails becomes a deficiency, logged, fixed and retested.',
          'Load banks (big resistive heaters) stand in for IT load, so the power and cooling can be tested at full load before any customer gear arrives.',
        ],
      },
      {
        h: 'Level 5: pull the plug',
        p: [
          'In the IST, the team cuts utility power on purpose with the hall loaded. UPS systems must carry the load, generators must start and take over, cooling must recover, and alarms must show up as designed. No load may drop.',
        ],
      },
    ],
    tour: [
      { anchor: 'dock', title: 'Delivery inspection (L2)', text: 'Gear is checked for damage and against the order before it is set.' },
      { anchor: 'switchgear', title: 'Startup (L3)', text: 'Vendors start up their equipment and run pre-functional checks.' },
      { anchor: 'loadbank', title: 'Load banks', text: 'Rows of load banks heat the hall like real IT, so cooling and power are tested at full load.' },
      { anchor: 'genyard', title: 'Functional tests (L4)', text: 'Each system tested on its own: generator start, transfer, sync and load steps.' },
      { anchor: 'powerline', title: 'IST: pull the plug (L5)', text: 'Utility is cut on purpose. Everything must work together with no load dropped.' },
      { anchor: 'noc', title: 'Witness sign-off', text: 'Results recorded against the script, deficiencies logged, signatures collected.' },
    ],
    task: {
      kind: 'sim',
      title: 'Run a mini Level 5 IST',
      prompt: 'Open the simulator and run an integrated systems test on the live plant: cut both utilities, prove the backups carry the load, and bring it back.',
      explain: 'A real IST is longer and witnessed by many people, but the idea is the same: cut the source on purpose, under load, and prove nothing drops.',
    },
    details: [
      { title: 'Test script', text: 'Each step lists the action, the expected result, the actual result and a signature. No script, no test.' },
      { title: 'Deficiency log', text: 'Every failed step gets an ID, an owner, a fix date and a retest. Turnover waits until critical items close.' },
      { title: 'Load bank heat', text: 'Load banks turn electricity into heat exactly like IT does. They also get hot to touch and need airflow.', verify: true },
      { title: 'Trend everything', text: 'BMS and power monitoring trends recorded during tests become the baseline for operations.' },
      { title: 'Seasonal testing', text: 'Some cooling tests are repeated in summer and winter, because plant behavior changes with the weather.' },
    ],
    mistakes: [
      { mistake: 'Treating commissioning as a formality', why: 'Problems found in Cx are cheap. The same problems found with customers live are outages.' },
      { mistake: 'Testing without load', why: 'Many faults only show at full load: hot connections, weak cooling, generator load steps.' },
      { mistake: 'Not training operations during Cx', why: 'Cx is the best chance for the ops team to learn the real plant before it is live.' },
    ],
    quiz: [
      { id: 'lq-cx-1', q: 'What is a Level 5 test usually called?', choices: ['Factory witness test', 'Integrated systems test (IST)', 'Paint inspection', 'Punch walk'], answer: 1, why: 'L5 tests all systems together.' },
      { id: 'lq-cx-2', q: 'What do load banks do in commissioning?', choices: ['Store spare parts', 'Stand in for IT load so power and cooling can be tested at full load', 'Hold cash', 'Measure humidity'], answer: 1, why: 'They make heat like IT without risking customer gear.' },
      { id: 'lq-cx-3', q: 'Where is a Level 1 test done?', choices: ['In the data hall', 'At the factory', 'At the utility', 'In the parking lot'], answer: 1, why: 'L1 is the factory witness test.' },
      { id: 'lq-cx-4', q: 'In an IST "pull the plug" test, what must not happen?', choices: ['Generators start', 'Any IT load drops', 'UPS goes to battery', 'Alarms annunciate'], answer: 1, why: 'The point is proving the load rides through.' },
      { id: 'lq-cx-5', q: 'What happens when a test step fails?', choices: ['Skip it', 'Log a deficiency, fix it, and retest', 'Sign it anyway', 'Start construction over'], answer: 1, why: 'Deficiencies are tracked to closure.' },
      { id: 'lq-cx-6', q: 'Which level checks equipment one system at a time on site?', choices: ['Level 1', 'Level 2', 'Level 4', 'Level 5'], answer: 2, why: 'L4 functional performance tests go system by system.' },
    ],
  },
];
