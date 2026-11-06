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

export const DEFAULT_INSTRUMENT: InstrumentId = 'concert';

/** Presets only: any profile with these fields works. */
export const INSTRUMENTS: Record<InstrumentId, InstrumentProfile> = {
  concert: {
    id: 'concert',
    transposition: 0,
    minHz: 80,
    maxHz: 2600,
    windowSize: 2048,
    oddHarmonics: false,
  },
  eb: { id: 'eb', transposition: 3, minHz: 190, maxHz: 2600, windowSize: 1024, oddHarmonics: true },
  bb: {
    id: 'bb',
    transposition: -2,
    minHz: 140,
    maxHz: 2000,
    windowSize: 1024,
    oddHarmonics: true,
  },
  bass: {
    id: 'bass',
    transposition: -14,
    minHz: 65,
    maxHz: 700,
    windowSize: 2048,
    oddHarmonics: true,
  },
};

export const writtenToSounding = (written: number, inst: InstrumentProfile): number =>
  written + inst.transposition;

export const soundingToWritten = (sounding: number, inst: InstrumentProfile): number =>
  sounding - inst.transposition;

/** Unknown ids (e.g. from old stored settings) fall back to concert pitch. */
export const getInstrument = (id: InstrumentId): InstrumentProfile =>
  INSTRUMENTS[id] ?? INSTRUMENTS[DEFAULT_INSTRUMENT]!;
