import type { Frame, NoteMeasure } from './types';

export const GAP_S = 0.1; // unvoiced gap bridged within one note (e.g. metronome-muted frames)
export const MIN_RUN_S = 0.15; // shorter runs are transitions, not notes
export const ATTACK_S = 0.12; // pitch is unsettled right after the onset
export const RELEASE_S = 0.05;
export const MIN_STABLE_S = 0.1;
const MIN_STABLE_FRAMES = 5;
const EXCURSION_CENTS = 40; // frames further than this from the note's median are slides, not the note
const VIBRATO_MIN_WIDTH = 12;
const VIBRATO_HZ: [number, number] = [3, 9];
const VIBRATO_SMOOTH = 12; // shortcut: about one vibrato cycle at ~60 frames/s; use a time window if the frame rate varies

const sorted = (v: number[]) => [...v].sort((a, b) => a - b);
const pick = (s: number[], q: number) => s[Math.min(s.length - 1, Math.floor(q * s.length))]!;
const median = (v: number[]) => pick(sorted(v), 0.5);
const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;
const robustStd = (v: number[]) => {
  const m = median(v);
  return 1.4826 * median(v.map((x) => Math.abs(x - m)));
};

/**
 * Splits frames into notes. A note is a run of voiced frames on the same nearest note (gaps up to GAP_S
 * bridged). shortcut: a note whose pitch flickers across the +-50 cent boundary splits into short runs
 * that are dropped; add hysteresis if that shows up in practice.
 */
export function segmentNotes(frames: Frame[]): NoteMeasure[] {
  const runs: Frame[][] = [];
  let cur: Frame[] | null = null;
  for (const f of frames) {
    if (f.midi === null || f.cents === null) continue;
    const last: Frame | undefined = cur?.[cur.length - 1];
    if (cur && last && f.midi === cur[0]!.midi && f.t - last.t <= GAP_S) cur.push(f);
    else runs.push((cur = [f]));
  }
  return runs.flatMap((run) => {
    const m = measureRun(run);
    return m ? [m] : [];
  });
}

function measureRun(run: Frame[]): NoteMeasure | null {
  const start = run[0]!.t;
  const end = run[run.length - 1]!.t;
  if (end - start < MIN_RUN_S) return null;

  const trimmed = run.filter((f) => f.t >= start + ATTACK_S && f.t <= end - RELEASE_S);
  if (trimmed.length === 0) return null;
  const m0 = median(trimmed.map((f) => f.cents!));
  const stable = trimmed.filter((f) => Math.abs(f.cents! - m0) <= EXCURSION_CENTS);
  if (
    stable.length < MIN_STABLE_FRAMES ||
    stable[stable.length - 1]!.t - stable[0]!.t < MIN_STABLE_S
  )
    return null;

  const cents = stable.map((f) => f.cents!);
  const duration = stable[stable.length - 1]!.t - stable[0]!.t;
  const s = sorted(cents);
  const width = pick(s, 0.95) - pick(s, 0.05);
  const centre = mean(cents);
  let crossings = 0;
  for (let i = 1; i < cents.length; i++)
    if (cents[i - 1]! - centre < 0 !== cents[i]! - centre < 0) crossings++;
  const hz = crossings / 2 / duration;
  const vibrato =
    width >= VIBRATO_MIN_WIDTH && crossings >= 4 && hz >= VIBRATO_HZ[0] && hz <= VIBRATO_HZ[1];

  let spread: number;
  if (vibrato) {
    const avg: number[] = [];
    for (let i = VIBRATO_SMOOTH - 1; i < cents.length; i++)
      avg.push(mean(cents.slice(i - VIBRATO_SMOOTH + 1, i + 1)));
    spread = avg.length >= 3 ? robustStd(avg) : 0;
  } else spread = robustStd(cents);

  return {
    startT: start,
    endT: end,
    midi: run[0]!.midi!,
    cents: vibrato ? centre : median(cents),
    spread,
    vibratoWidth: vibrato ? width : null,
    meanRms: mean(stable.map((f) => f.rms)),
  };
}
