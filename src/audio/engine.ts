import type { InstrumentProfile } from '~/music/instruments';
import workletUrl from '~/audio/worklet/pitch-processor.ts?worker&url';

export interface PitchFrame {
  freq: number; // 0 when nothing periodic was found
  clarity: number;
  rms: number;
  peak: number;
  /** AudioContext time in seconds: the shared clock for metronome and scoring. */
  t: number;
}

export type Warning = 'clipping' | 'highLatency';

export interface EngineHandlers {
  onFrame: (f: PitchFrame) => void;
  onWarning: (w: Warning) => void;
  onAutoPause: () => void;
}

const CLIP_PEAK = 0.99;
const HIGH_LATENCY_S = 0.15;
const SILENCE_PAUSE_S = 20;
const SILENCE_RMS = 0.002;

export class PitchEngine {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private node: AudioWorkletNode | null = null;
  private profile: InstrumentProfile | null = null;
  private prior: number | undefined;
  private lastSound = 0;

  constructor(private h: EngineHandlers) {}

  get context(): AudioContext | null {
    return this.ctx;
  }

  get running(): boolean {
    return this.node !== null;
  }

  async start(profile: InstrumentProfile, prior?: number): Promise<void> {
    if (this.running) return;
    this.profile = profile;
    this.prior = prior;
    // Processing off: AGC/noise suppression would distort the pitch and level.
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
    this.ctx = new AudioContext({ latencyHint: 'interactive' });
    await this.ctx.audioWorklet.addModule(workletUrl);
    this.node = new AudioWorkletNode(this.ctx, 'pitch-processor', { numberOfOutputs: 0 });
    this.node.port.onmessage = (e: MessageEvent<PitchFrame>) => this.handle(e.data);
    this.ctx.createMediaStreamSource(this.stream).connect(this.node);
    this.configure();
    this.lastSound = this.ctx.currentTime;
    // outputLatency is missing in some browsers; baseLatency alone then understates it.
    const latency = this.ctx.baseLatency + (this.ctx.outputLatency ?? 0);
    if (latency > HIGH_LATENCY_S) this.h.onWarning('highLatency');
  }

  setProfile(profile: InstrumentProfile): void {
    this.profile = profile;
    this.configure();
  }

  setPrior(freq: number | undefined): void {
    this.prior = freq;
    this.configure();
  }

  async stop(): Promise<void> {
    this.node?.disconnect();
    this.stream?.getTracks().forEach((t) => t.stop());
    await this.ctx?.close();
    this.node = this.stream = this.ctx = null;
  }

  private configure() {
    if (!this.node || !this.profile) return;
    const { minHz, maxHz, windowSize, oddHarmonics } = this.profile;
    this.node.port.postMessage({
      minHz,
      maxHz,
      windowSize,
      guardTwelfth: oddHarmonics,
      prior: this.prior,
    });
  }

  private handle(f: PitchFrame) {
    if (f.peak >= CLIP_PEAK) this.h.onWarning('clipping');
    if (f.rms >= SILENCE_RMS) this.lastSound = f.t;
    else if (f.t - this.lastSound > SILENCE_PAUSE_S) {
      void this.stop().then(() => this.h.onAutoPause());
      return;
    }
    this.h.onFrame(f);
  }
}
