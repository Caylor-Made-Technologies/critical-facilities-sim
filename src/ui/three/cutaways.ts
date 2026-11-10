/** Cutaway parts (loaded with the 3D equipment scene, not in the main bundle). */
import type { ModelKey } from './models';

/**
 * Cutaways: what you see inside a unit with "See inside" on, in the order the
 * energy or refrigerant flows. Generic training content; listed for expert
 * review in docs/REVIEW-QUEUE.md.
 */
export interface CutawayPart {
  id: string;
  name: string;
  what: string;
}
export const CUTAWAYS: Partial<Record<ModelKey, CutawayPart[]>> = {
  transformer: [
    { id: 'core', name: 'Core', what: 'Stacked steel laminations that carry the magnetic field from one winding to the other. Hums at twice line frequency; a change in the hum is worth noting.' },
    { id: 'windings', name: 'Windings (HV outside, LV inside)', what: 'Copper or aluminum coils on each core leg. Turns ratio sets the voltage change, e.g. 12.47 kV to 480 V. Heat from load ages their insulation.' },
    { id: 'oil', name: 'Insulating liquid', what: 'Oil or natural ester fills the tank, insulates the windings and carries heat to the fins. Watch level, temperature and leaks.' },
    { id: 'taps', name: 'Tap changer', what: 'De-energized tap changer: each step changes the output about 2.5%. Only moved with the unit locked out, under a change record.' },
    { id: 'gauge', name: 'Temperature gauge', what: 'Top-oil (and often winding) temperature with a red drag hand that holds the highest reading since the last reset.' },
  ],
  generator: [
    { id: 'radiator', name: 'Radiator and fan', what: 'Cools the engine\'s jacket water. Louvers must open and the core must be clean, or the engine overheats under load.' },
    { id: 'engine', name: 'Diesel engine', what: 'Turns fuel into shaft power. The governor sets fuel to hold speed, and speed sets frequency (60 Hz).' },
    { id: 'heater', name: 'Block heater', what: 'Keeps the jacket water warm in standby so the engine fires fast and takes load within the required time.' },
    { id: 'alternator', name: 'Alternator', what: 'Turns shaft power into electricity. The AVR controls its field current to hold voltage.' },
    { id: 'controls', name: 'Controller, governor and AVR', what: 'Start sequence, protection (oil pressure, coolant temperature, overspeed) and the AUTO / OFF / RUN switch. End every job in AUTO.' },
    { id: 'batteries', name: 'Starting batteries', what: 'Crank the engine. With their charger, the number one cause of failed starts. A charger alarm is a no-start risk.' },
  ],
  switchboard: [
    { id: 'bus', name: 'Main bus', what: 'Copper bars that carry power along the lineup. Bolted joints are torqued and checked by IR scan; a hot joint shows up there first.' },
    { id: 'breaker', name: 'Drawout breaker', what: 'Power circuit breaker on racking rails: Connected, Test or Disconnected. Must be open before it can be racked.' },
    { id: 'trip', name: 'Trip unit (LSIG)', what: 'Electronic brain of the breaker: Long-time, Short-time, Instantaneous and Ground-fault settings from the coordination study.' },
    { id: 'cradle', name: 'Cradle and shutters', what: 'The breaker\'s housing. Shutters close over the live bus stabs when the breaker is withdrawn.' },
    { id: 'kirk', name: 'Key interlock', what: 'Kirk key lock: the key comes out only with the breaker open and locked, so only the allowed breakers can close together.' },
  ],
  ups: [
    { id: 'rectifier', name: 'Rectifier', what: 'Turns incoming AC into DC. Feeds the DC bus and keeps the batteries charged.' },
    { id: 'dcbus', name: 'DC bus', what: 'The DC link between rectifier, batteries and inverter. If the input fails, the batteries hold it up with no break.' },
    { id: 'inverter', name: 'Inverter', what: 'Turns DC back into clean AC for the load. In double conversion, the load always runs from here in normal operation.' },
    { id: 'bypass', name: 'Static bypass switch', what: 'Electronic switch that moves the load straight to the bypass source in a fraction of a cycle if the inverter faults or is overloaded.' },
    { id: 'batteries', name: 'Battery strings', what: 'Stored energy that carries the load until the generator picks up. Runtime drops as they age; trend them.' },
  ],
  chiller: [
    { id: 'compressor', name: 'Compressor', what: 'C in CCME: squeezes refrigerant gas, raising its pressure and temperature so it can give heat away.' },
    { id: 'condenser', name: 'Condenser', what: 'Hot refrigerant gives its heat to condenser water (on to the cooling towers) and turns back into a liquid.' },
    { id: 'expansion', name: 'Expansion valve', what: 'Metering device: drops the liquid refrigerant\'s pressure, so it gets cold enough to absorb heat again.' },
    { id: 'evaporator', name: 'Evaporator', what: 'Cold refrigerant boils off by pulling heat out of the chilled water, which goes back out to the air handlers.' },
  ],
  crah: [
    { id: 'filters', name: 'Filters', what: 'Clean the warm return air coming back from the hall. Clogged filters cut airflow; watch the pressure drop.' },
    { id: 'coil', name: 'Chilled-water coil', what: 'Air passes through the fins and gives its heat to the chilled water inside the tubes.' },
    { id: 'valve', name: 'Control valve', what: 'Opens and closes to let more or less chilled water through the coil, holding the supply air temperature.' },
    { id: 'fans', name: 'EC fans', what: 'Push the cooled air out to the cold aisle or under the raised floor. Speed follows the cooling demand.' },
  ],
};
