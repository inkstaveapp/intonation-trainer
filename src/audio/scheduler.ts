export const BPM_MIN = 30;
export const BPM_MAX = 250;
export const LOOK_AHEAD_S = 0.1;
export const MUTE_WINDOW_S = 0.03;

export const clampBpm = (bpm: number): number =>
  Math.min(BPM_MAX, Math.max(BPM_MIN, Math.round(bpm)));

/** Emits (beat, time) for every beat falling inside the look-ahead window. Pure: the caller owns the clock. */
export class BeatScheduler {
  bpm = 80;
  beats = 4;
  private next = 0;
  private beat = 0;

  constructor(private emit: (beat: number, time: number) => void) {}

  start(now: number): void {
    this.next = now + 0.05;
    this.beat = 0;
  }

  tick(now: number, lookAhead = LOOK_AHEAD_S): void {
    while (this.next < now + lookAhead) {
      this.emit(this.beat, this.next);
      this.next += 60 / this.bpm;
      this.beat = (this.beat + 1) % this.beats;
    }
  }
}

/** Remembers recent click times so pitch frames near a click can be ignored. */
export class ClickLog {
  private times: number[] = [];

  record(t: number): void {
    this.times.push(t);
    if (this.times.length > 16) this.times.shift();
  }

  isMuted(t: number, window = MUTE_WINDOW_S): boolean {
    return this.times.some((c) => Math.abs(t - c) <= window);
  }
}

const TAP_RESET_S = 2;
const TAP_COUNT = 5;

/** BPM from tap timestamps (seconds). A pause longer than 2 s starts a new measurement. */
export function bpmFromTaps(taps: number[]): number | null {
  let start = 0;
  for (let i = 1; i < taps.length; i++) if (taps[i]! - taps[i - 1]! > TAP_RESET_S) start = i;
  const recent = taps.slice(start).slice(-TAP_COUNT);
  if (recent.length < 2) return null;
  const mean = (recent[recent.length - 1]! - recent[0]!) / (recent.length - 1);
  return clampBpm(60 / mean);
}

/** Heuristic: output device labels are only readable once mic permission is granted. */
export async function headphonesState(): Promise<'ok' | 'none' | 'unknown'> {
  const devices = await navigator.mediaDevices?.enumerateDevices?.();
  const outs = (devices ?? []).filter((d) => d.kind === 'audiooutput' && d.label);
  if (outs.length === 0) return 'unknown';
  return outs.some((d) =>
    /head(phone|set)|ear(phone|bud|pod)|airpods|buds|bluetooth/i.test(d.label),
  )
    ? 'ok'
    : 'none';
}
