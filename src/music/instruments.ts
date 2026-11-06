export type InstrumentId = string;

/** What matters to the player is the instrument's pitch: its transposition. Detection is the same for all. */
export interface InstrumentProfile {
  id: InstrumentId;
  /** Semitones to add to a written pitch to get the sounding pitch. */
  transposition: number;
}

type Row = [id: string, transposition: number];

/** Lookup table: one row per pitch. Display names (with the instruments that use it) live in i18n as `pitch.<id>`. */
const TABLE: Row[] = [
  ['c', 0], // flute, oboe, bassoon, trombone, C trumpet, violin ...
  ['bb', -2], // clarinet, trumpet, soprano sax
  ['a', -3], // A clarinet
  ['eb-up', 3], // E♭ clarinet
  ['eb-down', -9], // alto sax
  ['f', -7], // horn
  ['g', -5], // alto flute
  ['bb-low', -14], // tenor sax, bass clarinet
  ['eb-low', -21], // baritone sax
  ['c-up', 12], // piccolo
];

const profile = ([id, transposition]: Row): InstrumentProfile => ({ id, transposition });

export const DEFAULT_INSTRUMENT: InstrumentId = 'c';

export const INSTRUMENT_LIST: InstrumentProfile[] = TABLE.map(profile);

export const INSTRUMENTS: Record<InstrumentId, InstrumentProfile> = Object.fromEntries(
  INSTRUMENT_LIST.map((p) => [p.id, p]),
);

/** Unknown ids fall back to concert pitch. */
export const getInstrument = (id: InstrumentId): InstrumentProfile =>
  INSTRUMENTS[id] ?? INSTRUMENTS[DEFAULT_INSTRUMENT]!;

export const writtenToSounding = (written: number, inst: InstrumentProfile): number =>
  written + inst.transposition;

export const soundingToWritten = (sounding: number, inst: InstrumentProfile): number =>
  sounding - inst.transposition;
