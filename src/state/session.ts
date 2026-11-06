import { create } from 'zustand';
import { centsFromTarget } from '~/music/tuning';
import { buildSession } from '~/scoring/score';
import type { Frame, Session } from '~/scoring/types';
import { metronome, useMetronome } from '~/state/metronome';
import { subscribeFrames, tuningOf, useTuner } from '~/state/tuner';

interface SessionState {
  recording: boolean;
  /** Wall-clock start, for the elapsed timer. */
  startedMs: number;
  last: Session | null;
  toggle: () => Promise<void>;
}

let frames: Frame[] = [];
let beats: number[] = [];
let unsubscribe: Array<() => void> = [];

export const useSession = create<SessionState>((set, get) => ({
  recording: false,
  startedMs: 0,
  last: null,
  toggle: async () => {
    if (get().recording) {
      unsubscribe.forEach((u) => u());
      unsubscribe = [];
      const tuner = useTuner.getState();
      const m = useMetronome.getState();
      const first = frames[0]?.t ?? 0;
      const session = buildSession(
        {
          id: crypto.randomUUID(),
          startedAt: get().startedMs,
          durationS: frames.length ? frames[frames.length - 1]!.t - first : 0,
          instrument: tuner.instrument,
          a4: tuner.a4,
          tuningKind: tuner.tuningKind,
          droneWritten: tuner.droneWritten,
          tolerance: tuner.tolerance,
          metronome: beats.length ? { bpm: m.bpm, sig: m.sig, beats } : null,
        },
        frames,
      );
      frames = [];
      beats = [];
      return set({ recording: false, last: session });
    }
    if (useTuner.getState().status !== 'listening') await useTuner.getState().start();
    frames = [];
    beats = [];
    unsubscribe = [
      subscribeFrames((f, smoothed) => {
        if (smoothed === null)
          return void frames.push({ t: f.t, midi: null, cents: null, rms: f.rms });
        const s = useTuner.getState();
        const { midi, cents } = centsFromTarget(smoothed, s.a4, tuningOf(s));
        frames.push({ t: f.t, midi, cents, rms: f.rms });
      }),
      metronome.subscribe((e) => beats.push(e.time)),
    ];
    set({ recording: true, startedMs: Date.now() });
  },
}));
