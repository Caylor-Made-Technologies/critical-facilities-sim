/**
 * Fault-symptom library (Phase 4d). Each fault: likely causes, the alarms it brings in (alarm ids from
 * src/sim/v2/alarms.ts, `*` = any equipment of that kind), the trend signature a tech would see on the
 * BMS/EPMS, the correct response, and how to inject it in the simulator (engine v2 actions) so tests can
 * check the alarms really come in. Generic training content: follow the site's procedures and the
 * manufacturer's instructions first.
 */
import type { Action } from '../sim/actions';
import type { WeatherId } from '../sim/thermal';

export interface Fault {
  id: string;
  title: string;
  system: 'electrical' | 'cooling' | 'hall';
  causes: string[];
  /** Alarm ids (or patterns with *) that should come in. */
  alarms: string[];
  trend: string;
  response: string[];
  /** Nuisance or alarm-handling lesson tied to this fault (optional). */
  nuisance?: string;
  /** How the simulator reproduces it; checked by tests. */
  inject?: { weather?: WeatherId; actions: Action[]; within: number };
}

export const FAULTS: Fault[] = [
  {
    id: 'utility-loss',
    title: 'Utility source lost',
    system: 'electrical',
    causes: ['Utility outage or upstream fault', 'Main breaker or service switchgear trip', 'Medium-voltage cable or transformer failure'],
    alarms: ['UTIL-A.LOSS'],
    trend: 'Bus voltage drops to zero; the battery energy storage (or, without one, the UPS battery) carries the load and its state of charge falls; generators crank within seconds and the ATS transfers after its delay; UPS goes back to normal once the generators carry the load.',
    response: [
      'Confirm the scope: which buses are dead, which UPS systems are on battery.',
      'Watch generator start and ATS transfer; note the battery runtime left.',
      'If a generator fails to start, follow the fail-to-start response at once.',
      'Do not retransfer by hand; let the ATS time out after utility is stable.',
    ],
    nuisance: 'Many alarms arrive together (utility, UPS, ATS, generators): read the first-out alarm to find the cause.',
    inject: { actions: [{ a: 'fail', id: 'UTIL-A' }], within: 15 },
  },
  {
    id: 'utility-sag',
    title: 'Voltage sag or swell on the utility',
    system: 'electrical',
    causes: ['A fault elsewhere on the grid (most sags)', 'Large motor or transformer energizing nearby', 'Lightning or a utility switching operation', 'A swell when large load drops off or during a ground fault on another phase'],
    alarms: ['UTIL-A.PQ', 'UPS-A.BATT'],
    trend: 'The EPMS shows a short dip (or rise) on all three phases at one timestamp; the UPS goes to battery for the event and straight back; a sag longer than the ATS start delay starts the generators; a deep sag drops chillers, which restart minutes later.',
    response: [
      'Check the EPMS event capture: depth, duration, which service.',
      'Confirm every UPS is back on double conversion and recharging.',
      'Check for chillers, drives or pumps that dropped and did not restart.',
      'If generators started but did not transfer, let them finish their cool-down in auto.',
      'Log it; repeated sags go to the utility and engineering.',
    ],
    nuisance: 'A sag brings in UPS, ATS and chiller alarms at the same time stamp: the power quality alarm is the first-out.',
    inject: { actions: [{ a: 'utilityEvent', id: 'UTIL-A', kind: 'sag', pct: 80, s: 5 }], within: 15 },
  },
  {
    id: 'utility-single-phase',
    title: 'Single-phasing (one phase lost)',
    system: 'electrical',
    causes: ['A blown medium-voltage fuse', 'A broken conductor or failed connection upstream', 'One pole of a switch or breaker not making contact'],
    alarms: ['UTIL-A.PQ', 'UPS-A.BATT'],
    trend: 'One phase voltage drops to near zero while the other two stay up; motors without phase-loss protection draw high current; the ATS sees the source as not acceptable, starts the generators and transfers.',
    response: [
      'Treat it like a utility loss: watch the generator start and ATS transfer.',
      'Check chillers and pumps for phase-loss or overload trips.',
      'Do not retransfer until the utility has fixed the open phase and the ATS times out.',
    ],
    inject: { actions: [{ a: 'utilityEvent', id: 'UTIL-A', kind: 'single-phase', pct: 0, s: 60 }], within: 15 },
  },
  {
    id: 'utility-imbalance',
    title: 'Utility voltage imbalance',
    system: 'electrical',
    causes: ['Unbalanced single-phase load on the utility feeder', 'A failing capacitor bank or tap problem upstream', 'A high-resistance connection on one phase'],
    alarms: ['UTIL-A.IMB'],
    trend: 'Phase voltages spread apart by more than about 2%; motor currents unbalance much more than the voltages (several times as much) and motors run hotter.',
    response: ['Measure phase-to-phase voltages at the service and compare with the EPMS.', 'Check motor currents and temperatures on the biggest motors.', 'Report to engineering and the utility if it persists.'],
    inject: { actions: [{ a: 'utilityEvent', id: 'UTIL-A', kind: 'imbalance', pct: 3, s: 120 }], within: 15 },
  },
  {
    id: 'gen-fail-start',
    title: 'Generator fails to start',
    system: 'electrical',
    causes: ['Starting battery or charger fault', 'Fuel supply problem (valve, filter, air in the line)', 'Engine controls in the wrong mode', 'Cold engine with the block heater off (slow start)'],
    alarms: ['GEN-A1.FAIL'],
    trend: 'Crank attempts repeat without the engine reaching speed; the overcrank alarm comes in; the bus stays dead while the UPS battery drains.',
    response: ['Check the controller mode and alarms at the generator.', 'Start the backup per the site plan; shed load if the plan calls for it.', 'Track UPS runtime against the time to restore.'],
    inject: { actions: [{ a: 'failToStart', p: 1 }, { a: 'fail', id: 'UTIL-A' }], within: 60 },
  },
  {
    id: 'ups-eod',
    title: 'UPS battery running toward end of discharge',
    system: 'electrical',
    causes: ['Long outage with no generator', 'Aged or cold batteries giving less runtime than the label'],
    alarms: ['UPS-A.BATT', 'UPS-A.LOWBATT'],
    trend: 'State of charge falls in a straight line with load; runtime estimate shortens faster if the batteries are aged or cold.',
    response: ['Get a source back (generator, tie) before the battery runs out.', 'Prepare an orderly IT shutdown if no source will come back in time.'],
  },
  {
    id: 'breaker-trip',
    title: 'Breaker trips',
    system: 'electrical',
    causes: ['Overload held past the trip curve', 'Short circuit or ground fault downstream', 'Trip unit fault or wrong settings'],
    alarms: ['*.TRIP'],
    trend: 'Load on the breaker climbs above its pickup and stays there; the thermal memory fills; the breaker opens and its loads move to the other side or go down.',
    response: ['Do not reclose until the cause is known.', 'Check the load and the trip unit record; inspect downstream.', 'Rebalance load before closing again.'],
  },
  {
    id: 'fuel-low',
    title: 'Generator day tank low',
    system: 'electrical',
    causes: ['Long run with the transfer pump or bulk tank feed not keeping up', 'Fuel transfer pump failed'],
    alarms: ['GEN-*.FUEL'],
    trend: 'Day tank level falls at a steady rate set by load; it should level off when the transfer pump starts.',
    response: ['Check the transfer pump and bulk tank level.', 'Plan a fuel delivery for long outages.'],
  },
  {
    id: 'chiller-trip',
    title: 'Chiller trips',
    system: 'cooling',
    causes: ['High head pressure (hot condenser water, fouled tubes, tower problem)', 'Low evaporator flow', 'Loss of power', 'Internal fault (oil, motor, controls)'],
    alarms: ['CH-01.TRIP', 'TES.DISCH'],
    trend: 'Chiller kW drops to zero; CHW supply starts to rise; the storage tank starts discharging; the BMS calls the next chiller, which loads after its start delay.',
    response: ['Confirm the standby chiller started and loaded.', 'Find the trip reason on the chiller panel before resetting.', 'Fix the cause, then reset one chiller at a time.'],
    inject: { actions: [{ a: 'fail', id: 'CH-01' }], within: 30 },
  },
  {
    id: 'chw-pump-loss',
    title: 'Chilled water pumps lost',
    system: 'cooling',
    causes: ['Pump or VFD failure', 'Loss of power to the pump starters', 'Closed valve or air-bound pump'],
    alarms: ['CHW.FLOW-LO', 'CHWP-01.FAIL'],
    trend: 'Flow and differential pressure collapse; coils stop cooling at once, so supply air rises to return temperature within a minute; rack inlets follow within minutes.',
    response: ['Start the standby pump; check the VFD and starter.', 'This is the fastest cooling emergency: prepare to shed load.'],
    inject: { actions: [{ a: 'fail', id: 'CHWP-01' }, { a: 'fail', id: 'CHWP-02' }, { a: 'fail', id: 'CHWP-03' }], within: 30 },
  },
  {
    id: 'tower-loss',
    title: 'Cooling towers lost on a hot day',
    system: 'cooling',
    causes: ['Tower fan motor overloads', 'Low basin level or make-up water failure', 'Tower fan VFD fault'],
    alarms: ['CT-01.FAIL', 'CH-01.TRIP'],
    trend: 'Condenser water leaving temperature climbs toward the head pressure trip (the condenser-water-high alarm warns first when it climbs slowly); chiller kW per ton rises; water-cooled chillers trip one by one if it keeps climbing.',
    response: ['Reset tower fans and check basin level.', 'Use the air-cooled backup if fitted.', 'Restart chillers only after condenser water is back in range.'],
    inject: { weather: 'hot-dry', actions: [{ a: 'fail', id: 'CT-01' }, { a: 'fail', id: 'CT-02' }], within: 120 },
  },
  {
    id: 'cooling-shortfall',
    title: 'Cooling plant short of the load',
    system: 'cooling',
    causes: ['Several chillers out at once', 'Storage tank already discharged', 'Hot day derating air-cooled units'],
    alarms: ['TES.DISCH', 'CHW.SUPPLY-HI'],
    trend: 'Tank discharges in a straight line; near empty the warm layer reaches the outlet and supply temperature starts to climb before the tank reads zero.',
    response: ['Bring every available chiller back.', 'Know the tank ride-through in minutes at this load.', 'Prepare load shedding if supply keeps rising.'],
    inject: { actions: [{ a: 'fail', id: 'CH-01' }, { a: 'fail', id: 'CH-02' }, { a: 'fail', id: 'CH-03' }, { a: 'fail', id: 'ACH-04' }], within: 2700 },
  },
  {
    id: 'crah-loss',
    title: 'Air handler (CRAH) lost',
    system: 'hall',
    causes: ['Fan or EC motor failure', 'Loss of power', 'Chilled water valve stuck closed'],
    alarms: ['CRAH-101.FAIL'],
    trend: 'Other CRAH fans speed up to hold cold-aisle pressure; total fan kW rises; rack inlets stay in range while the remaining units have margin.',
    response: ['Confirm the others picked up (fan speed, supply temperature).', 'Check how many more you can lose before inlets climb.'],
    inject: { actions: [{ a: 'fail', id: 'CRAH-101' }], within: 5 },
  },
  {
    id: 'containment-door',
    title: 'Containment door left open',
    system: 'hall',
    causes: ['Door propped open during work', 'Door closer broken'],
    alarms: ['HALL.DOOR'],
    trend: 'CRAH fans speed up and return air gets colder (cold air bypasses the racks); rack inlets near the door warm; cooling energy and PUE go up.',
    response: ['Close the door; fix the closer.', 'Remind teams to keep containment closed while working.'],
    nuisance: 'Low priority with a 2-minute on-delay, so a door opened for a moment does not alarm.',
    inject: { actions: [{ a: 'containment', mode: 'door-open' }], within: 130 },
  },
  {
    id: 'hot-aisle-recirc',
    title: 'Hot air getting back to rack inlets',
    system: 'hall',
    causes: ['No containment or missing blanking panels', 'Too few perforated tiles in the cold aisle', 'Cold aisle starved of air'],
    alarms: ['HALL.INLET-HI'],
    trend: 'Rack inlet rises while supply air stays cold; CRAH valves open further to compensate until the coils are maxed.',
    response: ['Install blanking panels; close gaps.', 'Check tile layout against rack load.', 'Restore containment.'],
    nuisance: 'Without its 0.5 °C deadband and 60 s on-delay this alarm chatters when the inlet hovers at the limit.',
  },
  {
    id: 'cdu-loss',
    title: 'Liquid cooling unit (CDU) lost',
    system: 'hall',
    causes: ['CDU pump failure', 'Loss of power', 'Leak detection shut it down'],
    alarms: ['CDU-1.FAIL', 'GPU-1.THROTTLE'],
    trend: 'Coolant temperature climbs within seconds; GPUs throttle (power halves), then shut down if it keeps climbing.',
    response: ['Restore the CDU or start its backup at once.', 'Expect GPU racks on that row to throttle or trip within minutes.'],
    inject: { actions: [{ a: 'fail', id: 'CDU-1' }], within: 60 },
  },
  {
    id: 'ups-room-cooling',
    title: 'UPS room cooling lost',
    system: 'electrical',
    causes: ['DX unit compressor or fan failure', 'Loss of power to the unit'],
    alarms: ['CRAC-201.FAIL', 'UPSROOM.HI'],
    trend: 'UPS room temperature rises slowly (large room, steady UPS heat); battery life shortens fast above about 77 °F.',
    response: ['Restore cooling or set up temporary cooling.', 'Open doors only if the site plan allows.'],
    inject: { actions: [{ a: 'fail', id: 'CRAC-201' }], within: 3600 },
  },
  {
    id: 'doas-loss',
    title: 'Outdoor air unit (DOAS) lost',
    system: 'hall',
    causes: ['Fan or coil failure', 'Loss of power'],
    alarms: ['DOAS-01.FAIL'],
    trend: 'Hall pressure goes negative; dew point drifts toward outdoor over hours.',
    response: ['Start the standby DOAS.', 'Watch hall humidity on humid days.'],
    inject: { actions: [{ a: 'fail', id: 'DOAS-01' }], within: 5 },
  },
];
