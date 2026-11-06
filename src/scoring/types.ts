import type { InstrumentId } from '~/music/instruments';
import type { Tolerance } from './tolerance';

/** One detector frame on the shared AudioContext clock. Unvoiced frames have null midi/cents. */
export interface Frame {
  t: number;
  /** Nearest sounding MIDI note. */
  midi: number | null;
  /** Cents from that note's target in the active tuning. */
  cents: number | null;
  rms: number;
}

export interface NoteMeasure {
  startT: number;
  endT: number;
  /** Sounding MIDI note. */
  midi: number;
  /** Representative deviation: median, or the vibrato centre (mean) when vibrato is present. */
  cents: number;
  /** Robust spread (1.4826 * MAD) of the stable segment; for vibrato notes, of the cycle-averaged pitch. */
  spread: number;
  /** Peak-to-peak vibrato width in cents, null when there is no vibrato. */
  vibratoWidth: number | null;
  meanRms: number;
}

export interface NoteResult extends NoteMeasure {
  writtenMidi: number;
  /** 0-100 from |cents| and the tolerance. */
  score: number;
  /** 0-100 from the spread. */
  stabilityScore: number;
}

export interface Weights {
  accuracy: number;
  stability: number;
}

export interface SessionSummary {
  noteCount: number;
  /** Mean absolute deviation in cents. */
  meanAbsDev: number;
  /** Share of notes within the "good" tolerance, 0-100. */
  pctInTolerance: number;
  accuracy: number;
  stability: number;
  /** Weighted accuracy and stability, 0-100. */
  combined: number;
  /** Mean signed deviation per written note (positive = sharp). */
  bias: { writtenMidi: number; meanCents: number; count: number }[];
}

export interface Session {
  id: string;
  startedAt: number;
  durationS: number;
  instrument: InstrumentId;
  a4: number;
  tuningKind: 'equal' | 'just';
  droneWritten: number;
  tolerance: Tolerance;
  weights: Weights;
  /** Metronome settings and beat times (shared audio clock) for rushing/dragging analysis; empty if unused. */
  metronome: { bpm: number; sig: string; beats: number[] } | null;
  notes: NoteResult[];
  summary: SessionSummary;
  /** Full-rate pitch track. Never audio. */
  track: Frame[];
}
