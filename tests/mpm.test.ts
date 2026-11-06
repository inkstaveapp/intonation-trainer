import { describe, expect, it } from 'vitest';
import { DETECTOR, detectPitch } from '~/audio/mpm';
import { centsBetween } from '~/music/pitch';

const SR = 48000;
const harmonic = (f: number, amps: number[], n = 1024, sr = SR, phase = 0.3) => {
  const x = new Float32Array(n);
  amps.forEach((a, k) => {
    for (let i = 0; i < n; i++)
      x[i]! += a * Math.sin(2 * Math.PI * f * (k + 1) * (i / sr) + phase * (k + 1));
  });
  return x;
};
const opts = { sampleRate: SR, minHz: 190, maxHz: 2600 };
// Odd harmonics only, like a clarinet in the chalumeau register.
const CLARINET = [1, 0, 0.7, 0, 0.45, 0, 0.3, 0, 0.15];

describe('detectPitch', () => {
  it.each([220, 261.63, 440, 880, 1318.5])('pure sine %f Hz within ±2 cents', (f) => {
    const r = detectPitch(harmonic(f, [1]), opts)!;
    expect(Math.abs(centsBetween(r.freq, f))).toBeLessThan(2);
    expect(r.clarity).toBeGreaterThan(0.9);
  });

  it.each([220, 311.13, 523.25, 987.77])('odd-harmonic signal %f Hz within ±2 cents', (f) => {
    const r = detectPitch(harmonic(f, CLARINET), opts)!;
    expect(Math.abs(centsBetween(r.freq, f))).toBeLessThan(2);
  });

  it('detects at 44.1 kHz too', () => {
    const f = 392;
    const r = detectPitch(harmonic(f, CLARINET, 1024, 44100), { ...opts, sampleRate: 44100 })!;
    expect(Math.abs(centsBetween(r.freq, f))).toBeLessThan(2);
  });

  it('does not report an octave or twelfth error when the 3rd harmonic dominates', () => {
    const f = 233.08; // low register, fundamental weak
    const r = detectPitch(harmonic(f, [0.35, 0, 1, 0, 0.5, 0, 0.2]), opts)!;
    expect(Math.abs(centsBetween(r.freq, f))).toBeLessThan(2);
  });

  it('uses the target as a prior to fold a twelfth error back', () => {
    const f = 233.08;
    const x = harmonic(f, [0.05, 0, 1, 0, 0.5]); // fundamental almost absent
    const withPrior = detectPitch(x, { ...opts, prior: f })!;
    expect(Math.abs(centsBetween(withPrior.freq, f))).toBeLessThan(2);
  });

  it('returns null or low clarity for noise and silence', () => {
    expect(detectPitch(new Float32Array(1024), opts)).toBeNull();
    const noise = Float32Array.from({ length: 1024 }, () => Math.random() * 2 - 1);
    const r = detectPitch(noise, opts);
    expect(r === null || r.clarity < 0.6).toBe(true);
  });

  describe('fixed wide range (DETECTOR) for every instrument', () => {
    const wide = (sampleRate: number) => ({
      sampleRate,
      minHz: DETECTOR.minHz,
      maxHz: DETECTOR.maxHz,
    });
    const frame = (f: number, amps: number[], sr: number) =>
      harmonic(f, amps, DETECTOR.windowSize, sr);

    it.each([
      [55, 'low bass'],
      [82.41, 'bass clarinet E2'],
      [233.08, 'chalumeau'],
      [880, 'mid'],
      [1760, 'high'],
    ])('odd-harmonic %f Hz (%s) within ±2 cents at 48 kHz and 44.1 kHz', (f) => {
      for (const sr of [48000, 44100]) {
        const r = detectPitch(frame(f, CLARINET, sr), wide(sr))!;
        expect(Math.abs(centsBetween(r.freq, f))).toBeLessThan(2);
      }
    });

    it('an all-harmonic tone (violin-like) is not pulled down by the twelfth guard', () => {
      for (const f of [196, 330, 659.26]) {
        const r = detectPitch(frame(f, [1, 0.6, 0.4, 0.3, 0.2], SR), wide(SR))!;
        expect(Math.abs(centsBetween(r.freq, f))).toBeLessThan(2);
      }
    });

    it('piccolo-range sines stay within 5 cents (lags of only 11-23 samples)', () => {
      for (const f of [2093, 3136, 4186]) {
        const r = detectPitch(frame(f, [1], SR), wide(SR))!;
        expect(Math.abs(centsBetween(r.freq, f))).toBeLessThan(5);
      }
    });
  });
});
