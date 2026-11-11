/**
 * "Think deeper" questions for the result screen of each procedure and
 * drill. No single right answer is checked; each has a model answer to
 * compare against. They push past "what button" to "why, and what if".
 */
export const DEEPER: Record<string, { q: string; a: string }[]> = {
  'mop-ups-bypass': [
    {
      q: 'You did this on N+1, a single path. What changes if the same MOP runs on 2N?',
      a: 'On 2N every dual-corded rack has a second path from UPS B, so a wrong breaker on side A drops only single-corded loads. The MOP is the same; the consequence of a mistake is smaller. That is why many sites only allow UPS bypass work on 2N when both sides are proven healthy first: you are spending your redundancy.',
    },
    {
      q: 'The key release unit stopped you from closing the bypass too early. Why not just trust the procedure and skip the interlock?',
      a: 'Procedures depend on people reading and following every step under time pressure. Interlocks make the dangerous order physically impossible. Good sites use both: the MOP tells you what to do, and the hardware stops the one mistake that would hurt people or the load.',
    },
    {
      q: 'While on maintenance bypass, utility A drops. What happens to the load?',
      a: 'The load is fed straight from the switchboard with no battery behind it, so it drops until the generators pick up the bus (about 10 seconds). That is the real risk of bypass work, and why it is planned for low-risk windows with stable weather and generators ready.',
    },
  ],
  'mop-ups-return': [
    {
      q: 'Why not transfer the UPS to inverter first and then open the maintenance bypass?',
      a: 'With the maintenance bypass closed, the inverter output would be tied to raw switchboard power. If they are not perfectly in phase, current flows between them, which can damage the UPS or trip upstream. On static bypass both paths share the same source, so opening MBB is clean.',
    },
    {
      q: 'Who should remove the locks after maintenance, and why does it matter?',
      a: 'Only the person who placed each lock removes it, after confirming they and their work are clear. A lock is a promise about one person\'s safety. If someone else removes it, that promise is broken without that person knowing.',
    },
  ],
  'mop-mtm': [
    {
      q: 'Opening Main A puts UPS A on battery for a few seconds. When would that be unacceptable?',
      a: 'If UPS A batteries are weak or recently discharged, if a module is already out of service, or if side B is not healthy. Before any open transition, check battery health and the other side. If anything is off, reschedule. A few seconds is only safe when the batteries can actually cover it.',
    },
    {
      q: 'The engine refused to parallel two utilities even with a "cheater" key. Why is paralleling two services so dangerous?',
      a: 'Two utility services are rarely exactly in phase. Tying them creates a huge circulating current that can blow apart breakers and bus. It can also back-feed a line that a utility crew thinks is dead. Interlocks exist because the consequences land on people, not just equipment.',
    },
  ],
  'mop-tie-return': [
    {
      q: 'Why does the utility crew have to release their clearance before you switch?',
      a: 'Their clearance is their protection. Switching toward a source while their locks are still on it could energize a line they are touching. You never re-energize toward someone else\'s work until they have released it.',
    },
    {
      q: 'How would you know the plant is truly back to normal?',
      a: 'It matches the normal one-line: both mains closed, tie open with its lock empty, keys in their home locks, UPSs on inverter, batteries charging, no alarms. Compare to the drawing, not to memory.',
    },
  ],
  'mop-gen-test': [
    {
      q: 'An unloaded test run passed. What can it not tell you?',
      a: 'Whether the generator can carry real load. Wet stacking, fuel problems and cooling limits often show up only under load. That is why sites also run periodic load bank tests and full transfer tests under a MOP.',
    },
    {
      q: 'The generator ran fine, but you found the battery charger alarming on the walkdown. Is the generator "ready"?',
      a: 'Not reliably. Starting batteries are the most common cause of failed starts. A charger fault means the next start may fail. Report it as reduced redundancy and fix it quickly, even though the test "passed".',
    },
  ],
  'mop-chiller-pm': [
    {
      q: 'The storage tank covered the gap while the next chiller started. What if the tank had been half empty?',
      a: 'The hall would have warmed during the two-minute start. On a hot day or with high GPU load, that could mean throttling. Good practice: start the next chiller first, confirm it is loaded, then take the lead chiller out, so the tank is kept as a reserve.',
    },
    {
      q: 'Why lock out the water valves as well as the electrical disconnect?',
      a: 'Opening a chiller with pressurized water or refrigerant still connected can release scalding water or refrigerant. Energy isolation means every energy source: electrical, hydraulic, pressure, thermal.',
    },
  ],
  'mop-crah-filters': [
    {
      q: 'If removing one air handler changes nothing, why plan it at all?',
      a: 'Because "it changes nothing" is an assumption you check. Spare capacity may already be used by a failed unit nobody reported, or a hot spot near that unit. Small planned changes are also how teams keep the habit for the big ones.',
    },
    {
      q: 'How would dirty filters show up in the readings before anyone opens the unit?',
      a: 'Higher filter pressure drop, higher fan speed or power for the same air flow, and warmer spots near that unit. Trending those catches clogged filters before they cause a problem.',
    },
  ],
  'drill-utility': [
    {
      q: 'Your plant rode through perfectly. What single hidden failure would have turned this into an outage?',
      a: 'Generators failing to start (dead batteries, a controller left in OFF, fuel problems), or UPS batteries too weak to bridge the 10 seconds. The ride-through only works if the parts you never see in normal operation were maintained.',
    },
    {
      q: 'Why do the generators keep running for a while after the retransfer?',
      a: 'Cooldown. Shutting a hot engine down at once can damage turbochargers and seals. The unloaded run lets temperatures settle before the stop.',
    },
  ],
  'drill-chiller': [
    {
      q: 'You checked that the backup was working before you looked for the cause. Why that order?',
      a: 'Stabilize first, investigate second. The load is the priority. Once the standby chiller is carrying it and the tank is no longer draining, you have time to find out why CH-01 tripped without the hall heating up.',
    },
    {
      q: 'What trend data would have warned you that CH-01 was close to tripping?',
      a: 'Rising condenser water temperature and condenser approach over days or weeks, head pressure creeping up on hot afternoons, and tower fans at full speed with little margin. Trips are often the end of a slow story.',
    },
  ],
  'drill-double': [
    {
      q: 'Side A is running at N. How would you decide whether to ask the customer to move workloads?',
      a: 'Weigh the time to repair GEN-A1, the fuel position, the weather, and how dual-corded the critical load really is. If one more failure would drop critical single-corded load, warn the customer early so they can choose to move work. That is their decision, made with your facts.',
    },
    {
      q: 'Two generators on side A carry about 1,400 kW. What else is quietly using their margin?',
      a: 'Mechanical load. Chillers restarting after the outage pull extra power, and on a hot day mechanical load rises. Capacity math has to include cooling, not just IT.',
    },
  ],
  'drill-cdu': [
    {
      q: 'Air cooling could not save the GPUs. Why is liquid cooling so much less forgiving?',
      a: 'Cold plates hold very little heat and GPUs make a lot of it in a small space. With no coolant flow the chip temperature rises in seconds. With air cooling, the room\'s thermal mass gives you minutes. More density means faster failures.',
    },
    {
      q: 'What would make a CDU failure less likely to hurt the customer?',
      a: 'Redundant pumps with automatic switchover, CDUs in an N+1 arrangement with a shared loop, leak and flow alarms that page someone immediately, and a written response with the standby switch location posted at the unit.',
    },
  ],
  'drill-ups-room': [
    {
      q: 'The UPS room warmed slowly and nothing went down. Why treat it as urgent?',
      a: 'Battery life is roughly halved for every 8–10 °C above about 25 °C, and the damage is permanent. A few hot days can cost years of battery life, and weak batteries fail in the next outage. Slow problems are still expensive.',
    },
    {
      q: 'Bypass would make less heat. Why was it still the wrong move?',
      a: 'The simulator showed it: the whole load ends up on raw power with no battery protection. You would trade a slow cooling problem for an instant outage risk. Fix the cooling, not the UPS.',
    },
  ],
  'drill-fire': [
    {
      q: 'The simulator showed the EPO dropping all 36 racks. When is pressing it the right call?',
      a: 'When power itself is the danger: someone being electrocuted, or a fire that responders need de-energized. The site fire plan and the fire department decide. It is a life-safety device, never an equipment-protection device.',
    },
    {
      q: 'Nuisance alarms are common in data halls. How do they make real fires more dangerous?',
      a: 'Alarm fatigue. When people expect false alarms, they respond slower and are tempted to silence or reset. Sites fight it by fixing nuisance sources, keeping detectors clean, and treating every alarm as real until proven otherwise.',
    },
  ],
  'drill-towers': [
    {
      q: 'The air-cooled chiller saved the day. Why not build every plant with only air-cooled chillers?',
      a: 'They use more energy, especially on hot days (worse PUE), and lose capacity when it is hot outside. Water-cooled plants are efficient but depend on towers and water. A mix gives efficiency on normal days and a different failure mode on bad ones.',
    },
    {
      q: 'Two tower fans tripped on overload on the hottest day of the year. Coincidence?',
      a: 'Probably not. Fans run harder on hot days, and worn bearings, belts or motors fail when pushed. Hot-weather readiness (fan PM, vibration checks, tower cleaning) before summer is cheaper than this drill for real.',
    },
  ],
  'drill-fuel': [
    {
      q: 'The day tanks last about 6½ hours. Why is that number not the one you really manage?',
      a: 'Day tanks are refilled from the bulk tank by transfer pumps. What you manage is bulk tank level, transfer pump health, fuel quality, and delivery lead times. A failed transfer pump turns 6½ hours into your real deadline.',
    },
    {
      q: 'The simulator showed an overload when you shut half the generators down. What does that teach about "saving" resources in an emergency?',
      a: 'Removing capacity during an event can create the very outage you are trying to avoid. Any change to running equipment during an emergency needs the same capacity math as a planned change, plus a plan to undo it.',
    },
  ],
  'drill-gen-overcrank': [
    {
      q: 'All three A generators failed the same way at the same time. What does that tell you about the cause?',
      a: 'Three independent engines rarely fail together by chance. Look for a common cause: shared fuel supply or filters, a shared day tank, starting batteries that all aged together, or a controls change pushed to every unit. Common-cause failures are what redundancy does not cover, so they are worth designing out.',
    },
    {
      q: 'Side B carried everything. What changes about how you run the site until the A generators are fixed?',
      a: 'You are one failure from an outage on every rack: no planned work on side B, extra rounds on B equipment, a clear plan for what to do if B has a problem, and the customer told about the reduced redundancy.',
    },
  ],
  'drill-cold-start': [
    {
      q: 'How would you catch block heaters that are off before an outage finds them?',
      a: 'Rounds: feel the heater hose or read the jacket-water gauge; check the heater breaker; trend jacket-water temperature on the BMS with a low alarm; and make "heater breaker on, control in AUTO" part of every generator job close-out.',
    },
    {
      q: 'The design says the generators take load in about 10 s. Where else does that number show up?',
      a: 'In UPS battery sizing (minutes of runtime with margin), the ATS timing, the load-step plan (which loads land first), and in commissioning tests. A slow start eats into every one of those margins at once.',
    },
  ],
  'drill-sag': [
    {
      q: 'The UPS rode through but a chiller dropped. Why do motors and drives have less ride-through than IT?',
      a: 'A UPS has stored energy right at the load. A chiller starter or drive protects its motor and electronics: on low voltage it drops out (contactors open, drives trip on undervoltage) and then has to go through its restart and anti-short-cycle timers. Some sites add ride-through options or restart logic, but cooling still blinks.',
    },
    {
      q: 'What would make you ask the utility and engineering to look into sags?',
      a: 'A pattern: several events a month, events at the same time of day or during storms, events that keep dropping the same equipment, or depths and durations close to the windows that start the generators. The EPMS captures are the evidence.',
    },
  ],
  'drill-surprise': [
    {
      q: 'You found the failure from the event log. What makes an event log easy or hard to read in a real incident?',
      a: 'Good logs have synchronized clocks, clear device names that match the drawings, and alarm priorities that separate cause from consequence. Bad logs flood you with hundreds of follow-on alarms. Learning to find the first alarm is a core operator skill.',
    },
    {
      q: 'After repair, how would you check the plant is truly back to normal, not just "no alarms"?',
      a: 'Compare the line-up to normal: redundancy restored, standby units back in standby (not still running), storage tanks recharging, batteries charging, and trends settling back to their usual values.',
    },
  ],
};
