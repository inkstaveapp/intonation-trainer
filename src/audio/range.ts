import { DETECTOR, type PitchResult } from './mpm';

export interface Search {
  minHz: number;
  maxHz: number;
  windowSize: number;
}

/** The widest the search may ever be: the default, or the player's calibrated range. */
export interface Bounds {
  minHz: number;
  maxHz: number;
}

const SPAN = 2.2; // search from just over an octave below the note to just over an octave above
const EDGE = 1.25; // a note within this ratio of a range edge is re-checked against the full range
const CLARITY_OK = 0.8;
const WINDOWS = [512, 1024, 2048]; // the window must span PERIODS periods of the lowest searched pitch
const PERIODS = 3;
const MARGIN = 2 ** (2 / 12); // slack around a calibrated lowest/highest note: two semitones

export const DEFAULT_BOUNDS: Bounds = { minHz: DETECTOR.minHz, maxHz: DETECTOR.maxHz };

/** Search bounds from the lowest and highest note the player calibrated (sounding Hz). */
export const calibratedBounds = (lowHz: number, highHz: number): Bounds => ({
  minHz: Math.max(DETECTOR.minHz, lowHz / MARGIN),
  maxHz: Math.min(DETECTOR.maxHz, highHz * MARGIN),
});

const windowFor = (minHz: number, sampleRate: number): number =>
  WINDOWS.find((w) => w >= Math.ceil((PERIODS * sampleRate) / minHz)) ?? DETECTOR.windowSize;

/**
 * Keeps the pitch search as small as is safe. Cost grows with window size times lags searched, so a
 * confident note narrows the search around itself, never beyond the bounds. It widens again as soon as
 * a note lands near the edge of the range or nothing confident is heard, so a leap costs about one
 * frame, which falls inside the attack that scoring ignores anyway.
 */
export class RangeTracker {
  private b: Bounds;
  private search: Search;

  constructor(
    private sampleRate: number,
    bounds: Bounds = DEFAULT_BOUNDS,
  ) {
    this.b = bounds;
    this.search = this.full();
  }

  /** The range and window to use for the next frame. */
  get current(): Search {
    return this.search;
  }

  get bounds(): Bounds {
    return this.b;
  }

  setBounds(bounds: Bounds): void {
    this.b = bounds;
    this.search = this.full();
  }

  update(r: PitchResult | null): void {
    if (!r || r.clarity < CLARITY_OK) {
      this.search = this.full();
      return;
    }
    const s = this.search;
    const narrowed = s.minHz > this.b.minHz || s.maxHz < this.b.maxHz;
    if (narrowed && (r.freq < s.minHz * EDGE || r.freq > s.maxHz / EDGE)) {
      this.search = this.full();
      return;
    }
    const minHz = Math.max(this.b.minHz, r.freq / SPAN);
    this.search = {
      minHz,
      maxHz: Math.min(this.b.maxHz, r.freq * SPAN),
      windowSize: windowFor(minHz, this.sampleRate),
    };
  }

  private full(): Search {
    return { ...this.b, windowSize: windowFor(this.b.minHz, this.sampleRate) };
  }
}
