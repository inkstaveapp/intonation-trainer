import { create } from 'zustand';
import { Metronome } from '~/audio/metronome';
import { useDevices } from '~/state/devices';
import { getUiWindow, subscribeUiWindow } from '~/state/uiWindow';
import { bpmFromTaps, clampBpm, headphonesState } from '~/audio/scheduler';

export const SIGNATURES = { '2/4': 2, '3/4': 3, '4/4': 4, '6/8': 6 } as const;
export type SigId = keyof typeof SIGNATURES;
export type ClickMode = 'sound' | 'flash' | 'haptic';
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
  setMode: (m: ClickMode) => void;
  tap: () => void;
  toggle: () => Promise<void>;
}

let raf = 0;
let loopWin: Window | null = null;
let loopCtx: AudioContext | null = null;

/** Display loop for beat dots, flash and haptics, run on the active UI window's frames. */
function startLoop(): void {
  loopWin?.cancelAnimationFrame(raf);
  const win = (loopWin = getUiWindow());
  const loop = () => {
    if (loopCtx) {
      const b = metronome.pollBeat(loopCtx.currentTime);
      if (b) {
        const { tick, mode } = useMetronome.getState();
        useMetronome.setState({ beat: b.beat, tick: tick + 1 });
        if (mode === 'haptic') navigator.vibrate?.(b.beat === 0 ? 40 : 15);
      }
    }
    raf = win.requestAnimationFrame(loop);
  };
  loop();
}
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
    setMode: (mode) => {
      set({ mode });
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
        loopWin?.cancelAnimationFrame(raf);
        return set({ running: false, beat: null });
      }
      sync();
      loopCtx = await metronome.start();
      set({
        running: true,
        headphones:
          get().mode === 'sound' ? await headphonesState(useDevices.getState().outputId) : 'ok',
      });
      startLoop();
    },
  };
});

subscribeUiWindow(() => useMetronome.getState().running && startLoop());

export { SIG_IDS };
