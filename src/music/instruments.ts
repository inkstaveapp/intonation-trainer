export type InstrumentId = 'eb' | 'bb' | 'bass';

export interface InstrumentProfile {
  id: InstrumentId;
  /** Semitones to add to a written pitch to get the sounding pitch. */
  transposition: number;
  /** Pitch search range in Hz (sounding). */
  minHz: number;
  maxHz: number;
  /** Detector window in samples. */
  windowSize: number;
}

export const INSTRUMENTS: Record<InstrumentId, InstrumentProfile> = {
  eb: { id: 'eb', transposition: 3, minHz: 190, maxHz: 2600, windowSize: 1024 },
  bb: { id: 'bb', transposition: -2, minHz: 140, maxHz: 2000, windowSize: 1024 },
  bass: { id: 'bass', transposition: -14, minHz: 65, maxHz: 700, windowSize: 2048 },
};

export const writtenToSounding = (written: number, inst: InstrumentProfile): number =>
  written + inst.transposition;

export const soundingToWritten = (sounding: number, inst: InstrumentProfile): number =>
  sounding - inst.transposition;
