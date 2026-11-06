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
- Pop-out: Document Picture-in-Picture where available (Chromium, secure context), else a `window.open` popup. The widget is rendered into that window via a React portal, with the app's styles copied in. While popped out, the pop-out window's own animation frames drive the pitch trail and beat dots, because a hidden main tab gets none.
- CSV export (`src/export/`): per-session notes and a history summary. UTF-8 with BOM, comma delimiter, dot decimals, ISO timestamps (spreadsheets in locales that expect `;` and decimal commas, such as Dutch Excel, need Data > From Text/CSV to import it). Text cells are guarded against formula injection. The browser download lives in `download.ts` only, so a Capacitor build can swap it for Filesystem + Share. PDF export is not built.
- Theme: System (default), Light or Dark, saved with the settings. `tokens.css` holds both palettes; `data-theme` on `<html>` forces one, and the pop-out window gets the same attribute.
- PWA: `public/manifest.webmanifest`, icons, and a service worker generated at build time (`build/sw-plugin.ts`) that precaches the hashed build output. It serves from the cache first and opens `index.html` for any navigation, so the app works offline after one visit. New versions install in the background and apply on the next load. It registers only in production builds over http(s). Checked in Chromium: worker active, cache filled, deep link renders offline.
- Logo: a 24x24 pixel-art tile drawn in `scripts/make-icons.py` (`python3 scripts/make-icons.py` rewrites the SVG and PNG icons in `public/`). The tile is mid-tone teal so it shows on both light and dark pages. The local image model was tried first but only produced low-contrast blobs.
- Rendering never waits more than 1.5 s for saved settings, so blocked storage cannot leave a blank page.
- Instrument pitch: the selector lists pitches (C, B♭, E♭ higher or lower, A, F, G, octave variants), each named with the instruments that use it. Only the transposition is visible; the detector's search range, window size and clarinet twelfth-guard are fixed per pitch in `music/instruments.ts`.
- Tempo: type the BPM, hold − or + to repeat (the step grows from 1 to 5 after about a second), drag the slider, use arrow keys (Shift or Page keys for 10), or tap.
- No Capacitor yet; browser APIs are isolated in `audio/`, `storage/` and `ui/`.
