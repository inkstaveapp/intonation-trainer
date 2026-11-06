export const A4_MIN = 415;
export const A4_MAX = 466;
export const A4_DEFAULT = 442;
const A4_MIDI = 69;

export const clampA4 = (a4: number): number => Math.min(A4_MAX, Math.max(A4_MIN, a4));

export const midiToFreq = (midi: number, a4 = A4_DEFAULT): number =>
  a4 * 2 ** ((midi - A4_MIDI) / 12);

/** Fractional MIDI number. */
export const freqToMidi = (freq: number, a4 = A4_DEFAULT): number =>
  A4_MIDI + 12 * Math.log2(freq / a4);

/** Signed cents of `freq` relative to `ref` (positive = sharp). */
export const centsBetween = (freq: number, ref: number): number => 1200 * Math.log2(freq / ref);

export const nearestMidi = (freq: number, a4 = A4_DEFAULT): number =>
  Math.round(freqToMidi(freq, a4));

/** Deviation in cents from the nearest equal-tempered note. */
export const centsFromNearest = (freq: number, a4 = A4_DEFAULT): number =>
  centsBetween(freq, midiToFreq(nearestMidi(freq, a4), a4));
