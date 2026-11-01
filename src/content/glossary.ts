/** Glossary of terms used in the app, grouped by side of the house. */

export type GlossarySection = 'Electrical' | 'Mechanical' | 'Operations & safety';

export interface Term {
  term: string;
  section: GlossarySection;
  def: string;
}

export const GLOSSARY: Term[] = [
  // Electrical
  { term: 'ATS', section: 'Electrical', def: 'Automatic transfer switch. Moves load from the normal (utility) source to the emergency (generator) source and back.' },
  { term: 'STS', section: 'Electrical', def: 'Static transfer switch. Solid-state switch that moves single-corded loads between two sources in about 4 ms.' },
  { term: 'UPS', section: 'Electrical', def: 'Uninterruptible power supply. Rectifier, battery, and inverter that give the load clean power with zero break.' },
  { term: 'Double conversion', section: 'Electrical', def: 'UPS design where power always goes AC → DC → AC, so the load never sees utility disturbances.' },
  { term: 'Static bypass', section: 'Electrical', def: 'Automatic electronic path inside a UPS that feeds the load straight from the bypass source if the inverter faults or overloads.' },
  { term: 'Maintenance bypass', section: 'Electrical', def: 'Manual breakers that route power around a UPS so it can be fully isolated for work.' },
  { term: 'BESS', section: 'Electrical', def: 'Battery energy storage system. A large battery yard used for ride-through, bridging to generators, or peak shaving.' },
  { term: 'SOC', section: 'Electrical', def: 'State of charge. How full a battery is, from 0 to 100%.' },
  { term: 'Ride-through', section: 'Electrical', def: 'Carrying the load through a short disturbance or until backup sources take over.' },
  { term: 'Paralleling', section: 'Electrical', def: 'Connecting two sources to the same bus. Safe only when they are synchronized (same voltage, frequency, and phase).' },
  { term: 'Back-feed', section: 'Electrical', def: 'Power flowing backward into a circuit that is supposed to be dead. Deadly for people working on it.' },
  { term: 'Main-tie-main', section: 'Electrical', def: 'Two buses, each with a main breaker, joined by a normally open tie. Lets one source feed both buses during maintenance.' },
  { term: 'Kirk key', section: 'Electrical', def: 'Trapped-key interlock. A key that is trapped while a breaker is closed, enforcing safe operating sequences.' },
  { term: 'SKRU', section: 'Electrical', def: 'Solenoid key release unit. Holds an interlock key until an electrical condition is met (for example, UPS on static bypass).' },
  { term: 'PDU / RPP', section: 'Electrical', def: 'Power distribution unit (often with a transformer) / remote power panel (no transformer). Final distribution to racks.' },
  { term: 'Busway', section: 'Electrical', def: 'Overhead bus duct with plug-in tap boxes for flexible rack power.' },
  { term: 'Dual-corded', section: 'Electrical', def: 'IT equipment with two power supplies fed from A and B sources; survives losing either one.' },
  { term: 'Arc flash', section: 'Electrical', def: 'An explosive release of energy from an electrical fault through air. Causes severe burns and blast injuries.' },
  { term: 'Incident energy', section: 'Electrical', def: 'Heat energy (cal/cm²) at a working distance during an arc flash. Determines required PPE.' },
  { term: 'EPMS', section: 'Electrical', def: 'Electrical power monitoring system. Meters, alarms, and event logs for the electrical plant.' },
  { term: 'Load bank', section: 'Electrical', def: 'A portable resistive load used to test generators or UPS at real load without risking the IT load.' },
  { term: 'Wet stacking', section: 'Electrical', def: 'Unburned fuel building up in a diesel exhaust from running at light load.' },

  // Mechanical
  { term: 'Chiller', section: 'Mechanical', def: 'Refrigeration machine that makes chilled water using a compressor, condenser, expansion valve, and evaporator.' },
  { term: 'Head pressure', section: 'Mechanical', def: 'Refrigerant pressure on the condenser side. Rises when the condenser can\'t reject heat; too high trips the chiller.' },
  { term: 'Lift', section: 'Mechanical', def: 'Difference between condenser and evaporator pressure/temperature. More lift = more compressor work.' },
  { term: 'Approach temperature', section: 'Mechanical', def: 'How close a heat exchanger gets one fluid to another. For towers: leaving water minus wet bulb.' },
  { term: 'Delta-T', section: 'Mechanical', def: 'Temperature difference, e.g. chilled water return minus supply. Bigger delta-T moves more heat per gallon.' },
  { term: 'Wet bulb', section: 'Mechanical', def: 'Lowest temperature air can reach by evaporating water into it. Limits how cold a cooling tower can make water.' },
  { term: 'Dew point', section: 'Mechanical', def: 'Temperature at which moisture in air starts to condense. Used to control data hall humidity.' },
  { term: 'Economizer / free cooling', section: 'Mechanical', def: 'Using cold outdoor conditions to cool the building with chillers off or reduced.' },
  { term: 'CRAH', section: 'Mechanical', def: 'Computer room air handler. Fans and a chilled-water coil; no compressor.' },
  { term: 'CRAC', section: 'Mechanical', def: 'Computer room air conditioner. Self-contained DX unit with its own compressor.' },
  { term: 'CDU', section: 'Mechanical', def: 'Coolant distribution unit. Pumps and a heat exchanger feeding liquid coolant to chip cold plates.' },
  { term: 'TCS', section: 'Mechanical', def: 'Technology cooling system. The clean liquid loop between a CDU and the IT cold plates.' },
  { term: 'FWS', section: 'Mechanical', def: 'Facility water system. The building water loop on the other side of the CDU heat exchanger.' },
  { term: 'DOAS', section: 'Mechanical', def: 'Dedicated outdoor air system. Brings in, dries, and conditions fresh air; keeps the hall pressurized.' },
  { term: 'Energy recovery wheel', section: 'Mechanical', def: 'Rotating wheel in a DOAS that pre-conditions incoming air using exhaust air.' },
  { term: 'TES', section: 'Mechanical', def: 'Thermal energy storage. A chilled water tank that carries cooling while chillers restart.' },
  { term: 'Containment', section: 'Mechanical', def: 'Physical separation of hot and cold aisles so supply and exhaust air don\'t mix.' },
  { term: 'VFD', section: 'Mechanical', def: 'Variable frequency drive. Controls motor speed for pumps and fans. Stores energy in capacitors.' },
  { term: 'Differential pressure (DP)', section: 'Mechanical', def: 'Pressure difference between two points, used to control pumps and check filters and strainers.' },
  { term: 'Legionella', section: 'Mechanical', def: 'Bacteria that can grow in cooling towers and cause a serious pneumonia. Controlled by a water management plan.' },

  // Ops & safety
  { term: 'N, N+1, 2N', section: 'Operations & safety', def: 'Redundancy levels: exactly enough, one spare, or two complete independent systems.' },
  { term: 'Concurrently maintainable', section: 'Operations & safety', def: 'Any component can be taken out for planned maintenance without dropping the load.' },
  { term: 'Fault tolerant', section: 'Operations & safety', def: 'The plant survives any single unplanned failure automatically, even during maintenance.' },
  { term: 'PUE', section: 'Operations & safety', def: 'Power usage effectiveness = total facility power ÷ IT power. Lower is better; 1.0 is perfect.' },
  { term: 'MOP', section: 'Operations & safety', def: 'Method of procedure. Step-by-step script for a planned change.' },
  { term: 'SOP', section: 'Operations & safety', def: 'Standard operating procedure. How routine tasks are done.' },
  { term: 'EOP', section: 'Operations & safety', def: 'Emergency operating procedure. What to do when something fails.' },
  { term: 'MOC', section: 'Operations & safety', def: 'Management of change. The process that reviews, approves, and documents every change.' },
  { term: 'LOTO', section: 'Operations & safety', def: 'Lockout/tagout. Personal locks and tags that keep equipment from being energized during work.' },
  { term: 'EEWP', section: 'Operations & safety', def: 'Energized electrical work permit. The written plan and approvals required before work on live parts, when de-energizing truly isn\'t possible.' },
  { term: 'Restricted approach boundary', section: 'Operations & safety', def: 'The closest shock boundary to live parts. Only qualified people with a plan and shock protection may cross it.' },
  { term: 'Limited approach boundary', section: 'Operations & safety', def: 'Shock boundary that unqualified people may cross only with a qualified escort.' },
  { term: 'Fire watch', section: 'Operations & safety', def: 'A trained person watching for fire during hot work or a fire system impairment, and for at least 30 minutes after hot work.' },
  { term: 'Impairment', section: 'Operations & safety', def: 'Any time a fire protection system is out of service. Needs a permit, notifications and extra precautions.' },
  { term: 'Stop-work authority', section: 'Operations & safety', def: 'Everyone\'s right to stop a job they believe is unsafe, without blame.' },
  { term: 'ESWC', section: 'Operations & safety', def: 'Electrically safe work condition. Equipment isolated, locked out, tested dead, and grounded if needed.' },
  { term: 'AHJ', section: 'Operations & safety', def: 'Authority having jurisdiction, e.g. the fire marshal or building official.' },
  { term: 'Peer check', section: 'Operations & safety', def: 'A second qualified person confirms the right device and action before it is done.' },
  { term: 'Hold point', section: 'Operations & safety', def: 'A step in a MOP where work stops until someone confirms it is OK to continue.' },
  { term: 'Rounds', section: 'Operations & safety', def: 'Scheduled walk-throughs taking readings and checking equipment status.' },
  { term: 'RCA', section: 'Operations & safety', def: 'Root cause analysis. Finding why an incident really happened so it doesn\'t repeat.' },
];
