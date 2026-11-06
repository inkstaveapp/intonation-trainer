import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Frame, Session } from '~/scoring/types';
import type { Tolerance } from '~/scoring/tolerance';

/** A session without its pitch track, so history listings stay light. */
export type SessionRecord = Omit<Session, 'track'>;

export interface Settings {
  lang: 'en' | 'nl';
  theme: 'system' | 'light' | 'dark';
  instrument: string;
  a4: number;
  tuningKind: 'equal' | 'just';
  droneWritten: number;
  tolerance: Tolerance;
  droneVolume: number;
  widget: {
    collapsed: boolean;
    corner: 'tl' | 'tr' | 'bl' | 'br';
    size: 's' | 'm' | 'l';
    opacity: number;
  };
  metronome: { bpm: number; sig: string; mode: 'sound' | 'flash' | 'haptic' };
}

interface Schema extends DBSchema {
  sessions: { key: string; value: SessionRecord; indexes: { 'by-date': number } };
  tracks: { key: string; value: Frame[] };
  settings: { key: string; value: unknown };
}

let dbPromise: Promise<IDBPDatabase<Schema>> | null = null;
const db = () =>
  (dbPromise ??= openDB<Schema>('intonation-trainer', 1, {
    upgrade(d) {
      d.createObjectStore('sessions', { keyPath: 'id' }).createIndex('by-date', 'startedAt');
      d.createObjectStore('tracks');
      d.createObjectStore('settings');
    },
  }));

export async function saveSession(session: Session): Promise<void> {
  const { track, ...record } = session;
  const d = await db();
  const tx = d.transaction(['sessions', 'tracks'], 'readwrite');
  await Promise.all([
    tx.objectStore('sessions').put(record),
    tx.objectStore('tracks').put(track, record.id),
    tx.done,
  ]);
}

/** Newest first. */
export async function listSessions(): Promise<SessionRecord[]> {
  return (await (await db()).getAllFromIndex('sessions', 'by-date')).reverse();
}

export async function getSessionRecord(id: string): Promise<SessionRecord | undefined> {
  return (await db()).get('sessions', id);
}

export async function getTrack(id: string): Promise<Frame[]> {
  return (await (await db()).get('tracks', id)) ?? [];
}

export async function deleteSession(id: string): Promise<void> {
  const tx = (await db()).transaction(['sessions', 'tracks'], 'readwrite');
  await Promise.all([
    tx.objectStore('sessions').delete(id),
    tx.objectStore('tracks').delete(id),
    tx.done,
  ]);
}

const SETTINGS_KEY = 'app';

export async function loadSettings(): Promise<unknown> {
  return (await db()).get('settings', SETTINGS_KEY);
}

export async function saveSettings(s: Settings): Promise<void> {
  await (await db()).put('settings', s, SETTINGS_KEY);
}
