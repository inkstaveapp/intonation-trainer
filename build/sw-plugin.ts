import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type { Plugin } from 'vite';

/** Files from public/ that the app needs offline (hashed build output is added automatically). */
export const PUBLIC_FILES = [
  '/manifest.webmanifest',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-512.png',
  '/apple-touch-icon.png',
];

/**
 * Service worker source: precache everything, answer from the cache first, and open index.html for
 * any navigation. New versions install in the background and take over on the next load.
 */
export function swSource(files: string[], version: string): string {
  return `// Generated at build time by build/sw-plugin.ts
const CACHE = 'intonation-${version}';
const FILES = ${JSON.stringify(['/', ...files])};

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('intonation-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    caches.match(req.mode === 'navigate' ? '/' : req, { ignoreSearch: true }).then((hit) => hit ?? fetch(req)),
  );
});
`;
}

export function swPlugin(): Plugin {
  return {
    name: 'intonation-sw',
    apply: 'build',
    generateBundle(_, bundle) {
      const hash = createHash('sha1');
      const files: string[] = [];
      for (const [name, out] of Object.entries(bundle)) {
        hash.update(name).update(out.type === 'chunk' ? out.code : out.source);
        if (name !== 'index.html' && !name.endsWith('.map')) files.push('/' + name);
      }
      for (const f of PUBLIC_FILES) hash.update(readFileSync('public' + f)); // a changed icon must bump the cache
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: swSource([...files, ...PUBLIC_FILES], hash.digest('hex').slice(0, 10)),
      });
    },
  };
}
