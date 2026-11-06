import { noteName } from '~/music/notes';
import type { SessionRecord } from '~/storage/db';

type Cell = string | number | null;

/** RFC 4180 quoting, plus a guard so text can never be read as a spreadsheet formula. Numbers stay untouched. */
export function cell(v: Cell): string {
  if (v === null) return '';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : '';
  const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

const toCsv = (header: string[], rows: Cell[][]): string =>
  [header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n';

const n = (x: number, digits: number) => Number(x.toFixed(digits));

/** One row per scored note. Machine-friendly: dot decimals, ISO timestamps, signed cents (positive = sharp). */
export function notesToCsv(s: SessionRecord): string {
  const started = new Date(s.startedAt).toISOString();
  return toCsv(
    [
      'session_id',
      'started_at',
      'instrument',
      'a4_hz',
      'tuning',
      'note_index',
      'start_s',
      'end_s',
      'written_note',
      'sounding_note',
      'cents',
      'spread_cents',
      'vibrato_width_cents',
      'mean_rms',
      'note_score',
      'stability_score',
    ],
    s.notes.map((note, i) => [
      s.id,
      started,
      s.instrument,
      s.a4,
      s.tuningKind,
      i + 1,
      n(note.startT - (s.notes[0]?.startT ?? 0), 3),
      n(note.endT - (s.notes[0]?.startT ?? 0), 3),
      noteName(note.writtenMidi),
      noteName(note.midi),
      n(note.cents, 2),
      n(note.spread, 2),
      note.vibratoWidth === null ? null : n(note.vibratoWidth, 2),
      n(note.meanRms, 4),
      note.score,
      note.stabilityScore,
    ]),
  );
}

/** One row per session, for spreadsheets or backups of the history. */
export function sessionsToCsv(sessions: SessionRecord[]): string {
  return toCsv(
    [
      'session_id',
      'started_at',
      'duration_s',
      'instrument',
      'a4_hz',
      'tuning',
      'notes',
      'score',
      'accuracy',
      'stability',
      'pct_in_tolerance',
      'mean_abs_dev_cents',
      'weight_accuracy',
      'weight_stability',
    ],
    sessions.map((s) => [
      s.id,
      new Date(s.startedAt).toISOString(),
      n(s.durationS, 1),
      s.instrument,
      s.a4,
      s.tuningKind,
      s.summary.noteCount,
      s.summary.combined,
      s.summary.accuracy,
      s.summary.stability,
      s.summary.pctInTolerance,
      n(s.summary.meanAbsDev, 2),
      s.weights.accuracy,
      s.weights.stability,
    ]),
  );
}

const p2 = (x: number) => String(x).padStart(2, '0');

/** e.g. intonation-session-20261106-1530.csv (local time). */
export const exportFileName = (kind: 'session' | 'history', ms: number): string => {
  const d = new Date(ms);
  return `intonation-${kind}-${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}-${p2(d.getHours())}${p2(d.getMinutes())}.csv`;
};
