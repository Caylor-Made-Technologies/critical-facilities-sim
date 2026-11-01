/**
 * Rounds practice: a page of readings from a generic round. Spot the ones
 * that need action. Typical ranges only; your site's round sheets and
 * equipment manuals set the real limits.
 */
export interface Reading {
  label: string;
  value: string;
  /** Typical normal range, shown after checking. */
  normal: string;
  /** True if this reading needs action. */
  bad: boolean;
  /** What it means and what to do. */
  why: string;
}

export interface RoundSheet {
  id: string;
  title: string;
  where: string;
  readings: Reading[];
}

export const ROUNDS: RoundSheet[] = [
  {
    id: 'rounds-ups',
    title: 'UPS and battery room',
    where: 'UPS A room, 02:00 round',
    readings: [
      { label: 'Room temperature', value: '76 °F', normal: '68–77 °F', bad: false, why: 'Within range. Batteries like it cool and steady.' },
      { label: 'UPS-A1 mode', value: 'Normal (inverter)', normal: 'Normal', bad: false, why: 'Load on clean, battery-protected power.' },
      { label: 'UPS-A2 mode', value: 'Static bypass', normal: 'Normal', bad: true, why: 'Bypass means no battery protection. Find out why, check alarms, and report it.' },
      { label: 'UPS-A3 load', value: '68%', normal: 'Below about 80% (N+1 sized)', bad: false, why: 'Fine for this design.' },
      { label: 'Battery string float voltage', value: '545 V', normal: '540–548 V', bad: false, why: 'Within the float range.' },
      { label: 'Battery cabinet 2 temperature', value: '95 °F', normal: 'Close to room temperature', bad: true, why: 'One cabinet much hotter than the room points to a failing cell or bad connection. Report it now; thermal runaway risk.' },
      { label: 'Eyewash station', value: 'Tag dated 3 months ago', normal: 'Checked weekly', bad: true, why: 'Eyewash stations near batteries must be checked on schedule. Flush it and update the tag.' },
      { label: 'Hydrogen / ventilation alarm', value: 'Normal', normal: 'Normal', bad: false, why: 'Ventilation working.' },
    ],
  },
  {
    id: 'rounds-gen',
    title: 'Generator yard',
    where: 'Generator A1, standby',
    readings: [
      { label: 'Controller mode', value: 'OFF', normal: 'AUTO', bad: true, why: 'In OFF the generator will not start on a utility failure. Put it in AUTO (per procedure) and find out who left it off.' },
      { label: 'Block heater / coolant temp', value: '105 °F', normal: '90–120 °F', bad: false, why: 'Warm engine starts fast and takes load sooner.' },
      { label: 'Day tank level', value: '92%', normal: 'Above about 80%', bad: false, why: 'Full enough.' },
      { label: 'Battery charger', value: 'Charging alarm', normal: 'Float, no alarm', bad: true, why: 'A failed charger means flat starting batteries, the top cause of failed starts. Report it now.' },
      { label: 'Oil level', value: 'Full mark', normal: 'Between add and full', bad: false, why: 'Good.' },
      { label: 'Fuel under the unit', value: 'Small puddle', normal: 'Dry', bad: true, why: 'A fuel leak is a fire and environmental hazard. Contain it, report it, find the source.' },
      { label: 'Radiator air path', value: 'Clear', normal: 'Clear', bad: false, why: 'Nothing blocking the air flow.' },
    ],
  },
  {
    id: 'rounds-plant',
    title: 'Chiller plant',
    where: 'Central plant, afternoon round',
    readings: [
      { label: 'Chilled water supply', value: '65 °F', normal: 'About 64–66 °F (setpoint 65 °F)', bad: false, why: 'On setpoint.' },
      { label: 'Chilled water delta T', value: '4 °F', normal: 'About 10–14 °F at this load', bad: true, why: 'Low delta T means too much flow or bypassing coils. Pumps work harder and chillers load poorly. Investigate valves and bypass.' },
      { label: 'CH-01 condenser approach', value: '6 °F', normal: 'Under about 3 °F when clean', bad: true, why: 'A rising approach means fouled condenser tubes. Plan tube cleaning before summer.' },
      { label: 'Condenser water to chillers', value: '84 °F', normal: 'Below about 85 °F on a hot day', bad: false, why: 'Towers keeping up.' },
      { label: 'CHWP-02 vibration', value: 'Normal', normal: 'Normal', bad: false, why: 'Good.' },
      { label: 'Tower basin level', value: 'Low, makeup valve hissing', normal: 'Normal level', bad: true, why: 'Low basin with makeup running may mean a leak or a stuck drain. Low level can starve the condenser pumps.' },
      { label: 'Storage tank', value: '100% charged', normal: 'Fully charged', bad: false, why: 'Ready to cover a chiller trip.' },
    ],
  },
  {
    id: 'rounds-hall',
    title: 'Data hall',
    where: 'Hall 1, night round',
    readings: [
      { label: 'Cold aisle inlet', value: '75 °F', normal: '64.4–80.6 °F (ASHRAE recommended)', bad: false, why: 'In the recommended range.' },
      { label: 'Dew point', value: '28 °F', normal: '16–59 °F', bad: false, why: 'In range.' },
      { label: 'Blanking panels, row 4', value: 'Three missing', normal: 'All gaps blanked', bad: true, why: 'Gaps let hot air recirculate to the cold aisle and create hot spots. Install blanking panels.' },
      { label: 'Floor tile by CRAH-104', value: 'Wet', normal: 'Dry', bad: true, why: 'Water in a data hall: find the source now (condensate pan, valve, coil). Leak detection should agree.' },
      { label: 'Rack 12 A-cord', value: 'Unplugged', normal: 'Both cords powered', bad: true, why: 'A dual-corded rack on one cord has lost its redundancy. Report it to the customer; never plug in without approval.' },
      { label: 'CDU-1 coolant supply', value: '86 °F', normal: 'About 80–90 °F', bad: false, why: 'Normal for warm-water liquid cooling.' },
      { label: 'Fire suppression panel', value: 'Normal, no impairments', normal: 'Normal', bad: false, why: 'Good.' },
    ],
  },
];
