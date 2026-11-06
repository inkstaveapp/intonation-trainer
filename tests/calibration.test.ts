import { describe, expect, it } from 'vitest';
import { StableNote } from '~/calibration';
import { DETECTOR, detectPitch } from '~/audio/mpm';
import { calibratedBounds, DEFAULT_BOUNDS, RangeTracker } from '~/audio/range';
import { centsBetween } from '~/music/pitch';
import { boundsOf } from '~/state/tuner';

describe('StableNote', () => {
  it('accepts a held note after enough steady frames and returns its median', () => {
    const s = new StableNote(10);
    let out: number | null = null;
    for (let i = 0; i < 10; i++) out = s.push(147 * 2 ** ((i % 3) / 1200)); // wobble of 2 cents
    expect(out).toBeCloseTo(147, 0);
  });
  it('does not accept a wobbling or sliding pitch', () => {
    const s = new StableNote(10, 40);
    let out: number | null = null;
    for (let i = 0; i < 30; i++) out = s.push(147 * 2 ** ((i * 10) / 1200)); // glides 10 cents per frame
    expect(out).toBeNull();
  });
  it('restarts after silence and reports progress', () => {
    const s = new StableNote(10);
    for (let i = 0; i < 6; i++) s.push(440);
    expect(s.count).toBe(6);
    s.push(null);
    expect(s.count).toBe(0);
    for (let i = 0; i < 9; i++) expect(s.push(440)).toBeNull();
    expect(s.push(440)).toBe(440);
  });
});

describe('calibrated bounds', () => {
  it('adds two semitones of slack and never exceeds the detector limits', () => {
    const b = calibratedBounds(146.83, 1760);
    expect(centsBetween(146.83, b.minHz)).toBeCloseTo(200, 0);
    expect(centsBetween(b.maxHz, 1760)).toBeCloseTo(200, 0);
    expect(calibratedBounds(40, 5000)).toEqual(DEFAULT_BOUNDS);
  });
  it('only applies to the instrument pitch it was set for, and not while calibrating', () => {
    const range = { instrument: 'bb', lowHz: 147, highHz: 1760 };
    expect(boundsOf({ range, instrument: 'bb', calibrating: false })).toEqual(
      calibratedBounds(147, 1760),
    );
    expect(boundsOf({ range, instrument: 'eb-down', calibrating: false })).toBeNull();
    expect(boundsOf({ range, instrument: 'bb', calibrating: true })).toBeNull();
    expect(boundsOf({ range: null, instrument: 'bb', calibrating: false })).toBeNull();
  });
});

describe('RangeTracker with calibrated bounds', () => {
  const SR = 48000;
  const b = calibratedBounds(146.83, 1760); // a B♭ clarinet player: low D3 to a high A6

  it('starts at the calibrated range, with a window to match, and narrows inside it', () => {
    const t = new RangeTracker(SR, b);
    expect(t.current.minHz).toBeCloseTo(b.minHz, 3);
    expect(t.current.maxHz).toBeCloseTo(b.maxHz, 3);
    expect(t.current.windowSize).toBe(2048); // 3 periods of 131 Hz need more than 1024
    t.update({ freq: 146.83, clarity: 0.95 });
    expect(t.current.minHz).toBeCloseTo(b.minHz, 3); // cannot go below the floor
    t.update({ freq: 880, clarity: 0.95 });
    t.update({ freq: 880, clarity: 0.95 });
    expect(t.current.minHz).toBeGreaterThan(b.minHz);
    expect(t.current.maxHz).toBeLessThanOrEqual(b.maxHz);
  });

  it('setBounds restores the full calibrated search', () => {
    const t = new RangeTracker(SR);
    t.update({ freq: 440, clarity: 0.95 });
    t.setBounds(b);
    expect(t.current.minHz).toBeCloseTo(b.minHz, 3);
  });

  it('stays accurate at the player lowest note and costs less than the default range there', () => {
    const f = 146.83;
    const x = new Float32Array(DETECTOR.windowSize);
    [1, 0, 0.7, 0, 0.45, 0, 0.3].forEach((a, k) => {
      for (let i = 0; i < x.length; i++)
        x[i]! += a * Math.sin(2 * Math.PI * f * (k + 1) * (i / SR) + 0.3 * (k + 1));
    });
    const time = (bounds = DEFAULT_BOUNDS) => {
      const t = new RangeTracker(SR, bounds);
      let last = null as ReturnType<typeof detectPitch>;
      const run = () => {
        const s = t.current;
        last = detectPitch(x.subarray(x.length - s.windowSize), {
          sampleRate: SR,
          minHz: s.minHz,
          maxHz: s.maxHz,
          guardMinHz: t.bounds.minHz,
        });
        t.update(last);
      };
      for (let i = 0; i < 20; i++) run();
      const t0 = performance.now();
      for (let i = 0; i < 100; i++) run();
      return { ms: (performance.now() - t0) / 100, freq: last!.freq };
    };
    const def = time();
    const cal = time(b);
    console.log(`CAL low D3: default ${def.ms.toFixed(2)} ms, calibrated ${cal.ms.toFixed(2)} ms`);
    expect(Math.abs(centsBetween(cal.freq, f))).toBeLessThan(2);
    expect(cal.ms).toBeLessThan(def.ms * 0.7);
  });
});
