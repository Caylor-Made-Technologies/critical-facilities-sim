/**
 * Tips & tricks: short, plain-English field tips, memory aids and
 * "in a pinch" moves. Generic and educational: always follow the
 * equipment manual, your site's procedures, and your lead's direction.
 */

export type TipCat =
  | 'memory'
  | 'electrical'
  | 'meters'
  | 'ups'
  | 'gen'
  | 'refrig'
  | 'air'
  | 'water'
  | 'towers'
  | 'controls'
  | 'trouble'
  | 'pinch'
  | 'safety'
  | 'rounds'
  | 'math'
  | 'shift';

export interface Tip {
  id: string;
  cat: TipCat;
  title: string;
  text: string;
  /** Shown in amber under the tip when a move needs care or approval. */
  caution?: string;
}

export const TIP_CATS: { id: TipCat; label: string; icon: string }[] = [
  { id: 'memory', label: 'Memory aids', icon: '🧠' },
  { id: 'pinch', label: 'In a pinch', icon: '🛟' },
  { id: 'math', label: 'Quick math', icon: '🧮' },
  { id: 'electrical', label: 'Electrical', icon: '⚡' },
  { id: 'meters', label: 'Meters & testing', icon: '📟' },
  { id: 'ups', label: 'UPS & batteries', icon: '🔋' },
  { id: 'gen', label: 'Generators & fuel', icon: '⛽' },
  { id: 'refrig', label: 'Refrigeration', icon: '❄️' },
  { id: 'air', label: 'Air side', icon: '🌬️' },
  { id: 'water', label: 'Water & pumps', icon: '💧' },
  { id: 'towers', label: 'Cooling towers', icon: '🏭' },
  { id: 'controls', label: 'Controls & BMS', icon: '🎛️' },
  { id: 'trouble', label: 'Troubleshooting', icon: '🔍' },
  { id: 'safety', label: 'Safety habits', icon: '🦺' },
  { id: 'rounds', label: 'Rounds & PM', icon: '📋' },
  { id: 'shift', label: 'Shift & career', icon: '🤝' },
];

type Raw = [title: string, text: string, caution?: string];

const RAW: Record<TipCat, Raw[]> = {
  memory: [
    ['CCME: the refrigeration circle', 'Compressor → Condenser → Metering device → Evaporator → back to the Compressor. Say it "Can\'t Cool Much Else." The compressor squeezes the gas hot, the condenser dumps that heat and turns it to liquid, the metering device drops the pressure so it gets cold, and the evaporator boils it while soaking up heat from your water or air.'],
    ['BOY: 480 V wire colors', 'Brown, Orange, Yellow = phases A, B, C on a 277/480 V system, with a gray neutral. It\'s the common US convention, not a code requirement, so check the site\'s color standard and always test. Colors can lie.'],
    ['BRB: 208 V wire colors', 'Black, Red, Blue = phases A, B, C on a 120/208 V system, with a white neutral. Think "Be Right Back." Low voltage is BRB; high voltage is BOY.'],
    ['Green means ground', 'Green, green with a yellow stripe, or bare copper is the equipment ground. It should never carry current in normal operation. Current on a ground wire means something is wrong.'],
    ['Ohm\'s law triangle', 'V = I × R. Cover the one you want: V on top, I and R on the bottom. Volts = amps × ohms; amps = volts ÷ ohms; ohms = volts ÷ amps.'],
    ['Power: "PIE"', 'P = I × E (power = amps × volts). For three-phase, multiply by 1.73 (√3) and the power factor: kW = V × A × 1.73 × PF ÷ 1000.'],
    ['Live-dead-live', 'Test your meter on a known live source, test the circuit you think is dead, then test the known live source again. If the meter died in the middle, step 3 catches it.'],
    ['LOTO in order: "Please Never Skip Important Locks, Really Verify"', 'Prepare, Notify, Shut down, Isolate, Lock & tag, Release stored energy, Verify. The last step is the one people skip. Don\'t.'],
    ['Superheat = suction, subcooling = liquid', 'Superheat is measured on the suction line leaving the evaporator. Subcooling is measured on the liquid line leaving the condenser. "SS and SL" keeps them straight.'],
    ['PASS for extinguishers', 'Pull the pin, Aim at the base of the fire, Squeeze the handle, Sweep side to side. Only fight a small fire with a clear exit behind you.'],
    ['RACE for a fire', 'Rescue anyone in danger, Alarm (pull the station, call it in), Contain (close doors), Extinguish or Evacuate.'],
    ['Fronts face fronts', 'Hot aisle / cold aisle: rack fronts face each other across the cold aisle, backs face each other across the hot aisle. Server air goes front to back.'],
    ['N+1 vs 2N in one line', 'N+1 = one spare module in a shared system. 2N = two complete systems, each able to carry everything. N+1 survives a module; 2N survives a whole side.'],
    ['Quarter-turn valves', 'On a ball or butterfly valve, handle in line with the pipe = open; across the pipe = closed. On multi-turn valves, righty-tighty closes. Always confirm with flow or pressure, not just the handle.'],
    ['STAR for interview answers', 'Situation, Task, Action, Result. Keep each part short, and end with what you learned.'],
  ],
  electrical: [
    ['A breaker that trips twice is talking', 'If it trips again right after a reset, stop. Find the fault before you try again. Repeated closing into a fault can blow the breaker apart.'],
    ['Breakers protect wire, not loads', 'A breaker is sized for the conductor it feeds. Never upsize a breaker to "stop the trips." That turns the wire into the fuse.'],
    ['The 80% rule', 'Continuous loads (3+ hours) should run at no more than 80% of a standard breaker\'s rating. A 20 A circuit carries about 16 A continuously.'],
    ['Keep voltage imbalance under 2%', 'A small voltage imbalance on a 3-phase motor makes a much bigger current imbalance and extra heat. Above about 2%, look for a bad connection or uneven single-phase loads.'],
    ['Single-phasing', 'A 3-phase motor that hums and won\'t start, or runs hot and loud, may have lost a phase. Check all three phases for voltage and current.'],
    ['Reverse a 3-phase motor', 'Swapping any two of the three phase leads reverses rotation. Do it only under LOTO, and check rotation before running a pump: backwards pumps still spin but move little water.'],
    ['Neutrals can run hot', 'Lots of electronic loads on 120/208 V make harmonics that add up in the neutral. A neutral can carry more current than the phases. That\'s why IT panels often have oversized neutrals.'],
    ['Torque, don\'t guess', 'Use the manufacturer\'s torque value on lugs and bus. Loose connections heat up and fail; overtightened ones crack. Infrared scans find the loose ones.'],
    ['Tripped breaker handle', 'A tripped breaker often sits in the middle. Push it fully OFF to reset the mechanism, then ON. If it won\'t stay on, see the first tip in this section.'],
    ['GFCI vs. breaker', 'A GFCI trips on about 5 mA of leakage to protect people. A standard breaker trips on overload and short circuit to protect wire. They do different jobs.'],
    ['kW vs. kVA', 'UPS and generator ratings have both. kVA = kW ÷ power factor. Whichever limit you hit first is your real capacity.'],
    ['Check both cords', 'Dual-corded servers should have one cord on A and one on B. A rack with both cords on the same side looks redundant but isn\'t. Spot-check PDU labels on rounds.'],
    ['Labels change with the gear', 'After any change to switchgear, protection settings or transformers, the arc flash label may be wrong. Report it for review.'],
    ['Bonding vs. grounding', 'Bonding ties metal parts together so they stay at the same voltage. Grounding connects the system to earth. You need both.'],
  ],
  meters: [
    ['Match the CAT rating', 'Use a meter and leads rated CAT III or CAT IV for the voltage on switchgear. A cheap meter can explode on a transient.'],
    ['Inspect your leads', 'Cracked insulation or exposed metal = throw them out. Use tip shields so only a little metal sticks out.'],
    ['One wire in the clamp', 'Clamp around a single conductor to read current. Around a whole cable, the currents cancel. Around all conductors on purpose, it shows leakage.'],
    ['Ghost voltage', 'A high-impedance meter can read voltage induced on a dead wire. Use the meter\'s low-impedance (LoZ) mode to tell a real source from a ghost.'],
    ['Test every combination', 'On 3-phase, test A-B, B-C, A-C, and each phase to ground. One good reading doesn\'t prove the others are dead.'],
    ['Megger with care', 'Insulation testers put out high voltage. Disconnect VFDs, controls and electronics first, and only test de-energized, locked-out circuits.'],
    ['Infrared: compare like to like', 'Compare a connection to the same connection on the other phases. A clear temperature rise over its neighbors deserves a closer look. Shiny metal reads falsely cold.'],
    ['Non-contact testers are a hint', 'A voltage pen is a quick check, not proof something is dead. Use a rated meter and live-dead-live for that.'],
    ['Check the dial before you probe', 'Probing voltage with the meter on amps can blow its fuse or worse. Look at the dial and the lead jacks every time.'],
    ['Write the time down', 'A reading without a time is half a reading. Trends tell you more than single numbers.'],
    ['Good pipe-temperature contact', 'Clamp the probe on clean pipe and cover it with insulation for an accurate reading.'],
    ['Let gauges settle', 'Zero your gauges, let readings settle, and read at eye level.'],
    ['Battery resistance trends', 'Track each battery\'s internal resistance against its own baseline. A jar climbing well above its baseline is on its way out.'],
  ],
  ups: [
    ['77 °F is battery heaven', 'Lead-acid batteries last longest at about 77 °F (25 °C). Every 15 °F hotter roughly halves their life.'],
    ['Bypass means no backup', 'A UPS on static bypass has no battery protection. Treat it as urgent and get it back to normal mode.'],
    ['Sync before you switch', 'Before closing a maintenance bypass, confirm the UPS is on static bypass and in sync. Follow the MOP and the Kirk key sequence exactly.'],
    ['Never open the battery breaker on battery', 'If the UPS is carrying load on battery, opening the battery breaker drops the load.'],
    ['Runtime isn\'t linear', 'Halve the load and battery runtime more than doubles. Double the load and it more than halves.'],
    ['Weakest jar wins', 'A battery string is only as strong as its weakest jar. One bad jar can kill the whole runtime.'],
    ['Report swelling right away', 'Bulging, cracked, leaking or hot batteries need attention now, not at the next PM.'],
    ['Torque battery links at PM', 'Loose battery connections get hot and can melt posts. Check them at every PM.'],
    ['Lithium alarms are real', 'On lithium-ion cabinets, battery management alarms can mean thermal runaway is starting. Never silence them without finding the cause.'],
    ['Read the UPS log first', 'Before resetting an alarm, read the event log. It tells you what happened and in what order.'],
    ['Under 50% in 2N', 'In a 2N design each side should stay under about 50% load, so the survivor can carry everything if one side fails.'],
    ['Overload → static bypass', 'If a UPS went to bypass on overload, find and fix the overload before transferring back.'],
    ['Recharging takes hours', 'After a discharge, batteries can take hours to fully recharge. You have less protection until they do.'],
  ],
  gen: [
    ['End every job in AUTO', 'Return the generator to AUTO and have a second person check it. OFF after a test leaves the site with no backup.'],
    ['Run them loaded', 'Long unloaded runs cause wet stacking (unburned fuel in the exhaust). Monthly runs should carry real load when the site allows.'],
    ['Feel for the block heater', 'A standby engine should be warm. A cold block means a failed heater and a slow, hard start.'],
    ['Charger alarm = no-start risk', 'A failed battery charger on a generator can mean it won\'t crank when you need it. Fix it fast.'],
    ['Fuel goes bad', 'Test fuel regularly. Water and microbes grow in tanks. Fuel polishing cleans it.'],
    ['Drain the water separator', 'Check and drain the fuel/water separator on rounds.'],
    ['Fluids, belts, leaks', 'Coolant level, oil level, belts and leaks every round. Puddles under an engine are never normal.'],
    ['"Not in auto" is a big alarm', 'A generator not in AUTO is one of the most important alarms on site. It means no automatic backup.'],
    ['About 7 gallons per hour per 100 kW', 'At full load a diesel burns about 0.07 gal per kWh. A 2 MW unit at full load burns roughly 140 gal/hr.'],
    ['Check the air filter gauge', 'A clogged air filter starves the engine. Check the restriction indicator.'],
    ['Louvers must open', 'Intake and exhaust louvers must open on start. Blocked air means overheating within minutes.'],
    ['Soot means a leak', 'Black soot marks on exhaust joints point to an exhaust leak. Report it: exhaust carries carbon monoxide.'],
    ['Let it cool down', 'Generators run a cooldown after load is removed. Don\'t E-stop unless people or equipment are in danger.'],
  ],
  refrig: [
    ['Heat flows downhill', 'Heat always moves from hot to cold. A refrigeration machine uses the compressor to push it "uphill" from cold water to warm outdoor air.'],
    ['Feel the lines (carefully)', 'The suction line should be cool and may sweat; the liquid line warm. Use gloves near hot discharge lines.'],
    ['High head pressure suspects', 'Dirty condenser, warm condenser water, low condenser flow, air in the system, or too much refrigerant.'],
    ['Low suction pressure suspects', 'Low charge, low airflow or water flow over the evaporator, a restricted metering device, or an iced coil.'],
    ['Frost on the suction line', 'Frost right up to the compressor can mean liquid flooding back. Liquid destroys compressors.'],
    ['Rising approach = dirty tubes', 'If the gap between refrigerant temperature and water temperature keeps growing, the tubes are probably fouled.'],
    ['Superheat too low or too high', 'Too low: risk of liquid reaching the compressor. Too high: the evaporator is starved and capacity drops.'],
    ['Subcooling clues', 'High subcooling points to overcharge or a restriction. Low subcooling points to undercharge.'],
    ['Read the sight glass', 'Bubbles can mean low charge. A moisture indicator that changed color means moisture in the system.'],
    ['Never vent refrigerant', 'Releasing refrigerant is illegal. Only certified technicians open refrigerant circuits.'],
    ['Chillers restart slowly', 'After a power blip, chillers take minutes to restart (timers, oil warm-up). Plan for it with the storage tank and standby units.'],
    ['Respect anti-short-cycle timers', 'They protect the compressor. Resetting again and again does damage.'],
    ['Don\'t override oil safeties', 'Oil pressure and temperature alarms protect the most expensive part of the chiller.'],
    ['Too-cold condenser water hurts too', 'On some chillers, condenser water that\'s too cold causes low head pressure trips. That\'s why towers have bypass valves and fan staging.'],
  ],
  air: [
    ['Watch filter pressure drop', 'Dirty filters raise fan energy and cut airflow. Change on pressure drop, not just the calendar.'],
    ['Blank every empty U', 'Blanking panels stop hot exhaust from looping back to server inlets. Cheap, fast and very effective.'],
    ['Seal floor cutouts', 'Open cable cutouts leak cold air where it isn\'t needed. Use brush grommets.'],
    ['Perfs belong in cold aisles', 'Perforated tiles in hot aisles or open areas waste cooling.'],
    ['Measure inlets at three heights', 'Check rack inlet temperatures at the bottom, middle and top. Hot spots usually show up at the top.'],
    ['Row ends run hot', 'The ends of rows and tops of racks are where hot air recirculates. Check there first.'],
    ['Not too close to the CRAH', 'Perforated tiles right next to an air handler can get weak airflow (or even pull air down). Move them further out.'],
    ['Belts: tension and alignment', 'Misaligned sheaves eat belts. Check tension and wear on every PM.'],
    ['Keep condensate flowing', 'Clear condensate drains and test float switches. A full pan shuts the unit down.'],
    ['Dew point is the humidity number', 'Too dry means static; too wet means condensation. Dew point tells you more than relative humidity.'],
    ['Supply air control is steadier', 'Controlling on supply air temperature gives servers a steadier inlet than controlling on return.'],
    ['Low coil delta-T', 'A small temperature drop across a coil points to bypassing air, low airflow or a valve problem.'],
    ['Close the containment doors', 'A propped-open containment door breaks the whole design.'],
  ],
  water: [
    ['Cavitation sounds like gravel', 'Low suction pressure or very warm water makes pumps cavitate. Check strainers and suction valves.'],
    ['Watch strainer pressure drop', 'A clogged strainer starves the pump and everything downstream.'],
    ['Vent the high points', 'Air in a loop causes noise and poor flow. Bleed air at the high-point vents.'],
    ['Low delta-T means too much flow', 'If the return water is barely warmer than supply, look for stuck-open valves or bypasses.'],
    ['Close valves slowly', 'Slamming a valve shut causes water hammer that can break pipes and gauges.'],
    ['Check the expansion tank', 'A waterlogged expansion tank makes loop pressure swing up and down.'],
    ['Leak alarms are never "nuisance"', 'Find the water and stop the source. Water and electricity don\'t mix.'],
    ['Seal or packing?', 'Packed glands should drip a little. Mechanical seals should be dry. A dripping mechanical seal is failing.'],
    ['Check rotation after work', 'After motor or pump work, confirm rotation before you call it done.'],
    ['Test glycol strength', 'Use a refractometer to check glycol concentration, especially before winter.'],
    ['Water treatment is silent', 'Corrosion and scale build slowly. Keep up with chemistry checks and records.'],
    ['Rotate lead and lag', 'Alternating which pump leads spreads wear and proves the standby actually runs.'],
    ['Differential pressure at the far end', 'Loop DP is usually controlled near the farthest coil so the end of the line gets enough flow.'],
  ],
  towers: [
    ['Wet bulb sets the floor', 'A tower can\'t make water colder than the outdoor wet bulb. A healthy tower runs a few degrees above it.'],
    ['Vibration trip? Look first', 'A fan that tripped on vibration may have a damaged blade or loose part. Inspect before resetting.'],
    ['Basin heaters in winter', 'Check basin heaters and freeze protection before the first cold snap.'],
    ['Drift eliminators matter', 'Damaged eliminators throw mist (and possibly bacteria) and waste water.'],
    ['Blowdown keeps water clean', 'Blowdown removes concentrated minerals. Too little = scale; too much = wasted water and chemicals.'],
    ['Clean basin strainers', 'Debris from the basin ends up clogging condenser tubes.'],
    ['Fouled fill loses capacity', 'Scale or algae on the fill means warmer water leaving the tower.'],
    ['Watch the make-up valve', 'A stuck float valve means overflow or a low basin. Check the water level on rounds.'],
    ['Gearbox oil', 'Check gearbox oil level and look for leaks on every round.'],
    ['Prevent winter icing', 'Fan cycling and bypass valves keep towers from icing in cold weather.'],
    ['Follow the water program', 'Biocide, testing and records keep bacteria like Legionella under control.'],
    ['Clear clogged nozzles', 'Clogged spray nozzles leave dry spots on the fill and cut capacity.'],
  ],
  controls: [
    ['Hand-Off-Auto: back to AUTO', 'Leaving a switch in HAND bypasses the controls. Return it to AUTO and log it.'],
    ['Overrides need an end date', 'Every BMS override should have a note, an owner and an expiry.'],
    ['Sensors fail too', 'A bad sensor looks like a real problem. Check it against a handheld reading.'],
    ['Trends first', 'Before chasing an alarm, look at the trend: what changed just before it?'],
    ['4–20 mA: zero isn\'t zero', '4 mA means the bottom of the range. 0 mA means a broken wire or dead transmitter.'],
    ['Know the fail-safe', 'On a lost 0–10 V signal, some devices go to 0% and some to 100%. Know which before you need it.'],
    ['Find the first alarm', 'In an alarm flood, the first alarm in time usually points closest to the cause.'],
    ['Fix nuisance alarms properly', 'Alarms that are always on get ignored. Fix or re-tune them through change management.'],
    ['Clocks must match', 'If the BMS, EPMS and UPS clocks don\'t match, piecing events together gets much harder.'],
    ['Setpoints are changes', 'Changing a setpoint on critical gear goes through change management.'],
    ['NO / NC means "on the shelf"', 'Normally open and normally closed describe a contact with no power applied.'],
    ['Spring-return positions', 'Valves and dampers with spring actuators go to their safe position when power is lost. Know what that position is.'],
    ['Tags should match', 'BMS graphics, drawings and equipment labels should all use the same tags.'],
  ],
  trouble: [
    ['What changed?', 'Most problems start right after something changed: work, weather, a setpoint, a new load.'],
    ['Half-split it', 'Test in the middle of the chain. Each test cuts the search in half.'],
    ['Use your senses first', 'Look, listen and smell before reaching for tools.'],
    ['Simple stuff first', 'Power on? Switch in AUTO? Breaker on? Fuse good? Setpoint right? Most calls end here.'],
    ['One change at a time', 'Change one thing, check the result. Otherwise you won\'t know what fixed it.'],
    ['Write it down', 'Note what you checked and what you changed. It saves the next person hours.'],
    ['Reproduce it safely', 'If you can make it happen again safely, you can prove the fix.'],
    ['The manual has a table', 'Most manuals have a troubleshooting table. Start there.'],
    ['Look upstream and downstream', 'The problem is often next door: the feeder, the valve, the sensor.'],
    ['Cleared alarm ≠ fixed', 'An alarm that cleared on its own will usually come back. Find out why it happened.'],
    ['Compare to a good one', 'Side-by-side with an identical healthy unit shows what\'s different.'],
    ['Fuses blow for a reason', 'Find the cause before replacing a fuse, and use the same type and rating.'],
    ['Trend intermittent problems', 'Set up trends and logs to catch problems that come and go.'],
    ['Escalate early', 'When the critical load is at risk, call your lead first and troubleshoot second.'],
  ],
  pinch: [
    ['EC fans: lost speed signal → full speed', 'Many EC fans (common on European-made units) are designed to run at full speed if they lose their speed signal. On some units, pulling the speed-control fuse or signal per the manual forces the fans to 100% to keep cooling while the controller is fixed.', 'Only with your lead\'s OK and the manual in hand. Never bypass safety circuits (high pressure, fire shutdown, motor protection). Log it and put it back.'],
    ['Lost an air handler? Move the air', 'Open more perforated tiles in front of the hottest racks and close tiles where cooling isn\'t needed. Check blanking panels and close containment doors.'],
    ['Portable cooling: exhaust it right', 'Portable spot coolers must dump their hot exhaust into a return plenum or outside, not back into the room.'],
    ['Chiller down: use the stored cold', 'Start the standby chiller early and lean on the chilled-water storage tank. Shed non-critical cooling like office air handlers.'],
    ['Stretch the fuel', 'In a long outage, shed non-critical electrical loads to stretch generator fuel, and call the fuel supplier early, not when you hit a quarter tank.'],
    ['Batteries draining, generator failed', 'Follow the EOP: shed load per the customer agreement and communicate early. Minutes matter.'],
    ['Standby pump won\'t start', 'Check the Hand-Off-Auto switch, the VFD fault screen, then the breaker. If the VFD has an approved bypass, it can run the motor at full speed.', 'VFD bypass runs at full speed with no soft start. Use only if your site allows it.'],
    ['BMS is down', 'Equipment keeps running on its local controllers. Walk the floor with handheld meters and log key readings by hand every 15 minutes.'],
    ['Radios are down', 'Agree on a backup channel or phone tree ahead of time, and use runners if you have to.'],
    ['Water on the floor', 'Stop the source first (close the nearest valve), keep people away from wet energized gear, then use wet-vacs and absorbent socks.'],
    ['Condensate pump failed', 'A temporary hose to a drain keeps the unit running. The float switch will shut it down if the pan fills, so fix it fast.'],
    ['Tower fan VFD faulted', 'If the drive has an approved bypass, it can run the fan at full speed until the VFD is fixed.', 'Full speed with no soft start. Watch for icing in cold weather and condenser water getting too cold. Only if your site allows it.'],
    ['Tower basin running low', 'Open the manual make-up bypass valve and watch the level closely until the float valve is fixed.'],
    ['Hot day, high head pressure on air-cooled units', 'A water rinse of air-cooled condenser coils can bring head pressure down in an emergency.', 'Keep water off electrical parts and fan motors. Hard water can scale coils. Only with approval.'],
    ['Don\'t open the doors to "let heat out"', 'Propping data hall doors usually makes it worse: it breaks pressurization and containment and pulls in unfiltered air.'],
    ['Customer communication in a pinch', 'Facts, impact and the time of the next update. Even "no change, next update in 15 minutes" helps.'],
  ],
  safety: [
    ['Not your lock, not your control', 'Only your own lock protects you. Kirk keys and someone else\'s lock don\'t count.'],
    ['Assume it\'s live', 'Treat every conductor as live until you have tested it yourself.'],
    ['Stand to the side', 'When operating breakers, stand to the side, not in front.'],
    ['No metal jewelry', 'Rings and watches conduct electricity and hold heat. Take them off before electrical or battery work.'],
    ['Take two minutes', 'A two-minute pre-task brief prevents most surprises.'],
    ['Protect your ears', 'Hearing protection is cheaper than hearing aids. Generators and chiller rooms are loud.'],
    ['Drink water', 'Generator yards and roofs get hot fast. Hydrate before you\'re thirsty.'],
    ['Know two ways out', 'In every room you work in, know two exits.'],
    ['Report near misses', 'A near miss is a free lesson. Report it.'],
    ['Right ladder, right place', 'Fiberglass ladders near electrical equipment. Never metal.'],
    ['Air-test your gloves', 'Voltage-rated gloves get an air test before every use, and a lab test on schedule.'],
    ['No synthetic base layers', 'Under arc-rated clothing, wear cotton or arc-rated layers. Synthetics melt into skin.'],
    ['Check the eyewash', 'Know where the eyewash is and that it works.'],
    ['Rushed? Slow down', 'Feeling rushed is the moment to slow down. Mistakes cost more time than care does.'],
  ],
  rounds: [
    ['Same route every time', 'Walking the same route makes anything different stand out.'],
    ['Use all your senses', 'New noises, smells or vibrations are early warnings.'],
    ['Check modes, not just numbers', 'Is it in AUTO? Are the setpoints right? Is the standby actually standing by?'],
    ['Not every alarm reaches the BMS', 'Read local panels too. Some alarms only show at the unit.'],
    ['Tiles in place', 'Floor tiles in place, no trip hazards, no open holes.'],
    ['Flashlight under the floor', 'Peek under the raised floor for water, debris and blocked airflow.'],
    ['Fuel and chargers', 'Check generator fuel levels and battery charger status every round.'],
    ['Numbers, not check marks', 'Write the reading. A check mark can\'t show a trend.'],
    ['Compare to last shift', 'A reading that moved since last shift matters more than one that\'s simply "in range."'],
    ['Clean small messes now', 'A small spill or debris is a five-second fix now and a hazard later.'],
    ['Small leaks get big', 'Report a drip before it becomes a puddle.'],
    ['Missing labels', 'Report missing or wrong labels. Wrong labels cause wrong-device errors.'],
    ['Photos: follow site rules', 'Pictures of problems help, but many data centers restrict photos. Follow the site rules.'],
  ],
  math: [
    ['1 ton = 12,000 BTU/h = 3.517 kW', 'And 1 kW is about 0.28 tons. A 2,100 kW hall needs about 600 tons of cooling.'],
    ['1 kW = 3,412 BTU/h', 'Every watt of IT load becomes heat you must remove.'],
    ['Water heat: 500 × gpm × ΔT', 'BTU/h = 500 × gpm × temperature rise in °F.'],
    ['Air heat: 1.08 × CFM × ΔT', 'BTU/h = 1.08 × CFM × temperature rise in °F.'],
    ['2.4 gpm per ton', 'At a 10 °F chilled-water delta-T, you need about 2.4 gpm per ton.'],
    ['About 160 CFM per kW', 'At a 20 °F air delta-T, each kW of IT needs about 160 CFM of airflow.'],
    ['480 V amps ≈ kW × 1.2', 'Three-phase at 480 V and near-unity power factor: amps ≈ kW × 1.2.'],
    ['208 V amps ≈ kW × 2.8', 'Three-phase at 208 V: amps ≈ kW × 2.8.'],
    ['kVA = kW ÷ PF', 'At a 0.9 power factor, 900 kW is 1,000 kVA.'],
    ['Quick °F to °C', 'Subtract 30, then halve. 80 °F → about 25 °C (exact: 26.7).'],
    ['PUE in one line', 'Total facility power ÷ IT power. 1.25 means 25% overhead.'],
    ['7 gal/hr per 100 kW', 'Rough diesel burn at full load. Half load burns a bit more than half.'],
    ['Motor amps ≈ 1.4 × HP at 460 V', 'A rough guide for full-load amps on 460 V 3-phase motors. The nameplate rules.'],
    ['1 HP = 0.746 kW', 'A 50 HP motor is about 37 kW.'],
    ['1 psi = 2.31 ft of water', 'A 100 ft tall building needs about 43 psi just to lift water to the top.'],
  ],
  shift: [
    ['Hand off face to face', 'Talk it through, then write it down. The Career tab has a handoff builder.'],
    ['Read the log before you walk', 'Know what happened last shift before your first round.'],
    ['Three-way communication', 'Say it, have it repeated back, confirm. Especially for switching.'],
    ['Phonetic alphabet for tags', '"UPS Alpha One" can\'t be misheard as "UPS 8-1."'],
    ['Call early', 'No lead was ever upset by an early call. They get upset by late ones.'],
    ['Pocket notebook', 'Write readings, names, tags and questions. Your memory is worse at 3 a.m.'],
    ['One machine a week', 'Learn one piece of equipment deeply each week: manual, drawings, PM history.'],
    ['Learn from vendors', 'Ask questions during vendor PMs. It\'s free training.'],
    ['Track your certificates', 'Keep a list of certifications and renewal dates.'],
    ['Keep a win list', 'Write down problems you solved. It makes reviews and resumes easy.'],
    ['Sleep before nights', 'Fatigue causes errors. Protect your sleep before night shifts.'],
    ['Know the escalation list', 'Who to call, in what order, for what. Know it without looking.'],
    ['Read the MOP early', 'Read every MOP before the day of the work, not at the panel.'],
    ['Stay curious', 'Ask "why" about every alarm and every procedure step. That\'s how techs become engineers.'],
  ],
};

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);

export const TIPS: Tip[] = (Object.keys(RAW) as TipCat[]).flatMap((cat) =>
  RAW[cat].map(([title, text, caution]) => ({ id: `${cat}-${slug(title)}`, cat, title, text, caution })),
);

/** The same tip for everyone on a given date. */
export function tipOfDay(date: string): Tip {
  let h = 0;
  for (const c of date) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return TIPS[h % TIPS.length]!;
}
