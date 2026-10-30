/**
 * Hard stops: things you must never do, under any circumstances.
 * Shown in red with warning marks throughout the app.
 */

export type NeverSection = 'electrical' | 'mechanical' | 'life-safety' | 'everyone';

export interface NeverRule {
  rule: string;
  why: string;
}

export const NEVER_SECTIONS: { id: NeverSection; label: string }[] = [
  { id: 'everyone', label: 'Everyone' },
  { id: 'electrical', label: 'Electrical' },
  { id: 'mechanical', label: 'Mechanical' },
  { id: 'life-safety', label: 'Life safety' },
];

export const NEVER: Record<NeverSection, NeverRule[]> = {
  everyone: [
    { rule: 'NEVER work on equipment without your own lock and tag on every energy source.', why: 'Someone who doesn\'t know you are there can re-energize it. Your lock is the only thing that guarantees they can\'t.' },
    { rule: 'NEVER remove or cut someone else\'s lock.', why: 'That lock is protecting a person. Removal follows a documented supervisor procedure only.' },
    { rule: 'NEVER defeat, jumper, or bypass a safety device, interlock, or alarm to "keep things running".', why: 'Safeties exist because the failure they prevent has hurt people or dropped sites. Fix the cause instead.' },
    { rule: 'NEVER work from memory on critical equipment. Use the approved procedure.', why: 'Stress, fatigue, and similar-looking gear cause wrong-device errors. The procedure catches them.' },
    { rule: 'NEVER operate a device that isn\'t in your approved switching order or MOP.', why: 'An unplanned operation can drop load or energize equipment someone is working on.' },
    { rule: 'NEVER keep going when something doesn\'t match the procedure.', why: 'A mismatch means the plant isn\'t what you think it is. Stop, make it safe, and call your lead.' },
    { rule: 'NEVER hide a mistake or a near miss.', why: 'Reporting it right away limits the damage and fixes the system so it doesn\'t happen again.' },
    { rule: 'NEVER touch customer IT equipment unless it is your job and you are authorized.', why: 'You can cause an outage or a security incident.' },
  ],
  electrical: [
    { rule: 'NEVER assume a circuit is dead. Test for absence of voltage (live-dead-live).', why: 'Back-feed, mislabeled breakers, UPS outputs, and stored energy can all keep "off" circuits live.' },
    { rule: 'NEVER open energized gear or cross the arc flash boundary without being qualified, authorized, and in the PPE the label requires.', why: 'An arc flash can reach thousands of degrees in milliseconds and cause fatal burns and blast injuries.' },
    { rule: 'NEVER work on gear with a missing or outdated arc flash label.', why: 'The hazard is unknown. The incident energy can be far higher than the panel next to it.' },
    { rule: 'NEVER close a breaker that could parallel two unsynchronized sources.', why: 'Out-of-phase paralleling causes violent faults and can back-feed a utility line crews think is dead.' },
    { rule: 'NEVER cheat a Kirk-key interlock: no spare keys, removed locks, or forced mechanisms.', why: 'The interlock is the only thing stopping an illegal breaker combination.' },
    { rule: 'NEVER reclose a breaker that tripped on a fault until the cause is found.', why: 'You can re-energize the fault and cause an arc flash or a bigger outage.' },
    { rule: 'NEVER open a UPS output breaker while it is the only path to the load.', why: 'It drops every rack behind it instantly. Transfer to bypass first, following the MOP.' },
    { rule: 'NEVER close a UPS maintenance bypass unless the UPS is on static bypass.', why: 'It ties the inverter output to raw bypass power and can damage the UPS or drop the load.' },
    { rule: 'NEVER work on battery strings without insulated tools, a face shield, and acid-rated gloves.', why: 'DC arcs don\'t self-extinguish, and a dropped wrench across a battery terminal can explode.' },
    { rule: 'NEVER leave a generator out of AUTO without a tag, approval, and the control room knowing.', why: 'The site has silently lost its backup power.' },
    { rule: 'NEVER test or touch an EPO button outside an approved, planned procedure.', why: 'It is designed to drop the whole data hall at once.' },
  ],
  mechanical: [
    { rule: 'NEVER vent refrigerant or handle it without EPA Section 608 certification.', why: 'It is illegal, harms the environment, and in an enclosed room can displace oxygen.' },
    { rule: 'NEVER enter a chiller room during a refrigerant alarm until the procedure clears you.', why: 'Refrigerant is heavier than air. You can pass out without warning.' },
    { rule: 'NEVER jumper a flow switch or safety to keep a chiller running.', why: 'Running without flow can freeze and rupture the evaporator tubes, a major failure.' },
    { rule: 'NEVER open a radiator cap or pressurized system that is hot.', why: 'Superheated fluid can flash to steam and cause severe burns.' },
    { rule: 'NEVER close a valve on a running chilled water loop without the MOP.', why: 'It can starve every cooling coil downstream and overheat the data hall.' },
    { rule: 'NEVER run a pump dead-headed (discharge closed).', why: 'The water overheats and the pump and seals are destroyed.' },
    { rule: 'NEVER work on a fan, pump, or VFD-driven motor without locking out the drive and waiting for capacitors to discharge.', why: 'VFDs and building automation can restart equipment on their own.' },
    { rule: 'NEVER disconnect a CDU or liquid-cooling line under pressure unless the procedure says how.', why: 'Coolant can spray onto energized IT equipment.' },
    { rule: 'NEVER enter a tank, pit, or vault without a confined-space permit and atmospheric testing.', why: 'Confined spaces can have no oxygen or toxic gas, and rescuers often become victims too.' },
    { rule: 'NEVER climb a cooling tower or roof edge without fall protection.', why: 'Falls are a leading cause of workplace deaths.' },
  ],
  'life-safety': [
    { rule: 'NEVER silence, disable, or impair a fire system without an impairment permit and the required notifications.', why: 'The building loses its protection, and the fire department and insurer must know.' },
    { rule: 'NEVER stay in a room after a clean-agent pre-discharge alarm.', why: 'The agent floods the room within seconds.' },
    { rule: 'NEVER prop open doors to a clean-agent protected room.', why: 'The agent leaks out and won\'t hold the concentration needed to put out a fire.' },
    { rule: 'NEVER block exits, extinguishers, eyewash stations, or electrical panels.', why: 'Seconds matter in an emergency, and code requires clear access.' },
    { rule: 'NEVER enter a battery energy storage container during an alarm or after a thermal event.', why: 'Flammable and toxic gases can build up and ignite.' },
  ],
};
