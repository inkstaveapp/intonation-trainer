import { describe, expect, it, vi } from 'vitest';
import { swSource } from '../build/sw-plugin';

type Listener = (e: Record<string, unknown>) => void;

/** Runs the generated worker against minimal stand-ins for its globals. */
function load(files: string[], version: string, existingCaches: string[] = []) {
  const listeners: Record<string, Listener> = {};
  const store = { addAll: vi.fn().mockResolvedValue(undefined) };
  const caches = {
    open: vi.fn().mockResolvedValue(store),
    keys: vi.fn().mockResolvedValue(existingCaches),
    delete: vi.fn().mockResolvedValue(true),
    match: vi.fn().mockResolvedValue('cached'),
  };
  const self = {
    location: { origin: 'https://app.test' },
    registration: { scope: 'https://app.test/base/' },
    addEventListener: (type: string, fn: Listener) => (listeners[type] = fn),
    skipWaiting: vi.fn(),
    clients: { claim: vi.fn() },
  };
  new Function('self', 'caches', 'fetch', swSource(files, version))(self, caches, vi.fn());
  const run = async (type: string, e: Record<string, unknown> = {}) => {
    const waits: Promise<unknown>[] = [];
    const respond = vi.fn();
    listeners[type]!({
      ...e,
      waitUntil: (p: Promise<unknown>) => waits.push(p),
      respondWith: respond,
    });
    await Promise.all(waits);
    return respond;
  };
  return { caches, store, self, run };
}

describe('service worker', () => {
  it('precaches the shell plus every listed file under a versioned cache', async () => {
    const { caches, store, self, run } = load(['assets/app.js', 'icon.svg'], 'abc123');
    await run('install');
    expect(caches.open).toHaveBeenCalledWith('intonation-abc123');
    // Resolved against the worker's scope, so it works from a sub-path like /base/.
    expect(store.addAll).toHaveBeenCalledWith([
      'https://app.test/base/',
      'https://app.test/base/assets/app.js',
      'https://app.test/base/icon.svg',
    ]);
    expect(self.skipWaiting).toHaveBeenCalled();
  });

  it('deletes only older Intonation caches on activate', async () => {
    const { caches, self, run } = load([], 'new', [
      'intonation-old',
      'intonation-new',
      'other-app',
    ]);
    await run('activate');
    expect(caches.delete).toHaveBeenCalledTimes(1);
    expect(caches.delete).toHaveBeenCalledWith('intonation-old');
    expect(self.clients.claim).toHaveBeenCalled();
  });

  it('serves navigations from the cached shell and ignores other origins and non-GET requests', async () => {
    const { caches, run } = load([], 'v');
    const nav = await run('fetch', {
      request: { method: 'GET', url: 'https://app.test/base/history', mode: 'navigate' },
    });
    expect(nav).toHaveBeenCalled();
    expect(caches.match).toHaveBeenCalledWith('https://app.test/base/', { ignoreSearch: true });
    expect(
      await run('fetch', { request: { method: 'GET', url: 'https://other.test/x', mode: 'cors' } }),
    ).not.toHaveBeenCalled();
    expect(
      await run('fetch', { request: { method: 'POST', url: 'https://app.test/x', mode: 'cors' } }),
    ).not.toHaveBeenCalled();
  });
});
