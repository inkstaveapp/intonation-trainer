import { useEffect } from 'react';
import { create } from 'zustand';
import { getAudioContext } from '~/audio/context';
import { headphonesState } from '~/audio/scheduler';
import { Tone } from '~/audio/tone';
import { getInstrument, writtenToSounding } from '~/music/instruments';
import { midiToFreq } from '~/music/pitch';
import { useTuner } from '~/state/tuner';

const drone = new Tone([1, 0.5, 0.3, 0.15]);
const reference = new Tone([1]);

interface DroneState {
  playing: boolean;
  refPlaying: boolean;
  volume: number;
  headphones: 'ok' | 'none' | 'unknown';
  setVolume: (v: number) => void;
  toggleDrone: () => Promise<void>;
  toggleReference: () => Promise<void>;
}

export const droneFreq = (s = useTuner.getState()): number =>
  midiToFreq(writtenToSounding(s.droneWritten, getInstrument(s.instrument)), s.a4);

export const useDrone = create<DroneState>((set, get) => ({
  playing: false,
  refPlaying: false,
  volume: 0.25,
  headphones: 'unknown',
  setVolume: (volume) => {
    set({ volume });
    void getAudioContext().then((ctx) => drone.setGain(ctx, volume));
  },
  toggleDrone: async () => {
    const ctx = await getAudioContext();
    if (get().playing) {
      drone.stop(ctx);
      return set({ playing: false });
    }
    drone.start(ctx, droneFreq(), get().volume);
    set({ playing: true, headphones: await headphonesState() });
  },
  toggleReference: async () => {
    const ctx = await getAudioContext();
    if (get().refPlaying) {
      reference.stop(ctx);
      return set({ refPlaying: false });
    }
    reference.start(ctx, useTuner.getState().a4, 0.2);
    set({ refPlaying: true });
  },
}));

/** Keeps sounding tones in step with the instrument, A reference and tonic. Mount once at the app root. */
export function useToneSync(): void {
  const a4 = useTuner((s) => s.a4);
  const freq = useTuner((s) => droneFreq(s));
  useEffect(() => {
    void getAudioContext().then((ctx) => {
      if (drone.playing) drone.setFreq(ctx, freq);
      if (reference.playing) reference.setFreq(ctx, a4);
    });
  }, [a4, freq]);
}
