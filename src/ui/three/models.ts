/**
 * Which 3D model shows for each Equipment guide. Pure data (no three.js),
 * so a test can prove every guide has a model and every model exists.
 */
export const MODEL_KEYS = [
  'mv-gear',
  'transformer',
  'generator',
  'ats',
  'switchboard',
  'ups',
  'bess',
  'sts',
  'pdu',
  'rack',
  'chiller',
  'tower',
  'pump',
  'tank',
  'crah',
  'cdu',
  'doas',
  'fire',
  'epo',
] as const;
export type ModelKey = (typeof MODEL_KEYS)[number];

/** Equipment guide id → model. */
export const GUIDE_MODEL: Record<string, ModelKey> = {
  'utility-mv': 'mv-gear',
  transformer: 'transformer',
  generator: 'generator',
  ats: 'ats',
  switchboard: 'switchboard',
  ups: 'ups',
  bess: 'bess',
  sts: 'sts',
  distribution: 'pdu',
  racks: 'rack',
  chiller: 'chiller',
  'heat-rejection': 'tower',
  pumps: 'pump',
  tes: 'tank',
  'air-handling': 'crah',
  cdu: 'cdu',
  doas: 'doas',
  fire: 'fire',
  epo: 'epo',
};

/** What moves in each model, said in words for screen readers. */
export const MODEL_CAPTION: Record<ModelKey, string> = {
  'mv-gear': 'Medium-voltage switchgear lineup with incoming cables.',
  transformer: 'Pad-mounted transformer with cooling fins and bushings.',
  generator: 'Standby generator enclosure with exhaust stack and a spinning radiator fan.',
  ats: 'Automatic transfer switch cabinet with source lights.',
  switchboard: 'Main-tie-main switchboard lineup with breaker doors.',
  ups: 'UPS module with a glowing status display and battery cabinets.',
  bess: 'Battery energy storage containers with status lights.',
  sts: 'Static transfer switch cabinet.',
  pdu: 'Power distribution unit with overhead busway and tap-off boxes.',
  rack: 'IT rack full of servers with blinking activity lights.',
  chiller: 'Water-cooled chiller with evaporator and condenser shells and a compressor.',
  tower: 'Cooling tower with a spinning fan and falling water.',
  pump: 'End-suction pump with a spinning motor shaft.',
  tank: 'Chilled-water storage tank with piping.',
  crah: 'Computer room air handler with spinning fans.',
  cdu: 'Coolant distribution unit with supply and return pipes.',
  doas: 'Rooftop outdoor air unit with a turning energy-recovery wheel.',
  fire: 'Clean-agent cylinders, piping and sprinkler heads.',
  epo: 'Emergency power off button under a protective cover.',
};

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
