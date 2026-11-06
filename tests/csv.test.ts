import { describe, expect, it } from 'vitest';
import { cell, exportFileName, notesToCsv, sessionsToCsv } from '~/export/csv';
import { buildSession } from '~/scoring/score';
import { DEFAULT_TOLERANCE } from '~/scoring/tolerance';
import type { Frame } from '~/scoring/types';

const frames = (t0: number, midi: number, cents: number): Frame[] =>
  Array.from({ length: 40 }, (_, i) => ({ t: t0 + i / 60, midi, cents, rms: 0.1 }));

const session = buildSession(
  {
    id: 'abc',
    startedAt: Date.UTC(2026, 10, 6, 12, 0, 0),
    durationS: 3.2,
    instrument: 'clarinet-bb', // written = sounding + 2
    a4: 442,
    tuningKind: 'just',
    droneWritten: 60,
    tolerance: DEFAULT_TOLERANCE,
    metronome: null,
  },
  [...frames(5, 69, -7.5), ...frames(6, 71, 12)],
);

describe('cell', () => {
  it('quotes commas, quotes and newlines (RFC 4180)', () => {
    expect(cell('a,b')).toBe('"a,b"');
    expect(cell('say "hi"')).toBe('"say ""hi"""');
    expect(cell('a\nb')).toBe('"a\nb"');
    expect(cell('plain')).toBe('plain');
  });
  it('neutralises text that a spreadsheet would run as a formula, but not numbers', () => {
    expect(cell('=1+1')).toBe("'=1+1");
    expect(cell('@SUM(A1)')).toBe("'@SUM(A1)");
    expect(cell('-cmd')).toBe("'-cmd");
    expect(cell(-7.5)).toBe('-7.5');
  });
  it('writes null and non-finite numbers as empty', () => {
    expect(cell(null)).toBe('');
    expect(cell(NaN)).toBe('');
  });
});

describe('notesToCsv', () => {
  it('has a header and one row per note, with times relative to the first note', () => {
    const lines = notesToCsv(session).trimEnd().split('\r\n');
    expect(lines).toHaveLength(3);
    const cols = lines[0]!.split(',');
    const row = lines[1]!.split(',');
    expect(row).toHaveLength(cols.length);
    const get = (name: string) => row[cols.indexOf(name)];
    expect(get('session_id')).toBe('abc');
    expect(get('started_at')).toBe('2026-11-06T12:00:00.000Z');
    expect(get('tuning')).toBe('just');
    expect(get('written_note')).toBe('B4'); // sounding A4 + 2
    expect(get('sounding_note')).toBe('A4');
    expect(get('cents')).toBe('-7.5');
    expect(get('start_s')).toBe('0');
    expect(get('vibrato_width_cents')).toBe('');
    expect(get('note_score')).toBe('90'); // 100 * (30 - 7.5) / (30 - 5)
  });
  it('is header-only for a session with no notes', () => {
    const empty = buildSession({ ...session, notes: undefined } as never, []);
    expect(notesToCsv(empty).trimEnd().split('\r\n')).toHaveLength(1);
  });
});

describe('sessionsToCsv and file names', () => {
  it('writes one summary row per session', () => {
    const lines = sessionsToCsv([session, session]).trimEnd().split('\r\n');
    expect(lines).toHaveLength(3);
    expect(lines[1]!.split(',')[6]).toBe('2'); // notes
    expect(lines[1]!.endsWith('0.7,0.3')).toBe(true);
  });
  it('builds a readable local-time file name', () => {
    const ms = new Date(2026, 10, 6, 9, 5).getTime();
    expect(exportFileName('session', ms)).toBe('intonation-session-20261106-0905.csv');
    expect(exportFileName('history', ms)).toBe('intonation-history-20261106-0905.csv');
  });
});
