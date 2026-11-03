/**
 * Safety Center practice tools: golden rules, approach-boundary explorer,
 * LOTOTO sequencing drills, hazard hunts, emergency cards, and the pre-task
 * brief. Plain data plus small pure functions so they can be unit tested.
 *
 * Educational only. Real boundaries come from the equipment's arc flash
 * label and your site's electrical safety program.
 */

// ---------------------------------------------------------------------------
// Golden rules
// ---------------------------------------------------------------------------
export interface GoldenRule {
  rule: string;
  why: string;
  icon: 'lock' | 'shield' | 'bolt' | 'list' | 'warning' | 'eye' | 'stop' | 'people' | 'flame' | 'chat';
}

export const GOLDEN_RULES: GoldenRule[] = [
  { icon: 'stop', rule: 'Anyone can stop the job.', why: 'Stop-work authority belongs to everyone. A good-faith stop is never punished.' },
  { icon: 'lock', rule: 'Your lock, your life.', why: 'LOTOTO: lock out, tag out, try out, on every energy source you work behind.' },
  { icon: 'bolt', rule: 'Try it, rate it, test it.', why: 'Try out after you lock out. Check your meter\'s CAT and voltage rating. Then live-dead-live. Assume it is energized until you prove it isn\'t.' },
  { icon: 'shield', rule: 'Read the label, wear the PPE.', why: 'The arc flash label sets the boundary and the gear. No label means no work.' },
  { icon: 'list', rule: 'Follow the procedure, step by step.', why: 'Read it, do it, check it off. Never work from memory on critical gear.' },
  { icon: 'eye', rule: 'Verify the device.', why: 'Check the tag with a second person before you operate. Wrong-device errors drop sites.' },
  { icon: 'warning', rule: 'Never defeat a safety.', why: 'Interlocks, guards and alarms exist because someone got hurt without them.' },
  { icon: 'flame', rule: 'Permit the hazardous jobs.', why: 'Energized work, hot work, confined spaces and fire impairments need a written permit.' },
  { icon: 'people', rule: 'Don\'t become the second victim.', why: 'Make the scene safe before you help. Call for help first.' },
  { icon: 'chat', rule: 'Speak up about near misses.', why: 'A near miss is a free lesson. Reporting it fixes the system before someone is hurt.' },
];

// ---------------------------------------------------------------------------
// Approach-boundary explorer (480 V example)
// ---------------------------------------------------------------------------
/** Example 480 V values for an exposed fixed circuit part (in feet). */
export const SHOCK_BOUNDARIES = { limitedFt: 3.5, restrictedFt: 1 } as const;

export interface LabelExample {
  id: string;
  label: string;
  /** Incident energy at working distance, cal/cm². Made-up example. */
  cal: number;
  /** Arc flash boundary, feet. Made-up example. */
  afbFt: number;
}

export const LABEL_EXAMPLES: LabelExample[] = [
  { id: 'low', label: 'Panelboard', cal: 1.8, afbFt: 2.5 },
  { id: 'med', label: 'Switchboard feeder', cal: 8, afbFt: 8 },
  { id: 'high', label: 'Main switchboard', cal: 25, afbFt: 18 },
  { id: 'extreme', label: 'Service entrance', cal: 48, afbFt: 30 },
];

export type Who = 'unqualified' | 'escorted' | 'qualified';

export interface BoundaryVerdict {
  zone: 'outside' | 'arc' | 'limited' | 'restricted';
  ok: boolean;
  tone: 'ok' | 'warn' | 'alarm';
  headline: string;
  detail: string[];
}

/**
 * Who may stand where, with exposed energized parts (covers off), at the
 * given distance from the part. Simplified teaching version of the
 * NFPA 70E approach boundaries.
 */
export function boundaryVerdict(distFt: number, who: Who, arcPpe: boolean, label: LabelExample): BoundaryVerdict {
  const { limitedFt, restrictedFt } = SHOCK_BOUNDARIES;
  const inArc = distFt < label.afbFt;
  const zone: BoundaryVerdict['zone'] = distFt < restrictedFt ? 'restricted' : distFt < limitedFt ? 'limited' : inArc ? 'arc' : 'outside';
  const detail: string[] = [];
  if (label.cal > 40 && inArc) {
    return {
      zone,
      ok: false,
      tone: 'alarm',
      headline: 'Stop: de-energize first',
      detail: [`${label.cal} cal/cm² is above the 40 cal/cm² line many programs set. No PPE makes energized work safe here.`, 'Put the gear in an electrically safe work condition before anyone goes inside the arc flash boundary.'],
    };
  }
  if (zone === 'outside') {
    return { zone, ok: true, tone: 'ok', headline: 'Clear: outside every boundary', detail: ['No special PPE needed for this hazard here. Keep your normal site PPE on.'] };
  }
  if (zone === 'restricted' && who !== 'qualified') {
    return { zone, ok: false, tone: 'alarm', headline: 'Not allowed: restricted approach', detail: ['Only qualified people may cross the restricted approach boundary, even with an escort.'] };
  }
  if (zone === 'limited' && who === 'unqualified') {
    return { zone, ok: false, tone: 'alarm', headline: 'Not allowed without an escort', detail: ['Unqualified people stay outside the limited approach boundary unless a qualified person escorts them and explains the hazards.'] };
  }
  if (zone === 'restricted') detail.push('Restricted approach: needs a plan, shock protection (rated gloves and tools), and usually an energized work permit.');
  if (zone === 'limited') detail.push(who === 'escorted' ? 'Limited approach: OK only while the qualified escort stays with you and you never cross the restricted line.' : 'Limited approach: qualified people only, or people they escort.');
  if (inArc) {
    if (!arcPpe) {
      return {
        zone,
        ok: false,
        tone: 'alarm',
        headline: 'Not allowed: no arc-rated PPE',
        detail: [...detail, `You are inside the ${label.afbFt} ft arc flash boundary. Arc-rated PPE rated for at least ${label.cal} cal/cm² is required.`],
      };
    }
    detail.push(`Inside the arc flash boundary: arc-rated PPE rated at least ${label.cal} cal/cm² is on. Good.`);
  } else {
    detail.push('Outside the arc flash boundary, so arc-rated PPE isn\'t required for this hazard.');
  }
  return { zone, ok: true, tone: zone === 'restricted' ? 'warn' : 'ok', headline: zone === 'restricted' ? 'Allowed with a plan' : 'Allowed', detail };
}

// ---------------------------------------------------------------------------
// LOTOTO sequencing drills
// ---------------------------------------------------------------------------
export interface LotoStep {
  text: string;
  /** Shown when someone picks this step too early. */
  why: string;
}
export interface LotoDrill {
  id: string;
  title: string;
  scenario: string;
  /** Steps in the correct order. */
  steps: LotoStep[];
}

export const LOTO_DRILLS: LotoDrill[] = [
  {
    id: 'loto-crah',
    title: 'Lock out an air handler fan (480 V)',
    scenario: 'CRAH-104 needs a fan belt replaced. The hall has N+2 air handlers, so the load stays cool while it is out.',
    steps: [
      { text: 'Read the equipment\'s written LOTOTO procedure and list every energy source.', why: 'You have to know every source before you can control them. Planning comes first.' },
      { text: 'Tell the control room and everyone affected that CRAH-104 is coming down.', why: 'People affected are told before anything is shut down, so nobody is surprised or restarts it.' },
      { text: 'Stop the unit from its normal control (BMS or local stop).', why: 'Use the normal stop first. Opening a disconnect under load can arc.' },
      { text: 'Open the unit disconnect and the VFD bypass, if there is one.', why: 'The unit must be stopped normally before you isolate it.' },
      { text: 'Apply your own lock and tag to each isolation point.', why: 'Locks go on after the sources are isolated, not before.' },
      { text: 'Wait the labeled discharge time for the VFD capacitors.', why: 'Stored energy is released after locks are on and before you verify.' },
      { text: 'Try out: press start at the unit and from the BMS. Nothing should move. Return every control to OFF.', why: 'The try-out comes after locks and stored energy are handled. It proves the isolation works before anyone tests or touches.' },
      { text: 'Check your meter: CAT III or IV and rated for at least 480 V, with rated, undamaged leads.', why: 'Rate-check the meter right before you test with it. A meter rated too low can fail violently.' },
      { text: 'Live-dead-live: prove the meter on a known source, test every phase and to ground, prove the meter again.', why: 'Testing comes after the try-out, with a meter you just checked. It is the last proof before hands go in.' },
      { text: 'Start the belt work.', why: 'Work only starts once isolation has been verified.' },
    ],
  },
  {
    id: 'loto-pump',
    title: 'Isolate a chilled-water pump',
    scenario: 'CHWP-2 has a leaking seal. Pumps run 3 + 3 with standby, so the plant keeps flow while it is out.',
    steps: [
      { text: 'Confirm the standby pump is running and flow is stable on the BMS.', why: 'Protect the critical load first: make sure the backup has taken over before isolating anything.' },
      { text: 'Stop CHWP-2 from the BMS or its VFD.', why: 'Stop it normally before you isolate electrical or water sources.' },
      { text: 'Open the pump\'s disconnect and apply your lock and tag.', why: 'Electrical isolation comes after the normal stop.' },
      { text: 'Close and lock the suction and discharge isolation valves.', why: 'Hydraulic isolation comes after the motor is locked out so it can\'t run against closed valves.' },
      { text: 'Open the drain and vent to bleed the pump casing to zero.', why: 'Bleed only after both valves are closed, or you would drain the loop.' },
      { text: 'Try out: try to start the pump from the BMS and the local control. Return them to OFF.', why: 'Try out after the locks and the bleed, to prove the motor can\'t run.' },
      { text: 'Verify zero pressure on the gauge and no flow from the vent.', why: 'Proves the water side is isolated, after the try-out and before you open anything.' },
      { text: 'Check your meter rating, then live-dead-live on the load side of the disconnect.', why: 'Electrical proof comes last, with a meter rated for the circuit.' },
      { text: 'Start the seal replacement.', why: 'Work only starts once isolation has been verified.' },
    ],
  },
  {
    id: 'loto-ups',
    title: 'Put a UPS module in a safe work condition',
    scenario: 'A UPS module needs a capacitor check. The system is on maintenance bypass (per the MOP) and the load is still powered.',
    steps: [
      { text: 'Confirm on the display and EPMS that the load is on maintenance bypass.', why: 'Confirm the load is protected before you isolate anything.' },
      { text: 'Open the module input and output breakers per the MOP.', why: 'The AC sources are opened after the load is confirmed on bypass.' },
      { text: 'Open the battery breaker or disconnect.', why: 'The battery is a separate energy source. It is easy to forget, so it has its own step.' },
      { text: 'Apply your own lock and tag to every isolation point, including the battery.', why: 'Locks go on after all sources are open.' },
      { text: 'Wait the labeled DC capacitor discharge time.', why: 'Capacitors keep a charge after every source is open.' },
      { text: 'Try out: try to start the module from its panel. It must stay off.', why: 'The try-out comes after locks and the discharge wait, and proves the module can\'t restart.' },
      { text: 'Check your meter: CAT rating and voltage rating cover both the AC input and the DC bus voltage.', why: 'UPS DC buses can be several hundred volts. Check the meter right before testing.' },
      { text: 'Live-dead-live on AC and DC, at every point.', why: 'Testing is last: it proves every source, including the DC bus, is dead.' },
    ],
  },
];

/** Shuffle a drill's steps deterministically from a seed (so tests are stable). */
export function shuffledOrder(n: number, seed: number): number[] {
  const order = Array.from({ length: n }, (_, i) => i);
  let s = seed >>> 0 || 1;
  for (let i = n - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  // Never start already solved.
  if (order.every((v, i) => v === i) && n > 1) [order[0], order[1]] = [order[1]!, order[0]!];
  return order;
}

/** Score from 100: −10 per wrong pick, never below 0. */
export const lotoScore = (wrong: number) => Math.max(0, 100 - wrong * 10);

// ---------------------------------------------------------------------------
// Hazard hunts
// ---------------------------------------------------------------------------
export interface HuntItem {
  text: string;
  hazard: boolean;
  why: string;
}
export interface HazardHunt {
  id: string;
  title: string;
  scene: string;
  items: HuntItem[];
}

export const HAZARD_HUNTS: HazardHunt[] = [
  {
    id: 'hunt-battery',
    title: 'Battery room PM',
    scene: 'Two techs are torquing connections on a lead-acid UPS battery string on a Tuesday afternoon.',
    items: [
      { text: 'One tech is wearing a wedding ring.', hazard: true, why: 'Metal jewelry can bridge battery terminals and weld to the skin. Remove rings and watches.' },
      { text: 'They are using insulated tools.', hazard: false, why: 'Correct: insulated tools reduce the chance of a DC short.' },
      { text: 'A box of air filters is stacked in front of the eyewash station.', hazard: true, why: 'Eyewash must be reachable within seconds. Keep it clear.' },
      { text: 'The room\'s ventilation fan alarm has been silenced.', hazard: true, why: 'Batteries can give off hydrogen. Ventilation is a safety system, not a nuisance.' },
      { text: 'Both wear face shields, acid-rated gloves and aprons.', hazard: false, why: 'Correct PPE for corrosive electrolyte.' },
      { text: '"The UPS is off, so the batteries are dead."', hazard: true, why: 'Battery strings stay energized with the UPS off. Open the battery disconnect and test.' },
    ],
  },
  {
    id: 'hunt-gen',
    title: 'Generator yard, summer night',
    scene: 'It\'s 2 a.m. and 98 °F. A tech is replacing a radiator fan belt on GEN-3.',
    items: [
      { text: 'The generator controller is left in AUTO "in case utility drops".', hazard: true, why: 'In AUTO it can start with hands on the belt. OFF, locked out.' },
      { text: 'The tech is wearing hearing protection.', hazard: false, why: 'Correct: neighboring units may be running.' },
      { text: 'No one knows the tech is out in the yard.', hazard: true, why: 'Working alone at night needs check-ins so someone notices if you stop answering.' },
      { text: 'A small diesel drip was cleaned up with the spill kit.', hazard: false, why: 'Correct: clean it up and report it.' },
      { text: 'The tech touches the exhaust to see if GEN-3 ran recently.', hazard: true, why: 'Exhaust parts stay hot enough to burn long after a run. Check the controller history instead.' },
      { text: 'Water bottle and planned breaks in a cool room.', hazard: false, why: 'Correct: heat stress is a real hazard in generator yards.' },
    ],
  },
  {
    id: 'hunt-gear',
    title: 'Switchgear room',
    scene: 'A crew is racking out a 480 V feeder breaker for testing.',
    items: [
      { text: 'One section of the switchboard has no arc flash label.', hazard: true, why: 'No label means the hazard is unknown. No work until it is assessed.' },
      { text: 'The tech stands right in front of the breaker even though a remote racking tool is on the cart.', hazard: true, why: 'Distance is the best PPE. Use remote racking where it is provided.' },
      { text: 'The meter was checked on a known live source before and after the test.', hazard: false, why: 'Correct: live-dead-live.' },
      { text: 'The tester grabbed a CAT II meter from the truck for the 480 V switchboard.', hazard: true, why: 'Switchgear needs a meter and leads rated CAT III or IV and at least 480 V. Check the rating before any test.' },
      { text: 'A contractor walks past inside the limited approach boundary, unescorted, with covers off.', hazard: true, why: 'Unqualified people stay outside the limited approach boundary unless escorted.' },
      { text: 'They use a fiberglass ladder to reach the upper section.', hazard: false, why: 'Correct: non-conductive ladders near electrical gear.' },
      { text: 'Cardboard boxes are stored in front of the panels.', hazard: true, why: 'Working space in front of electrical equipment must be kept clear.' },
    ],
  },
  {
    id: 'hunt-roof',
    title: 'Cooling tower deck',
    scene: 'A tech is cleaning the basin strainer on cooling tower CT-2 on the roof.',
    items: [
      { text: 'The fan is locked out at its disconnect, but the VFD bypass contactor isn\'t.', hazard: true, why: 'Every source gets a lock. A bypass can start the fan around the VFD.' },
      { text: 'The tech is tied off to a rated anchor near the roof edge.', hazard: false, why: 'Correct fall protection.' },
      { text: 'A treatment chemical is in an unlabeled milk jug.', hazard: true, why: 'Unlabeled chemicals are unknown hazards. Every container must be labeled.' },
      { text: 'They read the safety data sheet for the biocide first.', hazard: false, why: 'Correct: the SDS gives the PPE and first aid.' },
      { text: 'They lean into the tower drift without respiratory protection where the water program says one is needed.', hazard: true, why: 'Tower mist can carry Legionella. Follow the water management program.' },
    ],
  },
  {
    id: 'hunt-hotwork',
    title: 'Hot work near the data hall',
    scene: 'A welder is repairing a pipe support in the corridor outside the data hall.',
    items: [
      { text: 'The fire watch leaves as soon as the welding stops.', hazard: true, why: 'Sparks smolder. Fire watch stays at least 30 minutes after the work (many sites require 60).' },
      { text: 'Smoke detectors were covered without telling the fire alarm monitoring company.', hazard: true, why: 'Covering detectors is an impairment. It needs the impairment process and notifications.' },
      { text: 'A signed hot work permit is posted at the job.', hazard: false, why: 'Correct.' },
      { text: 'Cardboard and plastic wrap are stacked 10 feet away, uncovered.', hazard: true, why: 'Move or cover combustibles within 35 feet.' },
      { text: 'A charged extinguisher is within reach.', hazard: false, why: 'Correct.' },
      { text: 'The door to the clean-agent protected room is propped open for the hose.', hazard: true, why: 'Propped doors let agent escape and let smoke in. Keep them shut.' },
    ],
  },
];

export interface HuntResult {
  found: number;
  missed: number;
  falseAlarms: number;
  score: number;
}

/** Score a hunt: −15 per missed hazard, −10 per safe item wrongly flagged. */
export function scoreHunt(h: HazardHunt, picked: Set<number>): HuntResult {
  let found = 0;
  let missed = 0;
  let falseAlarms = 0;
  h.items.forEach((it, i) => {
    if (it.hazard && picked.has(i)) found++;
    else if (it.hazard) missed++;
    else if (picked.has(i)) falseAlarms++;
  });
  return { found, missed, falseAlarms, score: Math.max(0, 100 - missed * 15 - falseAlarms * 10) };
}

// ---------------------------------------------------------------------------
// Emergency cards
// ---------------------------------------------------------------------------
export interface EmergencyCard {
  id: string;
  title: string;
  tone: 'alarm' | 'warn';
  doFirst: string[];
  dont: string[];
}

export const EMERGENCY_CARDS: EmergencyCard[] = [
  {
    id: 'shock',
    title: 'Someone is being shocked',
    tone: 'alarm',
    doFirst: ['Don\'t touch them while they may still be in contact.', 'Remove power if you safely can: open the breaker, or use the EPO if it is the fastest safe way.', 'Call 911 and your site emergency number.', 'Once they are clear of power: CPR and the AED if you are trained.'],
    dont: ['Don\'t approach a medium-voltage contact at all. Keep back and get it de-energized.', 'Don\'t let them "walk it off". Every shock victim needs a medical check, because heart rhythm problems can show up later.'],
  },
  {
    id: 'arc',
    title: 'Arc flash or electrical burn',
    tone: 'alarm',
    doFirst: ['Stay out while the gear may still be energized or arcing.', 'Call 911 and your site emergency number.', 'Cool burns with cool running water, not ice.', 'Cover burns loosely with a clean, dry cloth.'],
    dont: ['Don\'t pull off clothing stuck to the skin.', 'Don\'t reset or re-energize the gear. Preserve the scene for the investigation.'],
  },
  {
    id: 'refrigerant',
    title: 'Refrigerant leak alarm',
    tone: 'warn',
    doFirst: ['Leave the room and close the door.', 'Make sure the emergency exhaust is running.', 'Report it and keep others out.', 'Only trained responders with the right breathing protection go back in.'],
    dont: ['Don\'t go back in to "find the leak".', 'Don\'t touch liquid refrigerant: it causes frostbite.'],
  },
  {
    id: 'battery',
    title: 'Battery smoke or thermal runaway alarm',
    tone: 'alarm',
    doFirst: ['Clear the area and keep the doors shut.', 'Call the fire department and follow the site emergency plan.', 'Stay upwind of any vents or smoke.', 'Tell responders the battery type and location.'],
    dont: ['Don\'t open an enclosure that is in alarm.', 'Don\'t try to fight a lithium-ion fire with a hand extinguisher.'],
  },
  {
    id: 'chem-eye',
    title: 'Acid or chemical in the eyes',
    tone: 'warn',
    doFirst: ['Get to the eyewash immediately and flush for at least 15 minutes.', 'Hold the eyelids open and remove contact lenses if you can.', 'Call for help while flushing.', 'Bring the safety data sheet to the doctor.'],
    dont: ['Don\'t rub your eyes.', 'Don\'t stop flushing early because it feels better.'],
  },
  {
    id: 'fire',
    title: 'Fire alarm or pre-discharge alarm',
    tone: 'alarm',
    doFirst: ['Leave the room right away and close doors behind you.', 'Follow the evacuation route to the muster point.', 'Report to the person taking roll call.', 'Tell responders about anyone missing and about energized or battery hazards.'],
    dont: ['Don\'t hold the abort button unless you are trained and the procedure says to.', 'Don\'t re-enter until responders clear the building.'],
  },
  {
    id: 'heat',
    title: 'Heat illness',
    tone: 'warn',
    doFirst: ['Confused, collapsed or not sweating with hot skin: that can be heat stroke. Call 911.', 'Move them to a cool place and cool them fast (cold water, ice packs, fanning).', 'If they are alert and only dizzy or cramping: rest in the cool and sip water.'],
    dont: ['Don\'t leave them alone.', 'Don\'t send them back to work the same shift.'],
  },
  {
    id: 'confined',
    title: 'Person down in a confined space',
    tone: 'alarm',
    doFirst: ['Call rescue and your site emergency number.', 'The attendant stays outside and starts the rescue plan.', 'Use the retrieval line from outside if one is set up.'],
    dont: ['Don\'t go in after them. Most confined-space deaths are would-be rescuers.'],
  },
];

// ---------------------------------------------------------------------------
// Pre-task brief
// ---------------------------------------------------------------------------
export const ENERGY_SOURCES = [
  'AC electrical',
  'DC / battery',
  'Stored (capacitors, springs)',
  'Rotating parts',
  'Water or fluid pressure',
  'Refrigerant',
  'Heat (hot surfaces)',
  'Chemicals',
  'Gravity / falling objects',
] as const;

export const BRIEF_PPE = [
  'Safety glasses',
  'Hearing protection',
  'Arc-rated PPE per the label',
  'Rated voltage gloves',
  'Face shield',
  'Chemical gloves / apron',
  'Hard hat',
  'Fall protection',
] as const;

export const BRIEF_PERMITS = ['LOTOTO', 'Energized work permit', 'Hot work permit', 'Confined space permit', 'Fire system impairment', 'MOP / change approved'] as const;

export interface Brief {
  task: string;
  location: string;
  worst: string;
  energy: string[];
  ppe: string[];
  permits: string[];
  emergency: string;
  stopIf: string;
}

/** Things the brief still needs before the job should start. */
export function briefGaps(b: Brief): string[] {
  const gaps: string[] = [];
  if (!b.task.trim()) gaps.push('Describe the task.');
  if (!b.worst.trim()) gaps.push('Say what the worst thing that could happen is.');
  if (b.energy.length === 0) gaps.push('Pick at least one energy source (almost every job has one).');
  const electrical = b.energy.includes('AC electrical') || b.energy.includes('DC / battery') || b.energy.includes('Stored (capacitors, springs)');
  const hasEnergy = b.energy.some((e) => e !== 'Gravity / falling objects');
  if (hasEnergy && !b.permits.includes('LOTOTO') && !b.permits.includes('Energized work permit'))
    gaps.push('Energy is present: add LOTOTO, or an energized work permit if it truly can\'t be de-energized.');
  if (electrical && !b.ppe.includes('Arc-rated PPE per the label') && b.permits.includes('Energized work permit'))
    gaps.push('Energized electrical work needs arc-rated PPE per the label.');
  if (b.energy.includes('Chemicals') && !b.ppe.includes('Chemical gloves / apron')) gaps.push('Chemicals are present: add chemical gloves / apron (check the SDS).');
  if (b.energy.includes('Gravity / falling objects') && !b.ppe.includes('Hard hat')) gaps.push('Falling-object hazard: add a hard hat.');
  if (!b.emergency.trim()) gaps.push('Note the emergency number, nearest exit, eyewash and AED.');
  if (!b.stopIf.trim()) gaps.push('Agree on what will make you stop.');
  return gaps;
}

export const EMPTY_BRIEF: Brief = { task: '', location: '', worst: '', energy: [], ppe: ['Safety glasses'], permits: [], emergency: '', stopIf: '' };
