import { midiToFreq } from '~/music/pitch';

/** Just ratios per semitone above the drone (5-limit chromatic scale). */
const JUST_RATIOS = [
  1,
  16 / 15,
  9 / 8,
  6 / 5,
  5 / 4,
  4 / 3,
  45 / 32,
  3 / 2,
  8 / 5,
  5 / 3,
  16 / 9,
  15 / 8,
];

export type Tuning = { kind: 'equal' } | { kind: 'just'; droneMidi: number };

/** Cents the target sits from equal temperament (0 for ET). */
export const targetOffsetCents = (midi: number, tuning: Tuning): number => {
  if (tuning.kind === 'equal') return 0;
  const interval = (((midi - tuning.droneMidi) % 12) + 12) % 12;
  return 1200 * Math.log2(JUST_RATIOS[interval]!) - 100 * interval;
};

export const targetFreq = (midi: number, tuning: Tuning, a4: number): number =>
  midiToFreq(midi, a4) * 2 ** (targetOffsetCents(midi, tuning) / 1200);
