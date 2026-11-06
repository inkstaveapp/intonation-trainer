import { create } from 'zustand';
import { PitchEngine, type PitchFrame, type Warning } from '~/audio/engine';
import { FrameFilter } from '~/audio/filter';
import { calibratedBounds, type Bounds } from '~/audio/range';
import type { SavedRange } from '~/storage/db';
import { micErrorKind, type MicError } from '~/audio/micError';
import {
  DEFAULT_INSTRUMENT,
  getInstrument,
  soundingToWritten,
  writtenToSounding,
  type InstrumentId,
} from '~/music/instruments';
import { A4_DEFAULT, clampA4 } from '~/music/pitch';
import { centsFromTarget, type Tuning } from '~/music/tuning';
import { DEFAULT_TOLERANCE, type Tolerance } from '~/scoring/tolerance';
import { metronome } from '~/state/metronome';
import { detectLang, translate, type Lang } from '~/i18n';
import { useDevices } from '~/state/devices';

const DISPLAY_INTERVAL_MS = 80; // ~12 fps for the UI; scoring subscribers get every frame

export interface Reading {
  writtenMidi: number;
  soundingMidi: number;
  cents: number;
  freq: number;
}

interface TunerState {
  lang: Lang;
  instrument: InstrumentId;
  a4: number;
  status: 'idle' | 'listening' | 'paused';
  reading: Reading | null;
  warnings: Warning[];
  tolerance: Tolerance;
  /** The calibrated note range; only used while its instrument pitch is the selected one. */
  range: SavedRange | null;
  /** True while the calibration flow runs, which needs the full default range. */
  calibrating: boolean;
  /** Why the last attempt to listen failed; null when it did not. */
  error: MicError | null;
  tuningKind: 'equal' | 'just';
  /** Drone tonic as a written pitch for the selected instrument. */
  droneWritten: number;
  setLang: (l: Lang) => void;
  setInstrument: (i: InstrumentId) => void;
  setA4: (a4: number) => void;
  setRange: (r: SavedRange | null) => void;
  setCalibrating: (c: boolean) => void;
  setTuningKind: (k: 'equal' | 'just') => void;
  setDroneWritten: (m: number) => void;
  start: () => Promise<void>;
  stop: () => Promise<void>;
}

/** Active tuning: equal temperament, or just intonation against the drone's sounding pitch. */
export const tuningOf = (
  s: Pick<TunerState, 'tuningKind' | 'droneWritten' | 'instrument'>,
): Tuning =>
  s.tuningKind === 'equal'
    ? { kind: 'equal' }
    : { kind: 'just', droneMidi: writtenToSounding(s.droneWritten, getInstrument(s.instrument)) };

/** The detector's search bounds: the calibrated range if it fits this instrument pitch, else the default (null). */
export const boundsOf = (
  s: Pick<TunerState, 'range' | 'instrument' | 'calibrating'>,
): Bounds | null =>
  !s.calibrating && s.range && s.range.instrument === s.instrument
    ? calibratedBounds(s.range.lowHz, s.range.highHz)
    : null;

const filter = new FrameFilter();
let lastDisplay = 0;
const rawListeners = new Set<(f: PitchFrame, smoothed: number | null) => void>();

/** Full-rate frames for scoring (not throttled). */
export const subscribeFrames = (fn: (f: PitchFrame, smoothed: number | null) => void) => {
  rawListeners.add(fn);
  return () => void rawListeners.delete(fn);
};

export const useTuner = create<TunerState>((set, get) => {
  const engine = new PitchEngine({
    onFrame: (f) => {
      const smoothed = filter.push(f.freq, f.clarity, f.rms);
      rawListeners.forEach((fn) => fn(f, smoothed));
      const now = performance.now();
      if (now - lastDisplay < DISPLAY_INTERVAL_MS) return;
      lastDisplay = now;
      if (smoothed === null) return set({ reading: null });
      const st = get();
      const inst = getInstrument(st.instrument);
      const { midi, cents } = centsFromTarget(smoothed, st.a4, tuningOf(st));
      set({
        reading: {
          writtenMidi: soundingToWritten(midi, inst),
          soundingMidi: midi,
          cents,
          freq: smoothed,
        },
      });
    },
    onWarning: (w) => !get().warnings.includes(w) && set({ warnings: [...get().warnings, w] }),
    onAutoPause: () => set({ status: 'paused', reading: null }),
    onInputLost: () => {
      void engine.stop();
      set({ status: 'idle', reading: null, error: 'lost' });
      void refreshDevices();
    },
    isMuted: (t) => metronome.isMuted(t),
  });

  const applyBounds = () => engine.setBounds(boundsOf(get()));

  // Switching microphone while listening restarts capture on the new device.
  useDevices.subscribe((s, prev) => {
    if (s.inputId !== prev.inputId && get().status === 'listening')
      void get()
        .stop()
        .then(() => get().start());
  });

  return {
    lang: detectLang(),
    instrument: DEFAULT_INSTRUMENT,
    a4: A4_DEFAULT,
    status: 'idle',
    reading: null,
    warnings: [],
    tolerance: DEFAULT_TOLERANCE,
    error: null,
    range: null,
    calibrating: false,
    tuningKind: 'equal',
    droneWritten: 60,
    setLang: (lang) => set({ lang }),
    setInstrument: (instrument) => {
      set({ instrument });
      applyBounds();
    },
    setA4: (a4) => set({ a4: clampA4(a4) }),
    setRange: (range) => {
      set({ range });
      applyBounds();
    },
    setCalibrating: (calibrating) => {
      set({ calibrating });
      applyBounds();
    },
    setTuningKind: (tuningKind) => set({ tuningKind }),
    setDroneWritten: (droneWritten) => set({ droneWritten }),
    start: async () => {
      set({ warnings: [], error: null });
      try {
        applyBounds();
        const devices = useDevices.getState();
        try {
          await engine.start(undefined, devices.inputId);
        } catch (e) {
          // A remembered microphone that is no longer connected: use the system default instead, once.
          if (
            devices.inputId === null ||
            (e as { name?: unknown } | null)?.name !== 'OverconstrainedError'
          )
            throw e;
          devices.setInput(null);
          await engine.start(undefined, null);
        }
        set({ status: 'listening' });
        void refreshDevices(); // device names are only readable now that permission is granted
      } catch (e) {
        set({ error: micErrorKind(e, !!navigator.mediaDevices) });
      }
    },
    stop: async () => {
      await engine.stop();
      set({ status: 'idle', reading: null, error: null });
    },
  };
});

/** Re-reads the device lists, naming unnamed devices in the current language. */
export const refreshDevices = (): Promise<void> => {
  const lang = useTuner.getState().lang;
  return useDevices
    .getState()
    .refresh({ mic: translate(lang, 'devices.mic'), output: translate(lang, 'devices.output') })
    .catch(() => undefined);
};
