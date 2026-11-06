export const CLARITY_MIN = 0.8;
export const RMS_FLOOR = 0.005;
const HISTORY = 5;

const median = (v: number[]): number => {
  const s = [...v].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)]!;
};

/** Drops weak frames and median-filters accepted frequencies over the last few frames. */
export class FrameFilter {
  private hist: number[] = [];

  /** Smoothed frequency, or null when the frame is rejected (history is cleared: a new note may follow). */
  push(freq: number, clarity: number, rms: number): number | null {
    if (freq <= 0 || clarity < CLARITY_MIN || rms < RMS_FLOOR) {
      this.hist = [];
      return null;
    }
    this.hist.push(freq);
    if (this.hist.length > HISTORY) this.hist.shift();
    return median(this.hist);
  }
}
