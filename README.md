# Intonation Trainer

Local-first intonation PWA for any melodic instrument (concert pitch by default, with clarinet presets) (Vite + React + TypeScript). No backend, no audio stored or sent.

`npm run dev` · `npm test` · `npm run lint` · `npm run build`

## Assumptions

- Inter is named first in the font stack but not bundled (local-first, no CDN); falls back to system sans.
- Tests run in Node; DOM-free logic only. Storage tests use `fake-indexeddb`.
- Imports use the `~/` alias for `src/` (see `vite.config.ts` and `tsconfig.json`).
- Time signatures: BPM counts the written pulse, so 6/8 gives six clicks per bar (accent on 1).
- Metronome timing is on the audio clock; a short `setTimeout` loop only wakes the scheduler (100 ms look-ahead, 1.1 s when the tab is hidden).
- Headphone detection reads output device labels (available after mic permission) and is a heuristic; unknown means no warning.
- Mic, metronome and scoring share one `AudioContext` (`audio/context.ts`). Frames within ±30 ms of a click are dropped.
- Scoring: notes are runs on one nearest pitch (gaps up to 100 ms bridged, runs under 150 ms dropped); the first 120 ms (attack) and last 50 ms are ignored, frames more than 40 cents from the note's median are treated as slides. Vibrato (3-9 Hz, width of 12 cents or more) is stored as centre plus width. Note score is 100 within ±5 cents, 0 at ±30, linear between; stability is 100 at 2 cents spread, 0 at 15; combined is 70% accuracy and 30% stability (weights saved with each session).
- Storage: IndexedDB `sessions` (metadata, notes, summary), `tracks` (pitch track per session, loaded only on demand) and `settings` (one validated object). Sessions with no detected notes are shown but not saved. No audio is stored.
- No Capacitor yet; browser APIs are isolated in `audio/`, `storage/` and `ui/`.
