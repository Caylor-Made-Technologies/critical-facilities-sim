/**
 * Plain-English explainer cards, one per component kind.
 * Generic industry knowledge only, with no site- or vendor-specific details.
 */

import type { ComponentKind, Explainer } from '../types';

export const EXPLAINERS: Record<ComponentKind, Explainer> = {
  // --- Electrical ----------------------------------------------------------
  utility: {
    what: 'A medium-voltage service from the electric utility. Large sites take two independent feeds so one outage does not take down the whole site.',
    fails: 'Storms, upstream faults, and planned outages. Short sags of a few cycles happen far more often than full outages.',
    watch: 'Voltage on all three phases, frequency, and the utility event history. Sags that trip equipment show up as UPS battery events.',
  },
  'mv-switchgear': {
    what: 'Medium-voltage switchgear with protective relays and breakers. It accepts the utility service and feeds the step-down transformers.',
    fails: 'Relay misoperation, breaker failure to trip, insulation breakdown, and arc-flash events.',
    watch: 'Relay alarms, breaker counters, partial-discharge and infrared scan results, and battery health for the trip circuits.',
  },
  transformer: {
    what: 'Steps medium voltage down to low voltage (e.g. 480 V) for the switchboards.',
    fails: 'Winding insulation breakdown from heat and age, and cooling fan failures on larger units.',
    watch: 'Winding and oil temperature, load %, and annual oil or infrared testing.',
  },
  generator: {
    what: 'A diesel standby generator. When utility power fails it starts, comes up to speed, syncs to the paralleling bus, and picks up load in about 10 seconds.',
    fails: 'Fail to start (starting batteries, fuel, controls), fail to sync, fuel contamination, and overheating.',
    watch: 'Block heater temperature, starting battery voltage, day-tank level, results of monthly load tests, and the fuel polishing schedule.',
  },
  'paralleling-bus': {
    what: 'Paralleling switchgear that synchronizes several generators and ties them together, so they share load like one larger machine.',
    fails: 'Sync failures and a load-sharing imbalance between units. A bus fault takes out every generator on the bus.',
    watch: 'The kW share of each unit, sync status, and load-shed priority settings.',
  },
  ats: {
    what: 'An automatic transfer switch. It senses loss of the normal source, signals generators to start, and transfers load to the emergency source when it is ready. It retransfers after utility power has been stable for a set time.',
    fails: 'Fails to transfer (mechanism or controls), and contact wear. A wrong time-delay setting can cause nuisance transfers.',
    watch: 'Source availability lights, timer settings, the transfer counter, and results of the monthly transfer test.',
  },
  breaker: {
    what: 'A switching and protective device. It opens automatically on overcurrent or short circuit, and operators open and close it during switching.',
    fails: 'Fails to trip, nuisance trips, or worn contacts. Racking a breaker in or out is a high-risk task.',
    watch: 'Position (open/closed), trip-unit alarms, and the Kirk-key interlock state where fitted.',
  },
  bus: {
    what: 'A switchboard or bus section: the copper backbone that main, tie, and feeder breakers connect to.',
    fails: 'Loose connections that heat up, and bus faults (rare, but they de-energize every feeder on that section).',
    watch: 'Infrared scans, load on each section, and which breakers are closed.',
  },
  ups: {
    what: 'A double-conversion UPS module. The rectifier turns AC into DC, which charges the battery. The inverter turns DC back into clean AC for the load. If input power fails, the battery carries the load with zero break until generators pick up. A static bypass switch feeds the load straight from the bypass source if the inverter faults or is overloaded.',
    fails: 'Rectifier or inverter faults, capacitor and fan wear, and weak battery strings. Overload forces it to static bypass, where the load has no conditioning or battery protection.',
    watch: 'Load %, operating mode (normal / battery / bypass), battery runtime estimate, string voltages and temperatures, and alarm history.',
  },
  bess: {
    what: 'A battery energy storage system (BESS): a large battery yard with power conversion. It can ride through utility sags, bridge until generators start, or peak-shave by discharging during high-demand periods.',
    fails: 'Cell thermal events, inverter faults, and loss of HVAC in the battery enclosures. State of charge limits how long it can help.',
    watch: 'State of charge, discharge rate, cell temperature, fire detection status, and reserve-SOC rules (always keep enough for ride-through).',
  },
  sts: {
    what: 'A static transfer switch. It uses solid-state switches to move single-corded loads between two sources in about a quarter cycle (~4 ms), fast enough that IT equipment does not notice.',
    fails: 'An SCR failure, or a transfer that is blocked when the two sources are out of phase. The STS itself is a single point of failure for its loads.',
    watch: 'Preferred and alternate source health, phase sync status, the transfer counter, and which source is selected.',
  },
  pdu: {
    what: 'A power distribution unit: usually a transformer plus a panelboard that steps power down and distributes it to rack circuits on the data hall floor.',
    fails: 'Overloaded branch circuits, breaker trips, and transformer overheating.',
    watch: 'Load per phase and per breaker. Keep each cord below ~40% in 2N so it can carry its partner cord\'s load.',
  },
  rpp: {
    what: 'A remote power panel: a panelboard (no transformer) closer to the racks, fed by a PDU or STS.',
    fails: 'Branch breaker trips and loose connections.',
    watch: 'Branch circuit load and labeling, so the right breaker gets switched.',
  },
  busway: {
    what: 'Overhead busway with plug-in tap boxes, common for high-density rows. It is quick to reconfigure as racks change.',
    fails: 'Tap-box connection heating and joint failures.',
    watch: 'Infrared scans of joints and tap boxes, and load per run.',
  },
  rack: {
    what: 'An IT rack. Dual-corded racks draw from A and B feeds, normally about half from each, and survive losing either one. Single-corded loads rely on an STS for redundancy. High-density AI/GPU racks can draw over 100 kW and need liquid cooling.',
    fails: 'Loss of both feeds (or the only feed) drops the rack. Hot inlet air makes servers throttle, then shut down.',
    watch: 'Power per cord, inlet temperature against the ASHRAE range, and liquid-cooling flow on GPU racks.',
  },

  // --- Mechanical ----------------------------------------------------------
  'chiller-water-cooled': {
    what: 'A water-cooled chiller. Its refrigeration cycle (compressor → condenser → expansion valve → evaporator) pulls heat out of the chilled water and rejects it to condenser water, which goes to cooling towers.',
    fails: 'High head pressure (hot condenser water or fouled tubes), low refrigerant, compressor faults, and loss of flow.',
    watch: 'Leaving chilled water temperature, condenser approach, head pressure, kW per ton, and the alarm log.',
  },
  'chiller-air-cooled': {
    what: 'An air-cooled chiller. The same refrigeration cycle, but the condenser rejects heat straight to outdoor air with fans. There are no towers or condenser water.',
    fails: 'High head pressure on hot days or with dirty coils, fan failures, and compressor faults.',
    watch: 'Outdoor temperature, condenser coil condition, head pressure, and capacity derate on extreme days.',
  },
  'cooling-tower': {
    what: 'An evaporative cooling tower. It cools condenser water by evaporating a small part of it into outdoor air, so it can get within a few degrees of the wet-bulb temperature.',
    fails: 'Fan or gearbox failure, fouled fill, water treatment problems, and freezing in winter.',
    watch: 'Leaving water temperature against wet bulb (approach), basin level, makeup water use, and water chemistry.',
  },
  'dry-cooler': {
    what: 'A closed-loop dry cooler. It rejects heat to air through a coil without evaporating water. It saves water, but can only cool toward the dry-bulb temperature.',
    fails: 'Fan failure, dirty coils, and lost capacity on hot days.',
    watch: 'Leaving water temperature against dry bulb, and fan status.',
  },
  'pump-chw': {
    what: 'A chilled water pump. It moves chilled water from the chillers to CRAHs and CDUs. In variable-primary plants, a VFD speeds it up or down to hold differential pressure.',
    fails: 'Motor or VFD faults, seal leaks, and cavitation. Losing flow starves every cooling coil downstream.',
    watch: 'Differential pressure, flow, VFD speed and alarms, and vibration.',
  },
  'pump-cw': {
    what: 'A condenser water pump. It circulates water between the chiller condensers and the cooling towers.',
    fails: 'Motor or VFD faults. Losing flow trips its chiller on high head pressure.',
    watch: 'Flow, discharge pressure, and VFD status.',
  },
  'tes-tank': {
    what: 'A chilled water storage (thermal energy storage) tank. It holds a large volume of cold water that can carry the cooling load for minutes while chillers restart after a power transfer.',
    fails: 'Stratification loss (warm and cold water mixing), and valve misalignment.',
    watch: 'Tank temperature profile, charge state, and ride-through minutes at the current load.',
  },
  crah: {
    what: 'A computer room air handler: fans blow data hall air across a chilled-water coil. It has no compressor; the chillers do the refrigeration work.',
    fails: 'Fan failure, a stuck valve, or loss of chilled water. Without chilled water a CRAH just recirculates warm air.',
    watch: 'Supply and return air temperatures, valve position, fan speed, and filter pressure drop.',
  },
  crac: {
    what: 'A computer room air conditioner: a self-contained DX unit with its own compressor and refrigerant circuit. It does not need chilled water, so it is common in smaller rooms or as backup.',
    fails: 'Compressor faults, refrigerant leaks, condenser problems, and high head pressure.',
    watch: 'Suction and discharge pressure, supply air temperature, and compressor run hours.',
  },
  cdu: {
    what: 'A coolant distribution unit for direct-to-chip liquid cooling. A heat exchanger separates the facility water loop from the technology cooling system (TCS) loop that runs through the GPU cold plates. Redundant pumps move TCS coolant.',
    fails: 'Pump failure, leaks, and clogged filters. With little thermal mass in a cold plate, GPUs can hit thermal limits in seconds to a minute.',
    watch: 'TCS supply temperature, flow, differential pressure, leak detection, pump redundancy, and coolant quality.',
  },
  doas: {
    what: 'A dedicated outdoor air system (DOAS). It brings in a small, controlled amount of fresh air for ventilation, and keeps the data hall slightly pressurized so dust and humid air stay out. An energy-recovery wheel pre-conditions the air, a chilled-water coil removes moisture, reheat brings it back up to a neutral temperature, and a supply fan delivers it.',
    fails: 'Fan or damper failure, wheel drive belt, coil valve, and humidity sensor drift. Losing it slowly lets humidity and dust creep in and lets the hall go to negative pressure. It is not an immediate thermal emergency.',
    watch: 'Supply dew point against the ASHRAE band, data hall differential pressure, filter differential pressure, wheel rotation, and outdoor-air damper position.',
  },

  // --- Life safety -----------------------------------------------------------
  'fire-alarm': {
    what: 'The fire alarm control panel. It monitors smoke and heat detectors (often very early smoke detection in data halls), sounds alarms, and triggers suppression release logic.',
    fails: 'Detector faults, ground faults, and communication loss. A trouble signal means part of the system may not be protecting the space.',
    watch: 'Alarm, supervisory, and trouble signals; impairment procedures during any shutdown.',
  },
  preaction: {
    what: 'A pre-action sprinkler zone. Pipes stay dry until a detector confirms fire and opens the pre-action valve. Water only flows where a sprinkler head also fuses, so one broken head does not flood IT gear.',
    fails: 'Valve trips, air supervisory loss, and corrosion in dry pipe.',
    watch: 'Supervisory air pressure, valve status, and inspection and testing records.',
  },
  'clean-agent': {
    what: 'A clean-agent suppression zone. It floods an enclosed room with a gaseous agent that puts out fire without water or residue. Abort and hold stations let people stop a release.',
    fails: 'Room leaks (agent does not hold concentration), accidental discharge, and cylinder pressure loss.',
    watch: 'Cylinder pressure, room integrity test results, and abort station status. Evacuate on pre-discharge alarm.',
  },
  epo: {
    what: 'Emergency power off. A protected button that de-energizes data hall equipment so firefighters can work safely. Pressing it will drop IT load by design.',
    fails: 'Accidental activation is the big risk, so it is guarded with covers, signs, and sometimes delays.',
    watch: 'Cover intact, signage, and that its circuit is supervised. Never test it live without an approved procedure.',
  },
};
