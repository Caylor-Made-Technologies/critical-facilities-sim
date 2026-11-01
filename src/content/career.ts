/**
 * Career track: interview practice, a generic career path, and the shift
 * handoff. Generic and public: no employer, site or vendor names.
 */

export type InterviewCat = 'Electrical' | 'Mechanical' | 'Safety' | 'Operations' | 'Behavioral';

export interface InterviewQ {
  id: string;
  cat: InterviewCat;
  q: string;
  /** Points a strong answer hits. */
  points: string[];
  tip: string;
}

export const INTERVIEW: InterviewQ[] = [
  // Electrical
  { id: 'iv-ups', cat: 'Electrical', q: 'Walk me through how a double-conversion UPS works.', points: ['Rectifier turns incoming AC to DC and charges the battery.', 'Inverter makes clean AC from DC all the time, so the load never sees input disturbances.', 'If input fails, the battery feeds the inverter with no break.', 'Static bypass catches the load if the inverter faults or overloads; maintenance bypass is manual for service.'], tip: 'Draw it if there is a whiteboard. Interviewers love a one-line sketch.' },
  { id: 'iv-redundancy', cat: 'Electrical', q: 'What is the difference between N+1 and 2N?', points: ['N is the capacity the load needs.', 'N+1 adds one spare module to a shared system: survives one module failure, but the system itself is a single path.', '2N is two complete, independent systems each able to carry everything: survives losing a whole side.', 'Give a number: 4 × 750 kW for 2,100 kW is N+1.'], tip: 'Mention concurrent maintainability: can you take something out for PM and still be redundant?' },
  { id: 'iv-ats', cat: 'Electrical', q: 'Utility power drops. What happens in the first 30 seconds?', points: ['UPS batteries carry critical load instantly.', 'ATS senses the loss, waits a short delay to ride through blips, then signals generators to start.', 'Generators reach speed and voltage in about 10 seconds; the ATS transfers.', 'UPS goes back to normal mode and recharges. Mechanical loads restart in sequence.', 'Operator: confirm each step on the EPMS, watch fuel, don\'t rush the retransfer.'], tip: 'Say what YOU would check, not just what the equipment does.' },
  { id: 'iv-kirk', cat: 'Electrical', q: 'What is a Kirk key interlock and why does it matter?', points: ['A trapped-key system: a key is only released when a breaker is in a safe position.', 'It forces the right switching order, e.g. you can\'t close the maintenance bypass until the UPS output is in a safe state.', 'Prevents paralleling unsynchronized sources or back-feeding.', 'It is not a lockout device. You still apply your own lock.'], tip: 'The last point shows safety maturity. Always add it.' },
  { id: 'iv-arc', cat: 'Electrical', q: 'What is on an arc flash label and how do you use it?', points: ['Nominal voltage, arc flash boundary, incident energy at a working distance (or PPE category), and shock boundaries.', 'Use it to pick PPE and set boundaries before opening anything.', 'No label, unreadable, or gear changed since the study: stop and ask.'], tip: 'Mention live-dead-live testing to show you think past the label.' },
  // Mechanical
  { id: 'iv-chiller', cat: 'Mechanical', q: 'How does a chiller make cold water?', points: ['Refrigeration cycle: evaporator absorbs heat from the chilled water, compressor raises pressure and temperature, condenser rejects heat to condenser water or air, expansion valve drops pressure.', 'Cooling towers reject the condenser heat outdoors.', 'Watch approach temperatures and head pressure: rising approach means fouled tubes.'], tip: 'Connect it to uptime: what alarms would you watch for?' },
  { id: 'iv-free', cat: 'Mechanical', q: 'What is free cooling (economizer) and when can you use it?', points: ['Using cold outdoor conditions to make chilled water through a heat exchanger instead of running compressors.', 'Depends on wet bulb: low wet bulb gives cold tower water.', 'Partial mode mixes both. Saves a lot of energy and lowers PUE.'], tip: 'Bonus: mention you\'d check changeover setpoints in the BMS.' },
  { id: 'iv-gpu', cat: 'Mechanical', q: 'How is cooling a high-density GPU rack different?', points: ['Liquid cooling: cold plates on chips fed by a CDU on a technology cooling loop.', 'Much less thermal mass: loss of CDU flow causes throttling in seconds and trips in minutes.', 'Leak detection, filtration and flow monitoring become critical rounds items.'], tip: 'Showing you know the time scales (seconds, not minutes) stands out.' },
  { id: 'iv-delta', cat: 'Mechanical', q: 'Chilled water supply is fine but return is low. What could it mean?', points: ['Low delta-T: too much flow for the load, bypass valves open, or coils not loaded.', 'Low delta-T wastes pump energy and can make you run extra chillers.', 'Check valve positions, DP setpoint, and coil performance.'], tip: 'Talk through how you would troubleshoot, step by step.' },
  // Safety
  { id: 'iv-loto', cat: 'Safety', q: 'Explain your lockout/tagout process.', points: ['Prepare and identify all energy sources.', 'Notify affected people, shut down normally, isolate each source.', 'Apply your own lock and tag, release stored energy.', 'Verify: try to start, test for absence of voltage live-dead-live.', 'Remove: tools clear, people clear, each person removes only their own lock.'], tip: 'Mention UPS batteries and generators in AUTO as data-center-specific traps.' },
  { id: 'iv-stop', cat: 'Safety', q: 'Tell me about a time you stopped a job for safety.', points: ['Situation: what you saw that didn\'t match.', 'Action: stopped, made it safe, raised it with the lead.', 'Result: what changed, and that nobody was blamed.', 'Learning: how you brief jobs differently now.'], tip: 'Use STAR (situation, task, action, result). If you have no data center story, use a mill or plant one.' },
  { id: 'iv-energized', cat: 'Safety', q: 'When is energized work acceptable?', points: ['Only when de-energizing creates a greater hazard or is infeasible.', 'Needs an energized work permit, risk assessment, PPE and boundaries.', 'Schedule pressure or "the customer doesn\'t want downtime" is never a reason: redundancy exists so you can de-energize.'], tip: 'A firm, calm answer here is what hiring managers want to hear.' },
  // Operations
  { id: 'iv-mop', cat: 'Operations', q: 'What makes a good MOP?', points: ['Scope, risk rating, approvals and notifications.', 'Pre-checks and hold points, exact step order with device tags.', 'Expected indications after each step, and a back-out plan.', 'Peer check on critical steps, and a record of what was done.'], tip: 'Mention you read the whole MOP before starting and stop on any mismatch.' },
  { id: 'iv-alarm', cat: 'Operations', q: 'Three alarms come in at once. How do you prioritize?', points: ['People first: any life-safety alarm (fire, refrigerant, injury) wins.', 'Then the critical load: anything that drops or threatens IT power or cooling.', 'Look for the first alarm in time: it usually points closest to the root cause.', 'Communicate early to the lead and the customer per the escalation plan.'], tip: 'Calm, ordered thinking is the whole point of this question.' },
  { id: 'iv-rounds', cat: 'Operations', q: 'What do you look for on rounds?', points: ['Readings against normal ranges, and trends, not just alarms.', 'Leaks, smells, noise, vibration, heat.', 'Equipment in the right mode (AUTO), breakers in the expected position, clear access.', 'Log it, and report anything off right away.'], tip: 'Give one example of catching something early.' },
  { id: 'iv-pue', cat: 'Operations', q: 'What is PUE and how could you improve it?', points: ['Total facility power divided by IT power; 1.0 is perfect.', 'Raise supply temps within ASHRAE ranges, use more free cooling, contain hot/cold aisles, fix low delta-T, right-size running equipment.'], tip: 'Never trade reliability for PUE. Say that out loud.' },
  { id: 'iv-handoff', cat: 'Operations', q: 'What goes into a good shift handoff?', points: ['Plant status: anything not normal, on bypass, out of service or locked out.', 'Active alarms and open work, with who owns them.', 'Upcoming MOPs and vendor visits.', 'Anything weird you noticed, even if it cleared.', 'Face to face when possible, and written down.'], tip: 'The Career tab has a handoff builder that pulls the live plant. Try it.' },
  // Behavioral
  { id: 'iv-why', cat: 'Behavioral', q: 'Why do you want to work in critical facilities?', points: ['Interest in the equipment and the stakes: keeping the load up 24/7.', 'Your hands-on background (plant, mill, maintenance) and how it transfers.', 'What you are doing to grow: certifications, self-study, simulators like this one.'], tip: 'Be specific and honest. Mention what you have already learned on your own.' },
  { id: 'iv-mistake', cat: 'Behavioral', q: 'Tell me about a mistake you made at work.', points: ['Own it plainly.', 'What you did right after: made it safe, reported it fast.', 'What you changed so it can\'t happen again.'], tip: 'Reporting fast is the key value. Hiding mistakes is the red flag they test for.' },
  { id: 'iv-pressure', cat: 'Behavioral', q: 'How do you handle pressure during an outage?', points: ['Slow is smooth: follow the EOP, don\'t freelance.', 'Communicate status on a schedule.', 'Use peer checks on every switching step.', 'Debrief afterwards.'], tip: 'Pair it with a short real example.' },
];

export const INTERVIEW_CATS: InterviewCat[] = ['Electrical', 'Mechanical', 'Safety', 'Operations', 'Behavioral'];

export interface CareerStep {
  role: string;
  years: string;
  focus: string[];
  learn: string[];
}

export const CAREER_PATH: CareerStep[] = [
  { role: 'Facilities / maintenance technician', years: '0–2 yrs', focus: ['Rounds and readings', 'Basic PM (filters, belts, lubrication)', 'Following procedures and LOTO'], learn: ['OSHA 10 or 30', 'CPR / AED / first aid', 'Basic electrical theory'] },
  { role: 'Critical facilities technician', years: '1–4 yrs', focus: ['Switching under a MOP', 'UPS, generator and ATS operation', 'Chiller plant and BMS alarms'], learn: ['NFPA 70E electrical safety training', 'EPA Section 608 (refrigerant)', 'Reading one-lines and controls drawings'] },
  { role: 'Building / critical facilities engineer', years: '3–7 yrs', focus: ['Writing and reviewing MOPs', 'Troubleshooting and root cause', 'Leading vendors and contractors'], learn: ['State electrical license (where it applies)', 'Advanced controls and power quality', 'Data center operations courses'] },
  { role: 'Lead / shift supervisor', years: '5–10 yrs', focus: ['Running a shift and emergencies', 'Change management and approvals', 'Training new techs'], learn: ['Incident command basics', 'Risk assessment', 'Coaching and communication'] },
  { role: 'Chief engineer / facility manager', years: '8+ yrs', focus: ['Budgets, staffing and lifecycle planning', 'Customer and audit relationships', 'Reliability programs'], learn: ['Asset management', 'Project management', 'Reliability engineering'] },
];
