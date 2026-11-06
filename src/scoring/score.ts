import { getInstrument } from '~/music/instruments';
import { segmentNotes } from './segment';
import type { Tolerance } from './tolerance';
import type { Frame, NoteMeasure, NoteResult, Session, SessionSummary, Weights } from './types';

export const DEFAULT_WEIGHTS: Weights = { accuracy: 0.7, stability: 0.3 };
export const STABILITY_FULL = 2; // spread (cents) at or below this: full marks
export const STABILITY_ZERO = 15; // at or above: zero

const lerp100 = (x: number, full: number, zero: number) =>
  Math.round(100 * Math.min(1, Math.max(0, (zero - x) / (zero - full))));

/** 100 within `good` cents, 0 at `zero` cents, linear between. */
export const noteScore = (cents: number, tol: Tolerance): number =>
  lerp100(Math.abs(cents), tol.good, tol.zero);

export const stabilityScore = (spread: number): number =>
  lerp100(spread, STABILITY_FULL, STABILITY_ZERO);

export const scoreNotes = (
  measures: NoteMeasure[],
  transposition: number,
  tol: Tolerance,
): NoteResult[] =>
  measures.map((m) => ({
    ...m,
    writtenMidi: m.midi - transposition,
    score: noteScore(m.cents, tol),
    stabilityScore: stabilityScore(m.spread),
  }));

const avg = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0);

export function summarize(notes: NoteResult[], tol: Tolerance, w: Weights): SessionSummary {
  const accuracy = Math.round(avg(notes.map((n) => n.score)));
  const stability = Math.round(avg(notes.map((n) => n.stabilityScore)));
  const byNote = new Map<number, number[]>();
  for (const n of notes) byNote.set(n.writtenMidi, [...(byNote.get(n.writtenMidi) ?? []), n.cents]);
  return {
    noteCount: notes.length,
    meanAbsDev: avg(notes.map((n) => Math.abs(n.cents))),
    pctInTolerance: notes.length
      ? Math.round((100 * notes.filter((n) => Math.abs(n.cents) <= tol.good).length) / notes.length)
      : 0,
    accuracy,
    stability,
    combined: Math.round(
      (w.accuracy * accuracy + w.stability * stability) / (w.accuracy + w.stability),
    ),
    bias: [...byNote]
      .map(([writtenMidi, c]) => ({ writtenMidi, meanCents: avg(c), count: c.length }))
      .sort((a, b) => a.writtenMidi - b.writtenMidi),
  };
}

export const worstNotes = (notes: NoteResult[], n = 5): NoteResult[] =>
  [...notes].sort((a, b) => a.score - b.score).slice(0, n);

export type SessionMeta = Omit<Session, 'notes' | 'summary' | 'track' | 'weights'> & {
  weights?: Weights;
};

export function buildSession(meta: SessionMeta, track: Frame[]): Session {
  const weights = meta.weights ?? DEFAULT_WEIGHTS;
  const inst = getInstrument(meta.instrument);
  const notes = scoreNotes(segmentNotes(track), inst.transposition, meta.tolerance);
  return { ...meta, weights, notes, summary: summarize(notes, meta.tolerance, weights), track };
}
