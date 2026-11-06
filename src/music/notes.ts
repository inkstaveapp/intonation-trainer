const SHARP = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
const FLAT = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];

/** Pitch class letter, e.g. 61 -> "C♯". */
export const pitchClassName = (midi: number, flats = false): string =>
  (flats ? FLAT : SHARP)[((midi % 12) + 12) % 12]!;

/** Scientific pitch notation (C4 = 60), e.g. 69 -> "A4". */
export const noteName = (midi: number, flats = false): string =>
  `${pitchClassName(midi, flats)}${Math.floor(midi / 12) - 1}`;
