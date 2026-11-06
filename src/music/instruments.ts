import type { Lang } from '~/i18n';

export type InstrumentId = string;

export interface InstrumentProfile {
  id: InstrumentId;
  /** Display names per UI language. */
  names: Record<Lang, string>;
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

type Row = [
  id: string,
  en: string,
  nl: string,
  transposition: number,
  minHz: number,
  maxHz: number,
  odd?: true,
];

/**
 * Lookup table: picking an instrument selects its transposition, search range, detector window
 * and detector guards. Add a row to support another instrument.
 */
const TABLE: Row[] = [
  ['concert', 'Concert pitch (C)', 'Klinkend (C)', 0, 80, 2600],
  ['clarinet-eb', 'Clarinet in E♭', 'Klarinet in Es', 3, 190, 2600, true],
  ['clarinet-bb', 'Clarinet in B♭', 'Klarinet in Bes', -2, 140, 2000, true],
  ['clarinet-a', 'Clarinet in A', 'Klarinet in A', -3, 130, 2000, true],
  ['clarinet-bass', 'Bass clarinet in B♭', 'Basklarinet in Bes', -14, 65, 700, true],
  ['trumpet-bb', 'Trumpet in B♭', 'Trompet in Bes', -2, 150, 1300],
  ['trumpet-c', 'Trumpet in C', 'Trompet in C', 0, 150, 1300],
  ['horn-f', 'Horn in F', 'Hoorn in F', -7, 60, 900],
  ['trombone', 'Trombone', 'Trombone', 0, 75, 900],
  ['sax-soprano', 'Soprano sax in B♭', 'Sopraansax in Bes', -2, 200, 1500],
  ['sax-alto', 'Alto sax in E♭', 'Altsax in Es', -9, 130, 1200],
  ['sax-tenor', 'Tenor sax in B♭', 'Tenorsax in Bes', -14, 100, 900],
  ['sax-baritone', 'Baritone sax in E♭', 'Baritonsax in Es', -21, 60, 650],
  ['flute', 'Flute', 'Dwarsfluit', 0, 240, 2400],
  ['piccolo', 'Piccolo', 'Piccolo', 12, 500, 4300],
  ['oboe', 'Oboe', 'Hobo', 0, 220, 1800],
  ['bassoon', 'Bassoon', 'Fagot', 0, 50, 800],
];

const profile = ([id, en, nl, transposition, minHz, maxHz, odd]: Row): InstrumentProfile => ({
  id,
  names: { en, nl },
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
