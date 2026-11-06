import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { buildSession } from '~/scoring/score';
import { DEFAULT_TOLERANCE } from '~/scoring/tolerance';
import type { Frame } from '~/scoring/types';
import { sanitizeSettings } from '~/state/persist';
import {
  deleteSession,
  getSessionRecord,
  getTrack,
  listSessions,
  loadSettings,
  saveSession,
  saveSettings,
  type Settings,
} from '~/storage/db';

const frames = (t0: number): Frame[] =>
  Array.from({ length: 40 }, (_, i) => ({ t: t0 + i / 60, midi: 69, cents: 3, rms: 0.1 }));
const session = (id: string, startedAt: number) =>
  buildSession(
    {
      id,
      startedAt,
      durationS: 1,
      instrument: 'concert',
      a4: 442,
      tuningKind: 'equal',
      droneWritten: 60,
      tolerance: DEFAULT_TOLERANCE,
      metronome: null,
    },
    frames(0),
  );

describe('storage', () => {
  it('round-trips sessions, newest first, without loading tracks into the list', async () => {
    await saveSession(session('a', 1000));
    await saveSession(session('b', 2000));
    const list = await listSessions();
    expect(list.map((s) => s.id)).toEqual(['b', 'a']);
    expect(list[0]).not.toHaveProperty('track');
    expect((await getSessionRecord('a'))?.summary.noteCount).toBe(1);
    expect(await getTrack('a')).toHaveLength(40);
  });

  it('deletes the record and its track', async () => {
    await saveSession(session('c', 3000));
    await deleteSession('c');
    expect(await getSessionRecord('c')).toBeUndefined();
    expect(await getTrack('c')).toEqual([]);
  });

  it('round-trips settings', async () => {
    const s: Settings = {
      lang: 'nl',
      theme: 'dark',
      instrument: 'clarinet-bb',
      a4: 443,
      tuningKind: 'just',
      droneWritten: 62,
      tolerance: DEFAULT_TOLERANCE,
      droneVolume: 0.3,
      widget: { collapsed: true, corner: 'tl', size: 'l', opacity: 0.8 },
      metronome: { bpm: 96, sig: '3/4', mode: 'flash' },
    };
    await saveSettings(s);
    expect(sanitizeSettings(await loadSettings())).toEqual(s);
  });
});

describe('sanitizeSettings', () => {
  it('drops malformed values and clamps out-of-range ones', () => {
    expect(sanitizeSettings(null)).toEqual({});
    expect(sanitizeSettings('x')).toEqual({});
    const out = sanitizeSettings({
      lang: 'fr',
      theme: 'sepia',
      a4: 900,
      tuningKind: 'weird',
      tolerance: { good: 20, warn: 10, zero: 5 },
      widget: { corner: 'middle', size: 'm', opacity: 1 },
      metronome: { bpm: 'fast', sig: '4/4', mode: 'sound' },
    });
    expect(out).toEqual({ a4: 466 });
  });
});
