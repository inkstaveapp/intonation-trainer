import { DETECTOR, type PitchResult } from './mpm';

export interface Search {
  minHz: number;
  maxHz: number;
  windowSize: number;
}

const SPAN = 2.2; // search from just over an octave below the note to just over an octave above
const EDGE = 1.25; // a note within this ratio of a range edge is re-checked against the full range
const CLARITY_OK = 0.8;
const WINDOWS = [512, 1024, 2048]; // the window must span about three periods of the lowest searched pitch

const full = (): Search => ({ ...DETECTOR });

/**
 * Keeps the pitch search as small as is safe. Cost grows with window size times lags searched, so a
 * confident note narrows the search around itself. It widens again as soon as a note lands near the
 * edge of the range or nothing confident is heard, so a leap costs about one frame, which falls inside
 * the attack that scoring ignores anyway.
 */
export class RangeTracker {
  private search: Search = full();

  constructor(private sampleRate: number) {}

  /** The range and window to use for the next frame. */
  get current(): Search {
    return this.search;
  }

  update(r: PitchResult | null): void {
    if (!r || r.clarity < CLARITY_OK) {
      this.search = full();
      return;
    }
    const s = this.search;
    const narrowed = s.minHz > DETECTOR.minHz || s.maxHz < DETECTOR.maxHz;
    if (narrowed && (r.freq < s.minHz * EDGE || r.freq > s.maxHz / EDGE)) {
      this.search = full();
      return;
    }
    const minHz = Math.max(DETECTOR.minHz, r.freq / SPAN);
    const need = Math.ceil((3 * this.sampleRate) / minHz);
    this.search = {
      minHz,
      maxHz: Math.min(DETECTOR.maxHz, r.freq * SPAN),
      windowSize: WINDOWS.find((w) => w >= need) ?? DETECTOR.windowSize,
    };
  }
}
