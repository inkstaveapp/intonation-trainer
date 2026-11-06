import { centsBetween } from '../music/pitch';

export interface PitchResult {
  freq: number;
  clarity: number;
}

export interface DetectOptions {
  sampleRate: number;
  minHz: number;
  maxHz: number;
  /** Known target pitch in Hz (exercise mode). Octave/twelfth candidates are folded onto it. */
  prior?: number | undefined;
}

const KEY_MAX_RATIO = 0.9; // MPM "k": first key maximum above k * global max
const SUBHARMONIC_RATIO = 0.25; // f0/3 amplitude vs f0 amplitude that counts as "real energy"
const FOLD_CENTS = 60;

/** Magnitude of the Hann-windowed DFT of `x` at `freq`. */
function toneMagnitude(x: Float32Array, freq: number, sampleRate: number): number {
  const n = x.length;
  const w = (2 * Math.PI * freq) / sampleRate;
  let re = 0;
  let im = 0;
  for (let i = 0; i < n; i++) {
    const h = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1));
    re += x[i]! * h * Math.cos(w * i);
    im += x[i]! * h * Math.sin(w * i);
  }
  return Math.hypot(re, im);
}

/** McLeod Pitch Method with clarinet-specific twelfth guarding. Returns null if nothing periodic. */
export function detectPitch(x: Float32Array, o: DetectOptions): PitchResult | null {
  const n = x.length;
  const minLag = Math.max(2, Math.floor(o.sampleRate / o.maxHz));
  const maxLag = Math.min(n - 2, Math.ceil(o.sampleRate / o.minHz));

  // Normalized square difference function over the lag range.
  const nsdf = new Float32Array(maxLag + 2);
  for (let tau = 0; tau <= maxLag + 1 && tau < n; tau++) {
    let acf = 0;
    let m = 0;
    for (let j = 0; j < n - tau; j++) {
      acf += x[j]! * x[j + tau]!;
      m += x[j]! * x[j]! + x[j + tau]! * x[j + tau]!;
    }
    nsdf[tau] = m > 0 ? (2 * acf) / m : 0;
  }

  // Key maxima: highest point of each positive lobe after the first negative zero crossing.
  const peaks: number[] = [];
  let tau = 1;
  while (tau < maxLag && nsdf[tau]! > 0) tau++; // skip the lobe around lag 0
  while (tau < maxLag) {
    while (tau < maxLag && nsdf[tau]! <= 0) tau++;
    let best = -1;
    while (tau < maxLag + 1 && nsdf[tau]! > 0) {
      if (best < 0 || nsdf[tau]! > nsdf[best]!) best = tau;
      tau++;
    }
    if (
      best >= minLag &&
      best <= maxLag &&
      nsdf[best]! >= nsdf[best - 1]! &&
      nsdf[best]! >= nsdf[best + 1]!
    )
      peaks.push(best);
  }
  if (peaks.length === 0) return null;

  const globalMax = Math.max(...peaks.map((p) => nsdf[p]!));
  const chosen = peaks.find((p) => nsdf[p]! >= KEY_MAX_RATIO * globalMax)!;

  // Parabolic interpolation around the chosen peak.
  const a = nsdf[chosen - 1]!;
  const b = nsdf[chosen]!;
  const c = nsdf[chosen + 1]!;
  const denom = a - 2 * b + c;
  const shift = denom === 0 ? 0 : (0.5 * (a - c)) / denom;
  const clarity = b - 0.25 * (a - c) * shift;
  let freq = o.sampleRate / (chosen + shift);

  // Twelfth guard: a strong 3rd harmonic can win the NSDF. If f/3 has real energy, it is the fundamental.
  const sub = freq / 3;
  if (sub >= o.minHz) {
    const fundamental = toneMagnitude(x, freq, o.sampleRate);
    if (toneMagnitude(x, sub, o.sampleRate) >= SUBHARMONIC_RATIO * fundamental) freq = sub;
  }

  // Prior: fold octave/twelfth/fifth-style candidates onto the known target if it is within reach.
  if (o.prior) {
    for (const r of [1, 2, 0.5, 3, 1 / 3]) {
      const cand = freq * r;
      if (Math.abs(centsBetween(cand, o.prior)) < FOLD_CENTS) {
        freq = cand;
        break;
      }
    }
  }

  return { freq, clarity: Math.min(1, clarity) };
}
