import { getAudioContext } from './context';
import type { Bounds } from './range';
import workletUrl from './worklet/pitch-processor.ts?worker&url';

export interface PitchFrame {
  freq: number; // 0 when nothing periodic was found
  clarity: number;
  rms: number;
  peak: number;
  /** AudioContext time in seconds: the shared clock for metronome and scoring. */
  t: number;
  /** Average detector time per frame in ms over the last 60 frames (0 until measured). Diagnostics only. */
  costMs?: number;
}

export type Warning = 'clipping' | 'highLatency';

export interface EngineHandlers {
  onFrame: (f: PitchFrame) => void;
  onWarning: (w: Warning) => void;
  onAutoPause: () => void;
  /** Frames at these AudioContext times are dropped (e.g. around metronome clicks). */
  isMuted?: (t: number) => boolean;
}

let workletLoaded = false;
const CLIP_PEAK = 0.99;
const HIGH_LATENCY_S = 0.15;
const SILENCE_PAUSE_S = 20;
const SILENCE_RMS = 0.002;

export class PitchEngine {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private node: AudioWorkletNode | null = null;
  private prior: number | undefined;
  private bounds: Bounds | null = null;
  private lastSound = 0;

  constructor(private h: EngineHandlers) {}

  get context(): AudioContext | null {
    return this.ctx;
  }

  get running(): boolean {
    return this.node !== null;
  }

  async start(prior?: number): Promise<void> {
    if (this.running) return;
    this.prior = prior;
    // The context first: resume() must run while the click's user gesture is still valid (Safari, iOS),
    // and the permission prompt below can use that up.
    const ctx = await getAudioContext();
    // Processing off: AGC/noise suppression would distort the pitch and level.
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
    try {
      if (!workletLoaded) {
        await ctx.audioWorklet.addModule(workletUrl);
        workletLoaded = true;
      }
      const node = new AudioWorkletNode(ctx, 'pitch-processor', { numberOfOutputs: 0 });
      node.port.onmessage = (e: MessageEvent<PitchFrame>) => this.handle(e.data);
      ctx.createMediaStreamSource(stream).connect(node);
      this.ctx = ctx;
      this.stream = stream;
      this.node = node;
    } catch (e) {
      stream.getTracks().forEach((t) => t.stop()); // do not leave the mic open after a failed start
      throw e;
    }
    this.configure();
    this.lastSound = ctx.currentTime;
    // outputLatency is missing in some browsers; baseLatency alone then understates it.
    const latency = ctx.baseLatency + (ctx.outputLatency ?? 0);
    if (latency > HIGH_LATENCY_S) this.h.onWarning('highLatency');
  }

  /** Limits the pitch search to the player's calibrated range; null restores the default. */
  setBounds(bounds: Bounds | null): void {
    this.bounds = bounds;
    this.configure();
  }

  setPrior(freq: number | undefined): void {
    this.prior = freq;
    this.configure();
  }

  async stop(): Promise<void> {
    this.node?.disconnect();
    this.stream?.getTracks().forEach((t) => t.stop());
    this.node = this.stream = this.ctx = null; // the shared context stays open for the metronome
  }

  private configure() {
    this.node?.port.postMessage({ prior: this.prior, bounds: this.bounds });
  }

  private handle(f: PitchFrame) {
    if (f.peak >= CLIP_PEAK) this.h.onWarning('clipping');
    if (f.rms >= SILENCE_RMS) this.lastSound = f.t;
    else if (f.t - this.lastSound > SILENCE_PAUSE_S) {
      void this.stop().then(() => this.h.onAutoPause());
      return;
    }
    if (this.h.isMuted?.(f.t)) return;
    this.h.onFrame(f);
  }
}
