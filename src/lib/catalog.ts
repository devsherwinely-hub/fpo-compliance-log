// Task catalog + field schemas ported from sample/Index.html.
// Single source of truth for checklist definitions, period math, and flag rules.

export type ChecklistFrequency = 'daily' | 'weekly' | 'monthly';

export interface CatalogTask {
  id: string;
  freq: ChecklistFrequency;
  name: string;
  /** false = single global instance (e.g. i-STAT), true = one per location */
  perLoc: boolean;
}

export const LOCATIONS = ['Location 1', 'Location 2', 'Location 3'] as const;
export type LocationName = (typeof LOCATIONS)[number];

export const TASKS: CatalogTask[] = [
  { id: 'lock', freq: 'daily', name: 'Emergency Equipment & Lock Checklist', perLoc: true },
  { id: 'fridge', freq: 'daily', name: 'Refrigerator Temp Monitoring Log', perLoc: true },
  { id: 'glucometer', freq: 'daily', name: 'Glucometer Control Log', perLoc: true },
  { id: 'eyewash', freq: 'weekly', name: 'Plumbed Eye Wash Station Checklist', perLoc: true },
  { id: 'cartTray', freq: 'monthly', name: 'Emergency Equipment Cart Medication Tray (Banyan)', perLoc: true },
  { id: 'aed', freq: 'monthly', name: 'AED Maintenance Inspection', perLoc: true },
  { id: 'medKit', freq: 'monthly', name: 'Emergency Medication Kit', perLoc: true },
  { id: 'supplyAudit', freq: 'monthly', name: 'Medical/Surgical Supply Maintenance Audit', perLoc: true },
  { id: 'istat', freq: 'monthly', name: 'i-STAT Controls (Receipt & Monthly Check)', perLoc: false },
];

// ---------- Field schemas ----------

export type FieldType = 'header' | 'date' | 'time' | 'text' | 'number' | 'yesno' | 'checkbox' | 'select';

export interface SchemaField {
  type: FieldType;
  key?: string;
  label: string;
  options?: string[];
}

function itemFields(prefix: string, names: string[]): SchemaField[] {
  return names.map((n, i) => ({ key: `item_${prefix}${i}`, label: n, type: 'yesno' as const }));
}
function sectionHeader(label: string): SchemaField {
  return { type: 'header', label };
}

function medKitSchema(): SchemaField[] {
  const groups: Array<[string, string, string[]]> = [
    ['triage', 'Triage & Assessment', ['Gloves, Nitrile (3 pair)', 'Protective Eyewear', 'Microshield CPR mouth barrier', 'Stethoscope', 'Sphygmomanometer', 'Disposable thermometer', 'Headlamp', 'N95 Respirator']],
    ['ivfluids', 'Intravenous Fluids & Drug Delivery', ['VanishPoint Syringes', 'Sodium Chloride 0.9% 500mL bag (2)', 'IV administration tubing', 'IV Catheters', 'Tape, hypoallergenic paper', 'Tourniquet, latex free']],
    ['trauma', 'Trauma & Miscellaneous', ['Gauze pads', 'Gauze bandage', 'Compression bandage', 'Chlorascrub swabstick', 'Alcohol wipes', 'Gauze sponges', 'Mayo-Hegar needle holder', 'Curved Mayo scissors', 'Curved Kelly forceps (2)', 'Dressing thumb forcep', 'Scalpel', 'Prolene and Vicryl sutures', 'Cold pack', 'First aid handbook', 'Eye wash', 'EMS Shears', 'Emergency Thermal Blanket']],
    ['airway', 'Airway Management Equipment', ['Oropharyngeal airways', 'Supraglottic Airways', 'Endotracheal tubes', 'CO2 detector', 'Laryngoscopes', 'Hand-held suction unit w/ Yankauer tip', 'Magill forceps', 'Ambu SPUR resuscitator w/ adult & child masks']],
    ['anaphylaxis', 'Anaphylaxis, Allergy & Asthma Medications', ['Albuterol inhaler 90mcg', 'Diphenhydramine 25mg capsule (2)', 'Diphenhydramine 50mg/mL, 1mL vial (2)', 'Epinephrine auto-injector (Pedi) 0.15mg', 'Epinephrine auto-injector (Adult) 0.3mg', 'Epinephrine 1:1,000, 1mL vial (2)', 'Solu-Medrol 125mg Act-O-Vial']],
    ['miscmeds', 'Miscellaneous Medications', ['Ammonia inhalant (3)', 'Dextrose 25% (Infant) prefilled syringe', 'Dextrose 50% prefilled syringe', 'Flumazenil 0.1mg/mL vial', 'Naloxone 0.4mg/mL vial (2)', 'Ondansetron 2mg/mL vial (2)', 'Oral glucose gel 15g tube']],
    ['cardiac', 'Cardiac Medications', ['Adenosine 3mg/mL vial (5)', 'Amiodarone 50mg/mL vial (2)', 'Aspirin tablets 325mg (4)', 'Atropine Sulfate prefilled syringe (2)', 'Dopamine 40mg/mL vial (1)', 'Epinephrine 1:10,000 prefilled (2)', 'Lidocaine 2% prefilled (2)', 'Magnesium sulfate prefilled syringe (1)', 'Nitroglycerin 0.4mg tablets', 'Verapamil 2.5mg/mL vial']],
  ];
  let schema: SchemaField[] = [{ key: 'date', label: 'Date of inspection', type: 'date' }];
  groups.forEach(([slug, title, items]) => {
    schema.push(sectionHeader(title));
    schema = schema.concat(itemFields(slug, items));
  });
  schema.push({ key: 'expiredNotes', label: 'Details on any expired / missing items', type: 'text' });
  schema.push({ key: 'signature', label: 'Signature', type: 'text' });
  schema.push({ key: 'printName', label: 'Print name', type: 'text' });
  return schema;
}

export const FIELD_SCHEMAS: Record<string, SchemaField[]> = {
  lock: [
    { key: 'date', label: 'Date', type: 'date' },
    { key: 'time', label: 'Time', type: 'time' },
    { key: 'arrestCartLock', label: 'Arrest Cart Lock #', type: 'text' },
    { key: 'otherLock1', label: 'Other Lock # (if appl.)', type: 'text' },
    { key: 'otherLock2', label: 'Other Lock # (if appl.)', type: 'text' },
    { key: 'resBag', label: 'Manual res. bag w/ appropriate size masks', type: 'checkbox' },
    { key: 'o2Tank', label: 'Full O2 tank reg.', type: 'checkbox' },
    { key: 'suction', label: 'Portable suction', type: 'checkbox' },
    { key: 'aed', label: 'AED present & status window checked', type: 'checkbox' },
    { key: 'comments', label: 'Comments', type: 'text' },
    { key: 'rnSignature', label: 'RN signature', type: 'text' },
  ],
  fridge: [
    { key: 'staffInitials', label: 'Staff initials', type: 'text' },
    { key: 'exactTime', label: 'Exact time', type: 'time' },
    { key: 'minTemp', label: 'Min temp in unit since previous reading (°C)', type: 'number' },
    { key: 'maxTemp', label: 'Max temp in unit since previous reading (°C)', type: 'number' },
    { key: 'currentTemp', label: 'Current temperature', type: 'select', options: ['8°C', '7°C', '6°C', '5°C', '4°C', '3°C', '2°C', 'Above 8°C', 'Below 2°C'] },
    { key: 'actionNotes', label: 'Out-of-range temp — action taken (if applicable)', type: 'text' },
    { key: 'roomTemp', label: 'Room temperature (°C)', type: 'number' },
  ],
  glucometer: [
    { key: 'highControl', label: 'High control result', type: 'number' },
    { key: 'lowControl', label: 'Low control result', type: 'number' },
    { key: 'inRange', label: 'Results in range?', type: 'yesno' },
    { key: 'repeatHigh', label: 'Repeat high (if applicable)', type: 'text' },
    { key: 'repeatLow', label: 'Repeat low (if applicable)', type: 'text' },
    { key: 'nameSignature', label: 'Name / signature', type: 'text' },
  ],
  eyewash: [
    { key: 'date', label: 'Date', type: 'date' },
    { key: 'checkedBy', label: 'Checked by (print name)', type: 'text' },
    { key: 'item_accessible', label: 'Eye wash station accessible', type: 'yesno' },
    { key: 'item_waterTemp', label: 'Water temperature tepid/lukewarm', type: 'yesno' },
    { key: 'item_waterPressure', label: 'Water pressure adequate', type: 'yesno' },
    { key: 'item_dustCaps', label: 'Dust caps in place', type: 'yesno' },
    { key: 'item_signage', label: 'Eye wash station with proper signage', type: 'yesno' },
    { key: 'notes', label: 'Notes (required for any "No")', type: 'text' },
  ],
  cartTray: [
    { key: 'date', label: 'Date', type: 'date' },
    { key: 'itemsPresent', label: 'All medication tray items present & in date?', type: 'yesno' },
    { key: 'notes', label: 'Notes / items replaced', type: 'text' },
    { key: 'initials', label: 'Staff initials', type: 'text' },
  ],
  aed: [
    { key: 'date', label: 'Date of inspection', type: 'date' },
    { key: 'item_unitClean', label: 'Unit is clean, undamaged, free of excessive wear', type: 'yesno' },
    { key: 'item_noCracks', label: 'Absence of cracks or loose parts in housing', type: 'yesno' },
    { key: 'item_electrodesConnected', label: 'Electrodes connected & properly sealed', type: 'yesno' },
    { key: 'item_electrodesExp', label: 'Electrodes within expiration dates', type: 'yesno' },
    { key: 'item_cablesFree', label: 'Cables free of cracks/cuts/exposed wires', type: 'yesno' },
    { key: 'item_greenCheck', label: 'Green check indicates ready for use', type: 'yesno' },
    { key: 'item_suppliesAvailable', label: 'Supplies available for use (if applicable)', type: 'yesno' },
    { key: 'signature', label: 'Signature', type: 'text' },
    { key: 'printName', label: 'Print name', type: 'text' },
  ],
  medKit: medKitSchema(),
  supplyAudit: [
    { key: 'date', label: 'Date', type: 'date' },
    { key: 'departmentUnit', label: 'Department/Unit', type: 'text' },
    { key: 'floorRoom', label: 'Floor/Room #', type: 'text' },
    { key: 'inspectorTitle', label: 'Inspector/Title', type: 'text' },
    sectionHeader('I. Environment'),
    { key: 'envClean', label: 'Room clean — floors/walls/ceiling/bins dusted', type: 'select', options: ['Yes', 'No', 'N/A'] },
    { key: 'envSprinkler', label: 'Supplies stored ≥18" below sprinkler heads', type: 'select', options: ['Yes', 'No', 'N/A'] },
    { key: 'envNoStockZone', label: '18" no-stock zone clearly identified', type: 'select', options: ['Yes', 'No', 'N/A'] },
    { key: 'envDoors', label: 'Doors closed/locked, close automatically', type: 'select', options: ['Yes', 'No', 'N/A'] },
    { key: 'envDoorways', label: 'Doorways clear of equipment/supplies', type: 'select', options: ['Yes', 'No', 'N/A'] },
    { key: 'envDirtyFree', label: 'Room free of dirty supplies/equipment', type: 'select', options: ['Yes', 'No', 'N/A'] },
    { key: 'envOffFloor', label: 'All supplies/packages off the floor', type: 'select', options: ['Yes', 'No', 'N/A'] },
    sectionHeader('II. Supplies Inventory'),
    { key: 'invBins', label: 'Supplies separated in proper bins/locations', type: 'select', options: ['Yes', 'No', 'N/A'] },
    { key: 'invLabeled', label: 'Bins/shelf locations properly labeled', type: 'select', options: ['Yes', 'No', 'N/A'] },
    { key: 'invExpIdentified', label: 'Products with exp. dates clearly identified', type: 'select', options: ['Yes', 'No', 'N/A'] },
    { key: 'invRotation', label: 'Product rotation followed (nearest front)', type: 'select', options: ['Yes', 'No', 'N/A'] },
    { key: 'invBinSpace', label: 'Bin/shelf space adequate for par level', type: 'select', options: ['Yes', 'No', 'N/A'] },
    { key: 'invExpVisible', label: 'Exp. dates visible from staff line of sight', type: 'select', options: ['Yes', 'No', 'N/A'] },
    { key: 'invOutOfStock', label: 'Any supplies out of stock?', type: 'select', options: ['Yes', 'No', 'N/A'] },
    { key: 'invAllCurrent', label: 'All products with exp. date current', type: 'select', options: ['Yes', 'No', 'N/A'] },
    sectionHeader('III. Oxygen'),
    { key: 'o2SeparateStorage', label: 'Separate storage for full & empty cylinders', type: 'select', options: ['Yes', 'No', 'N/A'] },
    { key: 'o2RacksMarked', label: 'Storage racks/cabinets marked full/empty', type: 'select', options: ['Yes', 'No', 'N/A'] },
    { key: 'o2Secured', label: 'All oxygen cylinders properly secured', type: 'select', options: ['Yes', 'No', 'N/A'] },
    { key: 'expiredProducts', label: 'Expired products (item, catalog #, exp date, qty)', type: 'text' },
    { key: 'inspectionStatus', label: 'Inspection status', type: 'select', options: ['Pass', 'Fail'] },
    { key: 'correctiveAction', label: 'Corrective action needed?', type: 'yesno' },
    { key: 'correctiveDescribe', label: 'Describe corrective action', type: 'text' },
    { key: 'reviewedBy', label: 'Reviewed by', type: 'text' },
  ],
  istat: [
    { key: 'date', label: 'Date', type: 'date' },
    { key: 'testedBy', label: 'Tested by', type: 'text' },
    { key: 'clew', label: 'CLEW', type: 'text' },
    { key: 'cartridgeLot', label: 'Cartridge lot #', type: 'text' },
    { key: 'controlLevel', label: 'Control level', type: 'text' },
    { key: 'controlLot', label: 'Control lot #', type: 'text' },
    { key: 'range', label: 'Acceptable range', type: 'text' },
    { key: 'results', label: 'Results', type: 'text' },
    { key: 'inRange', label: 'Results in range?', type: 'yesno' },
  ],
};

// ---------- Flag rules ----------

export type FieldValues = Record<string, string>;

export function itemChecklistFields(taskId: string): SchemaField[] {
  const schema = FIELD_SCHEMAS[taskId] || [];
  return schema.filter((f) => (f.type === 'yesno' || f.type === 'checkbox') && (f.key || '').startsWith('item_'));
}

function itemFlagMessage(taskId: string, fields: FieldValues): string | null {
  const list = itemChecklistFields(taskId);
  if (!list.length) return null;
  const missing = list.filter((f) => fields[f.key!] !== 'yes').map((f) => f.label);
  return missing.length ? `Missing/not confirmed (${missing.length}): ${missing.join(', ')}` : null;
}

/** Short flag message if submitted values need attention, else null. */
export function evaluateFlag(taskId: string, fields: FieldValues | null | undefined): string | null {
  if (!fields) return null;
  if (taskId === 'lock') {
    const missing: string[] = [];
    if (fields.resBag === 'no') missing.push('res. bag/masks');
    if (fields.o2Tank === 'no') missing.push('O2 tank reg.');
    if (fields.suction === 'no') missing.push('portable suction');
    if (fields.aed === 'no') missing.push('AED');
    return missing.length ? 'Missing/not confirmed: ' + missing.join(', ') : null;
  }
  if (taskId === 'fridge') {
    const ct = fields.currentTemp || '';
    if (ct.startsWith('Above') || ct.startsWith('Below')) return `Current temp reading (${ct}) is out of the 2–8°C range`;
    return null;
  }
  if (taskId === 'glucometer' || taskId === 'istat') {
    if (fields.inRange === 'no') return 'Control result(s) out of range';
    return null;
  }
  if (taskId === 'eyewash' || taskId === 'aed' || taskId === 'medKit') {
    return itemFlagMessage(taskId, fields);
  }
  if (taskId === 'cartTray') {
    if (fields.itemsPresent === 'no') return 'Tray item(s) missing or expired — see notes';
    return null;
  }
  if (taskId === 'supplyAudit') {
    if (fields.inspectionStatus === 'Fail') return 'Inspection status: Fail — corrective action required';
    return null;
  }
  return null;
}

// ---------- Period helpers ----------

export function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
export function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}
export function isoWeekKey(d: Date): string {
  const c = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (c.getUTCDay() + 6) % 7;
  c.setUTCDate(c.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(c.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((+c - +firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return c.getUTCFullYear() + '-W' + String(week).padStart(2, '0');
}
export function monthKey(d: Date): string {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}
export function periodKeyFor(freq: ChecklistFrequency, d: Date): string {
  return freq === 'daily' ? fmtDate(d) : freq === 'weekly' ? isoWeekKey(d) : monthKey(d);
}
export function periodLabelFor(freq: ChecklistFrequency, d: Date): string {
  if (freq === 'daily') return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  if (freq === 'weekly') {
    const dayNum = (d.getDay() + 6) % 7;
    const mon = addDays(d, -dayNum);
    const sun = addDays(mon, 6);
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return mon.toLocaleDateString(undefined, opts) + ' – ' + sun.toLocaleDateString(undefined, opts);
  }
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

/** Record key: task|location|period — mirrors sample's "cmp:" keys. */
export function recordKey(taskId: string, loc: string, periodKey: string): string {
  return `${taskId}|${loc}|${periodKey}`;
}
