import { describe, expect, it } from 'vitest';
import { detectPitch } from '../src/audio/mpm';
import { centsBetween, midiToFreq } from '../src/music/pitch';

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

  it('works for bass clarinet range with a 2048 window', () => {
    const f = midiToFreq(40, 442); // E2
    const r = detectPitch(harmonic(f, CLARINET, 2048), { sampleRate: SR, minHz: 65, maxHz: 700 })!;
    expect(Math.abs(centsBetween(r.freq, f))).toBeLessThan(2);
  });
});
