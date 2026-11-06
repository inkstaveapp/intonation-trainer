import { describe, expect, it } from 'vitest';
import { DETECTOR, detectPitch, type PitchResult } from '~/audio/mpm';
import { RangeTracker } from '~/audio/range';
import { centsBetween } from '~/music/pitch';

const SR = 48000;
const ok = (freq: number): PitchResult => ({ freq, clarity: 0.95 });

describe('RangeTracker rules', () => {
  it('starts with the full range', () => {
    const t = new RangeTracker(SR);
    expect(t.current).toEqual({ ...DETECTOR });
  });

  it('narrows around a confident note and shrinks the window with it', () => {
    const t = new RangeTracker(SR);
    t.update(ok(440));
    expect(t.current.minHz).toBeCloseTo(200, 0);
    expect(t.current.maxHz).toBeCloseTo(968, 0);
    expect(t.current.windowSize).toBe(1024);
    t.update(ok(880));
    // 880 is outside the interior of [200, 968]: re-check against the full range first
    expect(t.current).toEqual({ ...DETECTOR });
    t.update(ok(880));
    expect(t.current.windowSize).toBe(512);
  });

  it('cannot narrow below the floor for low notes (window stays large)', () => {
    const t = new RangeTracker(SR);
    t.update(ok(110));
    expect(t.current.minHz).toBe(DETECTOR.minHz);
    expect(t.current.windowSize).toBe(2048);
  });

  it('goes back to the full range as soon as no confident pitch is heard', () => {
    const t = new RangeTracker(SR);
    t.update(ok(440));
    expect(t.current.minHz).toBeGreaterThan(DETECTOR.minHz);
    t.update(null);
    expect(t.current).toEqual({ ...DETECTOR });
    t.update(ok(440));
    t.update({ freq: 440, clarity: 0.5 }); // weak counts as not heard
    expect(t.current).toEqual({ ...DETECTOR });
  });

  it('a note near the range edge triggers a full-range re-check; an interior note just recentres', () => {
    const t = new RangeTracker(SR);
    t.update(ok(440));
    t.update(ok(500));
    expect(t.current.minHz).toBeCloseTo(500 / 2.2, 0);
    t.update(ok(100)); // far below
    expect(t.current).toEqual({ ...DETECTOR });
  });
});

/** The worklet's per-frame logic, driven with synthetic clarinet-like frames (odd harmonics). */
const tone = (f: number) => {
  const x = new Float32Array(DETECTOR.windowSize);
  [1, 0, 0.7, 0, 0.45, 0, 0.3, 0, 0.15].forEach((a, k) => {
    for (let i = 0; i < x.length; i++)
      x[i]! += a * Math.sin(2 * Math.PI * f * (k + 1) * (i / SR) + 0.3 * (k + 1));
  });
  return x;
};
function frame(t: RangeTracker, x: Float32Array) {
  const { minHz, maxHz, windowSize } = t.current;
  const r = detectPitch(x.subarray(x.length - windowSize), {
    sampleRate: SR,
    minHz,
    maxHz,
    guardMinHz: DETECTOR.minHz,
  });
  t.update(r);
  return r;
}

describe('with the real detector', () => {
  const melody = [440, 466.16, 523.25, 880, 220, 659.26, 220, 110, 1760, 261.63, 87.31, 349.23];
  const FRAMES = 8;
  const RECOVER = 2; // a leap may cost this many frames (about 33 ms at 60 updates/s)

  it('stays accurate through semitone steps, octaves and twelfths in both directions', () => {
    const t = new RangeTracker(SR);
    const wrong: string[] = [];
    for (const f of melody) {
      const x = tone(f);
      for (let i = 0; i < FRAMES; i++) {
        const r = frame(t, x);
        const err = r ? Math.abs(centsBetween(r.freq, f)) : Infinity;
        if (i >= RECOVER && err >= 2) wrong.push(`${f} Hz frame ${i}: ${r?.freq.toFixed(1)}`);
      }
    }
    expect(wrong).toEqual([]);
  });

  it('the first frame of a leap is the only one that can be wrong, and never for long', () => {
    const t = new RangeTracker(SR);
    for (let i = 0; i < FRAMES; i++) frame(t, tone(659.26)); // settle narrow around E5
    let bad = 0;
    const x = tone(220); // a twelfth down
    for (let i = 0; i < FRAMES; i++) {
      const r = frame(t, x);
      if (!r || Math.abs(centsBetween(r.freq, 220)) >= 2) bad++;
    }
    expect(bad).toBeLessThanOrEqual(1);
  });

  it('is much cheaper than the full range for a mid-register note', () => {
    const x = tone(440);
    const time = (adaptive: boolean) => {
      const t = new RangeTracker(SR);
      for (let i = 0; i < 20; i++) {
        const s = adaptive ? t.current : { ...DETECTOR };
        const r = detectPitch(x.subarray(x.length - s.windowSize), {
          sampleRate: SR,
          ...s,
          guardMinHz: DETECTOR.minHz,
        });
        t.update(r);
      }
      const t0 = performance.now();
      for (let i = 0; i < 100; i++) {
        const s = adaptive ? t.current : { ...DETECTOR };
        const r = detectPitch(x.subarray(x.length - s.windowSize), {
          sampleRate: SR,
          ...s,
          guardMinHz: DETECTOR.minHz,
        });
        t.update(r);
      }
      return (performance.now() - t0) / 100;
    };
    const full = time(false);
    const narrow = time(true);
    console.log(
      `COST full ${full.toFixed(3)} ms, adaptive ${narrow.toFixed(3)} ms per frame at 440 Hz`,
    );
    expect(narrow).toBeLessThan(full / 3);
  });
});
