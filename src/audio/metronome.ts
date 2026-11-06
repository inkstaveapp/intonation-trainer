import { getAudioContext } from './context';
import { BeatScheduler, ClickLog, LOOK_AHEAD_S } from './scheduler';

export interface BeatEvent {
  beat: number;
  time: number;
}

const WAKE_MS = 25;

function noiseBuffer(ctx: AudioContext): AudioBuffer {
  const buf = ctx.createBuffer(1, Math.round(ctx.sampleRate * 0.05), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

/** Woodblock-ish click: band-passed noise burst, deliberately not a musical pitch. */
function scheduleClick(ctx: AudioContext, buf: AudioBuffer, time: number, accent: boolean) {
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = accent ? 2600 : 1700;
  bp.Q.value = 3;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(accent ? 2.5 : 1.2, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
  src.connect(bp).connect(gain).connect(ctx.destination);
  src.start(time);
  src.stop(time + 0.05);
}

export class Metronome {
  readonly clicks = new ClickLog();
  private sched: BeatScheduler;
  private pending: BeatEvent[] = [];
  private listeners = new Set<(e: BeatEvent) => void>();
  private timer: ReturnType<typeof setTimeout> | undefined;
  private ctx: AudioContext | null = null;
  private noise: AudioBuffer | null = null;
  private audible = true;

  constructor() {
    this.sched = new BeatScheduler((beat, time) => {
      if (this.audible && this.ctx && this.noise) {
        scheduleClick(this.ctx, this.noise, time, beat === 0);
        this.clicks.record(time);
      }
      this.pending.push({ beat, time });
      this.listeners.forEach((fn) => fn({ beat, time }));
    });
  }

  get running(): boolean {
    return this.ctx !== null && this.timer !== undefined;
  }

  /** Beat times on the shared AudioContext clock, for later rushing/dragging analysis. */
  subscribe(fn: (e: BeatEvent) => void): () => void {
    this.listeners.add(fn);
    return () => void this.listeners.delete(fn);
  }

  configure(o: { bpm?: number; beats?: number; audible?: boolean }): void {
    if (o.bpm !== undefined) this.sched.bpm = o.bpm;
    if (o.beats !== undefined) this.sched.beats = o.beats;
    if (o.audible !== undefined) this.audible = o.audible;
  }

  async start(): Promise<AudioContext> {
    this.ctx = await getAudioContext();
    this.noise ??= noiseBuffer(this.ctx);
    this.pending = [];
    this.sched.start(this.ctx.currentTime);
    // shortcut: a hidden tab throttles timers to ~1 s, so look further ahead there; upgrade to a worklet clock if drift matters.
    const loop = () => {
      const ahead = document.hidden ? 1.1 : LOOK_AHEAD_S;
      this.sched.tick(this.ctx!.currentTime, ahead);
      this.timer = setTimeout(loop, WAKE_MS);
    };
    loop();
    return this.ctx;
  }

  stop(): void {
    clearTimeout(this.timer);
    this.timer = undefined;
    this.pending = [];
  }

  /** Latest beat whose time has arrived (for display); drops older ones. */
  pollBeat(now: number): BeatEvent | null {
    let last: BeatEvent | null = null;
    while (this.pending.length > 0 && this.pending[0]!.time <= now) last = this.pending.shift()!;
    return last;
  }

  isMuted(t: number): boolean {
    return this.clicks.isMuted(t);
  }
}
