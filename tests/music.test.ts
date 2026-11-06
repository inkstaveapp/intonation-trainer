import { describe, expect, it } from 'vitest';
import {
  centsBetween,
  centsFromNearest,
  clampA4,
  freqToMidi,
  midiToFreq,
  nearestMidi,
} from '../src/music/pitch';
import { INSTRUMENTS, soundingToWritten, writtenToSounding } from '../src/music/instruments';
import { noteName, pitchClassName } from '../src/music/notes';
import { targetFreq, targetOffsetCents } from '../src/music/tuning';

describe('pitch', () => {
  it('maps A4 and octaves', () => {
    expect(midiToFreq(69, 442)).toBeCloseTo(442);
    expect(midiToFreq(81, 440)).toBeCloseTo(880);
    expect(freqToMidi(220, 440)).toBeCloseTo(57);
  });
  it('round-trips freq <-> midi', () => {
    for (const m of [40, 55.3, 72, 90]) expect(freqToMidi(midiToFreq(m, 443), 443)).toBeCloseTo(m);
  });
  it('computes cents', () => {
    expect(centsBetween(880, 440)).toBeCloseTo(1200);
    expect(centsBetween(440 * 2 ** (10 / 1200), 440)).toBeCloseTo(10);
    expect(centsFromNearest(442 * 2 ** (-20 / 1200), 442)).toBeCloseTo(-20);
    expect(nearestMidi(440, 442)).toBe(69);
  });
  it('clamps A4 to 415-466', () => {
    expect(clampA4(400)).toBe(415);
    expect(clampA4(500)).toBe(466);
    expect(clampA4(442)).toBe(442);
  });
});

describe('instruments and notes', () => {
  it('transposes written <-> sounding', () => {
    const written = 72; // C5
    expect(writtenToSounding(written, INSTRUMENTS.eb!)).toBe(75); // E♭
    expect(writtenToSounding(written, INSTRUMENTS.bb!)).toBe(70); // B♭
    expect(writtenToSounding(written, INSTRUMENTS.bass!)).toBe(58);
    for (const i of Object.values(INSTRUMENTS))
      expect(soundingToWritten(writtenToSounding(60, i), i)).toBe(60);
  });
  it('concert pitch does not transpose', () => {
    expect(writtenToSounding(60, INSTRUMENTS.concert!)).toBe(60);
  });
  it('names notes', () => {
    expect(noteName(69)).toBe('A4');
    expect(noteName(60)).toBe('C4');
    expect(noteName(61, true)).toBe('D♭4');
    expect(pitchClassName(-1)).toBe('B');
  });
});

describe('tuning', () => {
  it('equal temperament has no offset', () => {
    expect(targetOffsetCents(64, { kind: 'equal' })).toBe(0);
  });
  it('just major third ~ -14, fifth ~ +2 cents relative to drone', () => {
    const t = { kind: 'just', droneMidi: 60 } as const;
    expect(targetOffsetCents(64, t)).toBeCloseTo(-13.69, 1);
    expect(targetOffsetCents(67, t)).toBeCloseTo(1.96, 1);
    expect(targetOffsetCents(76, t)).toBeCloseTo(-13.69, 1); // octave above
    expect(targetOffsetCents(60, t)).toBeCloseTo(0);
  });
  it('target frequency applies the offset', () => {
    const t = { kind: 'just', droneMidi: 60 } as const;
    const et = midiToFreq(64, 442);
    expect(centsBetween(targetFreq(64, t, 442), et)).toBeCloseTo(-13.69, 1);
  });
});
