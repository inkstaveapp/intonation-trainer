# How it works

Technical notes on the parts of the app that are not obvious from the code. The numbers were measured on a desktop in Node unless it says otherwise.

## Pitch detection

Detection runs in an audio worklet (`src/audio/worklet/pitch-processor.ts`), so it does not depend on the page's main thread. About 60 times a second it analyses the most recent samples with the McLeod Pitch Method (`src/audio/mpm.ts`) and posts the frequency, a clarity value, the signal level, the peak and the audio clock time.

- **Microphone setup.** Echo cancellation, noise suppression and automatic gain are switched off, because they distort pitch and level.
- **Odd harmonics.** A clarinet is rich in odd harmonics, so the third harmonic can win and the detector reports a twelfth too high. When the energy at a third of the detected frequency is at least a quarter of the energy at the detected frequency, the lower pitch is taken as the fundamental. This guard is always on.
- **Target prior.** The detector can fold octave and twelfth candidates onto a known target note. Nothing in the app sets a target yet, because there is no melody mode.
- **Filtering.** Frames with a clarity below 0.8 or a level below 0.005 are dropped, and the rest are median-filtered over five frames. The display updates about 12 times a second, while scoring uses every frame.
- **Warnings and power.** The app warns when the input clips (peak at 0.99 or more) and when the audio latency is above 150 ms, which usually means Bluetooth headphones. It stops listening after 20 seconds of silence, and you resume with a tap.

The detector is the same for every instrument: 50 to 4300 Hz, with a window of up to 2048 samples. The instrument pitch you pick only changes the transposition.

## Adaptive search range

The cost of one detection grows with the window size times the number of lags searched, and the lowest pitch sets the lags. So the search narrows around the note you are playing (`src/audio/range.ts`):

- After a confident note, it searches from just over an octave below to just over an octave above, with a window about three periods long at the lowest pitch searched.
- A note close to the edge of that range, or any frame without a confident pitch, goes back to the full range. A leap therefore costs about one frame, which falls inside the first 120 ms of a note that scoring ignores anyway.
- Silence skips detection altogether.

Time per detection for a steady note at 48 kHz, against 2.1 ms for the full range:

| Note         | Time    |
| ------------ | ------- |
| 82 to 110 Hz | 2.06 ms |
| 220 Hz       | 1.27 ms |
| 330 Hz       | 0.43 ms |
| 440 Hz       | 0.34 ms |
| 880 Hz       | 0.10 ms |
| 1760 Hz      | 0.06 ms |

Low notes save little, because an octave below them reaches the 50 Hz floor. Note range calibration helps there. On the Tuner page you play your lowest and highest note, and that range, with two semitones of slack, becomes the widest the detector will search. For a B♭ clarinet's low D3 this cut the time from 1.67 ms to 0.97 ms. A note outside the saved range is not detected, so there is a button to go back to the automatic range.

The audio thread has about 2.7 ms to produce each 128-sample block at 48 kHz, and the detector runs on it. These numbers have not been measured inside a browser worklet or on a phone. Add `?debug` to the address to see the real cost on your device.

## Music

- **Written and sounding pitch.** The app shows the note you read on your instrument's part and scores against the sounding pitch. The transposition is the number of semitones from written to sounding: for example B♭ is −2, E♭ clarinet is +3, alto sax is −9 and a bass clarinet or tenor sax is −14.
- **Reference pitch.** A4 defaults to 442 Hz and can be set from 415 to 466 Hz. The widget cycles through 440, 442 and 443.
- **Tunings.** Targets are either equal temperament or just intonation relative to the drone. Just intonation uses the five-limit ratios, so a major third sits about 13.7 cents below equal temperament and a perfect fifth about 2 cents above.

## Scoring

Scoring (`src/scoring/`) works on the full-rate frames recorded during a session.

- **Notes.** A note is a run of frames on the same nearest pitch. Gaps up to 100 ms count as the same note, and runs shorter than 150 ms are dropped.
- **Stable part.** The first 120 ms (the attack) and the last 50 ms are ignored. Frames more than 40 cents from the note's median are treated as slides and left out.
- **Vibrato.** If the pitch moves 3 to 9 times a second by 12 cents or more, the note is stored as a centre pitch plus a width, and its stability is judged on the cycle-averaged pitch.
- **Note score.** 100 within ±5 cents of the target, 0 at ±30 cents, and linear in between. These are the same tolerances that colour the widget.
- **Stability.** The spread of the note, as a robust standard deviation: 100 at 2 cents or less, 0 at 15 cents or more.
- **Session score.** Accuracy is the mean note score and stability the mean stability. The combined score is 70% accuracy and 30% stability, and the weights are saved with each session. The report also gives the mean deviation, the share of notes within tolerance, and the average sharp or flat tendency for each written note.

## Metronome and clock

The microphone, the metronome and the scoring share one `AudioContext`, so they share a single clock.

- Clicks are scheduled on the audio clock with a 100 ms look-ahead, and a short `setTimeout` only wakes the scheduler. In a hidden tab, where timers are throttled, it looks 1.1 seconds ahead instead.
- The click is a short burst of band-passed noise, so it is not a musical pitch. The downbeat is louder and higher.
- Pitch frames within 30 ms of a click are dropped. The app warns when it cannot find headphones, which is a guess based on the output device names.
- Beat times are saved with each session, so rushing and dragging can be shown later. That analysis is not in the report yet.
- BPM counts the written pulse, so 6/8 gives six clicks to the bar.

## Pop-out window

On Chromium the widget moves into a Document Picture-in-Picture window. Elsewhere it opens in a small pop-up window. In both cases React renders the widget into that window and the app's styles are copied across.

A hidden tab gets no animation frames, so while the widget is popped out the pop-out window's own frames drive the pitch trail and the beat dots.

## Storage

Everything is stored in the browser (IndexedDB, via `idb`), in three stores:

- `sessions`: the metadata, notes and summary of each recorded session.
- `tracks`: the pitch track of each session, loaded only when needed, so the history stays quick.
- `settings`: one object, validated when it is loaded.

Sessions with no detected notes are shown but not saved. No audio is ever stored. The app waits at most 1.5 seconds for saved settings before it renders, so blocked storage cannot leave a blank page.

## CSV export

One row per scored note for a session, or one row per session for the history. The files are UTF-8 with a byte order mark, comma separated, with dots as decimals and ISO timestamps. Spreadsheets in locales that expect semicolons and decimal commas, such as Dutch Excel, should import the file through Data, From Text/CSV. Text cells are guarded against formula injection. The browser download lives in `src/export/download.ts`, so a native build can replace it.

## Offline support

The service worker is generated at build time (`build/sw-plugin.ts`). It caches the built files, answers from the cache first, and serves `index.html` for any navigation, so the app works offline after one visit. A new version installs in the background and takes over on the next load. The worker registers only in production builds over HTTP or HTTPS.

All paths are relative to the worker's scope, so the app works from the site root or from a sub-path such as the GitHub Pages address.

## Decisions and limits

- Inter is the first font in the stack but is not bundled, to avoid loading anything from the network. The app falls back to the system sans-serif font.
- The audio context is created when you press Listen, before the permission prompt, never when the page loads. Safari needs this.
- If the microphone cannot start, the widget says why: the page is not on HTTPS or localhost, the permission is blocked, there is no microphone, or something else failed.
- Browser APIs are kept inside `audio/`, `storage/` and `ui/`, which keeps a later native wrapper (for example Capacitor) possible. There is none yet.
- The logo is a 24 by 24 pixel drawing generated by a script. A local image model was tried first and produced shapes that were too low in contrast to use.
