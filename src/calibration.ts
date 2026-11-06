import { centsBetween } from '~/music/pitch';

/** The highest note must be at least this far above the lowest (a tritone) or the pair is rejected. */
export const MIN_RANGE_RATIO = 2 ** (6 / 12);

/** Frames of silence (about 0.3 s) that count as lifting off before the next note is collected. */
export const REST_FRAMES = 20;

/** Recognises a held note: enough consecutive frames within a narrow band. Null input means silence. */
export class StableNote {
  private buf: number[] = [];

  constructor(
    readonly frames = 45, // about 0.75 s at 60 updates/s
    private maxSpreadCents = 40,
  ) {}

  /** Frames collected so far, for a progress display. */
  get count(): number {
    return this.buf.length;
  }

  reset(): void {
    this.buf = [];
  }

  /** The median frequency once the note has been held steadily, else null. */
  push(freq: number | null): number | null {
    if (freq === null) {
      this.buf = [];
      return null;
    }
    this.buf.push(freq);
    if (this.buf.length > this.frames) this.buf.shift();
    if (this.buf.length < this.frames) return null;
    const s = [...this.buf].sort((a, b) => a - b);
    if (centsBetween(s[s.length - 1]!, s[0]!) > this.maxSpreadCents) return null;
    return s[Math.floor(s.length / 2)]!;
  }
}
