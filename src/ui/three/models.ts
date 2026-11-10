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

