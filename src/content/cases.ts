/**
 * Case studies: composite, fictional incidents built from failure patterns
 * that are common across the industry. No real site, company or person.
 * Each one walks a root cause analysis the way a good post-incident review
 * does: timeline, contributing factors, 5 whys, fixes, and questions.
 */
export type CaseArea = 'electrical' | 'mechanical' | 'operations';

export interface CaseStudy {
  id: string;
  title: string;
  area: CaseArea;
  summary: string;
  setting: string;
  impact: string;
  timeline: { t: string; what: string }[];
  factors: string[];
  whys: string[];
  fixes: string[];
  questions: { q: string; a: string }[];
  /** A procedure or drill id to practice the lesson. */
  practice?: string;
}

export const CASES: CaseStudy[] = [
  {
    id: 'case-bypass',
    title: 'The bypass that wasn\'t closed',
    area: 'electrical',
    summary: 'A routine UPS maintenance window drops a whole data hall in under a second.',
    setting: 'Single-path (N+1) UPS system. Night shift, planned maintenance window, two technicians and a vendor.',
    impact: 'Every rack on the UPS lost power for about 4 minutes. Several customer systems took hours to recover.',
    timeline: [
      { t: '01:00', what: 'Window opens. The MOP is printed from a shared folder.' },
      { t: '01:12', what: 'UPS transferred to static bypass. Key removed from the key release unit.' },
      { t: '01:15', what: 'A technician opens the breaker labeled "UPS output". The hall goes dark.' },
      { t: '01:16', what: 'Investigation: the switchgear had been relabeled during a retrofit. The printed MOP used the old labels, and the maintenance bypass had never been closed.' },
      { t: '01:19', what: 'Maintenance bypass closed, load restored. Customers notified.' },
    ],
    factors: [
      'MOP printed from an old copy; it did not match the relabeled switchgear.',
      'No step to verify the maintenance bypass was closed and carrying load before opening the output.',
      'No second person reading the step and checking the label (no peer check).',
      'Time pressure: the window had started late.',
      'A retrofit changed the field labels without updating every document that used them (change management gap).',
    ],
    whys: [
      'Why did the hall go dark? The UPS output was opened while the load had no other path.',
      'Why had it no other path? The maintenance bypass breaker had never been closed.',
      'Why was it not closed? The printed step pointed to a breaker by its old label, and the crew believed it was already done.',
      'Why was the label old? The retrofit relabeled the gear but the MOP library was not updated.',
      'Why was it not updated? The change process listed drawings but not MOPs as documents to revise.',
    ],
    fixes: [
      'Every change now lists affected MOPs, EOPs and round sheets, not just drawings.',
      'MOPs are only printed from the controlled library on the day of work.',
      'A "verify" step before every open: confirm the new path is carrying load (meter reading, not assumption).',
      'Peer check (one reads, one does, both verify) for every switching step on critical power.',
    ],
    questions: [
      {
        q: 'The technician followed the printed MOP exactly. Is this "human error"?',
        a: 'Calling it human error stops the learning. The person did what the system told them. The real causes were an uncontrolled document, a missing verify step, and a change process that did not reach the MOP library. Fix the system and the next person won\'t fall into the same trap.',
      },
      {
        q: 'Which single control would most likely have stopped this?',
        a: 'A verify step that requires seeing load on the maintenance bypass before opening the output. It catches wrong labels, skipped steps and wrong assumptions all at once, because it checks the result, not the action.',
      },
      {
        q: 'Would this outage have happened on a 2N design?',
        a: 'Dual-corded racks would have stayed up on side B; only single-corded load would drop. 2N reduces the consequence of mistakes. It does not fix the process that let the mistake happen.',
      },
    ],
    practice: 'mop-ups-bypass',
  },
  {
    id: 'case-gen-off',
    title: 'The generator left in OFF',
    area: 'electrical',
    summary: 'A monthly test goes perfectly. Two weeks later, a utility outage finds one generator still switched off.',
    setting: '2N plant with three generators per side. Utility outage during a summer storm.',
    impact: 'Side A ran short of one generator. No load dropped because side B was healthy, but the site ran at N on side A for 40 minutes during a storm.',
    timeline: [
      { t: 'Day 1', what: 'Monthly test runs on GEN-A2. A technician switches the controller to OFF to reset an alarm, then gets called away.' },
      { t: 'Day 1–14', what: 'Daily rounds note "generator yard normal". The round sheet asks about fuel and leaks, not controller mode.' },
      { t: 'Day 15, 16:40', what: 'Utility A lost. GEN-A1 and GEN-A3 start; GEN-A2 does not.' },
      { t: '16:41', what: 'Side A carried by two generators. Alarm for GEN-A2 "not in auto" seen for the first time in the control room.' },
      { t: '17:20', what: 'Technician puts GEN-A2 in AUTO; it starts and joins the bus.' },
    ],
    factors: [
      'The test procedure had no final step to verify AUTO.',
      'The "not in auto" alarm was a low-priority alarm, routed to a list nobody checked.',
      'Round sheet did not include controller mode.',
      'Interruption mid-task, with no handoff.',
    ],
    whys: [
      'Why did GEN-A2 not start? Its controller was in OFF.',
      'Why was it in OFF? It was left there after the monthly test.',
      'Why was that not caught at the end of the test? The procedure had no "verify AUTO" close-out step.',
      'Why not caught for two weeks? Rounds did not check mode, and the alarm was low priority.',
      'Why was the alarm low priority? Alarm priorities had never been reviewed for "loss of redundancy" conditions.',
    ],
    fixes: [
      'Every test procedure ends with "verify AUTO" and a second-person sign-off.',
      'Controller mode added to the round sheet for every generator.',
      '"Not in auto" raised to a high-priority alarm.',
      'Rule: if you are pulled away mid-task, hand off out loud or put the equipment back to normal first.',
    ],
    questions: [
      {
        q: 'Nothing dropped. Should this still be investigated like an outage?',
        a: 'Yes. A near miss has the same causes as an outage, just a luckier outcome. Investigating near misses is the cheapest way to prevent the real thing.',
      },
      {
        q: 'Why do alarms for "loss of redundancy" matter as much as alarms for "loss of load"?',
        a: 'Because loss of redundancy is invisible until the next failure. The plant looks fine, but it is one failure away from an outage. Those conditions need attention before the next event, not during it.',
      },
    ],
    practice: 'mop-gen-test',
  },
  {
    id: 'case-fuel',
    title: 'Fuel that existed only on paper',
    area: 'operations',
    summary: 'A long outage. The bulk tank gauge says plenty of fuel. The day tanks run dry anyway.',
    setting: 'Regional storm, utility out for 30 hours. Generators healthy.',
    impact: 'One side lost generator power after 9 hours; dual-corded load rode on the other side. Fuel delivery took 6 more hours.',
    timeline: [
      { t: 'Hour 0', what: 'Utility lost. All generators start and carry the plant.' },
      { t: 'Hour 4', what: 'Bulk tank gauge reads 70%. Team relaxes.' },
      { t: 'Hour 8', what: 'Day tank low-level alarm on side A. Transfer pump shows running.' },
      { t: 'Hour 9', what: 'Side A generators shut down on empty day tanks.' },
      { t: 'Hour 9.5', what: 'Stick reading: the bulk tank is nearly empty. The gauge float was stuck.' },
      { t: 'Hour 15', what: 'Emergency fuel delivery arrives. Side A restarted.' },
    ],
    factors: [
      'Bulk tank gauge never cross-checked with a manual stick reading.',
      'Transfer pump "running" status came from the motor starter, not from flow.',
      'No measured burn rate to compare against the gauge.',
      'Fuel was ordered late because the gauge looked fine.',
    ],
    whys: [
      'Why did side A stop? Its day tanks ran dry.',
      'Why did they run dry? The bulk tank had far less fuel than the gauge showed.',
      'Why was the gauge wrong? A stuck float, not found because it was never cross-checked.',
      'Why not found during the event? Nobody compared the gauge to the expected burn rate.',
      'Why was there no burn-rate check? The long-outage plan had no fuel tracking step.',
    ],
    fixes: [
      'Monthly stick readings logged next to the gauge reading.',
      'Hourly fuel tracking during outages: measured level vs. expected burn.',
      'Fuel ordered at a fixed trigger (e.g. 24 hours of runtime left), not by feel.',
      'Flow proving on transfer pumps, not just motor status.',
    ],
    questions: [
      {
        q: 'Every instrument agreed nothing was wrong. How do you protect yourself from a lying instrument?',
        a: 'Cross-check with an independent measurement (a stick, a sight glass, a calculation). If two ways of knowing disagree, trust neither until you find out why.',
      },
      {
        q: 'When should fuel be ordered in a long outage?',
        a: 'At a fixed trigger based on runtime remaining and delivery lead time, decided before the storm. In regional events, suppliers are swamped, so the trigger should be early.',
      },
    ],
    practice: 'drill-fuel',
  },
  {
    id: 'case-heatwave',
    title: 'The heat wave and the dirty tubes',
    area: 'mechanical',
    summary: 'Months of slowly rising condenser approach end with chillers tripping on the hottest afternoon of the year.',
    setting: 'Water-cooled chiller plant with storage tank and one air-cooled backup chiller. Heat wave, 105 °F afternoons.',
    impact: 'Two chillers tripped on high head pressure. The storage tank emptied. GPU rows throttled for 25 minutes; no hardware lost.',
    timeline: [
      { t: 'Spring', what: 'Condenser approach on CH-01 and CH-02 creeps from 2 °F to 6 °F. Tube cleaning deferred to save budget.' },
      { t: 'Day 1, 14:00', what: '105 °F outside. Towers at full fan speed; condenser water 104 °F and rising.' },
      { t: '14:35', what: 'CH-01 trips on high head pressure, then CH-02. Storage tank starts discharging.' },
      { t: '14:37', what: 'BMS starts CH-03 and the air-cooled chiller. Both take about two minutes.' },
      { t: '14:50', what: 'Tank nearly empty; chilled water warming. GPU rows begin to throttle.' },
      { t: '15:15', what: 'CH-01 reset after head pressure drops; plant recovers.' },
    ],
    factors: [
      'Deferred condenser tube cleaning; the approach trend was logged but not acted on.',
      'No hot-weather readiness check before summer (tower fill, fans, strainers).',
      'Both lead chillers shared the same fouling, a common-mode failure.',
      'Storage tank sized for one chiller start, not two trips back to back.',
    ],
    whys: [
      'Why did GPUs throttle? Chilled water warmed after the storage tank ran out.',
      'Why did the tank run out? Two chillers tripped and the replacements took time to load.',
      'Why did both trip? High head pressure from hot condenser water and fouled tubes.',
      'Why were the tubes fouled? Cleaning was deferred.',
      'Why was it deferred? The rising approach was seen as a trend, not as a risk, so it lost the budget argument.',
    ],
    fixes: [
      'Approach temperature has an action limit that triggers cleaning automatically.',
      'Hot-weather readiness checklist every spring.',
      'On heat-wave days, start the backup chiller early so it is already loaded.',
      'Risk language for deferrals: "deferring this means X on a 105 °F day".',
    ],
    questions: [
      {
        q: 'The trend was logged for months. Why didn\'t it lead to action?',
        a: 'Trends without action limits are just history. A number that slowly gets worse rarely wins a budget fight unless someone translates it into a consequence and a date. Set limits that trigger work, and explain deferrals in terms of risk.',
      },
      {
        q: 'Why is "both chillers had the same problem" especially dangerous?',
        a: 'It is a common-mode failure: redundancy only protects you from independent failures. If both units share a cause (same fouling, same water, same software), they can fail together and the spare is no spare.',
      },
    ],
    practice: 'drill-towers',
  },
  {
    id: 'case-one-cord',
    title: 'Dual-corded, single-fed',
    area: 'operations',
    summary: 'Planned work on side A drops racks that everyone believed were safe on side B.',
    setting: '2N electrical plant. Planned maintenance on UPS A with side B confirmed healthy.',
    impact: 'Eleven "dual-corded" racks lost power when side A was isolated.',
    timeline: [
      { t: 'Weeks before', what: 'A customer re-cabled a row. Both cords of eleven racks ended up on side A power strips.' },
      { t: '09:00', what: 'MOP for UPS A maintenance approved. Risk assessment: "all critical load dual-corded".' },
      { t: '09:40', what: 'Side A isolated per the MOP.' },
      { t: '09:40', what: 'Eleven racks drop. The rest of the hall is fine.' },
      { t: '09:45', what: 'Walkdown finds both cords of the dropped racks on A-side strips.' },
    ],
    factors: [
      'No cord audit before work on one side.',
      'Customer cabling changes were not reported to facilities.',
      'Risk assessment relied on the design ("dual-corded") instead of a check of the actual installation.',
      'Monitoring showed per-strip load, but nobody compared A and B balance per rack.',
    ],
    whys: [
      'Why did the racks drop? Both of their cords were fed from side A.',
      'Why were both on A? A customer re-cabling put them there.',
      'Why was it not known? No process reported customer cabling changes, and no audit was done.',
      'Why did the MOP not catch it? The risk assessment assumed the design, not the field condition.',
      'Why was the assumption accepted? There was no requirement to verify cord feeds before single-side work.',
    ],
    fixes: [
      'Before any single-side work: verify every rack draws from both sides (A/B load balance per rack).',
      'Customer cabling changes go through a simple notification process.',
      'Rounds include a spot check of cord labels and A/B balance.',
    ],
    questions: [
      {
        q: 'What is the difference between "designed redundant" and "redundant"?',
        a: 'Design is what the drawings say. Redundant is what is actually installed and working today. Every planned change should check the real condition, because the field drifts from the design over time.',
      },
      {
        q: 'Facilities did nothing wrong in the MOP itself. Where does responsibility sit?',
        a: 'Shared. Customers change their equipment; facilities depend on it being correct. Good sites make the boundary explicit: who reports changes, who verifies before work, and what the customer must do to get redundancy.',
      },
    ],
    practice: 'mop-ups-bypass',
  },
  {
    id: 'case-alarm-fatigue',
    title: 'The alarm everyone learned to ignore',
    area: 'mechanical',
    summary: 'A water leak alarm under the floor had gone off falsely for months. One night it was real.',
    setting: 'Raised-floor data hall with leak detection cable near the air handlers.',
    impact: 'Water reached a power distribution unit\'s base. The PDU was shut down for drying; dual-corded load rode on the other side.',
    timeline: [
      { t: 'Months before', what: 'Leak cable near CRAH-104 alarms several times a week, always false (condensation on a cold pipe).' },
      { t: 'Weeks before', what: 'The alarm is "shelved" in the BMS to stop the noise.' },
      { t: '02:10', what: 'A condensate pump in CRAH-104 fails. Water starts pooling under the floor.' },
      { t: '05:30', what: 'Round finds a wet tile near CRAH-104 and water at a PDU base.' },
      { t: '05:45', what: 'PDU isolated, water removed, pump replaced.' },
    ],
    factors: [
      'Nuisance alarm never fixed at the source (pipe insulation).',
      'Alarm shelved with no expiry and no review.',
      'No compensating check (extra rounds) while the alarm was shelved.',
    ],
    whys: [
      'Why did water reach the PDU? A leak ran for three hours undetected.',
      'Why undetected? The leak alarm had been shelved.',
      'Why shelved? It had been false for months and was considered noise.',
      'Why false? Condensation on an uninsulated pipe, never repaired.',
      'Why never repaired? Nuisance alarms had no owner or due date.',
    ],
    fixes: [
      'Every nuisance alarm gets an owner and a fix date.',
      'Shelving requires approval, an expiry time and a compensating check.',
      'Monthly review of shelved and frequently repeating alarms.',
    ],
    questions: [
      {
        q: 'Shelving the alarm stopped real noise that was distracting the team. Was it wrong?',
        a: 'Shelving can be reasonable, but only with an expiry, an owner fixing the cause, and a compensating check. Without those, it quietly turns a detection system off.',
      },
      {
        q: 'How does alarm fatigue connect to the fire drill?',
        a: 'Same mechanism: false alarms train people to respond slowly or not at all. Fixing nuisance sources is safety work, not housekeeping.',
      },
    ],
    practice: 'rounds-hall',
  },
];
