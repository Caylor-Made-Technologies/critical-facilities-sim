/**
 * Career ladder for data center critical facilities, bottom rung first,
 * plus the side branches you can step off onto. Generic: no employer
 * names. Certifications are named by the public agency or non-profit
 * association that issues them; data-center-specific courses from
 * private training firms are described generically. Requirements change,
 * so always check the issuer's current rules. Not an endorsement.
 */

export interface Cert {
  name: string;
  /** Who issues it (agency, state, or professional association). */
  by: string;
  why: string;
}

export interface Rung {
  id: string;
  role: string;
  aka: string;
  years: string;
  summary: string;
  /** What to try to do in this phase. */
  doNow: string[];
  /** What shows you're ready for the next rung. */
  advance: string[];
  certs: Cert[];
}

export const LADDER: Rung[] = [
  {
    id: 'r1',
    role: 'Facilities / maintenance technician',
    aka: 'Maintenance tech, facilities helper, apprentice',
    years: 'Year 0–1',
    summary: 'Get in the door, learn to work safely, and become the person who always does rounds right.',
    doNow: [
      'Learn the site\'s safety rules, LOTO program and emergency plan cold.',
      'Do rounds by the book and write real numbers, not check marks.',
      'Shadow every PM you can and ask "why" at each step.',
      'Learn to read a one-line diagram and trace power from utility to rack.',
      'Keep a pocket notebook of tags, readings and lessons learned.',
    ],
    advance: [
      'Your rounds catch problems before alarms do.',
      'You can explain N+1 vs 2N and the refrigeration cycle without notes.',
      'Leads trust you to do PMs with light supervision.',
      'Zero safety violations, and you speak up about near misses.',
    ],
    certs: [
      { name: 'OSHA 10-Hour General Industry', by: 'OSHA Outreach Training Program', why: 'The baseline safety card most sites expect.' },
      { name: 'CPR / AED / First Aid', by: 'A nationally recognized provider', why: 'You may be the first person on scene.' },
      { name: 'NFPA 70E electrical safety training', by: 'Your employer or a qualified trainer (based on the NFPA 70E standard)', why: 'Required before you work near energized equipment.' },
    ],
  },
  {
    id: 'r2',
    role: 'Critical facilities technician',
    aka: 'Data center technician, CFT, operations technician',
    years: 'Year 1–3',
    summary: 'Run the plant under a MOP: switching, transfers, generator tests and the mechanical plant.',
    doNow: [
      'Perform switching under approved MOPs with peer checks.',
      'Learn UPS modes, ATS logic, generator starts and the BMS alarms.',
      'Get comfortable on the chiller plant: staging, free cooling, delta-T.',
      'Practice every emergency drill until the steps are automatic (use this simulator!).',
      'Learn your meters: live-dead-live, clamp meter, IR camera.',
    ],
    advance: [
      'You can run a utility-loss response from memory and calmly.',
      'You can troubleshoot common alarms to a root cause, not just a reset.',
      'You write clear shift logs and handoffs.',
      'Vendors and engineers start asking for your input.',
    ],
    certs: [
      { name: 'EPA Section 608 Universal', by: 'U.S. EPA (through an approved testing organization)', why: 'Legally required to handle refrigerant; expected for anyone on chillers or CRACs.' },
      { name: 'OSHA 30-Hour General Industry', by: 'OSHA Outreach Training Program', why: 'Deeper safety training that supervisors look for.' },
      { name: 'Vendor-neutral data center operations certificate', by: 'Several private training firms offer one', why: 'Shows you understand data center power, cooling and resiliency as a system.' },
      { name: 'Systems Maintenance Technician (SMT)', by: 'BOMI International', why: 'Building systems fundamentals: HVAC, electrical, boilers and controls.' },
    ],
  },
  {
    id: 'r3',
    role: 'Building engineer / critical facilities engineer',
    aka: 'Building engineer, CFE, facilities engineer II',
    years: 'Year 2–5',
    summary: 'Own systems, not just tasks: write MOPs, lead vendors, find root causes.',
    doNow: [
      'Take ownership of one system (UPS, generators, chillers or BMS) and become the go-to person.',
      'Write and review MOPs and SOPs, including the back-out plan.',
      'Lead vendor PMs: review their procedures, watch their work, check their reports.',
      'Run root-cause analyses on incidents and drive the fixes.',
      'Trend data to catch slow problems (approach temps, battery resistance, fuel quality).',
    ],
    advance: [
      'Your MOPs get approved with few changes.',
      'You led at least one incident response and the RCA after it.',
      'Newer techs come to you to learn.',
      'You can explain the business impact of a risk, not just the technical part.',
    ],
    certs: [
      { name: 'Journeyman electrician license', by: 'Your state licensing board (where it applies)', why: 'Proves electrical competence and opens the electrical SME branch.' },
      { name: 'Stationary / operating engineer license', by: 'Your city or state (where required)', why: 'Some cities require it to operate boilers, chillers or large plants.' },
      { name: 'NETA ETT Certified Technician (Level I–II)', by: 'InterNational Electrical Testing Association', why: 'Electrical testing and maintenance skills for switchgear and protection.' },
      { name: 'Certified Maintenance & Reliability Technician (CMRT)', by: 'Society for Maintenance & Reliability Professionals', why: 'Shows you think in reliability, not just repairs.' },
    ],
  },
  {
    id: 'r4',
    role: 'Senior building engineer',
    aka: 'Senior CFE, lead technician, subject matter expert in training',
    years: 'Year 4–8',
    summary: 'Be the expert people call at 3 a.m. Pick a specialty and go deep.',
    doNow: [
      'Choose a specialty (electrical, mechanical or controls) and go deep. This is where branches open up.',
      'Review other people\'s MOPs and catch the risks they missed.',
      'Train newer techs and build training materials.',
      'Help plan capital projects and lifecycle replacements.',
      'Represent operations in design and commissioning reviews.',
    ],
    advance: [
      'You are the recognized expert on at least one system.',
      'Your training or documents are used across the team.',
      'You have helped commission or upgrade a major system.',
      'You handle customer conversations well during incidents.',
    ],
    certs: [
      { name: 'Master electrician license', by: 'Your state licensing board (where it applies)', why: 'Top electrical credential; often required for electrical SME roles.' },
      { name: 'Certified Control Systems Technician (CCST)', by: 'ISA (International Society of Automation)', why: 'Controls and instrumentation credential for the BMS/EPMS branch.' },
      { name: 'Certified Maintenance & Reliability Professional (CMRP)', by: 'Society for Maintenance & Reliability Professionals', why: 'Reliability leadership; useful toward lead and chief roles.' },
      { name: 'NETA ETT Certified Technician (Level III)', by: 'InterNational Electrical Testing Association', why: 'Senior electrical testing; supports the electrical SME branch.' },
    ],
  },
  {
    id: 'r5',
    role: 'Lead engineer / shift supervisor',
    aka: 'Lead CFE, shift lead, operations supervisor',
    years: 'Year 5–10',
    summary: 'Run a shift: people, priorities, emergencies and change approvals.',
    doNow: [
      'Lead the shift: assign work, watch quality, own the handoff.',
      'Run emergency response as the incident lead.',
      'Approve changes and make sure MOPs are followed.',
      'Coach and grow your techs: give feedback, plan their training.',
      'Track KPIs: PM completion, incidents, response times.',
    ],
    advance: [
      'Your shift has strong safety and uptime records.',
      'You develop people who get promoted.',
      'You can build a budget request and defend it.',
      'Leadership trusts your judgment under pressure.',
    ],
    certs: [
      { name: 'Facility Management Professional (FMP)', by: 'IFMA (International Facility Management Association)', why: 'Facility management basics: operations, finance, projects, leadership.' },
      { name: 'Certified Associate in Project Management (CAPM)', by: 'PMI (Project Management Institute)', why: 'Project skills for upgrades and capital work.' },
      { name: 'OSHA Outreach Trainer (500/501 course)', by: 'OSHA Training Institute Education Centers', why: 'Lets you teach OSHA 10/30 to your own team.' },
    ],
  },
  {
    id: 'r6',
    role: 'Chief engineer / facility manager',
    aka: 'Chief engineer, critical facilities manager',
    years: 'Year 8+',
    summary: 'Own the site: budgets, staffing, lifecycle, audits and the customer relationship.',
    doNow: [
      'Own the operating and capital budgets.',
      'Hire, staff and build the team\'s training program.',
      'Plan equipment lifecycle and major replacements years ahead.',
      'Lead audits and customer reviews.',
      'Set the site\'s reliability and safety programs.',
    ],
    advance: [
      'The site meets uptime, safety and budget targets year after year.',
      'You build leaders, not just technicians.',
      'You can run more than one site or a large campus.',
    ],
    certs: [
      { name: 'Certified Facility Manager (CFM)', by: 'IFMA (International Facility Management Association)', why: 'Senior facility management credential.' },
      { name: 'Project Management Professional (PMP)', by: 'PMI (Project Management Institute)', why: 'For leading large capital projects.' },
      { name: 'Certified Energy Manager (CEM)', by: 'Association of Energy Engineers', why: 'Energy and PUE improvement credibility.' },
    ],
  },
  {
    id: 'r7',
    role: 'Operations director / regional manager',
    aka: 'Director of critical facilities, regional operations manager',
    years: 'Year 12+',
    summary: 'Lead many sites: strategy, standards, and the people who run them.',
    doNow: [
      'Set standards across sites (MOP templates, training, KPIs).',
      'Lead managers, not technicians.',
      'Work with design, construction and customers on new builds.',
      'Drive a culture of safety and learning from incidents.',
    ],
    advance: ['From here, paths lead to vice president of operations, consulting, or owning a business.'],
    certs: [{ name: 'Business or engineering degree (optional but common)', by: 'A college or university', why: 'Many director roles prefer one; experience can substitute.' }],
  },
];

export interface Branch {
  id: string;
  title: string;
  emoji: string;
  /** Ladder rung id where this branch usually opens up. */
  from: string;
  what: string;
  day: string[];
  skills: string[];
  certs: Cert[];
  firstSteps: string[];
}

export const BRANCHES: Branch[] = [
  {
    id: 'b-elec-sme',
    title: 'Electrical subject matter expert',
    emoji: '⚡',
    from: 'r4',
    what: 'The go-to expert for switchgear, UPS, protection and power quality across one or many sites.',
    day: ['Review electrical MOPs and switching orders', 'Investigate electrical incidents and trips', 'Advise on breaker settings, studies and upgrades', 'Train techs on electrical systems'],
    skills: ['One-lines and protection coordination', 'UPS and generator systems in depth', 'Power quality analysis', 'NFPA 70E program knowledge'],
    certs: [
      { name: 'Master electrician license', by: 'Your state licensing board', why: 'Often required or strongly preferred.' },
      { name: 'NETA ETT Certified Technician (Level III–IV)', by: 'InterNational Electrical Testing Association', why: 'Deep testing and commissioning skills.' },
    ],
    firstSteps: ['Volunteer for every electrical MOP and vendor PM', 'Ask to sit in on arc flash and coordination study reviews', 'Write an electrical training module for your team'],
  },
  {
    id: 'b-controls',
    title: 'Controls / BMS / EPMS specialist',
    emoji: '🎛️',
    from: 'r3',
    what: 'Keeps the building automation and power monitoring systems accurate, alarming right, and secure.',
    day: ['Tune control loops and setpoints', 'Fix sensor, network and graphics issues', 'Clean up nuisance alarms', 'Manage controls changes through MOC'],
    skills: ['Sequences of operation', 'Networks and building protocols', 'Sensors, 4–20 mA and 0–10 V signals', 'Basic scripting and data trending'],
    certs: [
      { name: 'Certified Control Systems Technician (CCST)', by: 'ISA (International Society of Automation)', why: 'Core controls credential.' },
      { name: 'Certified Automation Professional (CAP)', by: 'ISA (International Society of Automation)', why: 'Senior automation credential for the long run.' },
    ],
    firstSteps: ['Learn every point on one system\'s BMS graphic', 'Shadow the controls vendor on service calls', 'Build a trend report that catches a real problem'],
  },
  {
    id: 'b-mech-sme',
    title: 'Mechanical / HVAC subject matter expert',
    emoji: '❄️',
    from: 'r4',
    what: 'The expert on chillers, towers, pumps, air handlers and liquid cooling.',
    day: ['Review mechanical MOPs', 'Lead chiller and tower troubleshooting', 'Advise on liquid cooling and CDU projects', 'Track plant efficiency'],
    skills: ['Refrigeration cycle and chiller controls', 'Hydronics and pump curves', 'Psychrometrics and airflow management', 'Water treatment basics'],
    certs: [
      { name: 'EPA Section 608 Universal', by: 'U.S. EPA', why: 'Required for refrigerant work.' },
      { name: 'Operations & Performance Management Professional (OPMP)', by: 'ASHRAE (the HVAC engineering society)', why: 'Shows you can run and optimize building HVAC systems at a high level.' },
    ],
    firstSteps: ['Own the chiller plant trends for a quarter', 'Sit in on every chiller vendor PM', 'Learn the liquid-cooling loop end to end'],
  },
  {
    id: 'b-writer',
    title: 'Technical writer (MOPs, SOPs, EOPs)',
    emoji: '✍️',
    from: 'r3',
    what: 'Turns expert knowledge into clear, safe, step-by-step procedures and training that anyone can follow.',
    day: ['Write and update MOPs, SOPs and EOPs', 'Walk down procedures in the field', 'Build training and job aids', 'Keep the document library controlled and current'],
    skills: ['Clear, plain writing', 'Field knowledge to catch unsafe steps', 'Diagrams and photos', 'Document control and version tracking'],
    certs: [
      { name: 'Technical writing certificate', by: 'A community college, university or professional association', why: 'Formal writing skills on top of your field experience.' },
      { name: 'OSHA 30-Hour General Industry', by: 'OSHA Outreach Training Program', why: 'Safety knowledge you write into every procedure.' },
    ],
    firstSteps: ['Offer to rewrite one confusing SOP on your site', 'Build a portfolio of 3 to 5 sample procedures (generic, no site details)', 'Learn your site\'s document control process'],
  },
  {
    id: 'b-cx',
    title: 'Commissioning agent',
    emoji: '✅',
    from: 'r4',
    what: 'Tests new and upgraded systems before they go live to prove they work as designed, including failure scenarios.',
    day: ['Write and run functional test scripts', 'Witness factory and site acceptance tests', 'Run integrated systems tests (pull the plug, watch it recover)', 'Track and close issues'],
    skills: ['Reading design documents and sequences', 'Test planning', 'Electrical and mechanical breadth', 'Calm under pressure during live tests'],
    certs: [
      { name: 'Building Commissioning Professional (BCxP)', by: 'ASHRAE (the HVAC engineering society)', why: 'Recognized commissioning credential.' },
      { name: 'Certified Commissioning Authority (CxA)', by: 'AABC Commissioning Group', why: 'Another widely recognized commissioning credential.' },
    ],
    firstSteps: ['Join every commissioning activity on your site', 'Keep copies of test scripts (generic) to learn the format', 'Learn integrated systems testing from this simulator\'s drills'],
  },
  {
    id: 'b-reliability',
    title: 'Reliability engineer / maintenance planner',
    emoji: '📈',
    from: 'r3',
    what: 'Uses data to decide what maintenance to do, when, and why, so failures happen less often.',
    day: ['Build and tune PM schedules', 'Run failure analysis and RCAs', 'Manage spare parts strategy', 'Report reliability KPIs'],
    skills: ['CMMS data and reporting', 'Root-cause analysis methods', 'Condition monitoring (IR, vibration, oil analysis)', 'Spreadsheets or basic data analysis'],
    certs: [
      { name: 'CMRT, then CMRP', by: 'Society for Maintenance & Reliability Professionals', why: 'The core reliability credentials.' },
      { name: 'Vibration or thermography technician certificate', by: 'A recognized training body', why: 'Hands-on condition monitoring skills.' },
    ],
    firstSteps: ['Pull a year of work orders and find the top 3 repeat failures', 'Learn the CMMS reports', 'Propose one PM change backed by data'],
  },
  {
    id: 'b-ehs',
    title: 'Environmental, health & safety (EHS) specialist',
    emoji: '🦺',
    from: 'r3',
    what: 'Builds and audits the safety programs: LOTO, arc flash, confined space, hot work, training and incident investigation.',
    day: ['Audit LOTO and permits', 'Investigate incidents and near misses', 'Run safety training', 'Track regulations and site compliance'],
    skills: ['OSHA regulations', 'NFPA 70E programs', 'Incident investigation', 'Teaching and coaching'],
    certs: [
      { name: 'OSHA Outreach Trainer (500/501)', by: 'OSHA Training Institute Education Centers', why: 'Teach OSHA 10/30.' },
      { name: 'Associate Safety Professional (ASP), then Certified Safety Professional (CSP)', by: 'Board of Certified Safety Professionals', why: 'The main professional safety credentials.' },
    ],
    firstSteps: ['Join or lead your site safety committee', 'Volunteer to run a LOTO audit', 'Take OSHA 30 and a 70E program course'],
  },
  {
    id: 'b-trainer',
    title: 'Technical trainer / instructor',
    emoji: '🎓',
    from: 'r4',
    what: 'Teaches new techs the systems, procedures and safety habits, in the classroom and on the floor.',
    day: ['Build lessons, labs and quizzes', 'Run new-hire training', 'Qualify techs on procedures', 'Keep training records'],
    skills: ['Explaining complex things simply', 'Building hands-on exercises', 'Patience and coaching', 'Measuring whether training worked'],
    certs: [
      { name: 'OSHA Outreach Trainer (500/501)', by: 'OSHA Training Institute Education Centers', why: 'Teach recognized safety courses.' },
      { name: 'Train-the-trainer or adult education certificate', by: 'A community college or training association', why: 'How adults learn, and how to test that they did.' },
    ],
    firstSteps: ['Offer to teach one topic at a team meeting', 'Build a one-page job aid for a common task', 'Use simulators like this one to run practice drills with new techs'],
  },
  {
    id: 'b-pm',
    title: 'Project / construction manager',
    emoji: '🏗️',
    from: 'r5',
    what: 'Delivers upgrades and new builds on time and on budget, while protecting the live site.',
    day: ['Plan scope, schedule and budget', 'Coordinate contractors and vendors', 'Manage risk to live operations', 'Report progress to stakeholders'],
    skills: ['Scheduling and budgeting', 'Contracts and change orders', 'Construction safety', 'Operations knowledge to keep the site up during work'],
    certs: [
      { name: 'CAPM, then PMP', by: 'PMI (Project Management Institute)', why: 'The standard project management credentials.' },
      { name: 'OSHA 30-Hour Construction', by: 'OSHA Outreach Training Program', why: 'Construction-site safety.' },
    ],
    firstSteps: ['Help manage a small project on your site', 'Learn your site\'s capital planning process', 'Track a project\'s schedule and budget for practice'],
  },
  {
    id: 'b-energy',
    title: 'Energy & sustainability analyst',
    emoji: '🌱',
    from: 'r4',
    what: 'Finds ways to lower PUE, energy cost and water use without risking uptime.',
    day: ['Analyze PUE and energy data', 'Propose and verify efficiency projects', 'Report sustainability metrics', 'Work with controls on setpoint strategy'],
    skills: ['Energy data analysis', 'Free cooling and economizer strategy', 'Measurement and verification', 'Spreadsheets or data tools'],
    certs: [
      { name: 'Certified Energy Manager (CEM)', by: 'Association of Energy Engineers', why: 'The main energy management credential.' },
      { name: 'Building Energy Assessment Professional (BEAP)', by: 'ASHRAE (the HVAC engineering society)', why: 'Energy audit skills.' },
    ],
    firstSteps: ['Trend PUE for your site for a month and explain the swings', 'Find one safe efficiency idea and write it up', 'Use the Designs & PUE tab to learn where power goes'],
  },
  {
    id: 'b-software',
    title: 'Data center software / automation (toward software engineer)',
    emoji: '💻',
    from: 'r2',
    what: 'Builds the tools: monitoring dashboards, DCIM data, alarm analytics, scripts, and apps like this simulator.',
    day: ['Write scripts to pull and analyze BMS/EPMS data', 'Build dashboards and reports', 'Automate repetitive tasks', 'Work with IT and controls teams'],
    skills: ['Python', 'Data analysis and SQL', 'Web basics (HTML, CSS, JavaScript)', 'Facilities knowledge, which most programmers don\'t have'],
    certs: [
      { name: 'Python programming certificate', by: 'An online course provider or college', why: 'Proves the basics; pair it with real projects.' },
      { name: 'Computer science or data science degree', by: 'A college or university', why: 'Opens most software engineer roles.' },
      { name: 'Entry-level cloud certificate', by: 'A cloud provider\'s certification program', why: 'Many monitoring tools now run in the cloud.' },
    ],
    firstSteps: ['Automate one boring report with Python', 'Build a portfolio of facilities tools (like this one)', 'Learn SQL by querying exported alarm or trend data'],
  },
  {
    id: 'b-design',
    title: 'Design / facility engineer (degreed)',
    emoji: '📐',
    from: 'r4',
    what: 'Designs the electrical or mechanical systems of new data centers, bringing operations experience to the drawing board.',
    day: ['Design and review drawings', 'Run load and capacity calculations', 'Write specifications', 'Support construction and commissioning'],
    skills: ['Engineering math and code knowledge', 'Design software', 'Operations lessons learned (what breaks in the field)'],
    certs: [
      { name: 'Engineering degree, then the FE exam', by: 'A university, then NCEES', why: 'The first steps toward a professional engineer license.' },
      { name: 'Professional Engineer (PE) license', by: 'Your state engineering board (exam by NCEES)', why: 'Needed to seal designs.' },
    ],
    firstSteps: ['Look into engineering degree programs (many offer evening or online options)', 'Keep a "lessons from the field" list to bring to design reviews', 'Ask design engineers questions during projects'],
  },
  {
    id: 'b-field',
    title: 'Equipment field service engineer',
    emoji: '🧰',
    from: 'r3',
    what: 'Works for an equipment maker, servicing UPS, generators, switchgear or chillers at many customer sites.',
    day: ['Travel to sites for PMs, repairs and startups', 'Troubleshoot at component level', 'Write service reports', 'Train customer staff'],
    skills: ['Deep knowledge of one equipment line', 'Component-level troubleshooting', 'Customer communication', 'Comfort with travel and on-call'],
    certs: [
      { name: 'Factory training on the product line', by: 'The equipment maker', why: 'Usually provided after hiring.' },
      { name: 'NETA ETT or EPA 608 (depending on equipment)', by: 'InterNational Electrical Testing Association / U.S. EPA', why: 'Shows you have the base skills before you apply.' },
    ],
    firstSteps: ['Get to know the vendor techs who service your site', 'Learn one equipment line inside and out', 'Ask what their hiring path looks like'],
  },
];

export const branchesFrom = (rungId: string) => BRANCHES.filter((b) => b.from === rungId);
