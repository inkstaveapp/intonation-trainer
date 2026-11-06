export type InstrumentId = string;

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

type Row = [nl: string, transposition: number, minHz: number, maxHz: number, odd?: true];

/**
 * Lookup table (display names live in i18n as `instrument.<id>`): picking an instrument selects its transposition, search range, detector window
 * and detector guards. Add a row to support another instrument.
 */
const TABLE: Row[] = [
  ['concert', 0, 80, 2600],
  ['clarinet-eb', 3, 190, 2600, true],
  ['clarinet-bb', -2, 140, 2000, true],
  ['clarinet-a', -3, 130, 2000, true],
  ['clarinet-bass', -14, 65, 700, true],
  ['trumpet-bb', -2, 150, 1300],
  ['trumpet-c', 0, 150, 1300],
  ['horn-f', -7, 60, 900],
  ['trombone', 0, 75, 900],
  ['sax-soprano', -2, 200, 1500],
  ['sax-alto', -9, 130, 1200],
  ['sax-tenor', -14, 100, 900],
  ['sax-baritone', -21, 60, 650],
  ['flute', 0, 240, 2400],
  ['piccolo', 12, 500, 4300],
  ['oboe', 0, 220, 1800],
  ['bassoon', 0, 50, 800],
];

const profile = ([id, transposition, minHz, maxHz, odd]: Row): InstrumentProfile => ({
  id,
  transposition,
  minHz,
  maxHz,
  windowSize: minHz >= 140 ? 1024 : 2048, // window must span a few periods of the lowest note
  oddHarmonics: odd === true,
});

export const DEFAULT_INSTRUMENT: InstrumentId = 'concert';

export const INSTRUMENT_LIST: InstrumentProfile[] = TABLE.map(profile);

export const INSTRUMENTS: Record<InstrumentId, InstrumentProfile> = Object.fromEntries(
  INSTRUMENT_LIST.map((p) => [p.id, p]),
);

/** Unknown ids (e.g. from old stored settings) fall back to concert pitch. */
export const getInstrument = (id: InstrumentId): InstrumentProfile =>
  INSTRUMENTS[id] ?? INSTRUMENTS[DEFAULT_INSTRUMENT]!;

export const writtenToSounding = (written: number, inst: InstrumentProfile): number =>
  written + inst.transposition;

export const soundingToWritten = (sounding: number, inst: InstrumentProfile): number =>
  sounding - inst.transposition;
