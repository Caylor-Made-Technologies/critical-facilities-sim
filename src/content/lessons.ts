/**
 * Guided walkthroughs. Each step can drive the simulator (actions) and
 * point at a component (focus). Every step also has a plain "simpler"
 * explanation for people who are brand new.
 *
 * Steps are cumulative and replayed from the start each time, so going
 * back and forth always shows the right plant state.
 */
import { buildPlant, Simulation, type Topology, type WeatherId } from '../sim';

export type SimAction =
  | { do: 'topology'; t: Topology }
  | { do: 'fail'; id: string }
  | { do: 'restore'; id: string }
  | { do: 'advance'; s: number }
  | { do: 'open'; id: string }
  | { do: 'close'; id: string }
  | { do: 'removeKey'; lock: string }
  | { do: 'insertKey'; key: string; lock: string }
  | { do: 'ups'; sys: string; mode: 'static-bypass' | 'auto' }
  | { do: 'maint'; id: string }
  | { do: 'weather'; w: WeatherId };

export type FigureId = 'refrigeration' | 'heat-path';

export interface LessonStep {
  title: string;
  body: string[];
  simpler: string;
  actions?: SimAction[];
  focus?: string;
  /** Which simulator view to show for this step. */
  view?: 'electrical' | 'mechanical';
  /** Show an animated figure, optionally highlighting one part of it. */
  figure?: { id: FigureId; highlight?: string };
}

export type LessonArea = 'electrical' | 'mechanical' | 'safety';

export interface Lesson {
  id: string;
  title: string;
  area: LessonArea;
  level: 'Beginner' | 'Intermediate';
  minutes: number;
  summary: string;
  topology?: Topology;
  steps: LessonStep[];
}

export const LESSONS: Lesson[] = [
  {
    id: 'power-path',
    area: 'electrical',
    title: 'Start here: how power reaches a rack',
    level: 'Beginner',
    minutes: 4,
    summary: 'Follow the A-side path from the utility to a GPU rack, one component at a time.',
    topology: '2N',
    steps: [
      {
        title: 'The big picture',
        body: [
          'A data center turns grid power into extremely reliable power for servers. Every stage either changes the power (voltage, AC/DC) or adds a backup.',
          'This plant is "2N": there are two complete paths, A and B. Each can carry the whole load alone. We\'ll walk the A side.',
        ],
        simpler: 'Think of it like two separate roads to the same house. If one road closes, you can still get home on the other.',
      },
      {
        title: 'Utility A',
        body: ['Power arrives from the electric company at medium voltage (thousands of volts). Big sites take two independent feeds.'],
        simpler: 'This is where the power comes in from the power company, like the water main for a house.',
        focus: 'UTIL-A',
      },
      {
        title: 'Switchgear and transformer',
        body: ['MV switchgear protects the site with relays and breakers. The transformer then steps the voltage down to 480 V for the building.'],
        simpler: 'The switchgear is a giant, smart circuit breaker. The transformer turns the "high pressure" power down to a level the building can use.',
        focus: 'TX-A',
      },
      {
        title: 'Automatic transfer switch',
        body: ['The ATS watches the utility. If it fails, the ATS starts the generators and switches over to them in roughly 10 seconds.'],
        simpler: 'It\'s an automatic "if the power company fails, use the generators" switch.',
        focus: 'ATS-A',
      },
      {
        title: 'Main switchboard',
        body: ['MSB-A distributes power to the UPS and to mechanical equipment (chillers, pumps). A tie breaker to MSB-B lets one source feed both boards during maintenance.'],
        simpler: 'This is the main breaker panel, like the one in your garage but the size of a room.',
        focus: 'MSB-A',
      },
      {
        title: 'UPS: the zero-gap backup',
        body: [
          'Generators need about 10 seconds to start; servers can\'t survive even a fraction of a second without power. The UPS bridges that gap with batteries, with no break at all.',
          'It constantly converts AC → DC → AC, so the load always runs from the inverter and never sees utility blips.',
        ],
        simpler: 'The UPS is a huge battery backup, like the one under a computer desk but big enough for a whole room of servers.',
        focus: 'UPS-A1',
      },
      {
        title: 'Distribution to the rack',
        body: ['The critical bus feeds busway (for GPU rows) and PDUs (for general rows). Each rack has an A cord and a B cord, from different sides.'],
        simpler: 'Each rack plugs into two different outlets that come from two different backup systems.',
        focus: 'BW-1A',
      },
      {
        title: 'The rack',
        body: ['R-01 is a 130 kW GPU rack. It pulls about half its power from each cord. Lose one cord and the other carries everything, with no interruption.', 'Next: try the "utility outage" walkthrough, or switch the simulator to Failure mode and break things yourself.'],
        simpler: 'The server has two power supplies. If one stops, the other keeps it running.',
        focus: 'R-01',
      },
    ],
  },
  {
    id: 'utility-outage',
    area: 'electrical',
    title: 'What happens when the utility fails',
    level: 'Beginner',
    minutes: 5,
    summary: 'Watch the battery yard, generators, and transfer switch catch the load, second by second.',
    topology: 'N+1',
    steps: [
      {
        title: 'Normal operation',
        body: ['Everything is on utility power. The generators are in AUTO standby, warm and ready. The BESS (battery yard) is charged.'],
        simpler: 'All quiet. The backup systems are waiting.',
        focus: 'UTIL-A',
      },
      {
        title: 'Utility A fails',
        body: [
          'The utility drops. In the same instant, the BESS starts discharging into switchboard A, so the UPS input never even goes dark.',
          'Without a BESS, the UPS batteries would carry the load here instead. Either way, the servers don\'t notice.',
        ],
        simpler: 'The power company goes out. The big battery yard takes over immediately.',
        actions: [{ do: 'fail', id: 'UTIL-A' }],
        focus: 'BESS-A',
      },
      {
        title: 'Generators get the start signal',
        body: ['The ATS waits a couple of seconds to make sure it\'s not just a blip, then sends the start signal. The generators crank.'],
        simpler: 'After a short wait to be sure, the generators start up.',
        actions: [{ do: 'advance', s: 3 }],
        focus: 'GEN-01',
      },
      {
        title: 'Transfer to generator',
        body: [
          'About 10 seconds after starting, the generators are at speed, synced to the paralleling bus, and the ATS transfers the load to them. The BESS stops discharging and will recharge later.',
          'Check the event log for the exact timeline. Operators would now verify generator loads, fuel levels, and that every UPS is back on normal.',
        ],
        simpler: 'The generators are now running the building. The battery yard can rest.',
        actions: [{ do: 'advance', s: 12 }],
        focus: 'ATS-A',
      },
      {
        title: 'Utility comes back',
        body: [
          'When the utility returns, the ATS does NOT switch back right away. It waits for a retransfer timer (5 minutes here) to prove the utility is stable.',
          'Then it retransfers and the generators run unloaded to cool down before stopping.',
        ],
        simpler: 'When the power company comes back, the system waits a few minutes to be sure, then switches back and turns the generators off.',
        actions: [{ do: 'restore', id: 'UTIL-A' }, { do: 'advance', s: 305 }],
        focus: 'ATS-A',
      },
      {
        title: 'What operators do',
        body: [
          'During a real event: confirm every generator started and carries load, watch UPS modes, check fuel, notify per the escalation list, and log times.',
          'Try it yourself: in Failure mode, fail BESS-A and then UTIL-A. Watch the UPS go on battery and count down.',
        ],
        simpler: 'People watch every step and are ready to act if any backup fails.',
      },
    ],
  },
  {
    id: 'redundancy',
    area: 'electrical',
    title: 'N vs N+1 vs 2N: same failure, different outcome',
    level: 'Beginner',
    minutes: 5,
    summary: 'Fail the same parts in different designs and see why redundancy levels matter.',
    steps: [
      {
        title: 'N: exactly enough',
        body: ['This plant has 3 UPS modules for a ~2,190 kW load: exactly enough (N). Let\'s fail one module.', 'The remaining two are overloaded, so the UPS transfers to static bypass. The racks stay up, but on raw utility power with no battery behind them.'],
        simpler: 'With no spare, losing one part means the rest are overworked and the safety net is gone.',
        actions: [{ do: 'topology', t: 'N' }, { do: 'fail', id: 'UPS-A1' }],
        focus: 'UPS-A2',
      },
      {
        title: 'N+1: one spare',
        body: ['Now 4 modules, same load. Fail one module: the other three share the load and stay on inverter. No drama.', 'Check the capacity panel: "N+1" became "N". You\'re now one failure from trouble, so repairs are urgent.'],
        simpler: 'With one spare, you can lose one part and be fine. But now you have no spare left.',
        actions: [{ do: 'topology', t: 'N+1' }, { do: 'fail', id: 'UPS-A1' }],
        focus: 'UPS-A2',
      },
      {
        title: 'N+1 has a weak spot',
        body: ['N+1 adds spare modules, but everything still flows through ONE critical bus. Fail that bus and all 36 racks drop.', 'This is a single point of failure. More modules don\'t fix it; a second path does.'],
        simpler: 'Spare engines don\'t help if there\'s only one fuel line and it breaks.',
        actions: [{ do: 'topology', t: 'N+1' }, { do: 'fail', id: 'CB-A' }],
        focus: 'CB-A',
      },
      {
        title: '2N: two complete paths',
        body: ['In 2N, the same critical-bus failure drops nothing. Every dual-corded rack simply pulls all its power from the B side.', 'Single-corded racks survive too, because their static transfer switch moves them to B in about 4 milliseconds.'],
        simpler: 'Two completely separate systems. One can break completely and the other carries everything.',
        actions: [{ do: 'topology', t: '2N' }, { do: 'fail', id: 'CB-A' }],
        focus: 'CB-B',
      },
      {
        title: 'Concurrently maintainable vs fault tolerant',
        body: [
          'Concurrently maintainable: any component can be taken out for planned maintenance without dropping load (needs redundant paths, like 2N or distributed redundant).',
          'Fault tolerant: the plant survives an unplanned failure of any single component automatically. While something is out for maintenance, that protection can be reduced.',
          'Try the other designs in the Simulator: distributed redundant and block redundant reach similar resilience with fewer UPS modules.',
        ],
        simpler: '"Maintainable" means you can fix things without turning anything off. "Fault tolerant" means it survives surprises too.',
      },
    ],
  },
  {
    id: 'sts',
    area: 'electrical',
    title: 'Dual-corded vs single-corded racks',
    level: 'Beginner',
    minutes: 3,
    summary: 'See how a static transfer switch protects equipment that only has one power cord.',
    topology: '2N',
    steps: [
      {
        title: 'Two kinds of racks',
        body: ['Most IT gear has two power supplies (dual-corded). Some equipment has only one (single-corded). Row 4 has both: R-13 to R-18 are dual-corded, R-19 and R-20 are single-corded.'],
        simpler: 'Some servers have two plugs, some only have one.',
        focus: 'R-19',
      },
      {
        title: 'Lose the A-side PDU',
        body: ['PDU-4A fails. The dual-corded racks lose their A cord and keep running on B.', 'The single-corded racks hang off STS-4, which instantly switches from its preferred source (A) to its alternate (B).'],
        simpler: 'The two-plug servers just use their other plug. The one-plug servers get switched to the other side automatically.',
        actions: [{ do: 'fail', id: 'PDU-4A' }],
        focus: 'STS-4',
      },
      {
        title: 'The STS is its own weak spot',
        body: ['Now fail the RPP downstream of the STS. Both single-corded racks drop, because they have no second path at all.', 'That\'s why sites push for dual-corded equipment everywhere they can.'],
        simpler: 'The switch helps, but if the panel after it breaks, the one-plug servers have nowhere else to go.',
        actions: [{ do: 'fail', id: 'RPP-4' }],
        focus: 'RPP-4',
      },
    ],
  },
  {
    id: 'kirk-mtm',
    area: 'electrical',
    title: 'Kirk keys: why you can\'t close the tie',
    level: 'Intermediate',
    minutes: 5,
    summary: 'Use trapped-key interlocks on a main-tie-main switchboard, and see the sim block an illegal move.',
    topology: '2N',
    steps: [
      {
        title: 'The setup',
        body: [
          'Switchboards A and B each have a main breaker (MB-A, MB-B) and share a normally open tie breaker (TIE-AB).',
          'There are 3 locks but only 2 keys. A key is trapped in its lock while that breaker is closed. So at most 2 of the 3 breakers can ever be closed.',
        ],
        simpler: 'There are three switches but only two keys. You need a key to turn a switch on, so you can never turn on all three.',
        focus: 'TIE-AB',
      },
      {
        title: 'Try the illegal move',
        body: ['With both mains closed, try to close the tie. It\'s blocked: the tie\'s lock is empty.', 'If it weren\'t blocked, Utility A and Utility B would be tied together without synchronization. That can cause a violent fault, and can back-feed a utility line that crews think is dead.'],
        simpler: 'The system won\'t let you connect two power companies together. That would be like crossing two hoses at different pressures, but with lightning.',
        actions: [{ do: 'close', id: 'TIE-AB' }],
        focus: 'TIE-AB',
      },
      {
        title: 'Open Main A',
        body: ['Plan: put switchboard A on Utility B so Utility A\'s gear can be maintained. Step 1: open MB-A. Switchboard A is briefly dead; the BESS (and UPS batteries) carry it.'],
        simpler: 'First, turn off the main switch for side A.',
        actions: [{ do: 'open', id: 'MB-A' }],
        focus: 'MB-A',
      },
      {
        title: 'Take the key',
        body: ['With MB-A open, its key is free. Remove it. MB-A is now locked open: nobody can close it while you hold the key.'],
        simpler: 'Now the key comes out, and that switch is locked off.',
        actions: [{ do: 'removeKey', lock: 'L-MB-A' }],
        focus: 'MB-A',
      },
      {
        title: 'Close the tie',
        body: ['Insert the key into the tie lock and close TIE-AB. Switchboard A is now fed from Utility B through the tie. No sources were ever paralleled.'],
        simpler: 'Put the key in the middle switch and turn it on. Now side B powers both sides.',
        actions: [
          { do: 'insertKey', key: 'K-MTM-1', lock: 'L-TIE-AB' },
          { do: 'close', id: 'TIE-AB' },
        ],
        focus: 'TIE-AB',
      },
      {
        title: 'Why interlocks matter',
        body: [
          'Interlocks turn a rule ("never close all three") into something physically impossible to break by mistake.',
          'Never use spare keys or force a lock. Even if someone did, this simulator would refuse to parallel the sources. Real equipment might not.',
        ],
        simpler: 'The keys make it impossible to make that dangerous mistake by accident.',
      },
    ],
  },
  {
    id: 'ups-bypass',
    area: 'electrical',
    title: 'UPS maintenance bypass, step by step (MOP)',
    level: 'Intermediate',
    minutes: 7,
    summary: 'Take UPS-A out for maintenance without dropping a single rack, following a MOP-style sequence.',
    topology: 'N+1',
    steps: [
      {
        title: 'Why this is risky',
        body: [
          'In N+1 there\'s one UPS system and one path. To work on it, you must move the load to the maintenance bypass, around the UPS, without a break.',
          'Do it in the wrong order and all 36 racks drop. This is exactly what a MOP prevents.',
        ],
        simpler: 'We need to unplug the battery backup to fix it, without the servers ever noticing.',
        focus: 'UPS-A1',
      },
      {
        title: 'Step 1: UPS to static bypass',
        body: ['Command UPS-A to static bypass. The load now flows through the UPS\'s internal bypass switch, straight from switchboard A.', 'Verify on the display: bypass ON, load unchanged.'],
        simpler: 'Tell the UPS to let power pass straight through instead of through its batteries.',
        actions: [{ do: 'ups', sys: 'A', mode: 'static-bypass' }],
        focus: 'UPS-A1',
      },
      {
        title: 'Step 2: release the key',
        body: ['The key release unit (SKRU) only lets go of the bypass key once the UPS is on static bypass. Remove the key.', 'If you had tried this before step 1, it would refuse.'],
        simpler: 'Now the safety key comes out, because the UPS is in the right mode.',
        actions: [{ do: 'removeKey', lock: 'L-SKRU-A' }],
        focus: 'MBB-A',
      },
      {
        title: 'Step 3: close maintenance bypass',
        body: ['Insert the key into MBB-A and close it. Make-before-break: both the static bypass and the maintenance bypass now feed the critical bus from the same source.', 'HOLD POINT: confirm with the control room before opening anything.'],
        simpler: 'Turn on the bypass path, so there are now two ways for power to reach the servers.',
        actions: [
          { do: 'insertKey', key: 'K-MBP-A', lock: 'L-MBB-A' },
          { do: 'close', id: 'MBB-A' },
        ],
        focus: 'MBB-A',
      },
      {
        title: 'Step 4: isolate the UPS',
        body: ['Open the UPS output breaker (UOB-A), then the input (UIB-A) and static bypass input (SBB-A) breakers. The load is now fully on maintenance bypass.', 'Notice: the racks never lost power, but they have NO battery protection right now. Keep this window short.'],
        simpler: 'Disconnect the UPS on all sides. The servers run on the bypass path.',
        actions: [
          { do: 'open', id: 'UOB-A' },
          { do: 'open', id: 'UIB-A' },
          { do: 'open', id: 'SBB-A' },
        ],
        focus: 'UOB-A',
      },
      {
        title: 'Step 5: tag out and lock out',
        body: ['Tag the UPS out of service. In real life you would now apply your personal LOTOTO locks, open the battery breakers, wait for capacitors to discharge, and test for absence of voltage before touching anything.'],
        simpler: 'Put your lock on it so nobody turns it back on while you work.',
        actions: [{ do: 'maint', id: 'UPS-A1' }],
        focus: 'UPS-A1',
      },
      {
        title: 'The wrong way',
        body: ['For contrast: reset the plant in the Simulator and open UOB-A first. Every rack drops instantly. One wrong step, total outage.', 'Returning to normal is the same sequence in reverse, with the same checks.'],
        simpler: 'Doing the steps in the wrong order turns off the whole room. Order matters.',
      },
    ],
  },
  {
    id: 'loto-basics',
    area: 'safety',
    title: 'LOTOTO: lock out, tag out, try out',
    level: 'Beginner',
    minutes: 4,
    summary: 'The steps that keep you from being hurt by equipment that someone else turns on, ending with a try-out and a live-dead-live test with a properly rated meter.',
    steps: [
      { title: 'Why', body: ['Equipment can start or be energized by someone who doesn\'t know you\'re working on it. Your personal lock makes that impossible. OSHA calls it lockout/tagout (LOTO); many sites teach it as LOTOTO, lock out, tag out, try out, so the proving step is never skipped.'], simpler: 'Your lock means "a person is working here; this cannot be turned on." The try-out proves it.' },
      { title: 'Prepare & notify', body: ['Read the equipment\'s LOTOTO procedure. Identify every energy source (electric, stored, mechanical, pressure). Tell everyone affected.'], simpler: 'Know everything that could power it, and tell people what you\'re doing.' },
      { title: 'Shut down & isolate', body: ['Stop it normally, then open every disconnect, breaker, or valve that feeds it.'], simpler: 'Turn it off, then cut every supply.' },
      { title: 'Lock, tag & release stored energy', body: ['Your lock and tag on each isolation point. Bleed pressure, discharge capacitors, block moving parts.'], simpler: 'Lock every switch and let any leftover energy out.' },
      { title: 'Try out', body: ['Try to start it from every place it can be started: the local start button, the BMS, the HAND position. Nothing should move or hum. Then return every control to OFF.'], simpler: 'Push start. If nothing happens, your locks are working. Put the switches back to off.' },
      { title: 'Check your meter first', body: ['Before any electrical test, confirm your meter is rated for the job: its CAT category (CAT III or CAT IV for switchgear and panels) and voltage rating must meet or beat the circuit. The leads and probes need the same rating, with no cracks or exposed metal. Use the site\'s required tester, and make sure it isn\'t out of its test or calibration date.'], simpler: 'A meter rated too low can blow up in your hand. Check the rating on the meter and the leads before you test.' },
      { title: 'Live-dead-live', body: ['Live: prove the meter works on a known live source. Dead: test the circuit you locked out, every phase to phase and phase to ground (and DC where there is any). Live: prove the meter on the known source again. If the last check fails, the "dead" reading can\'t be trusted.'], simpler: 'Prove the meter, test the circuit, prove the meter again.' },
      { title: 'When you\'re done', body: ['Clear tools and people, reinstall guards, notify, then each person removes only their own lock.', 'More detail is in the Safety tab.'], simpler: 'Clean up, tell everyone, and only you take off your lock.' },
    ],
  },
  {
    id: 'rounds',
    area: 'safety',
    title: 'Your first rounds',
    level: 'Beginner',
    minutes: 4,
    summary: 'What a good operator round looks like, and why readings beat walk-throughs.',
    steps: [
      { title: 'The purpose', body: ['Rounds catch problems before they become outages. The goal isn\'t to walk; it\'s to notice change.'], simpler: 'You\'re looking for anything different from normal.' },
      { title: 'Use all your senses', body: ['Look: alarms, leaks, positions, gauges. Listen: new noises, rattles, buzzing. Smell: burning, ozone, refrigerant, fuel. Feel the air: hot spots, airflow changes. Never touch equipment to check temperature.'], simpler: 'If something looks, sounds, or smells odd, write it down and tell someone.' },
      { title: 'Record readings', body: ['Write real numbers (temperatures, pressures, loads, battery voltages). A number that slowly creeps over weeks is the early warning a quick glance misses.'], simpler: 'Numbers let you spot slow changes.' },
      { title: 'Check the lineup', body: ['Is every breaker, valve, and controller in its normal position and in AUTO? Equipment left in manual or bypass is a hidden loss of redundancy.'], simpler: 'Make sure everything is set the way it should be.' },
      { title: 'Report', body: ['Report abnormal findings right away, even if you\'re not sure. A false alarm costs a minute; a missed one can cost the site.', 'The Equipment tab lists what to check on each type of equipment.'], simpler: 'When in doubt, speak up.' },
    ],
  },
  // ------------------------------- Mechanical -------------------------------
  {
    id: 'heat-path',
    area: 'mechanical',
    title: 'Start here: where the heat goes',
    level: 'Beginner',
    minutes: 4,
    summary: 'Follow heat from a GPU chip all the way outdoors, one handoff at a time.',
    steps: [
      {
        title: 'Every watt becomes heat',
        body: ['Almost every watt the servers use turns into heat. 2,100 kW of IT means about 2,100 kW of heat that must leave the building, all day, every day.', 'Cooling is a relay race: heat gets handed from one fluid to the next until it reaches the outdoors.'],
        simpler: 'Computers turn electricity into heat, like a space heater. We have to carry that heat outside.',
        figure: { id: 'heat-path' },
      },
      {
        title: 'Chip to air or liquid',
        body: ['Air-cooled servers blow heat into the hot aisle. GPU racks put most of their heat into liquid running through cold plates on the chips, through a CDU.'],
        simpler: 'Regular servers use fans. The powerful GPU servers use water pipes touching the chips.',
        figure: { id: 'heat-path', highlight: 'rack' },
      },
      {
        title: 'Air to chilled water',
        body: ['CRAH units pull hot aisle air across chilled-water coils. CDUs hand liquid-cooling heat to the facility water through a heat exchanger. Both dump the heat into the chilled water loop.'],
        simpler: 'Big fans blow the hot air over cold water pipes, and the water soaks up the heat.',
        figure: { id: 'heat-path', highlight: 'crah' },
      },
      {
        title: 'Chilled water to the chiller',
        body: ['Pumps carry the warmed chilled water back to the chillers. The chiller\'s refrigeration cycle pulls the heat out and pumps it "uphill" into the condenser water.'],
        simpler: 'The chiller is a giant refrigerator that moves heat from one water loop to another.',
        figure: { id: 'heat-path', highlight: 'chiller' },
      },
      {
        title: 'Condenser water to the outdoors',
        body: ['Condenser water goes to the cooling towers, where evaporating a little of it cools the rest, and the heat leaves with the air.', 'On cold days the towers can cool the chilled water directly (free cooling) and the chillers can rest.'],
        simpler: 'The cooling towers spray the warm water through outside air, which carries the heat away.',
        figure: { id: 'heat-path', highlight: 'tower' },
      },
    ],
  },
  {
    id: 'cooling-failure',
    area: 'mechanical',
    title: 'When cooling fails on a 105 °F day',
    level: 'Intermediate',
    minutes: 6,
    summary: 'Lose a chiller, then the towers, then a CDU, and watch the storage tank, standby units, and GPUs react.',
    topology: '2N',
    steps: [
      {
        title: 'The plant on a hot afternoon',
        body: [
          'It is 105 °F outside. The wet bulb is too high for free cooling, so two water-cooled chillers carry the load, with CH-03 on standby.',
          'Watch the pipe colors: blue is chilled water headed to the hall, orange and red are warm water headed back to the towers.',
        ],
        simpler: 'It\'s very hot out, so the big refrigerators are doing all the work.',
        actions: [{ do: 'weather', w: 'hot-dry' }, { do: 'advance', s: 300 }],
        focus: 'CH-01',
        view: 'mechanical',
      },
      {
        title: 'Lose a chiller',
        body: [
          'CH-01 fails. The BMS calls standby CH-03, but a chiller needs about 2 minutes to start and load.',
          'Meanwhile the chilled water storage tank discharges to cover the gap. Check its percentage dropping and the event log.',
        ],
        simpler: 'One refrigerator broke. A spare is starting, and a big tank of cold water covers the gap.',
        actions: [{ do: 'fail', id: 'CH-01' }, { do: 'advance', s: 30 }],
        focus: 'TES-01',
        view: 'mechanical',
      },
      {
        title: 'The standby picks up',
        body: ['Two minutes later CH-03 is running. The tank stops discharging and starts recharging. N+1 did its job: no rack ever saw a temperature change.'],
        simpler: 'The spare is running now. Nobody in the data hall noticed anything.',
        actions: [{ do: 'advance', s: 120 }],
        focus: 'CH-03',
        view: 'mechanical',
      },
      {
        title: 'Now lose two cooling towers',
        body: [
          'Two towers fail. The last tower is badly overloaded, condenser water gets hotter, and refrigerant head pressure climbs.',
          'On a 105 °F day it climbs past the limit and the water-cooled chillers trip on HIGH HEAD PRESSURE. A safety trip like this needs investigation and a manual reset.',
        ],
        simpler: 'The towers that dump heat outside broke. The refrigerators overheat and shut themselves off to protect themselves.',
        actions: [{ do: 'fail', id: 'CT-01' }, { do: 'fail', id: 'CT-02' }, { do: 'advance', s: 5 }],
        focus: 'CH-02',
        view: 'mechanical',
      },
      {
        title: 'Air-cooled chiller and storage buy time',
        body: [
          'With no tower capacity, the BMS starts the air-cooled chiller ACH-04, which doesn\'t need towers. But it is smaller and loses capacity in the heat.',
          'The storage tank covers the difference. Its "minutes left" is now the most important number on the BMS. Operators would restore towers or chillers before it runs out.',
        ],
        simpler: 'A different kind of refrigerator that uses outside air starts up, and the cold water tank fills in the rest, but only for a while.',
        actions: [{ do: 'advance', s: 300 }],
        focus: 'ACH-04',
        view: 'mechanical',
      },
      {
        title: 'Liquid cooling: seconds, not minutes',
        body: [
          'Now CDU-2 fails. GPU cold plates hold very little coolant, so the row 2 GPUs hit throttling temperature in about 30 seconds and would trip offline soon after.',
          'Compare that to the air side, where the hall barely moved. Liquid-cooled racks need the fastest response of anything in the building.',
        ],
        simpler: 'The water pump for the GPU row stopped, and those chips overheat almost instantly.',
        actions: [{ do: 'fail', id: 'CDU-2' }, { do: 'advance', s: 40 }],
        focus: 'CDU-2',
        view: 'mechanical',
      },
      {
        title: 'What operators do',
        body: [
          'Protect the load first: confirm standby units started, watch storage minutes and rack inlet temperatures, and escalate early.',
          'Then find causes, not symptoms: why did the towers fail? Never reset a tripped chiller over and over, and never jumper its safeties.',
          'Try it yourself: switch weather, fail equipment in Failure mode, and watch the BMS panel.',
        ],
        simpler: 'Keep the servers cool first, then figure out what broke and why.',
      },
    ],
  },
  {
    id: 'chiller-cycle',
    area: 'mechanical',
    title: 'Inside a chiller: the refrigeration cycle',
    level: 'Beginner',
    minutes: 5,
    summary: 'Compressor, condenser, expansion valve, evaporator, with an animated cutaway.',
    steps: [
      {
        title: 'The loop',
        body: ['A chiller moves heat from cold chilled water to warmer condenser water. Heat doesn\'t flow uphill on its own, so a refrigerant loop does the work.', 'Four parts, one loop. Tap any part in the cutaway.'],
        simpler: 'It works like your fridge at home, just much bigger.',
        figure: { id: 'refrigeration' },
      },
      {
        title: '1. Compressor',
        body: ['The compressor squeezes low-pressure refrigerant vapor into high-pressure, hot vapor. This is where most of the chiller\'s electricity goes.'],
        simpler: 'It squeezes the gas, which makes it hot, like a bike pump getting warm.',
        figure: { id: 'refrigeration', highlight: 'compressor' },
      },
      {
        title: '2. Condenser',
        body: ['The hot vapor gives its heat to the condenser water (or outdoor air on an air-cooled chiller) and condenses into a liquid.', 'If the condenser water is too hot, pressure climbs. That\'s high head pressure, and on a 105 °F day it can trip the chiller.'],
        simpler: 'The hot gas cools off and turns into a liquid, passing its heat to the tower water.',
        figure: { id: 'refrigeration', highlight: 'condenser' },
      },
      {
        title: '3. Expansion valve',
        body: ['The liquid passes through a restriction and its pressure drops suddenly. Some of it flashes to vapor and the mix becomes very cold.'],
        simpler: 'Letting the pressure out makes it ice cold, like a spray can getting cold.',
        figure: { id: 'refrigeration', highlight: 'expansion' },
      },
      {
        title: '4. Evaporator',
        body: ['The cold refrigerant boils inside the evaporator by absorbing heat from the chilled water, which leaves colder. The vapor goes back to the compressor and the loop repeats.', 'Operators watch the evaporator and condenser approach temperatures: a rising approach means fouled tubes or low refrigerant.'],
        simpler: 'The cold refrigerant soaks up heat from the water, so the water comes out cold.',
        figure: { id: 'refrigeration', highlight: 'evaporator' },
      },
    ],
  },
  {
    id: 'crah-crac',
    area: 'mechanical',
    title: 'CRAH vs CRAC',
    level: 'Beginner',
    minutes: 2,
    summary: 'Two air units that look alike but work very differently.',
    steps: [
      { title: 'CRAH: air handler', body: ['A CRAH has fans and a chilled-water coil. A valve controls how much chilled water flows through the coil. It has no compressor; the chiller plant does the refrigeration.'], simpler: 'A CRAH is a big fan blowing over cold water pipes.' },
      { title: 'CRAC: air conditioner', body: ['A CRAC is a self-contained DX unit with its own compressor and refrigerant circuit, like a home AC. It works without chilled water.'], simpler: 'A CRAC is a complete air conditioner in a box.' },
      { title: 'Why it matters', body: ['If the chilled water plant fails, every CRAH stops cooling. CRACs keep working if they have power, which is why they often serve small rooms like UPS or telecom rooms.', 'At large scale, CRAHs with an efficient chiller plant use much less energy.'], simpler: 'CRAHs depend on the chillers; CRACs don\'t.' },
    ],
  },
  {
    id: 'doas-humidity',
    area: 'mechanical',
    title: 'DOAS: fresh air, humidity & pressure',
    level: 'Intermediate',
    minutes: 3,
    summary: 'How the dedicated outdoor air system keeps the hall dry, clean, and pressurized.',
    steps: [
      { title: 'Why bring in outdoor air?', body: ['People need ventilation, and the hall needs slight positive pressure so dust and humid air leak out, not in. The DOAS brings in just enough outdoor air to do both.'], simpler: 'It gently pumps clean, dry air in so dirty air can\'t sneak in.' },
      { title: 'Recover energy', body: ['An energy recovery wheel turns slowly between the exhaust and supply air streams, pre-cooling incoming air in summer and pre-warming it in winter.'], simpler: 'A spinning wheel reuses the temperature of the air going out.' },
      { title: 'Dry it out', body: ['A chilled-water coil cools the air below its dew point. Moisture condenses on the coil and drains away, so the air leaving is dry.', 'Too humid risks condensation and corrosion; too dry raises static risk. ASHRAE gives a recommended dew point band.'], simpler: 'Cold pipes pull water out of the air, like a cold drink getting wet on the outside.' },
      { title: 'Reheat and deliver', body: ['Reheat warms the dry air back to a neutral temperature so it doesn\'t overcool the room, and the supply fan delivers it.', 'If a DOAS fails, nothing happens fast, which is exactly why it gets missed. Watch dew point and hall pressure on rounds.'], simpler: 'Warm it back up a little and blow it in.' },
    ],
  },
  {
    id: 'liquid-cooling',
    area: 'mechanical',
    title: 'Liquid cooling & CDUs for GPU racks',
    level: 'Intermediate',
    minutes: 3,
    summary: 'Why 130 kW racks need liquid, and why a CDU failure is urgent.',
    steps: [
      { title: 'Air runs out of room', body: ['A 130 kW rack would need a hurricane of air to cool. Water carries thousands of times more heat per volume, so GPU racks use cold plates mounted right on the chips.'], simpler: 'Air can\'t carry enough heat away from the hottest chips, so we use liquid.' },
      { title: 'Two loops and a heat exchanger', body: ['The facility water (FWS) never touches the chips. A CDU heat exchanger passes the heat from a clean technology cooling loop (TCS) to the facility water. Redundant pumps move the TCS fluid.'], simpler: 'There\'s a clean water loop for the chips and a building water loop, and they swap heat without mixing.' },
      { title: 'Seconds, not minutes', body: ['Cold plates hold very little fluid. If TCS flow stops, GPUs can throttle or shut down within seconds to a minute.', 'Operators verify standby pump health, filter differential pressure, coolant chemistry, and leak detection every round.'], simpler: 'If the pump stops, the chips overheat almost right away, so we watch these closely.' },
    ],
  },
];

/**
 * Build the plant state for a lesson at a given step by replaying every
 * action from the first step up to this one. A 'topology' action starts
 * over with a fresh plant.
 */
export function simForStep(lesson: Lesson, stepIndex: number): Simulation {
  let sim = new Simulation(buildPlant(lesson.topology ?? '2N'));
  for (const step of lesson.steps.slice(0, stepIndex + 1)) {
    for (const a of step.actions ?? []) {
      if (a.do === 'topology') sim = new Simulation(buildPlant(a.t));
      else applyAction(sim, a);
    }
  }
  return sim;
}

export function applyAction(sim: Simulation, a: SimAction): void {
  switch (a.do) {
    case 'topology':
      return; // handled by simForStep
    case 'fail':
      sim.fail(a.id);
      return;
    case 'restore':
      sim.restore(a.id);
      return;
    case 'advance':
      sim.advance(a.s);
      return;
    case 'open':
      sim.openBreaker(a.id);
      return;
    case 'close':
      sim.closeBreaker(a.id);
      return;
    case 'removeKey':
      sim.removeKey(a.lock);
      return;
    case 'insertKey':
      sim.insertKey(a.key, a.lock);
      return;
    case 'ups':
      sim.setUpsSystemMode(a.sys, a.mode);
      return;
    case 'maint':
      sim.setMaintenance(a.id);
      return;
    case 'weather':
      sim.setWeather(a.w);
      return;
  }
}
