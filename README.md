# Intonation Trainer

Local-first clarinet intonation PWA (Vite + React + TypeScript). No backend, no audio stored or sent.

`npm run dev` · `npm test` · `npm run lint` · `npm run build`

## Assumptions

- Inter is named first in the font stack but not bundled (local-first, no CDN); falls back to system sans.
- Tests run in Node; DOM-free logic only. Storage tests use `fake-indexeddb`.
- No Capacitor yet; browser APIs are isolated in `audio/`, `storage/` and `ui/`.
