import { create } from 'zustand';
import { MIN_RANGE_RATIO, REST_FRAMES, StableNote } from '~/calibration';
import { subscribeFrames, useTuner } from '~/state/tuner';

type Step = 'idle' | 'low' | 'high';

interface CalibrationState {
  step: Step;
  /** The lowest note once collected (sounding Hz). */
  low: number | null;
  /** Waiting for the player to stop before the next note is collected. */
  resting: boolean;
  /** Frames of the current note collected, out of `stable.frames`. */
  progress: number;
  /** The highest note was not clearly above the lowest. */
  error: 'order' | null;
  begin: () => Promise<void>;
  cancel: () => void;
}

export const CALIBRATION_FRAMES = new StableNote().frames;

const stable = new StableNote();
let rest = 0;
let unsubscribe: (() => void) | null = null;

export const useCalibration = create<CalibrationState>((set, get) => {
  const finish = () => {
    unsubscribe?.();
    unsubscribe = null;
    useTuner.getState().setCalibrating(false);
    set({ step: 'idle', low: null, resting: false, progress: 0 });
  };

  const onFrame = (freq: number | null) => {
    const s = get();
    if (s.resting) {
      if (freq === null) {
        if (++rest >= REST_FRAMES) set({ resting: false });
      } else rest = 0;
      return;
    }
    const note = stable.push(freq);
    set({ progress: stable.count });
    if (note === null) return;
    stable.reset();
    rest = 0;
    if (s.step === 'low')
      return set({ low: note, step: 'high', resting: true, progress: 0, error: null });
    if (s.low === null || note < s.low * MIN_RANGE_RATIO)
      return set({ error: 'order', resting: true, progress: 0 });
    const tuner = useTuner.getState();
    tuner.setRange({ instrument: tuner.instrument, lowHz: s.low, highHz: note });
    finish();
  };

  return {
    step: 'idle',
    low: null,
    resting: false,
    progress: 0,
    error: null,
    begin: async () => {
      const tuner = useTuner.getState();
      if (tuner.status !== 'listening') await tuner.start();
      if (useTuner.getState().status !== 'listening') return; // the widget says why the mic did not start
      stable.reset();
      rest = 0;
      tuner.setCalibrating(true); // the full default range, whatever was calibrated before
      set({ step: 'low', low: null, resting: false, progress: 0, error: null });
      unsubscribe = subscribeFrames((_f, smoothed) => onFrame(smoothed));
    },
    cancel: finish,
  };
});
