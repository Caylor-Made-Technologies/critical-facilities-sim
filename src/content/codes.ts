/**
 * Codes & standards tab. Plain-language summaries for learning, not legal
 * advice. The current edition and the AHJ decide what applies.
 */
import type { Article } from './types';

const head = ['Standard', 'Covers', 'What it means on shift'];

export const CODES: Article[] = [
  {
    id: 'who',
    group: 'Start here',
    title: 'Who writes the rules',
    intro: 'Laws, codes, standards, and guidelines aren\'t the same thing. Here\'s who does what.',
    blocks: [
      { table: {
        head: ['Body', 'What they do'],
        rows: [
          ['OSHA', 'U.S. federal workplace safety law (29 CFR 1910). Legally enforceable.'],
          ['NFPA', 'Writes consensus codes (NFPA 70 the NEC, 70E, 70B, 72, 110, 855...). They become law when a jurisdiction adopts them, and OSHA points to 70E as the way to meet its electrical rules.'],
          ['EPA', 'Environmental rules: refrigerants, fuel storage, engine emissions.'],
          ['ASHRAE', 'Thermal guidelines for data centers, ventilation and energy standards, Legionella risk management.'],
          ['IEEE', 'Battery maintenance practices and electrical engineering standards.'],
          ['AHJ', 'The authority having jurisdiction, e.g. the fire marshal or building official. Their interpretation decides.'],
        ],
      } },
      { callout: 'Standards are updated every few years. Always check which edition your site and AHJ use.', tone: 'warn', title: 'Editions matter' },
    ],
  },
  {
    id: 'electrical',
    group: 'Electrical',
    title: 'Electrical codes & standards',
    intro: 'How electrical systems are installed, maintained, and worked on safely.',
    blocks: [
      { table: {
        head,
        rows: [
          ['OSHA 29 CFR 1910.147', 'Control of hazardous energy (LOTOTO)', 'Written procedures, personal locks, training, periodic inspections of the program.'],
          ['OSHA 1910.331–.335', 'Electrical safe work practices', 'Only qualified people work on or near exposed energized parts.'],
          ['NFPA 70E', 'Electrical safety in the workplace', 'ESWC, risk assessment, energized work permits, arc flash PPE, approach boundaries.'],
          ['NFPA 70 (NEC)', 'How electrical systems are installed', 'Working clearances, labeling, Article 645 for IT rooms, Articles 700/701/702 for emergency and standby systems.'],
          ['NFPA 70B', 'Maintenance of electrical equipment', 'An electrical maintenance program with intervals based on equipment condition.'],
          ['NFPA 110', 'Emergency & standby power systems', 'Weekly generator inspections, monthly exercise under load, periodic extended load tests, records.'],
          ['NFPA 111', 'Stored electrical energy systems', 'UPS/battery systems used as emergency power.'],
          ['IEEE 1188 / 450', 'VRLA / flooded battery maintenance', 'What to measure on batteries and how often.'],
        ],
      } },
    ],
  },
  {
    id: 'mechanical',
    group: 'Mechanical',
    title: 'Mechanical codes & standards',
    intro: 'Cooling, ventilation, water, and refrigerant.',
    blocks: [
      { table: {
        head,
        rows: [
          ['ASHRAE TC 9.9 thermal guidelines', 'Data center thermal envelope', 'Inlet temperature 64.4–80.6 °F (18–27 °C) recommended; dew point and humidity limits.'],
          ['ASHRAE 62.1', 'Ventilation', 'Minimum outdoor air for occupied spaces; drives DOAS sizing.'],
          ['ASHRAE 90.4', 'Data center energy', 'Efficiency requirements for mechanical and electrical systems.'],
          ['ASHRAE 188', 'Legionella risk management', 'A written water management program for cooling towers.'],
          ['ASHRAE 15', 'Refrigeration system safety', 'Machinery room ventilation, refrigerant detectors, and alarms.'],
          ['EPA Clean Air Act §608', 'Refrigerant handling', 'Only certified technicians handle refrigerant; no venting; leak repair rules.'],
          ['OSHA 1910.146', 'Permit-required confined spaces', 'Tanks, pits, and vaults need a permit, testing, and an attendant.'],
        ],
      } },
    ],
  },
  {
    id: 'fire',
    group: 'Fire & life safety',
    title: 'Fire & life safety standards',
    intro: 'Detection, suppression, and protection of IT and energy storage spaces.',
    blocks: [
      { table: {
        head,
        rows: [
          ['NFPA 72', 'Fire alarm and signaling', 'Detection, testing, and impairment handling.'],
          ['NFPA 13 / 25', 'Sprinkler installation / inspection, testing, maintenance', 'Pre-action valves and supervisory air checked on schedule.'],
          ['NFPA 75 / 76', 'Fire protection of IT and telecom facilities', 'Construction, suppression, and EPO guidance for IT spaces.'],
          ['NFPA 2001', 'Clean agent systems', 'Room integrity, safety before discharge, cylinder checks.'],
          ['NFPA 855', 'Energy storage systems', 'BESS siting, fire protection, ventilation, emergency planning.'],
        ],
      } },
    ],
  },
  {
    id: 'environmental',
    group: 'Environmental',
    title: 'Environmental rules',
    intro: 'Fuel, emissions, and water.',
    blocks: [
      { table: {
        head,
        rows: [
          ['EPA 40 CFR 112 (SPCC)', 'Oil spill prevention', 'Spill plan, secondary containment, and inspections for fuel storage above threshold volumes.'],
          ['EPA engine rules (NSPS/NESHAP)', 'Emergency engine emissions', 'Limits on non-emergency run hours for testing and maintenance; keep run-hour logs.'],
          ['Local water / discharge permits', 'Cooling tower blowdown', 'What can go down the drain and how it is tested.'],
        ],
      } },
    ],
  },
  {
    id: 'ratings',
    group: 'Design ratings',
    title: 'Tiers & design ratings',
    intro: 'Rating systems describe how much redundancy and maintainability a design has.',
    blocks: [
      { table: {
        head: ['Tier-style level', 'Plain meaning', 'Typical design'],
        rows: [
          ['I: basic', 'Single path, no spares. Maintenance means downtime.', 'N'],
          ['II: redundant components', 'Spare components, still one path.', 'N+1'],
          ['III: concurrently maintainable', 'Any component can be maintained without dropping load. Multiple paths, one active is OK.', '2N paths or N+1 with redundant distribution'],
          ['IV: fault tolerant', 'Survives any single unplanned failure automatically. While equipment is out for maintenance, that protection can be reduced.', '2N / 2N+1, compartmentalized'],
        ],
      } },
      { callout: 'Tier certifications (e.g. from the Uptime Institute) and TIA-942 ratings are awarded by those organizations after review. This simulator only explains the ideas and does not rate or certify anything.', tone: 'warn', title: 'No certification claims' },
    ],
  },
];
