import { create } from 'zustand';
import { Metronome } from '~/audio/metronome';
import { bpmFromTaps, clampBpm, headphonesState } from '~/audio/scheduler';

export const SIGNATURES = { '2/4': 2, '3/4': 3, '4/4': 4, '6/8': 6 } as const;
export type SigId = keyof typeof SIGNATURES;
export type ClickMode = 'sound' | 'flash' | 'haptic';
const NEXT_MODE: Record<ClickMode, ClickMode> = {
  sound: 'flash',
  flash: 'haptic',
  haptic: 'sound',
};
const SIG_IDS = Object.keys(SIGNATURES) as SigId[];

export const metronome = new Metronome();

interface MetroState {
  bpm: number;
  sig: SigId;
  mode: ClickMode;
  running: boolean;
  /** Index of the beat just played, null when stopped. */
  beat: number | null;
  /** Increments every beat; keys the flash animation. */
  tick: number;
  headphones: 'ok' | 'none' | 'unknown';
  setBpm: (bpm: number) => void;
  setSig: (s: SigId) => void;
  cycleMode: () => void;
  tap: () => void;
  toggle: () => Promise<void>;
}

let raf = 0;
let taps: number[] = [];

export const useMetronome = create<MetroState>((set, get) => {
  const sync = () =>
    metronome.configure({
      bpm: get().bpm,
      beats: SIGNATURES[get().sig],
      audible: get().mode === 'sound',
    });

  return {
    bpm: 80,
    sig: '4/4',
    mode: 'sound',
    running: false,
    beat: null,
    tick: 0,
    headphones: 'unknown',
    setBpm: (bpm) => {
      set({ bpm: clampBpm(bpm) });
      sync();
    },
    setSig: (sig) => {
      set({ sig });
      sync();
    },
    cycleMode: () => {
      set({ mode: NEXT_MODE[get().mode] });
      sync();
    },
    tap: () => {
      const now = performance.now() / 1000;
      taps = [...taps.slice(-8), now];
      const bpm = bpmFromTaps(taps);
      if (bpm !== null) get().setBpm(bpm);
    },
    toggle: async () => {
      if (get().running) {
        metronome.stop();
        cancelAnimationFrame(raf);
        return set({ running: false, beat: null });
      }
      sync();
      const ctx = await metronome.start();
      set({ running: true, headphones: get().mode === 'sound' ? await headphonesState() : 'ok' });
      const loop = () => {
        const b = metronome.pollBeat(ctx.currentTime);
        if (b) {
          set({ beat: b.beat, tick: get().tick + 1 });
          if (get().mode === 'haptic') navigator.vibrate?.(b.beat === 0 ? 40 : 15);
        }
        raf = requestAnimationFrame(loop);
      };
      loop();
    },
  };
});

export { SIG_IDS };
