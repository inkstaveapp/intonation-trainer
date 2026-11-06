import { create } from 'zustand';
import { PitchEngine, type PitchFrame, type Warning } from '../audio/engine';
import { FrameFilter } from '../audio/filter';
import {
  DEFAULT_INSTRUMENT,
  getInstrument,
  soundingToWritten,
  type InstrumentId,
} from '../music/instruments';
import { A4_DEFAULT, centsBetween, clampA4, midiToFreq, nearestMidi } from '../music/pitch';
import { detectLang, type Lang } from '../i18n';

const DISPLAY_INTERVAL_MS = 80; // ~12 fps for the UI; scoring subscribers get every frame

export interface Reading {
  writtenMidi: number;
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
  setLang: (l: Lang) => void;
  setInstrument: (i: InstrumentId) => void;
  setA4: (a4: number) => void;
  start: () => Promise<void>;
  stop: () => Promise<void>;
}

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
      const { a4, instrument } = get();
      const sounding = nearestMidi(smoothed, a4);
      set({
        reading: {
          writtenMidi: soundingToWritten(sounding, getInstrument(instrument)),
          cents: centsBetween(smoothed, midiToFreq(sounding, a4)),
          freq: smoothed,
        },
      });
    },
    onWarning: (w) => !get().warnings.includes(w) && set({ warnings: [...get().warnings, w] }),
    onAutoPause: () => set({ status: 'paused', reading: null }),
  });

  return {
    lang: detectLang(),
    instrument: DEFAULT_INSTRUMENT,
    a4: A4_DEFAULT,
    status: 'idle',
    reading: null,
    warnings: [],
    setLang: (lang) => set({ lang }),
    setInstrument: (instrument) => {
      set({ instrument });
      if (engine.running) engine.setProfile(getInstrument(instrument));
    },
    setA4: (a4) => set({ a4: clampA4(a4) }),
    start: async () => {
      set({ warnings: [] });
      await engine.start(getInstrument(get().instrument));
      set({ status: 'listening' });
    },
    stop: async () => {
      await engine.stop();
      set({ status: 'idle', reading: null });
    },
  };
});
