import { describe, expect, it } from 'vitest';
import {
  buildSession,
  DEFAULT_WEIGHTS,
  noteScore,
  stabilityScore,
  worstNotes,
} from '~/scoring/score';
import { segmentNotes } from '~/scoring/segment';
import { DEFAULT_TOLERANCE as TOL } from '~/scoring/tolerance';
import type { Frame } from '~/scoring/types';

const DT = 1 / 60;
/** A note of `dur` seconds starting at `t0`; cents(t) is the deviation, with an optional attack scoop. */
const note = (
  t0: number,
  dur: number,
  midi: number,
  cents: (t: number) => number,
  scoop = 0,
): Frame[] =>
  Array.from({ length: Math.round(dur / DT) }, (_, i) => {
    const t = i * DT;
    const attack = t < 0.1 ? scoop * (1 - t / 0.1) : 0;
    return { t: t0 + t, midi, cents: cents(t) + attack, rms: 0.1 };
  });

describe('segmentNotes', () => {
  it('removes the attack so a scooped onset does not bias the note', () => {
    const [n] = segmentNotes(note(0, 1, 69, () => -8, 40));
    expect(n!.cents).toBeCloseTo(-8, 0);
    expect(n!.vibratoWidth).toBeNull();
  });

  it('splits notes on a pitch change and on a long gap', () => {
    const frames = [
      ...note(0, 0.6, 69, () => 3),
      ...note(0.6, 0.6, 71, () => -4),
      ...note(2, 0.6, 71, () => 0),
    ];
    const notes = segmentNotes(frames);
    expect(notes.map((n) => n.midi)).toEqual([69, 71, 71]);
    expect(notes[1]!.cents).toBeCloseTo(-4, 0);
  });

  it('bridges short unvoiced gaps (e.g. muted metronome frames) inside one note', () => {
    const a = note(0, 0.5, 69, () => 2);
    const b = note(0.55, 0.5, 69, () => 2);
    expect(segmentNotes([...a, ...b])).toHaveLength(1);
  });

  it('drops blips shorter than a note', () => {
    expect(segmentNotes(note(0, 0.1, 69, () => 0))).toHaveLength(0);
  });

  it('ignores an end-of-note slide away from the pitch', () => {
    const frames = [...note(0, 1, 69, (t) => (t > 0.8 ? -60 : 5))];
    expect(segmentNotes(frames)[0]!.cents).toBeCloseTo(5, 0);
  });

  it('reports vibrato as centre plus width, and rates stability on the centre', () => {
    const [n] = segmentNotes(note(0, 2, 69, (t) => 10 + 15 * Math.sin(2 * Math.PI * 5.5 * t)));
    expect(n!.vibratoWidth).toBeGreaterThan(25);
    expect(n!.vibratoWidth).toBeLessThan(32);
    expect(n!.cents).toBeCloseTo(10, 0);
    expect(n!.spread).toBeLessThan(4);
  });

  it('does not call a steady, slightly noisy note vibrato', () => {
    let seed = 1;
    const noise = () => ((seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5) * 3;
    const [n] = segmentNotes(note(0, 1.5, 69, () => 4 + noise()));
    expect(n!.vibratoWidth).toBeNull();
    expect(n!.spread).toBeLessThan(2);
  });
});

describe('scoring', () => {
  it('maps cents to 0-100 with the tolerance', () => {
    expect(noteScore(0, TOL)).toBe(100);
    expect(noteScore(-5, TOL)).toBe(100);
    expect(noteScore(17.5, TOL)).toBe(50);
    expect(noteScore(30, TOL)).toBe(0);
    expect(noteScore(-80, TOL)).toBe(0);
    expect(stabilityScore(1)).toBe(100);
    expect(stabilityScore(15)).toBe(0);
  });

  const meta = {
    id: 't',
    startedAt: 0,
    durationS: 4,
    instrument: 'bb', // written = sounding + 2
    a4: 442,
    tuningKind: 'equal' as const,
    droneWritten: 60,
    tolerance: TOL,
    metronome: null,
  };

  it('builds a session summary with visible weights, bias per written note and worst notes', () => {
    const frames = [
      ...note(0, 0.6, 69, () => 0), // perfect
      ...note(1, 0.6, 71, () => 17.5), // half marks, sharp
      ...note(2, 0.6, 71, () => 30), // zero marks, sharp
      ...note(3, 0.6, 72, () => -10),
    ];
    const s = buildSession(meta, frames);
    expect(s.weights).toEqual(DEFAULT_WEIGHTS);
    expect(s.summary.noteCount).toBe(4);
    expect(s.notes.map((n) => n.writtenMidi)).toEqual([71, 73, 73, 74]);
    expect(s.summary.accuracy).toBe(Math.round((100 + 50 + 0 + 80) / 4));
    expect(s.summary.pctInTolerance).toBe(25);
    expect(s.summary.meanAbsDev).toBeCloseTo((0 + 17.5 + 30 + 10) / 4, 0);
    expect(s.summary.combined).toBe(
      Math.round(0.7 * s.summary.accuracy + 0.3 * s.summary.stability),
    );
    const b = s.summary.bias.find((x) => x.writtenMidi === 73)!;
    expect(b.count).toBe(2);
    expect(b.meanCents).toBeCloseTo(23.75, 0);
    expect(worstNotes(s.notes, 2).map((n) => n.score)).toEqual([0, 50]);
  });

  it('handles an empty session', () => {
    const s = buildSession(meta, []);
    expect(s.summary).toMatchObject({ noteCount: 0, accuracy: 0, combined: 0, bias: [] });
  });
});
