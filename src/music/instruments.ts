export type InstrumentId = string;

/**
 * What matters to the player is the instrument's pitch (its transposition). The rest is detector tuning
 * chosen per pitch, never shown: the search range and window suit the instruments of that pitch.
 */
export interface InstrumentProfile {
  id: InstrumentId;
  /** Semitones to add to a written pitch to get the sounding pitch. */
  transposition: number;
  /** Pitch search range in Hz (sounding). */
  minHz: number;
  maxHz: number;
  /** Detector window in samples. */
  windowSize: number;
  /** Odd-harmonic-heavy tone (clarinet family): enables the twelfth-error guard. */
  oddHarmonics: boolean;
}

type Row = [id: string, transposition: number, minHz: number, maxHz: number, odd?: true];

/**
 * Lookup table: one row per pitch. Display names (with the instruments that use it) live in i18n as
 * `pitch.<id>`. Ranges are the union of the instruments listed in that name.
 */
const TABLE: Row[] = [
  ['c', 0, 50, 2600], // flute, oboe, bassoon, trombone, C trumpet, violin ...
  ['bb', -2, 140, 2000, true], // clarinet, trumpet, soprano sax
  ['a', -3, 130, 2000, true], // A clarinet
  ['eb-up', 3, 190, 2600, true], // E♭ clarinet
  ['eb-down', -9, 130, 1200], // alto sax
  ['f', -7, 60, 900], // horn
  ['g', -5, 180, 1700], // alto flute
  ['bb-low', -14, 65, 900, true], // tenor sax, bass clarinet
  ['eb-low', -21, 60, 650], // baritone sax
  ['c-up', 12, 500, 4300], // piccolo
];

const profile = ([id, transposition, minHz, maxHz, odd]: Row): InstrumentProfile => ({
  id,
  transposition,
  minHz,
  maxHz,
  windowSize: minHz >= 140 ? 1024 : 2048, // window must span a few periods of the lowest note
  oddHarmonics: odd === true,
});

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
